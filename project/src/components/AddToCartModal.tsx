import { useState, useEffect } from 'react';
import { X, Clock, Users, MessageSquare, Info, ShoppingCart, CheckCircle } from 'lucide-react';
import { Activity } from '../types';
import { useCart } from '../lib/cart-context';
import { AvailabilityCalendar } from './AvailabilityCalendar';

interface AddToCartModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddToCartModal({ activity, isOpen, onClose, onSuccess }: AddToCartModalProps) {
  const { addItem } = useCart();
  const [formData, setFormData] = useState({
    booking_date: '',
    booking_time: '09:00',
    num_people: 1,
    special_requests: '',
    operator_dob: '',
    phone_number: '',
  });
  const [rentalType, setRentalType] = useState<'single' | 'double'>('single');
  const [duration, setDuration] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [damageProtection, setDamageProtection] = useState<'insurance' | 'hold' | null>(null);

  useEffect(() => {
    if (isOpen && activity) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData(prev => ({
        ...prev,
        booking_date: tomorrow.toISOString().split('T')[0],
      }));
    }
  }, [isOpen, activity]);


  const calculatePrice = () => {
    if (!activity) return 0;
    const isJetSki = activity.name.toLowerCase().includes('jet ski');

    let basePrice = 0;
    if (isJetSki) {
      if (duration === 1) {
        basePrice = rentalType === 'double' ? 150 : 125;
      } else {
        basePrice = rentalType === 'double' ? 250 : 200;
      }
      if (damageProtection === 'insurance') {
        basePrice += 25;
      }
    } else {
      basePrice = activity.base_price;
    }

    return basePrice;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity) return;

    if (!formData.phone_number) {
      setError('Please provide a phone number');
      return;
    }

    const isJetSki = activity.name.toLowerCase().includes('jet ski');

    if (isJetSki && !damageProtection) {
      setError('Please select a damage protection option');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const totalPrice = calculatePrice();

      await addItem({
        activity,
        rentalType: isJetSki ? rentalType : undefined,
        duration: isJetSki ? duration : undefined,
        numPeople: isJetSki ? (rentalType === 'double' ? 2 : 1) : formData.num_people,
        bookingDate: formData.booking_date,
        bookingTime: formData.booking_time,
        specialRequests: formData.special_requests,
        price: totalPrice,
        phoneNumber: formData.phone_number,
        damageProtection: isJetSki ? (damageProtection || undefined) : undefined,
        damageProtectionAmount: isJetSki && damageProtection ? (damageProtection === 'insurance' ? 25 : 500) : undefined,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error adding to cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !activity) return null;

  const isJetSki = activity.name.toLowerCase().includes('jet ski');
  const totalPrice = calculatePrice();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">{activity.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-cyan-100">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {activity.duration_hours} hour{activity.duration_hours > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Up to {activity.capacity} people
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-gradient-to-br from-slate-50 to-cyan-50 rounded-xl p-6 border border-cyan-100">
            <div className="flex items-start gap-3 mb-4">
              <Info className="w-5 h-5 text-cyan-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">About This Experience</h3>
                <p className="text-gray-700 leading-relaxed">{activity.description}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isJetSki && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Florida law requires operators to be at least 14 years old. Operators born on or after January 1, 1988 must have a valid Boating Safety Education Card. You'll provide this documentation at checkout.
                </p>
              </div>
            )}

            {isJetSki ? (
              <>
                <div className="md:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <Users className="w-4 h-4 text-cyan-600" />
                      Rental Option
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setRentalType('single');
                          setFormData({ ...formData, num_people: 1 });
                        }}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                          rentalType === 'single'
                            ? 'border-cyan-500 bg-cyan-50'
                            : 'border-gray-300 hover:border-cyan-300'
                        }`}
                      >
                        <div className="font-semibold text-gray-900">1 Person</div>
                        <div className="text-sm text-gray-600 mt-1">Single rider on 1 jet ski</div>
                        <div className="text-cyan-700 font-bold mt-2">Starting at $125.00</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRentalType('double');
                          setFormData({ ...formData, num_people: 2 });
                        }}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                          rentalType === 'double'
                            ? 'border-cyan-500 bg-cyan-50'
                            : 'border-gray-300 hover:border-cyan-300'
                        }`}
                      >
                        <div className="font-semibold text-gray-900">2 People</div>
                        <div className="text-sm text-gray-600 mt-1">2 riders on same jet ski</div>
                        <div className="text-cyan-700 font-bold mt-2">Starting at $150.00</div>
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <Clock className="w-4 h-4 text-cyan-600" />
                      Duration (2 hours maximum)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2].map((hours) => {
                        let price;
                        if (hours === 1) {
                          price = rentalType === 'double' ? 150 : 125;
                        } else {
                          price = rentalType === 'double' ? 250 : 200;
                        }

                        return (
                          <button
                            key={hours}
                            type="button"
                            onClick={() => setDuration(hours)}
                            className={`p-4 border-2 rounded-lg transition-all text-center ${
                              duration === hours
                                ? 'border-cyan-500 bg-cyan-50'
                                : 'border-gray-300 hover:border-cyan-300'
                            }`}
                          >
                            <div className="font-semibold text-gray-900">{hours} {hours === 1 ? 'Hour' : 'Hours'}</div>
                            <div className="text-cyan-700 font-bold mt-1">${price}.00</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-6">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Info className="w-5 h-5 text-orange-600" />
                      Damage Protection (Required)
                    </h4>
                    <p className="text-sm text-gray-700 mb-4">
                      Choose your damage protection option. This protects both you and our equipment.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setDamageProtection('insurance')}
                        className={`p-5 border-2 rounded-xl transition-all text-left ${
                          damageProtection === 'insurance'
                            ? 'border-orange-500 bg-white shadow-lg'
                            : 'border-gray-300 hover:border-orange-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-bold text-gray-900 text-lg">Damage Insurance</div>
                          <div className="text-orange-700 font-bold text-xl">$25</div>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>• One-time fee added to rental</p>
                          <p>• Covers accidental damage</p>
                          <p>• No credit card hold</p>
                          <p>• Simple and convenient</p>
                        </div>
                        {damageProtection === 'insurance' && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-green-700 font-semibold">
                            <CheckCircle className="w-4 h-4" />
                            Selected
                          </div>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDamageProtection('hold')}
                        className={`p-5 border-2 rounded-xl transition-all text-left ${
                          damageProtection === 'hold'
                            ? 'border-orange-500 bg-white shadow-lg'
                            : 'border-gray-300 hover:border-orange-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-bold text-gray-900 text-lg">Security Deposit</div>
                          <div className="text-orange-700 font-bold text-xl">$500</div>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>• Temporary credit card hold</p>
                          <p>• Released after safe return</p>
                          <p>• No charge if no damage</p>
                          <p>• Full amount refunded</p>
                        </div>
                        {damageProtection === 'hold' && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-green-700 font-semibold">
                            <CheckCircle className="w-4 h-4" />
                            Selected
                          </div>
                        )}
                      </button>
                    </div>
                    {!damageProtection && (
                      <div className="mt-4 bg-orange-100 border border-orange-300 rounded-lg p-3">
                        <p className="text-sm text-orange-800 font-medium">
                          Please select a damage protection option to continue
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Users className="w-4 h-4 text-cyan-600" />
                    Number of People
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={activity.capacity}
                    value={formData.num_people}
                    onChange={(e) => setFormData({ ...formData, num_people: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum {activity.capacity} people</p>
                </div>
              )}

            <div>
              <AvailabilityCalendar
                activity={activity}
                selectedDate={formData.booking_date}
                selectedTime={formData.booking_time}
                onDateSelect={(date) => setFormData({ ...formData, booking_date: date })}
                onTimeSelect={(time) => setFormData({ ...formData, booking_time: time })}
                requestedPeople={isJetSki ? (rentalType === 'double' ? 2 : 1) : formData.num_people}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">Required for booking confirmation</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <MessageSquare className="w-4 h-4 text-cyan-600" />
                Special Requests (Optional)
              </label>
              <textarea
                value={formData.special_requests}
                onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-none"
                placeholder="Any special requirements or requests?"
              />
            </div>

            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 rounded-xl border border-cyan-200">
              {isJetSki && damageProtection ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-lg text-gray-700">
                    <span>Rental Price</span>
                    <span className="font-semibold">
                      ${(totalPrice - (damageProtection === 'insurance' ? 25 : 0)).toFixed(2)}
                    </span>
                  </div>
                  {damageProtection === 'insurance' && (
                    <div className="flex justify-between items-center text-lg text-green-700">
                      <span>Damage Insurance</span>
                      <span className="font-semibold">$25.00</span>
                    </div>
                  )}
                  {damageProtection === 'hold' && (
                    <div className="flex justify-between items-center text-sm text-orange-700">
                      <span>Security Deposit (Hold - Not Charged)</span>
                      <span className="font-semibold">$500.00</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-cyan-300 flex justify-between items-center text-xl font-bold text-cyan-700">
                    <span>Total Price</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center text-xl font-bold text-cyan-700">
                  <span>Price</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-5 h-5" />
                {loading ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
