import MerchandiseAdmin from './MerchandiseAdmin';
import { useState } from 'react';

import PropertiesAdmin from './PropertiesAdmin';
import ActivitiesAdmin from './ActivitiesAdmin';
import { RentalBookingsAdmin } from './RentalBookingsAdmin';
import { AdminCalendarView } from './AdminCalendarView';
import { PromoCodesAdmin } from './PromoCodesAdmin';
import { SiteSettings } from './SiteSettings';
import { TaxReport } from './TaxReport';

type Tab =
  | 'properties'
  | 'activities'
  | 'bookings'
  | 'calendar'
  | 'promo'
  | 'settings'
  | 'tax'
  | 'merch';
  | 'calendar-sync'

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('properties');

  const TabButton = ({
    id,
    label,
  }: {
    id: Tab;
    label: string;
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      type="button"
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        background: activeTab === id ? '#111827' : '#e5e7eb',
        color: activeTab === id ? '#fff' : '#111827',
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="p-6">
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <TabButton id="properties" label="Properties" />
        <TabButton id="activities" label="Activities" />
        <TabButton id="bookings" label="Bookings" />
        <TabButton id="calendar" label="Calendar" />
        <TabButton id="promo" label="Promo Codes" />
        <TabButton id="settings" label="Settings" />
        <TabButton id="tax" label="Tax Report" />
        <TabButton id="merch" label="Merch" />
        <TabButton id="calendar-sync" label="Calendar Sync" />
      </div>

      <div>
        {activeTab === 'properties' && <PropertiesAdmin />}
        {activeTab === 'activities' && <ActivitiesAdmin />}
        {activeTab === 'bookings' && <RentalBookingsAdmin />}
        {activeTab === 'calendar' && <AdminCalendarView />}
        {activeTab === 'promo' && <PromoCodesAdmin />}
        {activeTab === 'settings' && <SiteSettings />}
        {activeTab === 'tax' && <TaxReport />}
        {activeTab === 'merch' && <MerchandiseAdmin />}
        {activeTab === 'calendar-sync' && <PropertyCalendarSync />}
      </div>
    </div>
  );
}