import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = 'button, input, select, textarea, a[href]';

export default function Modal({ title, subtitle, onClose, children }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const node = ref.current;
    node?.focus();
    // Mantiene el foco dentro del diálogo y permite cerrarlo con Escape.
    const handler = e => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const items = [...node.querySelectorAll(FOCUSABLE)].filter(el => !el.disabled);
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; previous?.focus(); };
  }, []);
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title" className="modal">
        <button className="icon-button modal-close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button>
        <span className="eyebrow">TU DINERO, CON CLARIDAD</span>
        <h2 id="modal-title">{title}</h2>
        {subtitle && <p className="muted modal-subtitle">{subtitle}</p>}
        {children}
      </section>
    </div>
  );
}
