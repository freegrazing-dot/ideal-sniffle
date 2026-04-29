import { useState, useEffect } from 'react';
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
    if (property) {
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
    }
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
  const cleaningFee = property.cleaning_fee || 190;
  const roomTotal = totalNights * property.price_per_night;
  const rentalSubtotal = roomTotal + cleaningFee;
  const taxes = calculateRentalTaxes(rentalSubtotal);
  const securityDeposit = 500;

  // Deposit is shown as a hold, not charged in Stripe total.
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
        .select('id, start_date, end_date')
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
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 font-bold text-lg">
                $
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-yellow-900 text-lg mb-1">
                  $500 Refundable Security Deposit Required
                </h3>
                <p className="text-yellow-800 text-sm leading-relaxed">
                  A $500 security deposit hold may be required for vacation rental bookings.
                  This is separate from the rental payment and is refundable after checkout,
                  provided there is no damage to the property.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700">Price per night:</span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(property.price_per_night)}
              </span>
            </div>

            {totalNights > 0 && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Number of nights:</span>
                  <span className="font-semibold text-gray-900">{totalNights}</span>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Room total:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(roomTotal)}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Cleaning fee:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(cleaningFee)}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-medium">Subtotal:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(rentalSubtotal)}
                  </span>
                </div>

                <div className="mb-2 pb-2 border-b border-blue-200"></div>

                <div className="flex justify-between items-center mb-1 text-sm">
                  <span className="text-gray-600">Sales tax:</span>
                  <span className="text-gray-900">{formatCurrency(taxes.salesTax)}</span>
                </div>

                <div className="flex justify-between items-center mb-2 pb-2 border-b border-blue-200 text-sm">
                  <span className="text-gray-600">Lodging tax:</span>
                  <span className="text-gray-900">{formatCurrency(taxes.lodgingTax)}</span>
                </div>

                <div className="flex justify-between items-center mb-2 pb-2 border-b border-blue-200">
                  <span className="text-gray-700 font-medium">Total due now:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(checkoutTotal)}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-2 pb-2 border-b border-blue-200">
                  <span className="text-yellow-700 font-medium">
                    Security deposit hold:
                  </span>
                  <span className="font-semibold text-yellow-700">
                    {formatCurrency(securityDeposit)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-semibold text-gray-900">Checkout total:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(checkoutTotal)}
                  </span>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Number of Guests
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">Maximum {property.max_guests} guests</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone
              </label>
              <input
                type="tel"
                value={formData.customer_phone}
                onChange={(e) =>
                  setFormData({ ...formData, customer_phone: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Requests
            </label>
            <textarea
              rows={3}
              value={formData.special_requests}
              onChange={(e) =>
                setFormData({ ...formData, special_requests: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any special requests or requirements..."
            />
          </div>

          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800">Important Information:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check-in time is 4:00 PM, check-out time is 11:00 AM</li>
              <li>No smoking allowed inside the property</li>
              <li>Quiet hours are from 10:00 PM to 8:00 AM</li>
              <li>Parties and events require prior approval</li>
              <li>All guests must be registered prior to arrival</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading || totalNights <= 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding to Cart...' : `Add Rental to Cart - ${formatCurrency(checkoutTotal)}`}
          </button>
        </form>
      </div>
    </div>
  );
}