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

    if (!phoneNumber) {
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
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{property.name}</h2>
            <p className="text-sm text-gray-600">{property.location}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close modal"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {property.description && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-2 text-lg font-semibold text-gray-900">About This Property</h3>
              <div className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                {property.description}
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-4 text-lg font-semibold">Select Your Dates</h3>
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
                <h3 className="mb-4 text-lg font-semibold">Booking Details</h3>

                {checkInDate && checkOutDate && (
                  <div className="mb-4 rounded-lg bg-blue-50 p-4">
                    <div className="mb-3 grid grid-cols-2 gap-4">
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
                      <div className="mt-3 space-y-2 border-t border-blue-200 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Number of nights:</span>
                          <span className="font-semibold text-gray-900">{totalNights}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Nightly total:</span>
                          <span className="font-semibold text-gray-900">
                            ${subtotal.toFixed(2)}
                          </span>
                        </div>
                        {cleaningFee > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">Cleaning fee:</span>
                            <span className="font-semibold text-gray-900">
                              ${cleaningFee.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                          <span className="text-gray-700">Rental subtotal:</span>
                          <span className="font-semibold text-gray-900">
                            ${totalPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                          <span className="font-medium text-yellow-700">Security deposit:</span>
                          <span className="font-semibold text-yellow-700">$500.00</span>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-lg font-semibold text-gray-900">Total:</span>
                          <span className="text-2xl font-bold text-blue-600">
                            ${grandTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      <Users className="mr-2 inline h-4 w-4" />
                      Number of Guests
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={property.max_guests}
                      value={guests}
                      onChange={(e) => setGuests(parseInt(e.target.value || '1', 10))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Maximum {property.max_guests} guests
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Required for booking confirmation
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Special Requests (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="Any special requests or requirements..."
                    />
                  </div>
                </div>
              </div>

              {priceBreakdown.length > 0 && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <h4 className="mb-3 font-semibold">Nightly Breakdown</h4>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
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

          <div className="rounded-lg border-2 border-yellow-400 bg-yellow-50 p-4">
            <h4 className="mb-2 text-lg font-bold text-yellow-900">
              $500 Refundable Security Deposit Required
            </h4>
            <p className="mb-3 text-sm text-yellow-800">
              A $500 security deposit is required for all vacation rental bookings. This deposit
              will be fully refunded within 7 days after checkout, provided there is no damage to
              the property.
            </p>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={depositAcknowledged}
                onChange={(e) => setDepositAcknowledged(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-900">
                I acknowledge and agree to the $500 refundable security deposit policy
              </span>
            </label>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={
              loading || !checkInDate || !checkOutDate || totalNights <= 0 || !depositAcknowledged
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-4 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            type="button"
          >
            <ShoppingCart className="h-5 w-5" />
            {loading ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}