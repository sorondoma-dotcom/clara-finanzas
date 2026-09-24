import { DatabaseBackup, KeyRound, UserRound, Wallet } from 'lucide-react';

/** Apartados de la página de Configuración, en el orden del menú superior. */
export const settingsSections = [
  { id: 'economic', label: 'Configuración económica', short: 'Economía', icon: Wallet, description: 'Ingresos, presupuesto diario, colchón e inicio de la previsión.' },
  { id: 'account', label: 'Cuenta', short: 'Cuenta', icon: UserRound, description: 'Tus datos de acceso y la sesión de este dispositivo.' },
  { id: 'security', label: 'Seguridad', short: 'Seguridad', icon: KeyRound, description: 'Contraseña, código de recuperación y sesiones abiertas.' },
  { id: 'data', label: 'Datos y copias', short: 'Datos', icon: DatabaseBackup, description: 'Copias de seguridad de tu plan y reinicio.' },
];

export const DEFAULT_SETTINGS_SECTION = settingsSections[0].id;
