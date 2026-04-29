import { useEffect, useState } from 'react';
import { X, Calendar, Users, Phone, Mail, User } from 'lucide-react';
import type { Property } from '../types';
import { supabase } from '../lib/supabase';
import { calculateRentalTaxes, formatCurrency } from '../lib/tax-calculations';
import { useCart } from '../lib/cart-context';

interface PropertyBookingModalProps {
  property: Property | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PropertyBookingModal({
  property,
  onClose,
  onSuccess,
}: PropertyBookingModalProps) {
  const { addPropertyItem } = useCart();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    check_in_date: '',
    check_out_date: '',
    guests: 1,
    special_requests: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!property) return;

    const today = new Date();
    today.setDate(today.getDate() + 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      check_in_date: today.toISOString().split('T')[0],
      check_out_date: tomorrow.toISOString().split('T')[0],
      guests: 1,
      special_requests: '',
    });

    setError('');
  }, [property]);

  if (!property) return null;

  const calculateNights = () => {
    if (!formData.check_in_date || !formData.check_out_date) return 0;

    const checkIn = new Date(formData.check_in_date);
    const checkOut = new Date(formData.check_out_date);

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    return nights > 0 ? nights : 0;
  };

  const totalNights = calculateNights();
  const nightlyRate = Number(property.price_per_night || 0);
  const cleaningFee = Number(property.cleaning_fee ?? 190);
  const roomTotal = totalNights * nightlyRate;
  const rentalSubtotal = roomTotal + cleaningFee;
  const taxes = calculateRentalTaxes(rentalSubtotal);
  const securityDeposit = 500;
  const checkoutTotal = taxes.grandTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (totalNights <= 0) {
      setError('Check-out date must be after check-in date');
      setLoading(false);
      return;
    }

    if (formData.guests > property.max_guests) {
      setError(`This property can accommodate a maximum of ${property.max_guests} guests`);
      setLoading(false);
      return;
    }

    try {
      const { data: existingBookings, error: checkError } = await supabase
        .from('rental_bookings')
        .select('id')
        .eq('property_id', property.id)
        .in('status', ['confirmed'])
        .or(
          `and(check_in_date.lt.${formData.check_out_date},check_out_date.gt.${formData.check_in_date})`
        );

      if (checkError) throw checkError;

      if (existingBookings && existingBookings.length > 0) {
        setError('This property is not available for the selected dates');
        setLoading(false);
        return;
      }

      const { data: externalEvents, error: externalError } = await supabase
        .from('external_calendar_events')
        .select('id')
        .eq('property_id', property.id)
        .or(
          `and(start_date.lt.${formData.check_out_date},end_date.gt.${formData.check_in_date})`
        );

      if (externalError) throw externalError;

      if (externalEvents && externalEvents.length > 0) {
        setError('This property is not available for the selected dates');
        setLoading(false);
        return;
      }

      await addPropertyItem({
        property,
        checkInDate: formData.check_in_date,
        checkOutDate: formData.check_out_date,
        guests: formData.guests,
        specialRequests: formData.special_requests,
        phoneNumber: formData.customer_phone,
        price: rentalSubtotal,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Rental add-to-cart error:', err);
      setError(err instanceof Error ? err.message : 'Failed to add rental to cart');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Book {property.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-lg mb-4">
            <h3 className="font-bold text-yellow-900 text-lg mb-1">
              $500 Refundable Security Deposit Required
            </h3>
            <p className="text-yellow-800 text-sm">
              The security deposit is a hold and is not included in the Stripe charge total.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span>Price per night:</span>
              <strong>{formatCurrency(nightlyRate)}</strong>
            </div>

            <div className="flex justify-between mb-2">
              <span>Number of nights:</span>
              <strong>{totalNights}</strong>
            </div>

            <div className="flex justify-between mb-2">
              <span>Room total:</span>
              <strong>{formatCurrency(roomTotal)}</strong>
            </div>

            <div className="flex justify-between mb-2">
              <span>Cleaning fee:</span>
              <strong>{formatCurrency(cleaningFee)}</strong>
            </div>

            <div className="flex justify-between mb-2 border-t pt-2">
              <span>Subtotal:</span>
              <strong>{formatCurrency(rentalSubtotal)}</strong>
            </div>

            <div className="flex justify-between text-sm mb-1">
              <span>Sales tax:</span>
              <span>{formatCurrency(taxes.salesTax)}</span>
            </div>

            <div className="flex justify-between text-sm mb-2">
              <span>Lodging tax:</span>
              <span>{formatCurrency(taxes.lodgingTax)}</span>
            </div>

            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Total due now:</span>
              <strong className="text-blue-600">{formatCurrency(checkoutTotal)}</strong>
            </div>

            <div className="flex justify-between text-yellow-700 mt-2">
              <span>Security deposit hold:</span>
              <strong>{formatCurrency(securityDeposit)}</strong>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Check-in Date
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={formData.check_in_date}
                onChange={(e) =>
                  setFormData({ ...formData, check_in_date: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Check-out Date
              </label>
              <input
                type="date"
                required
                min={formData.check_in_date}
                value={formData.check_out_date}
                onChange={(e) =>
                  setFormData({ ...formData, check_out_date: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Guests
            </label>
            <input
              type="number"
              required
              min="1"
              max={property.max_guests}
              value={formData.guests}
              onChange={(e) =>
                setFormData({ ...formData, guests: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.customer_name}
              onChange={(e) =>
                setFormData({ ...formData, customer_name: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                required
                value={formData.customer_email}
                onChange={(e) =>
                  setFormData({ ...formData, customer_email: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone
              </label>
              <input
                type="tel"
                value={formData.customer_phone}
                onChange={(e) =>
                  setFormData({ ...formData, customer_phone: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Special Requests</label>
            <textarea
              rows={3}
              value={formData.special_requests}
              onChange={(e) =>
                setFormData({ ...formData, special_requests: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading || totalNights <= 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Adding to Cart...' : `Add Rental to Cart - ${formatCurrency(checkoutTotal)}`}
          </button>
        </form>
      </div>
    </div>
  );
}