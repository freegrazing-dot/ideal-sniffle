import ActivitiesAdmin from './ActivitiesAdmin';
import { useState } from 'react';
import PropertiesAdmin from './PropertiesAdmin';
import { RentalBookingsAdmin } from './RentalBookingsAdmin';
import { AdminCalendarView } from './AdminCalendarView';
import { PromoCodesAdmin } from './PromoCodesAdmin';
import { PromoBannerAdmin } from './PromoBannerAdmin';
import SiteSettings from './SiteSettings';
import { TaxReport } from './TaxReport';
import AdminMerchView from './AdminMerchView';

type Tab =
  | 'properties'
  | 'bookings'
  | 'calendar'
  | 'activities'
  | 'promo'
  | 'banners'
  | 'settings'
  | 'tax'
  | 'merch';
export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('bookings');

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
  <TabButton id="banners" label="Banners" />
  <TabButton id="settings" label="Settings" />
  <TabButton id="tax" label="Tax Report" />
  <TabButton id="merch" label="Merch" />
      </div>

      <div>
        {activeTab === 'properties' && <PropertiesAdmin />}
        {activeTab === 'bookings' && <RentalBookingsAdmin />}
        {activeTab === 'calendar' && <AdminCalendarView />}
        {activeTab === 'promo' && <PromoCodesAdmin />}
        {activeTab === 'banners' && <PromoBannerAdmin />}
        {activeTab === 'settings' && <SiteSettings />}
        {activeTab === 'tax' && <TaxReport />}
        {activeTab === 'merch' && <AdminMerchView />}
        {activeTab === 'activities' && <ActivitiesAdmin />}
      </div>
    </div>
  );
}