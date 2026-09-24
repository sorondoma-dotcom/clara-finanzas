import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartTooltip from './ChartTooltip';

const axisTick = size => ({ fill: '#899088', fontSize: size });

export default function ForecastChart({ data, tall = false }) {
  return (
    <div className={`chart-wrap ${tall ? 'chart-tall' : ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 15, right: 10, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="availableGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#badc8b" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#badc8b" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#eaece7" strokeDasharray="3 5" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick(11)} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={axisTick(10)} tickFormatter={v => `${v.toLocaleString('es-ES')} €`} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="income" name="Ingresos" stroke="#b9beb5" strokeDasharray="5 5" strokeWidth={1.5} fill="none" />
          <Area type="monotone" dataKey="committed" name="Comprometido" stroke="#dbb97c" strokeWidth={2} fill="none" />
          <Area type="monotone" dataKey="available" name="Disponible" stroke="#537b45" strokeWidth={3} fill="url(#availableGradient)" activeDot={{ r: 6, fill: '#234c3c', stroke: '#fff', strokeWidth: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
