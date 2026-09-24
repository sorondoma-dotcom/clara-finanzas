import { useEffect, useState } from 'react';

export function useToast(duration = 4500) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), duration);
    return () => clearTimeout(timer);
  }, [message, duration]);
  return [message, setMessage];
}
