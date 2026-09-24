import React from 'react';
import { Check, X } from 'lucide-react';

export default function Toast({ message, onClose }) {
  if (!message) return null;
  return <div className="toast" role="status"><Check size={17} />{message}<button aria-label="Cerrar aviso" onClick={onClose}><X size={15} /></button></div>;
}
