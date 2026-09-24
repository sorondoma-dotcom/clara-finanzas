import React, { useEffect, useRef, useState } from 'react';
import { useCloudPlan } from '../hooks/useCloudPlan';
import { usePlanView } from '../hooks/usePlanView';
import { useToast } from '../hooks/useToast';
import { downloadBackup, emptyPlan, readBackup, readLegacyPlan } from '../lib/backup';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import PageHeading from '../components/layout/PageHeading';
import MainFooter from '../components/layout/MainFooter';
import { DemoBanner, LegacyPlanBanner, SyncNotice } from '../components/layout/PlanBanners';
import MonthPicker from '../components/ui/MonthPicker';
import Toast from '../components/ui/Toast';
import ExpenseForm from '../components/expenses/ExpenseForm';
import PlanSettingsForm from '../components/settings/PlanSettingsForm';
import AccountPanel from '../features/auth/AccountPanel';
import OverviewPage from '../pages/OverviewPage';
import ExpensesPage from '../pages/ExpensesPage';
import CalendarPage from '../pages/CalendarPage';
import ForecastPage from '../pages/ForecastPage';
import ReservesPage from '../pages/ReservesPage';
import MethodModal from '../modals/MethodModal';
import AlertsModal from '../modals/AlertsModal';
import { DeleteExpenseModal, ImportPlanModal, NewPlanModal, ReloadPlanModal } from '../modals/ConfirmModals';

const SYNC_LABELS = { saved: 'Sincronizado con tu cuenta', saving: 'Guardando cambios…', pending: 'Cambios pendientes', conflict: 'Revisa el conflicto', error: 'Sin sincronizar', expired: 'Sesión caducada' };
const SYNC_PROBLEMS = ['error', 'conflict', 'expired'];

