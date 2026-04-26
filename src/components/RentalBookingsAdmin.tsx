import { useState, useEffect } from 'react';
import { Home, CheckCircle, XCircle, DollarSign, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RentalBooking {
  id: string;
  property_id: string;
  customer_name: string;
  customer_email: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  total_nights: number;
  total_price: number;
  deposit_status: string;
  deposit_payment_intent_id: string | null;
  deposit_captured_amount: number | null;
  deposit_capture_reason: string | null;
  deposit_released_at: string | null;
  status: string;
  payment_status: string;
  properties: {
    name: string;
  };
}

export function RentalBookingsAdmin() {
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [captureAmount, setCaptureAmount] = useState<string>('500');
  const [captureReason, setCaptureReason] = useState<string>('');
  const [showCaptureModal, setShowCaptureModal] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('rental_bookings')
        .select('*, properties(*)')
        .order('check_in_date', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching rental bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking? This cannot be undone.')) {
      return;
    }

    setActionLoading(bookingId);

    try {
      const { error } = await supabase
        .from('rental_bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;

      await fetchBookings();
      alert('Booking deleted');
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Failed to delete booking');
    } finally {
      setActionLoading(null);
    }
  };

  const releaseDeposit = async (bookingId: string, paymentIntentId: string) => {
    if (!confirm('Are you sure you want to release this deposit? The hold will be removed from the customer\'s card.')) {
      return;
    }

    setActionLoading(bookingId);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/release-deposit`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          paymentIntentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to release deposit');
      }

      await fetchBookings();
      alert('Deposit released successfully!');
    } catch (error) {
      console.error('Error releasing deposit:', error);
      alert('Failed to release deposit. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const captureDeposit = async (bookingId: string, paymentIntentId: string) => {
    if (!captureReason.trim()) {
      alert('Please provide a reason for capturing the deposit');
      return;
    }

    setActionLoading(bookingId);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-deposit`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          paymentIntentId,
          amountToCapture: parseFloat(captureAmount),
          reason: captureReason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to capture deposit');
      }

      await fetchBookings();
      setShowCaptureModal(null);
      setCaptureAmount('500');
      setCaptureReason('');
      alert('Deposit captured successfully!');
    } catch (error) {
      console.error('Error capturing deposit:', error);
      alert('Failed to capture deposit. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const getDepositStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">Pending</span>;
      case 'authorized':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">On Hold</span>;
      case 'released':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Released</span>;
      case 'captured':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">Captured</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        <p className="mt-4 text-gray-600">Loading rental bookings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Rentals</p>
              <p className="text-3xl font-bold text-gray-900">{bookings.length}</p>
            </div>
            <Home className="w-12 h-12 text-cyan-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Deposits On Hold</p>
              <p className="text-3xl font-bold text-yellow-600">
                {bookings.filter((b) => b.deposit_status === 'authorized').length}
              </p>
            </div>
            <AlertCircle className="w-12 h-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Released</p>
              <p className="text-3xl font-bold text-green-600">
                {bookings.filter((b) => b.deposit_status === 'released').length}
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Captured</p>
              <p className="text-3xl font-bold text-red-600">
                {bookings.filter((b) => b.deposit_status === 'captured').length}
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Rental Bookings & Deposits</h2>
        </div>

        {bookings.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Home className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No rental bookings yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deposit Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {booking.properties?.name || 'Property'}
                      </div>
                      <div className="text-sm text-gray-500">
                        ${Number(booking.total_price || 0).toFixed(2)} for {booking.total_nights} nights
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.customer_name}</div>
                      <div className="text-sm text-gray-500">{booking.customer_email}</div>
                      <div className="text-xs text-gray-400">{booking.guests} guests</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.check_in_date}</div>
                      <div className="text-sm text-gray-500">to {booking.check_out_date}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {getDepositStatusBadge(booking.deposit_status)}

                      {booking.deposit_captured_amount && (
                        <div className="text-xs text-red-600 mt-1">
                          ${booking.deposit_captured_amount.toFixed(2)} captured
                        </div>
                      )}

                      {booking.deposit_capture_reason && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs">
                          {booking.deposit_capture_reason}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-wrap gap-2">
                        {booking.deposit_status === 'authorized' && booking.deposit_payment_intent_id && (
                          <>
                            <button
                              onClick={() => releaseDeposit(booking.id, booking.deposit_payment_intent_id!)}
                              disabled={actionLoading === booking.id}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Release
                            </button>

                            <button
                              onClick={() => setShowCaptureModal(booking.id)}
                              disabled={actionLoading === booking.id}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              <XCircle className="w-4 h-4" />
                              Capture
                            </button>
                          </>
                        )}

                        {booking.deposit_status === 'released' && (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Released
                          </span>
                        )}

                        {booking.deposit_status === 'captured' && (
                          <span className="text-red-600 flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            Charged
                          </span>
                        )}

                        <button
                          onClick={() => deleteBooking(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="px-3 py-1 bg-gray-800 text-white rounded-lg hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCaptureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Capture Security Deposit</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Capture ($)
                </label>
                <input
                  type="number"
                  value={captureAmount}
                  onChange={(e) => setCaptureAmount(e.target.value)}
                  min="0"
                  max="500"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="500.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Capture (Required)
                </label>
                <textarea
                  value={captureReason}
                  onChange={(e) => setCaptureReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  rows={3}
                  placeholder="e.g., Damaged furniture, missing items, etc."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCaptureModal(null);
                    setCaptureAmount('500');
                    setCaptureReason('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    const booking = bookings.find((b) => b.id === showCaptureModal);
                    if (booking?.deposit_payment_intent_id) {
                      captureDeposit(booking.id, booking.deposit_payment_intent_id);
                    }
                  }}
                  disabled={!captureReason.trim() || actionLoading === showCaptureModal}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Capture ${captureAmount}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}