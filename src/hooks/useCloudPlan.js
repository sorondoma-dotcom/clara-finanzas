import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export function useCloudPlan(initial, onExpired) {
  const [data, rawSetData] = useState(initial.data);
  const [status, setStatus] = useState('saved');
  const [error, setError] = useState('');
  const state = useRef({ data: initial.data, revision: initial.revision, saved: JSON.stringify(initial.data), busy: false, blocked: false, retry: 0, disposed: false });
  const timer = useRef();
  const flushRef = useRef();
  const expireRef = useRef(onExpired); expireRef.current = onExpired;
  const flush = useCallback(async () => {
    const s = state.current;
    clearTimeout(timer.current);
    if (s.busy || s.blocked || s.disposed) return !s.blocked && !s.busy;
    const snapshot = JSON.stringify(s.data);
    if (snapshot === s.saved) return true;
    s.busy = true; setStatus('saving');
    try {
      const result = await api('/plan', { method: 'PUT', body: { data: JSON.parse(snapshot), revision: s.revision } });
      s.revision = result.revision; s.saved = snapshot; s.retry = 0; setError('');
      setStatus(JSON.stringify(s.data) === snapshot ? 'saved' : 'pending');
      return true;
    } catch (e) {
      setError(e.message);
      if (e.status === 409) { s.blocked = true; setStatus('conflict'); }
      else if (e.status === 401 || e.status === 403) { s.blocked = true; setStatus('expired'); expireRef.current(); }
      else { setStatus('error'); if (e.status !== 400 && e.status !== 413) timer.current = setTimeout(() => flushRef.current(), Math.min(30000, 2000 * 2 ** Math.min(s.retry++, 4))); }
      return false;
    } finally {
      s.busy = false;
      if (!s.blocked && s.saved === snapshot && JSON.stringify(s.data) !== snapshot) timer.current = setTimeout(() => flushRef.current(), 800);
    }
  }, []);
  flushRef.current = flush;
  const setData = useCallback(update => {
    const s = state.current;
    const next = typeof update === 'function' ? update(s.data) : update;
    s.data = next; rawSetData(next); setStatus(s.blocked ? 'conflict' : 'pending');
    clearTimeout(timer.current); timer.current = setTimeout(() => flushRef.current(), 800);
  }, []);
  const reload = useCallback(async () => {
    const s = state.current;
    if (s.busy) return;
    try { const result = await api('/plan'); s.data = result.data; s.revision = result.revision; s.saved = JSON.stringify(result.data); s.blocked = false; s.retry = 0; rawSetData(result.data); setStatus('saved'); setError(''); }
    catch (e) { setError(e.message); setStatus('error'); if (e.status === 401) expireRef.current(); }
  }, []);
  const resume = useCallback(() => { state.current.blocked = false; setError(''); return flushRef.current(); }, []);
  const hasPending = useCallback(() => state.current.saved !== JSON.stringify(state.current.data), []);
  useEffect(() => {
    const s = state.current; s.disposed = false;
    let lastCheck = 0;
    async function check() {
      if (document.visibilityState !== 'visible' || s.busy || s.blocked || Date.now() - lastCheck < 30000) return;
      if (hasPending()) { flushRef.current(); return; }
      lastCheck = Date.now();
      try {
        const result = await api('/plan/revision');
        if (result.revision === s.revision && !hasPending() && !s.busy) { setError(''); setStatus('saved'); }
        if (result.revision !== s.revision && !hasPending() && !s.busy) {
          const fresh = await api('/plan');
          if (!hasPending() && !s.busy) { s.data = fresh.data; s.revision = fresh.revision; s.saved = JSON.stringify(fresh.data); rawSetData(fresh.data); setStatus('saved'); }
        }
      } catch (e) { if (e.status === 401) { s.blocked = true; expireRef.current(); } else { setError(e.message); setStatus('error'); } }
    }
    const leave = e => { if (hasPending()) { e.preventDefault(); e.returnValue = ''; } };
    const interval = setInterval(check, 60000);
    window.addEventListener('focus', check); window.addEventListener('online', check); window.addEventListener('beforeunload', leave);
    return () => { s.disposed = true; clearInterval(interval); clearTimeout(timer.current); window.removeEventListener('focus', check); window.removeEventListener('online', check); window.removeEventListener('beforeunload', leave); };
  }, [hasPending]);
  return { data, setData, status, error, flush, reload, resume, hasPending };
}