/** Espacio del usuario autenticado: estado del plan, navegación entre páginas y diálogos. */
export default function Dashboard({ initialPlan, user, authGeneration, onExpired, onLogout, onAuthChanged }) {
  const cloud = useCloudPlan(initialPlan, onExpired);
  const { data, setData } = cloud;
  const syncLabel = SYNC_LABELS[cloud.status];
  useEffect(() => { if (authGeneration > 0) cloud.resume(); }, [authGeneration]);

  const [legacy, setLegacy] = useState(readLegacyPlan);
  const [page, setPage] = useState('overview');
  const [offset, setOffset] = useState(0);
  const [modal, setModal] = useState(null);
  // Gasto en edición o plan pendiente de importar, según el diálogo abierto.
  const [editing, setEditing] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, notify] = useToast();
  const fileRef = useRef();
  const view = usePlanView(data, offset);
  const closeModal = () => setModal(null);

  const navigate = id => { setPage(id); setMobileOpen(false); };
  const updateData = updater => setData(previous => ({ ...updater(previous), demo: false }));
  const openExpense = (expense = null) => { setEditing(expense); setModal('expense'); };
  const saveExpense = expense => {
    updateData(d => ({ ...d, expenses: editing ? d.expenses.map(e => e.id === expense.id ? expense : e) : [...d.expenses, expense] }));
    closeModal();
    notify(editing ? 'Gasto actualizado. Previsión recalculada.' : 'Gasto añadido a tu previsión.');
  };
  const deleteExpense = () => {
    updateData(d => ({ ...d, expenses: d.expenses.filter(e => e.id !== editing.id) }));
    closeModal(); notify('Gasto eliminado de la previsión.');
  };
  const paidKey = e => `${view.month}:${e.id}`;
  const togglePaid = e => updateData(d => ({ ...d, paid: { ...d.paid, [paidKey(e)]: !d.paid[paidKey(e)] } }));
  const exportData = () => { downloadBackup(data); notify('Copia de seguridad descargada.'); };
  const importFile = async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try { setEditing(await readBackup(file)); setModal('import'); }
    catch { notify('El archivo no es una copia válida de Clara.'); }
  };
  const restorePlan = () => { setData(editing); setLegacy(null); setOffset(0); closeModal(); notify('Copia importada. Guardando en tu cuenta…'); };
  const startPlan = () => { setData(emptyPlan()); setOffset(0); closeModal(); navigate('settings'); notify('Tu espacio está listo. Empieza por tus ingresos.'); };
  const savePlanSettings = values => { updateData(d => ({ ...d, ...values })); setOffset(0); notify('Plan actualizado. Tus cuentas ya están recalculadas.'); };

  const pages = {
    overview: () => <OverviewPage data={data} view={view} onNavigate={navigate} onShowMethod={() => setModal('method')} onOpenExpense={openExpense} />,
    expenses: () => <ExpensesPage expenses={data.expenses} ahead={view.ahead} onOpenExpense={openExpense} />,
    calendar: () => <CalendarPage key={view.month} view={view} isPaid={e => Boolean(data.paid[paidKey(e)])} onTogglePaid={togglePaid} />,
    forecast: () => <ForecastPage view={view} />,
    reserves: () => <ReservesPage view={view} onOpenExpense={openExpense} />,
    settings: () => <>
      <AccountPanel user={user} onLogout={onLogout} onAuthChanged={onAuthChanged} flush={cloud.flush} hasPending={cloud.hasPending} />
      <PlanSettingsForm data={data} onSave={savePlanSettings} onExport={exportData} onImport={() => fileRef.current.click()} onReset={() => setModal('reset')} />
    </>,
  };

  return (
    <div className="app-shell">
      <Sidebar page={page} open={mobileOpen} expenseCount={data.expenses.length} userName={user.name} syncLabel={syncLabel} onNavigate={navigate} onShowMethod={() => setModal('method')} onClose={() => setMobileOpen(false)} />
      <div className="main-shell">
        <Topbar page={page} user={user} syncLabel={syncLabel} hasAlerts={view.alerts.length > 0} onOpenMenu={() => setMobileOpen(true)} onShowAlerts={() => setModal('alerts')} onOpenAccount={() => navigate('settings')} />
        <main>
          <PageHeading page={page} monthPicker={page !== 'settings' && <MonthPicker month={view.month} offset={offset} onChange={setOffset} />} onAddExpense={() => openExpense()} />
          {SYNC_PROBLEMS.includes(cloud.status) && <SyncNotice cloud={cloud} onExport={exportData} onReload={() => setModal('reload-cloud')} />}
          {legacy && <LegacyPlanBanner onImport={() => { setEditing(legacy); setModal('import'); }} onDismiss={() => setLegacy(null)} />}
          {data.demo && <DemoBanner onStart={() => setModal('start')} />}
          {pages[page]()}
          <MainFooter onShowMethod={() => setModal('method')} />
        </main>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />

      {modal === 'expense' && <ExpenseForm expense={editing} startMonth={view.month} onSave={saveExpense} onClose={closeModal} onDelete={e => { setEditing(e); setModal('delete'); }} />}
      {modal === 'delete' && <DeleteExpenseModal expense={editing} onBack={() => setModal('expense')} onConfirm={deleteExpense} onClose={closeModal} />}
      {modal === 'method' && <MethodModal current={view.current} startMonth={data.startMonth} onClose={closeModal} />}
      {modal === 'alerts' && <AlertsModal alerts={view.alerts} upcoming={view.upcoming} onClose={closeModal} />}
      {(modal === 'start' || modal === 'reset') && <NewPlanModal reset={modal === 'reset'} onExport={exportData} onConfirm={startPlan} onClose={closeModal} />}
      {modal === 'import' && <ImportPlanModal plan={editing} onConfirm={restorePlan} onClose={closeModal} />}
      {modal === 'reload-cloud' && <ReloadPlanModal onExport={exportData} onConfirm={async () => { await cloud.reload(); setOffset(0); closeModal(); }} onClose={closeModal} />}
      <Toast message={toast} onClose={() => notify('')} />
    </div>
  );
}
