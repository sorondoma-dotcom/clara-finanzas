import React from 'react';
import { Car, Droplets, Dumbbell, Home, Music2, ShieldCheck, Tv, Wallet, Wifi, Zap } from 'lucide-react';

const categoryIcons = { Vivienda: Home, Suministros: Zap, Suscripciones: Music2, Transporte: Car, Salud: Dumbbell, Seguros: ShieldCheck, Otros: Wallet };
const specialIcons = { internet: Wifi, netflix: Tv, water: Droplets };

export default function ExpenseIcon({ expense }) {
  const Icon = specialIcons[expense.id] || categoryIcons[expense.category] || Wallet;
  return <span className={`expense-icon cat-${expense.category}`}><Icon size={18} /></span>;
}
