import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, Download, Link as LinkIcon, RefreshCw, List, CalendarDays, Home, Mail, Image, Receipt, Settings, Megaphone, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Booking, Activity } from '../types';
import { AdminCalendarView } from './AdminCalendarView';
import { PropertyCalendarSync } from './PropertyCalendarSync';
import { RentalBookingsAdmin } from './RentalBookingsAdmin';
import { ImageUploadManager } from './ImageUploadManager';
import { TaxReport } from './TaxReport';
import { SiteSettings } from './SiteSettings';
import { PromoBannerAdmin } from './PromoBannerAdmin';
import { PromoCodesAdmin } from './PromoCodesAdmin';

export function AdminPanel() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<(Booking & { activities: Activity })[]>([]);
  const [loading, setLoading] = useState(true);
  const [icalUrl, setIcalUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'calendar' | 'properties' | 'rentals' | 'taxes' | 'settings' | 'banners' | 'promo-codes'>('settings');
  const [showImageUpload, setShowImageUpload] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, activities(*)')
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const syncAirbnbCalendar = async () => {
    if (!icalUrl) {
      setSyncMessage('Please enter an iCal URL');
      return;
    }

    setSyncing(true);
    setSyncMessage('');

    try {
      const response = await fetch(icalUrl);
      const icalData = await response.text();

      const events = parseICalendar(icalData);

      for (const event of events) {
        const { error } = await supabase
          .from('availability_exceptions')
          .insert({
            activity_id: null,
            exception_date: event.date,
            start_time: null,
            end_time: null,
            reason: 'airbnb_booking',
            notes: `Airbnb booking: ${event.summary}`,
          });

        if (error && !error.message.includes('duplicate')) {
          console.error('Error inserting availability exception:', error);
        }
      }

      setSyncMessage(`Successfully synced ${events.length} bookings from Airbnb`);
      setTimeout(() => setSyncMessage(''), 5000);
    } catch (error) {
      setSyncMessage('Error syncing calendar. Please check the URL and try again.');
      console.error('Error syncing Airbnb calendar:', error);
    } finally {
      setSyncing(false);
    }
  };

  const parseICalendar = (icalData: string) => {
    const events: { date: string; summary: string }[] = [];
    const lines = icalData.split('\n');
    let currentEvent: { date?: string; summary?: string } = {};

    for (const line of lines) {
      if (line.startsWith('DTSTART')) {
        const dateMatch = line.match(/DTSTART[^:]*:(\d{8})/);
        if (dateMatch) {
          const dateStr = dateMatch[1];
          currentEvent.date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
        }
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.replace('SUMMARY:', '').trim();
      } else if (line.startsWith('END:VEVENT') && currentEvent.date) {
        events.push({
          date: currentEvent.date,
          summary: currentEvent.summary || 'Airbnb Booking',
        });
        currentEvent = {};
      }
    }

    return events;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const exportBookings = () => {
    const csv = [
      ['Date', 'Time', 'Activity', 'Customer', 'Email', 'Phone', 'People', 'Price', 'Status'].join(','),
      ...bookings.map(b => [
        b.booking_date,
        b.booking_time,
        b.activities.name,
        b.customer_name,
        b.customer_email,
        b.customer_phone,
        b.num_people,
        b.total_price,
        b.status,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Manage bookings and sync with Airbnb</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImageUpload(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg"
              >
                <Image className="w-5 h-5" />
                Upload Images
              </button>
              <button
                onClick={() => navigate('/test-email')}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-all shadow-lg"
              >
                <Mail className="w-5 h-5" />
                Test Email
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'calendar'
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <CalendarDays className="w-5 h-5" />
              Calendar View
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'list'
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <List className="w-5 h-5" />
              List View
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'properties'
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Home className="w-5 h-5" />
              Property Calendars
            </button>
            <button
              onClick={() => setActiveTab('rentals')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'rentals'
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Home className="w-5 h-5" />
              Rental Bookings
            </button>
            <button
              onClick={() => setActiveTab('taxes')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'taxes'
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Receipt className="w-5 h-5" />
              Tax Reports
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Settings className="w-5 h-5" />
              Site Settings
            </button>
            <button
              onClick={() => setActiveTab('banners')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'banners'
                  ? 'bg-orange-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Megaphone className="w-5 h-5" />
              Promo Banners
            </button>
            <button
              onClick={() => setActiveTab('promo-codes')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'promo-codes'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Tag className="w-5 h-5" />
              Promo Codes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900">{bookings.length}</p>
              </div>
              <Calendar className="w-12 h-12 text-cyan-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Confirmed</p>
                <p className="text-3xl font-bold text-green-600">
                  {bookings.filter(b => b.status === 'confirmed').length}
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {bookings.filter(b => b.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-12 h-12 text-yellow-600" />
            </div>
          </div>
        </div>

        {activeTab === 'calendar' ? (
          <AdminCalendarView />
        ) : activeTab === 'properties' ? (
          <PropertyCalendarSync />
        ) : activeTab === 'rentals' ? (
          <RentalBookingsAdmin />
        ) : activeTab === 'taxes' ? (
          <TaxReport />
        ) : activeTab === 'settings' ? (
          <SiteSettings />
        ) : activeTab === 'banners' ? (
          <PromoBannerAdmin />
        ) : activeTab === 'promo-codes' ? (
          <PromoCodesAdmin />
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <LinkIcon className="w-6 h-6 text-cyan-600" />
            Airbnb Calendar Sync
          </h2>
          <p className="text-gray-600 mb-4">
            Enter your Airbnb iCal URL to automatically block dates when you have Airbnb bookings.
            This prevents double bookings across platforms.
          </p>
          <div className="flex gap-3">
            <input
              type="url"
              value={icalUrl}
              onChange={(e) => setIcalUrl(e.target.value)}
              placeholder="https://www.airbnb.com/calendar/ical/..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
            <button
              onClick={syncAirbnbCalendar}
              disabled={syncing}
              className="px-6 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
          {syncMessage && (
            <p className={`mt-3 text-sm ${syncMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {syncMessage}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-3">
            To get your iCal URL: Go to Airbnb → Calendar → Availability Settings → Export Calendar
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Recent Bookings</h2>
            <button
              onClick={exportBookings}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
              <p className="mt-4 text-gray-600">Loading bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No bookings yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      People
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{booking.booking_date}</div>
                        <div className="text-sm text-gray-500">{booking.booking_time}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{booking.activities.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{booking.customer_name}</div>
                        <div className="text-sm text-gray-500">{booking.customer_email}</div>
                        <div className="text-sm text-gray-500">{booking.customer_phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.num_people}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${booking.total_price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(booking.status || 'pending')}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <select
                          value={booking.status}
                          onChange={(e) => updateBookingStatus(booking.id!, e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {showImageUpload && (
        <ImageUploadManager onClose={() => setShowImageUpload(false)} />
      )}
    </div>
  );
}
