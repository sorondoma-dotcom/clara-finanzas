import React from 'react';
import { ArrowRight, Download, Leaf } from 'lucide-react';
import Modal from '../components/ui/Modal';

export function DeleteExpenseModal({ expense, onBack, onConfirm, onClose }) {
  return (
    <Modal title={`¿Eliminar ${expense.name}?`} subtitle="Se quitará de todos los meses de tu previsión. Puedes volver a añadirlo cuando quieras." onClose={onClose}>
      <div className="modal-actions">
        <button className="button secondary" onClick={onBack}>Volver</button>
        <button className="button danger" onClick={onConfirm}>Eliminar gasto</button>
      </div>
    </Modal>
  );
}

export function NewPlanModal({ reset, onExport, onConfirm, onClose }) {
  return (
    <Modal title={reset ? 'Empezar con una hoja en blanco.' : 'Tu plan empieza aquí.'} subtitle="Se quitarán los gastos de ejemplo o los que tengas guardados. Después podrás configurar tus ingresos y añadir tus gastos." onClose={onClose}>
      <div className="onboarding-note"><Leaf size={24} /><p>Necesitas tres cosas: tus ingresos mensuales, tus gastos recurrentes y lo que quieres proteger cada mes.</p></div>
      <div className="modal-actions">
        <button className="button secondary" onClick={onExport}><Download size={16} /> Guardar copia</button>
        <button className="button primary" onClick={onConfirm}>Crear mi plan <ArrowRight size={16} /></button>
      </div>
    </Modal>
  );
}

export function ImportPlanModal({ plan, onConfirm, onClose }) {
  return (
    <Modal title="Restaurar tu copia" subtitle={`La copia contiene ${plan.expenses.length} gastos y sustituirá el plan guardado en tu cuenta.`} onClose={onClose}>
      <div className="modal-actions">
        <button className="button secondary" onClick={onClose}>Cancelar</button>
        <button className="button primary" onClick={onConfirm}>Restaurar copia</button>
      </div>
    </Modal>
  );
}

export function ReloadPlanModal({ onExport, onConfirm, onClose }) {
  return (
    <Modal title="Cargar el plan de tu cuenta" subtitle="Se sustituirán los cambios de esta página por la última versión guardada. Descarga primero una copia si quieres conservarlos." onClose={onClose}>
      <div className="modal-actions">
        <button className="button secondary" onClick={onExport}>Descargar mis cambios</button>
        <button className="button primary" onClick={onConfirm}>Cargar versión guardada</button>
      </div>
    </Modal>
  );
}
