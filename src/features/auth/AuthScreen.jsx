import React from 'react';
import { Leaf, ShieldCheck } from 'lucide-react';
import AuthForm from './AuthForm';

export default function AuthScreen(props) {
  return (
    <main className="auth-screen">
      <section className="auth-story">
        <a className="brand" href="/"><span className="brand-mark">✳</span>clara<span className="brand-dot">.</span></a>
        <div>
          <span className="eyebrow">MENOS SORPRESAS. MÁS VIDA.</span>
          <h1>Tu dinero en orden.<br /><span>Tu cabeza, en calma.</span></h1>
          <p>Anticipa tus gastos, protege tus reservas y descubre lo que puedes disfrutar de verdad.</p>
          <div className="auth-feature"><ShieldCheck size={20} /> Un espacio privado para tus finanzas</div>
          <div className="auth-feature"><Leaf size={20} /> El mismo plan en todos tus dispositivos</div>
        </div>
        <span className="auth-story-footer">Un pequeño hábito hoy. Más libertad mañana.</span>
      </section>
      <section className="auth-side"><AuthForm {...props} /></section>
    </main>
  );
}
