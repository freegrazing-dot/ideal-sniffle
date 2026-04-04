import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, Mail, Phone, User, MessageSquare, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { Activity, Booking } from '../types';
import { supabase } from '../lib/supabase';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { checkAvailability } from '../lib/availability';
import { calculateJetSkiTaxes, formatCurrency } from '../lib/tax-calculations';

interface BookingModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingModal({ activity, isOpen, onClose, onSuccess: _onSuccess }: BookingModalProps) {
  const isSunsetActivity = activity?.name.toLowerCase().includes('sunset') || false;

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    booking_date: '',
    booking_time: '09:00',
    num_people: 1,
    special_requests: '',
    operator_dob: '',
  });
  const [rentalType, setRentalType] = useState<'single' | 'double'>('single');
  const [duration, setDuration] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [showCalendar, setShowCalendar] = useState(true);
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [boatingSafetyCardFile, setBoatingSafetyCardFile] = useState<File | null>(null);
  const [uploadingCard, setUploadingCard] = useState(false);
  const [boatingCompliance, setBoatingCompliance] = useState({
    has_boater_card: '',
    certification_agreed: false,
  });
  const [acknowledgments, setAcknowledgments] = useState({
    operator_age: false,
    passenger_age: false,
    backwater_only: false,
    life_jackets: false,
  });
  const [damageProtection, setDamageProtection] = useState<'insurance' | 'hold' | null>(null);

  useEffect(() => {
    if (isOpen && activity) {
      generateAvailableTimes();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        booking_date: tomorrow.toISOString().split('T')[0],
        booking_time: '09:00',
        num_people: 1,
        special_requests: '',
        operator_dob: '',
      });
      setRentalType('single');
      setDuration(1);
      setDamageProtection(null);
      setBoatingSafetyCardFile(null);
      setBoatingCompliance({
        has_boater_card: '',
        certification_agreed: false,
      });
      setAcknowledgments({
        operator_age: false,
        passenger_age: false,
        backwater_only: false,
        life_jackets: false,
      });
      setShowCalendar(true);
      setError('');


      // Clean up URL parameters
      if (window.location.search) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }

      setAvailabilityMessage('');
    }
  }, [isOpen, activity]);

  useEffect(() => {
    if (formData.booking_date && formData.booking_time && activity) {
      checkSlotAvailability();
    }
  }, [formData.booking_date, formData.booking_time, formData.num_people, rentalType, activity]);

  const generateAvailableTimes = () => {
    const times: string[] = [];
    for (let hour = 9; hour <= 17; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 17) {
        times.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    setAvailableTimes(times);
  };

  const checkSlotAvailability = async () => {
    if (!activity) return;

    const numPeople = rentalType === 'double' ? 2 : formData.num_people;
    const result = await checkAvailability(
      activity.id,
      formData.booking_date,
      formData.booking_time,
      numPeople
    );

    setAvailabilityMessage(result.message);
  };

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
      basePrice = activity.base_price * formData.num_people;
    }

    return basePrice;
  };

  const calculateOperatorAge = (dob: string): number => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity) return;

    setLoading(true);
    setError('');

    try {
      const isJetSki = activity.name.toLowerCase().includes('jet ski');

      if (isJetSki) {
        if (!formData.operator_dob) {
          throw new Error('Operator date of birth is required');
        }

        const operatorAge = calculateOperatorAge(formData.operator_dob);
        if (operatorAge < 14) {
          throw new Error('Operator must be at least 14 years old to operate a jet ski.');
        }

        if (!damageProtection) {
          throw new Error('Please select a damage protection option');
        }

        const bornAfter1988 = new Date(formData.operator_dob) >= new Date('1988-01-01');

        if (bornAfter1988) {
          if (!boatingCompliance.has_boater_card) {
            throw new Error('Please indicate if you have a Boating Safety Education Card');
          }

          if (boatingCompliance.has_boater_card === 'no') {
            throw new Error('Florida law requires a Boating Safety Education Card for operators born on or after January 1, 1988. You must obtain this card before renting.');
          }

          if (!boatingSafetyCardFile) {
            throw new Error('Please upload your Boating Safety Education Card');
          }
        }

        if (!boatingCompliance.certification_agreed) {
          throw new Error('You must certify that the information provided is true and accurate');
        }

        if (!acknowledgments.operator_age || !acknowledgments.passenger_age ||
            !acknowledgments.backwater_only || !acknowledgments.life_jackets) {
          throw new Error('Please confirm all required acknowledgments');
        }
      }

      const numPeople = rentalType === 'double' ? 2 : formData.num_people;
      const availabilityCheck = await checkAvailability(
        activity.id,
        formData.booking_date,
        formData.booking_time,
        numPeople
      );

      if (!availabilityCheck.available) {
        throw new Error(availabilityCheck.message);
      }

      let boatingSafetyCardUrl = null;
      if (isJetSki && boatingSafetyCardFile) {
        setUploadingCard(true);
        const fileExt = boatingSafetyCardFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('boating-cards')
          .upload(fileName, boatingSafetyCardFile);

        if (uploadError) throw new Error('Failed to upload boating safety card');

        const { data: { publicUrl } } = supabase.storage
          .from('boating-cards')
          .getPublicUrl(uploadData.path);

        boatingSafetyCardUrl = publicUrl;
        setUploadingCard(false);
      }

      const basePrice = calculatePrice();
      const taxes = isJetSki ? calculateJetSkiTaxes(basePrice) : { subtotal: basePrice, salesTax: 0, surtax: 0, taxTotal: 0, grandTotal: basePrice, lodgingTax: 0 };

      const booking: Booking = {
        activity_id: activity.id,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        booking_date: formData.booking_date,
        booking_time: formData.booking_time,
        num_people: numPeople,
        total_price: taxes.grandTotal,
        subtotal: taxes.subtotal,
        sales_tax: taxes.salesTax,
        surtax: taxes.surtax,
        tax_total: taxes.taxTotal,
        special_requests: formData.special_requests,
        status: 'pending',
        payment_status: 'pending',
        source: 'website',
        operator_dob: isJetSki ? formData.operator_dob : undefined,
        boating_safety_card_url: boatingSafetyCardUrl || undefined,
        acknowledgments: isJetSki ? acknowledgments : undefined,
        damage_protection_type: isJetSki ? (damageProtection || undefined) : undefined,
        damage_protection_amount: isJetSki && damageProtection ? (damageProtection === 'insurance' ? 25 : 500) : undefined,
      };

      const { data: bookingData, error: insertError } = await supabase
        .from('bookings')
        .insert(booking)
        .select()
        .single();

      if (insertError) throw insertError;

      const checkoutUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-checkout`;
      const response = await fetch(checkoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          booking_id: bookingData.id,
          activity_name: activity.name,
          amount: taxes.grandTotal,
          success_url: `${window.location.origin}/success?booking_id=${bookingData.id}`,
          cancel_url: window.location.origin,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
      setLoading(false);
    }
  };

  if (!isOpen || !activity) return null;

  const isJetSki = activity.name.toLowerCase().includes('jet ski');
  const basePrice = calculatePrice();
  const taxes = isJetSki ? calculateJetSkiTaxes(basePrice) : { subtotal: basePrice, salesTax: 0, surtax: 0, taxTotal: 0, grandTotal: basePrice, lodgingTax: 0 };
  const pricePerPerson = isJetSki ? (rentalType === 'double' ? 125 : 200) : activity.base_price;
  const operatorAge = formData.operator_dob ? calculateOperatorAge(formData.operator_dob) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">{activity.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-cyan-100">
                {activity.duration_hours > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {activity.duration_hours} hour{activity.duration_hours > 1 ? 's' : ''}
                  </span>
                )}
                {isJetSki && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    1-2 hours
                  </span>
                )}
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
          <div className="bg-gradient-to-br from-slate-50 to-cyan-50 rounded-xl p-6 border border-cyan-100">
            <div className="flex items-start gap-3 mb-4">
              <Info className="w-5 h-5 text-cyan-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">About This Experience</h3>
                <p className="text-gray-700 leading-relaxed">{activity.description}</p>

                {isJetSki && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-white rounded-lg p-4 border border-cyan-200">
                      <h4 className="font-semibold text-gray-900 mb-2">Operator Requirements (Florida Law)</h4>
                      <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                        <li>Must be 14 years of age or older</li>
                        <li>Operators born on or after January 1, 1988 must have a valid Florida Boating Safety Education Card</li>
                      </ul>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-cyan-200">
                      <h4 className="font-semibold text-gray-900 mb-2">Passenger Requirements</h4>
                      <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                        <li>Must be at least 6 years old</li>
                        <li>Must fit properly in a USCG-approved life jacket</li>
                        <li>Must be able to hold on independently for the duration of the ride</li>
                        <li>Maximum: One operator and one passenger per jet ski</li>
                      </ul>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-cyan-200">
                      <h4 className="font-semibold text-gray-900 mb-2">What's Included</h4>
                      <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                        <li>Jet ski rental for selected duration</li>
                        <li>Life jackets provided (required to wear at all times)</li>
                        <li>Route map provided prior to departure</li>
                      </ul>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-cyan-200">
                      <h4 className="font-semibold text-gray-900 mb-2">Safety Rules</h4>
                      <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                        <li>USCG-approved life jackets required and provided</li>
                        <li>Operator must wear the engine cutoff (kill switch) lanyard</li>
                        <li>Follow all posted speed, wake, and navigation rules</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {activity.name.toLowerCase().includes('jet ski') && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Jet Ski Rental Rates – Backwater Only</h3>
              <div className="bg-white rounded-lg p-4 space-y-3">
                <div className="pb-3 border-b border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700 font-medium">1 Person Rental</span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600 ml-4">
                    <div className="flex justify-between">
                      <span>1 hour</span>
                      <span className="font-semibold text-cyan-700">$125</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2 hours (maximum)</span>
                      <span className="font-semibold text-cyan-700">$200</span>
                    </div>
                  </div>
                </div>
                <div className="pb-3 border-b border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700 font-medium">2 People (Same Jet Ski)</span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600 ml-4">
                    <div className="flex justify-between">
                      <span>1 hour</span>
                      <span className="font-semibold text-cyan-700">$150</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2 hours (maximum)</span>
                      <span className="font-semibold text-cyan-700">$250</span>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    Plus 6.5% sales tax • Backwater exploration only • Route map provided
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6">
            {showCalendar && (
              <div className="mb-6">
                <AvailabilityCalendar
                  activity={activity}
                  selectedDate={formData.booking_date}
                  selectedTime={formData.booking_time}
                  onDateSelect={(date) => setFormData({ ...formData, booking_date: date })}
                  onTimeSelect={(time) => setFormData({ ...formData, booking_time: time })}
                  requestedPeople={rentalType === 'double' ? 2 : formData.num_people}
                />
                <button
                  type="button"
                  onClick={() => setShowCalendar(false)}
                  className="mt-4 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                >
                  Hide Calendar
                </button>
              </div>
            )}

            {!showCalendar && (
              <button
                type="button"
                onClick={() => setShowCalendar(true)}
                className="mb-6 flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
              >
                <Calendar className="w-4 h-4" />
                Show Availability Calendar
              </button>
            )}

            <h3 className="text-xl font-bold text-gray-900 mb-4">Complete Your Booking</h3>

            {availabilityMessage && (
              <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
                availabilityMessage === 'Available'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-orange-50 text-orange-700 border border-orange-200'
              }`}>
                {availabilityMessage === 'Available' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                {availabilityMessage}
              </div>
            )}

            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200 mb-6">
              <h4 className="font-bold text-gray-900 mb-4">Pricing{isJetSki && ' & Availability'}</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Price (per person)</span>
                  <span className="font-bold text-cyan-700">${activity.base_price.toFixed(2)}</span>
                </div>
                {isJetSki && (
                  <div className="bg-white rounded-lg p-4 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Available Jet Skis</span>
                      <span className="font-semibold text-green-700">2 units</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <User className="w-4 h-4 text-cyan-600" />
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Mail className="w-4 h-4 text-cyan-600" />
                Email Address
              </label>
              <input
                type="email"
                required
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Phone className="w-4 h-4 text-cyan-600" />
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                placeholder="(239) 555-0123"
              />
            </div>

            {isJetSki && (
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 text-cyan-600" />
                  Operator Date of Birth (Required)
                </label>
                <input
                  type="date"
                  required
                  value={formData.operator_dob}
                  onChange={(e) => setFormData({ ...formData, operator_dob: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  max={new Date().toISOString().split('T')[0]}
                />
                {operatorAge > 0 && operatorAge < 14 && (
                  <p className="text-sm text-red-600 mt-1 font-medium">
                    Operator must be at least 14 years old
                  </p>
                )}
                {operatorAge >= 14 && (
                  <p className="text-sm text-green-600 mt-1">
                    Operator age: {operatorAge} years
                  </p>
                )}
              </div>
            )}

            {isJetSki && (
              <div className="md:col-span-2 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  Florida Boating Safety Compliance Form
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Florida law requires boating safety education for the operation of a personal watercraft (PWC).
                </p>

                <div className="space-y-4">
                  {formData.operator_dob && new Date(formData.operator_dob) >= new Date('1988-01-01') && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Do you currently possess a valid Boating Safety Education Identification Card? <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={boatingCompliance.has_boater_card}
                          onChange={(e) => setBoatingCompliance({ ...boatingCompliance, has_boater_card: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                        >
                          <option value="">Select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      {boatingCompliance.has_boater_card === 'yes' && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Upload Your Boating Safety Card <span className="text-red-500">*</span>
                          </label>
                          <div className="border-2 border-dashed border-cyan-300 rounded-lg p-4 bg-white">
                            <input
                              type="file"
                              required
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setBoatingSafetyCardFile(file);
                                }
                              }}
                              className="w-full text-sm text-gray-700"
                            />
                            {boatingSafetyCardFile && (
                              <p className="text-sm text-green-600 mt-2 font-medium">
                                ✓ Card uploaded: {boatingSafetyCardFile.name}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Accepted formats: JPG, PNG, PDF
                            </p>
                          </div>
                        </div>
                      )}

                      {boatingCompliance.has_boater_card === 'no' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <p className="text-sm text-red-700 font-medium">
                            Florida law requires a Boating Safety Education Card for operators born on or after January 1, 1988.
                            You must obtain this card before you can rent a jet ski. Visit{' '}
                            <a href="https://takemyboattest.com/" target="_blank" rel="noopener noreferrer" className="underline">
                              takemyboattest.com
                            </a>{' '}
                            to complete the course online.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={boatingCompliance.certification_agreed}
                        onChange={(e) => setBoatingCompliance({ ...boatingCompliance, certification_agreed: e.target.checked })}
                        className="mt-1 w-4 h-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        I certify that the information provided is true and accurate. I understand that Florida law requires boating safety education to operate a personal watercraft and that failure to comply may result in denial of rental or citation by law enforcement.
                      </span>
                    </label>
                  </div>
                </div>
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
                          <div className="text-cyan-700 font-bold text-lg mt-1">${price}</div>
                        </button>
                      );
                    })}
                  </div>
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

            <div className={isSunsetActivity ? 'md:col-span-2' : ''}>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 text-cyan-600" />
                Date
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={formData.booking_date}
                onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
              {isSunsetActivity && (
                <div className="mt-3 bg-gradient-to-r from-orange-50 to-pink-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="font-medium">Departure time: 1 hour before sunset on selected date</span>
                  </p>
                </div>
              )}
            </div>

            {!isSunsetActivity && (
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Clock className="w-4 h-4 text-cyan-600" />
                  Time
                </label>
                <select
                  required
                  value={formData.booking_time}
                  onChange={(e) => setFormData({ ...formData, booking_time: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                >
                  {availableTimes.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            )}
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

          {isJetSki && (
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
          )}

          {isJetSki && (
            <div className="md:col-span-2 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Required Acknowledgments
              </h4>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={acknowledgments.operator_age}
                    onChange={(e) => setAcknowledgments({ ...acknowledgments, operator_age: e.target.checked })}
                    className="mt-1 w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-700">
                    I confirm the operator is 14 years or older.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={acknowledgments.passenger_age}
                    onChange={(e) => setAcknowledgments({ ...acknowledgments, passenger_age: e.target.checked })}
                    className="mt-1 w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-700">
                    I confirm any passenger is at least 6 years old, fits properly in a USCG-approved life jacket, and can hold on independently for the duration of the ride.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={acknowledgments.backwater_only}
                    onChange={(e) => setAcknowledgments({ ...acknowledgments, backwater_only: e.target.checked })}
                    className="mt-1 w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-700">
                    I understand this rental is backwater only and not for open Gulf use.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={acknowledgments.life_jackets}
                    onChange={(e) => setAcknowledgments({ ...acknowledgments, life_jackets: e.target.checked })}
                    className="mt-1 w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-700">
                    I understand life jackets are required and provided, and must be worn at all times.
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 rounded-xl border border-cyan-200">
            <div className="space-y-3">
              {isJetSki ? (
                <>
                  <div className="flex justify-between items-center pb-3 border-b border-cyan-200">
                    <span className="text-gray-700">Rental Type</span>
                    <span className="font-semibold text-gray-900">
                      {rentalType === 'double' ? '2 People (Same Jet Ski)' : '1 Person'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-cyan-200">
                    <span className="text-gray-700">Duration</span>
                    <span className="font-semibold text-gray-900">{duration} {duration === 1 ? 'Hour' : 'Hours'}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-cyan-200">
                    <span className="text-gray-700">Rental Fee</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(duration === 1 ? (rentalType === 'double' ? 150 : 125) : (rentalType === 'double' ? 250 : 200))}</span>
                  </div>
                  {damageProtection === 'insurance' && (
                    <div className="flex justify-between items-center pb-3 border-b border-cyan-200">
                      <span className="text-gray-700">Damage Insurance</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(25)}</span>
                    </div>
                  )}
                  {damageProtection === 'hold' && (
                    <div className="flex justify-between items-center pb-3 border-b border-cyan-200">
                      <span className="text-gray-700">Security Deposit (Hold)</span>
                      <span className="font-semibold text-orange-700">+$500 (Temporary Hold)</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pb-2 text-sm">
                    <span className="text-gray-600">Sales Tax (6.5%)</span>
                    <span className="text-gray-900">{formatCurrency(taxes.salesTax)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-cyan-200 text-sm">
                    <span className="text-gray-600">Surtax (0.5%)</span>
                    <span className="text-gray-900">{formatCurrency(taxes.surtax)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center pb-3 border-b border-cyan-200">
                    <span className="text-gray-700">Number of People</span>
                    <span className="font-semibold text-gray-900">{formData.num_people}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-cyan-200">
                    <span className="text-gray-700">Price per Person</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(pricePerPerson)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center text-xl font-bold text-cyan-700 pt-2">
                <span>Total {damageProtection === 'hold' ? 'Charge' : 'Amount'}</span>
                <span>{formatCurrency(taxes.grandTotal)}</span>
              </div>
              {damageProtection === 'hold' && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-xs text-orange-800 font-medium">
                    Note: An additional $500 security deposit will be placed on hold on your card. This is NOT charged and will be released after you return the jet ski undamaged (typically 5-7 business days).
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-cyan-200">
              <p className="text-xs text-gray-600 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                Payment will be processed securely at checkout
              </p>
            </div>
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
              disabled={loading || uploadingCard}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg"
            >
              {uploadingCard ? 'Uploading Document...' : loading ? 'Processing...' : 'Confirm Booking'}
            </button>
          </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
