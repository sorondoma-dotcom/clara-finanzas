import React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { monthLabel } from '../../lib/finance';

export const MAX_OFFSET = 12;

export default function MonthPicker({ month, offset, onChange }) {
  return (
    <div className="month-picker">
      <button className="icon-button" aria-label="Mes anterior" disabled={offset === 0} onClick={() => onChange(offset - 1)}><ChevronLeft size={17} /></button>
      <CalendarDays size={16} />
      <span className="capitalize">{monthLabel(month)}</span>
      <button className="icon-button" aria-label="Mes siguiente" disabled={offset === MAX_OFFSET} onClick={() => onChange(offset + 1)}><ChevronRight size={17} /></button>
    </div>
  );
}
