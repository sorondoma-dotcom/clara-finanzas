import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { colors, euro } from '../../lib/finance';

const EMPTY = [{ name: 'Sin gastos', value: 1 }];

export default function CategoryDonut({ data, total }) {
  const slices = data.length ? data : EMPTY;
  return (
    <div className="donut-container">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={slices} dataKey="value" innerRadius={63} outerRadius={83} paddingAngle={3} cornerRadius={4} startAngle={90} endAngle={-270} stroke="none">
            {slices.map(c => <Cell key={c.name} fill={colors[c.name] || '#e8ece5'} />)}
          </Pie>
          <Tooltip formatter={v => euro(data.length ? v : 0, 2)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-label"><small>Total previsto</small><strong>{euro(total)}</strong><span>este mes</span></div>
    </div>
  );
}
