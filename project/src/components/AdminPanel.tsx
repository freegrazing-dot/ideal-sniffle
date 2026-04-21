import { useState } from 'react';
import { RentalBookingsAdmin } from './RentalBookingsAdmin';
import { AdminCalendarView } from './AdminCalendarView';
import { PromoCodesAdmin } from './PromoCodesAdmin';
import { PromoBannerAdmin } from './PromoBannerAdmin';
import SiteSettings from './SiteSettings';
import { TaxReport } from './TaxReport';
import AdminMerchView from './AdminMerchView';

type Tab =
  | 'list'
  | 'calendar'
  | 'properties'
  | 'rentals'
  | 'taxes'
  | 'settings'
  | 'banners'
  | 'promo-codes'
  | 'merch';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('merch'); // change back to 'settings' later if you want

  const TabButton = ({
    id,
    label
  }: {
    id: Tab;
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        border: 'none',
        background: activeTab === id ? '#111827' : '#e5e7eb',
        color: activeTab === id ? '#fff' : '#111',
        cursor: 'pointer'
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="p-6">
      <h1>Admin Panel</h1>

      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginTop: 20
        }}
      >
        <TabButton id="list" label="List" />
        <TabButton id="calendar" label="Calendar" />
        <TabButton id="properties" label="Properties" />
        <TabButton id="rentals" label="Rentals" />
        <TabButton id="taxes" label="Tax Reports" />
        <TabButton id="settings" label="Settings" />
        <TabButton id="banners" label="Banners" />
        <TabButton id="promo-codes" label="Promo Codes" />
        <TabButton id="merch" label="Merch" />
      </div>

      <div style={{ marginTop: 30 }}>
        {activeTab === 'list' && <div>List tab placeholder</div>}
        {activeTab === 'calendar' && <AdminCalendarView />}
        {activeTab === 'properties' && <div>Properties tab placeholder</div>}
        {activeTab === 'rentals' && <RentalBookingsAdmin />}
        {activeTab === 'taxes' && <TaxReport />}
        {activeTab === 'settings' && <SiteSettings />}
        {activeTab === 'banners' && <PromoBannerAdmin />}
        {activeTab === 'promo-codes' && <PromoCodesAdmin />}
        {activeTab === 'merch' && <AdminMerchView />}
      </div>
    </div>
  );
}