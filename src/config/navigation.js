import { CalendarDays, CreditCard, LayoutDashboard, ShieldCheck, TrendingUp } from 'lucide-react';

export const navigation = [
  { id: 'overview', label: 'Vista general', icon: LayoutDashboard },
  { id: 'expenses', label: 'Mis gastos', icon: CreditCard },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'forecast', label: 'Previsión', icon: TrendingUp },
  { id: 'reserves', label: 'Mis reservas', icon: ShieldCheck },
];

export const pageLabel = page => navigation.find(n => n.id === page)?.label || 'Configuración';

export const pageCopy = {
  overview: { title: 'Tu dinero, bajo control', dot: true, description: 'Sabe lo que viene. Disfruta de lo que queda.' },
  expenses: { title: 'Cada gasto, en su sitio.', description: 'Tus pagos recurrentes y puntuales, en un único lugar.' },
  calendar: { title: 'Adelántate a cada cobro.', description: 'Todos tus vencimientos, sin perder de vista ninguno.' },
  forecast: { title: 'Mira lo que viene.', description: 'Doce meses por delante para decidir con perspectiva.' },
  reserves: { title: 'Tu tranquilidad, mes a mes.', description: 'Pequeñas reservas para que los grandes pagos no sorprendan.' },
  settings: { title: 'Hagámoslo tuyo.', description: 'Ajusta las cifras que dan forma a tu previsión.' },
};
