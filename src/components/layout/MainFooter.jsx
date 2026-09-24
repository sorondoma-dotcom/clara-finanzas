import React from 'react';
import { CircleHelp } from 'lucide-react';

export default function MainFooter({ onShowMethod }) {
  return (
    <footer className="main-footer">
      <span><span className="footer-spark">✳</span> Menos sorpresas. Más vida.</span>
      <span>Previsión orientativa con tus datos registrados <span className="footer-separator">·</span><button onClick={onShowMethod}>Cómo se calcula <CircleHelp size={13} /></button></span>
    </footer>
  );
}
