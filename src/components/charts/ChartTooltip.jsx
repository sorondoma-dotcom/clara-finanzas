import React from 'react';
import { euro } from '../../lib/finance';

export default function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong className="capitalize">{label}</strong>
      {payload.map(p => <div key={p.dataKey}><span style={{ background: p.color }} />{p.name}<b>{euro(p.value, 2)}</b></div>)}
    </div>
  );
}
