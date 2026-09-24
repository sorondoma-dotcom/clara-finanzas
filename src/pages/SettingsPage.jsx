import React from 'react';
import SettingsTabs, { panelId, tabId } from '../components/settings/SettingsTabs';
import EconomicSettings from '../components/settings/EconomicSettings';
import DataSettings from '../components/settings/DataSettings';
import AccountSettings from '../features/auth/AccountSettings';
import SecuritySettings from '../features/auth/SecuritySettings';

/** Configuración dividida en apartados, con un menú superior de pestañas. */
export default function SettingsPage({ section, onSectionChange, data, view, user, syncLabel, cloud, onLogout, onAuthChanged, onSavePlan, onExport, onImport, onReset }) {
  const session = { flush: cloud.flush, hasPending: cloud.hasPending, onLogout };
  const sections = {
    economic: () => <EconomicSettings data={data} current={view.current} onSave={onSavePlan} />,
    account: () => <AccountSettings user={user} syncLabel={syncLabel} {...session} onGoToSecurity={() => onSectionChange('security')} />,
    security: () => <SecuritySettings {...session} onAuthChanged={onAuthChanged} />,
    data: () => <DataSettings expenseCount={data.expenses.length} syncLabel={syncLabel} onExport={onExport} onImport={onImport} onReset={onReset} />,
  };
  return (
    <div className="settings-page">
      <SettingsTabs active={section} onChange={onSectionChange} />
      <div key={section} id={panelId(section)} role="tabpanel" aria-labelledby={tabId(section)} className="settings-panel-body page-enter">
        {sections[section]()}
      </div>
    </div>
  );
}
