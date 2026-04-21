import { useState, useEffect } from 'react';
import { X, Users, ShoppingCart } from 'lucide-react';
import type { Property } from '../types';
import { useCart } from '../lib/cart-context';
import PropertyCalendar from './PropertyCalendar';
import { calculateRentalPrice, checkAvailability } from '../lib/pricing';

interface AddPropertyToCartModalProps {
  property: Property | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPropertyToCartModal({
  property,
  onClose,
  onSuccess,
}: AddPropertyToCartModalProps) {
  const { addPropertyItem } = useCart();

  const [checkInDate, setCheckInDate] = useState<string | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<string | null>(null);
  const [guests, setGuests] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [priceBreakdown, setPriceBreakdown] = useState<{ date: string; price: number }[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [cleaningFee, setCleaningFee] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [depositAcknowledged, setDepositAcknowledged] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);

  useEffect(() => {
    if (property) {
      setCheckInDate(null);
      setCheckOutDate(null);
      setGuests(1);
      setPhoneNumber('');
      setSpecialRequests('');
      setError('');
      setDepositAcknowledged(false);
      setPriceBreakdown([]);
      setTotalPrice(0);
      setCleaningFee(0);
      setSubtotal(0);
      setCalendarKey((prev) => prev + 1);
    }
  }, [property]);

  useEffect(() => {
    if (checkInDate && checkOutDate && property) {
      void calculatePrice();
    }
  }, [checkInDate, checkOutDate, property]);

  if (!property) return null;

  const calculatePrice = async () => {
    if (!checkInDate || !checkOutDate || !property) return;

    try {
      const {
        totalPrice: calculatedPrice,
        nightlyBreakdown,
        cleaningFee: cleaningFeeAmount,
        subtotal: subtotalAmount,
      } = await calculateRentalPrice(property, checkInDate, checkOutDate);

      setTotalPrice(calculatedPrice);
      setPriceBreakdown(nightlyBreakdown);
      setCleaningFee(cleaningFeeAmount);
      setSubtotal(subtotalAmount);
    } catch (err) {
      console.error('Error calculating price:', err);
      setError('Unable to calculate rental price for those dates');
    }
  };

  const handleDateSelect = (checkIn: string, checkOut: string) => {
    setCheckInDate(checkIn);
    setCheckOutDate(checkOut);
    setError('');
  };

  const totalNights = priceBreakdown.length;
  const securityDeposit = 500;
  const grandTotal = totalPrice + securityDeposit;

  const handleAddToCart = async () => {
    if (!checkInDate || !checkOutDate) {
      setError('Please select check-in and check-out dates');
      return;
    }

    if (guests > property.max_guests) {
      setError(`This property can accommodate a maximum of ${property.max_guests} guests`);
      return;
    }

    if (!depositAcknowledged) {
      setError('Please acknowledge the security deposit policy');
      return;
    }

    if (!phoneNumber.trim()) {
      setError('Please provide a phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const available = await checkAvailability(property.id, checkInDate, checkOutDate);

      if (!available) {
        setError('This property is not available for the selected dates');
        setLoading(false);
        return;
      }

      await addPropertyItem({
        property,
        checkInDate,
        checkOutDate,
        guests,
        specialRequests,
        price: totalPrice,
        phoneNumber,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error adding to cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{property.name}</h2>
            <p className="text-sm text-gray-600">{property.location}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {property.description && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">About This Property</h3>
              <div className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">
                {property.description}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Your Dates</h3>
              <PropertyCalendar
                key={`${property.id}-${calendarKey}`}
                property={property}
                checkInDate={checkInDate}
                checkOutDate={checkOutDate}
                onDateSelect={handleDateSelect}
              />
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Booking Details</h3>

                {checkInDate && checkOutDate && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Check-in</p>
                        <p className="font-semibold">
                          {new Date(`${checkInDate}T00:00:00`).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Check-out</p>
                        <p className="font-semibold">
                          {new Date(`${checkOutDate}T00:00:00`).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    {priceBreakdown.length > 0 && (
                      <div className="border-t border-blue-200 pt-3 mt-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Number of nights:</span>
                          <span className="font-semibold text-gray-900">{totalNights}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Nightly total:</span>
                          <span className="font-semibold text-gray-900">
                            ${subtotal.toFixed(2)}
                          </span>
                        </div>

                        {cleaningFee > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">Cleaning fee:</span>
                            <span className="font-semibold text-gray-900">
                              ${cleaningFee.toFixed(2)}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pb-2 border-b border-blue-200">
                          <span className="text-gray-700">Rental subtotal:</span>
                          <span className="font-semibold text-gray-900">
                            ${totalPrice.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pb-2 border-b border-blue-200">
                          <span className="text-yellow-700 font-medium">Security deposit:</span>
                          <span className="font-semibold text-yellow-700">$500.00</span>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                          <span className="text-lg font-semibold text-gray-900">Estimated Total:</span>
                          <span className="text-2xl font-bold text-blue-600">
                            ${grandTotal.toFixed(2)}
                          </span>
                        </div>

                        <p className="text-xs text-gray-600 pt-2">
                          Promo codes are applied at checkout.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="w-4 h-4 inline mr-2" />
                      Number of Guests
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={property.max_guests}
                      value={guests}
                      onChange={(e) => setGuests(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Maximum {property.max_guests} guests
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Required for booking confirmation
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Requests (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Any special requests or requirements..."
                    />
                  </div>
                </div>
              </div>

              {priceBreakdown.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">Nightly Breakdown</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {priceBreakdown.map((night, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {new Date(`${night.date}T00:00:00`).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span
                          className={
                            night.price !== property.price_per_night
                              ? 'font-semibold text-green-600'
                              : 'text-gray-900'
                          }
                        >
                          ${night.price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-lg">
            <h4 className="font-bold text-yellow-900 text-lg mb-2">
              $500 Refundable Security Deposit Required
            </h4>
            <p className="text-yellow-800 text-sm mb-3">
              A $500 security deposit is required for all vacation rental bookings. This deposit
              will be fully refunded within 7 days after checkout, provided there is no damage to
              the property.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={depositAcknowledged}
                onChange={(e) => setDepositAcknowledged(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-900">
                I acknowledge and agree to the $500 refundable security deposit policy
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={
              loading ||
              !checkInDate ||
              !checkOutDate ||
              totalNights <= 0 ||
              !depositAcknowledged
            }
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            {loading ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}