import { useState, useEffect } from 'react';
import {
  Loader2,
  Info,
  AlertTriangle,
  Calendar,
  Tag,
  X,
} from 'lucide-react';

import type { CartItem } from '../lib/cart-context';
import { supabase } from '../lib/supabase';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  totalAmount: number;
  subtotal: number;
  lodgingTax: number;
  salesTax: number;
  depositAmount: number;
  promoCode?: string;
  promoDiscount?: number;
  onSuccess: () => void;
  onPromoChange?: (code: string, discount: number) => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  items,
  totalAmount,
  subtotal,
  lodgingTax,
  salesTax,
  depositAmount,
  promoCode: initialPromoCode,
  promoDiscount: initialPromoDiscount,
  onSuccess: _onSuccess,
  onPromoChange,
}: CheckoutModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [operatorDob, setOperatorDob] = useState('');
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
  const [promoCode, setPromoCode] = useState(initialPromoCode || '');
  const [promoDiscount, setPromoDiscount] = useState(initialPromoDiscount || 0);
  const [promoMessage, setPromoMessage] = useState('');
  const [promoApplied, setPromoApplied] =
    useState(!!initialPromoCode && (initialPromoDiscount || 0) > 0);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [allowBackdropClick, setAllowBackdropClick] = useState(false);

  const hasJetSki = items.some(
    (item) => item.type === 'activity' && item.activity?.name?.toLowerCase().includes('jet ski')
  );

  const hasProperties = items.some((item) => item.type === 'property');
  const hasActivities = items.some((item) => item.type === 'activity');
  const hasMerchandise = items.some((item) => item.type === 'merchandise');

  const getOrderType = () => {
    if (hasProperties) return 'properties';
    if (hasMerchandise) return 'merch';
    return 'activities';
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

  const handleApplyPromoCode = async () => {
    const codeToUse = promoCode.trim().toUpperCase();

    if (!codeToUse) {
      setPromoMessage('Please enter a promo code');
      setPromoApplied(false);
      setPromoDiscount(0);
      return;
    }

    setIsValidatingPromo(true);
    setPromoMessage('');

    try {
      const { data, error } = await supabase.rpc('validate_promo_code', {
        code_text: codeToUse,
        applies_to_type: getOrderType(),
      });

      if (error) {
        console.error('Promo code validation error:', error);
        setPromoApplied(false);
        setPromoDiscount(0);
        setPromoMessage('Error validating promo code');
        return;
      }

      if (!data || data.length === 0) {
        setPromoApplied(false);
        setPromoDiscount(0);
        setPromoMessage('Invalid or expired promo code');
        return;
      }

      const result = data[0];

      if (result.is_valid) {
        const nextDiscount = Number(result.discount_percentage) || 0;

        setPromoCode(codeToUse);
        setPromoApplied(true);
        setPromoDiscount(nextDiscount);
        setPromoMessage(result.message || 'Promo code applied!');

        onPromoChange?.(codeToUse, nextDiscount);
      } else {
        setPromoApplied(false);
        setPromoDiscount(0);
        setPromoMessage(result.message || 'Invalid or expired promo code');
      }
    } catch (err) {
      console.error('Error applying promo code:', err);
      setPromoApplied(false);
      setPromoDiscount(0);
      setPromoMessage('Error applying promo code');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromoCode = () => {
    setPromoCode('');
    setPromoDiscount(0);
    setPromoMessage('');
    setPromoApplied(false);
    onPromoChange?.('', 0);
  };

  const discountAmount = (subtotal * promoDiscount) / 100;
  const discountedSubtotal = subtotal - discountAmount;

  const propertySubtotal = items
    .filter((item) => item.type === 'property')
    .reduce((sum, item) => sum + (item.price ?? 0), 0);

  const activityMerchandiseSubtotal = items
    .filter((item) => item.type === 'activity' || item.type === 'merchandise')
    .reduce((sum, item) => sum + (item.price ?? 0), 0);

  const propertyDiscount =
    propertySubtotal > 0 && subtotal > 0 ? (discountAmount * propertySubtotal) / subtotal : 0;

  const activityMerchandiseDiscount =
    activityMerchandiseSubtotal > 0 && subtotal > 0
      ? (discountAmount * activityMerchandiseSubtotal) / subtotal
      : 0;

  const discountedPropertySubtotal = propertySubtotal - propertyDiscount;
  const discountedActivityMerchandiseSubtotal =
    activityMerchandiseSubtotal - activityMerchandiseDiscount;

  const adjustedLodgingTax =
    hasProperties && promoDiscount > 0 ? discountedPropertySubtotal * 0.115 : lodgingTax;

  const adjustedSalesTax =
    (hasActivities || hasMerchandise) && promoDiscount > 0
      ? discountedActivityMerchandiseSubtotal * 0.065
      : salesTax;

  const finalTotal =
    promoDiscount > 0
      ? discountedSubtotal + adjustedLodgingTax + adjustedSalesTax
      : totalAmount;

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCustomerEmail('');
      setCustomerName('');
      setOperatorDob('');
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

      setAllowBackdropClick(false);
      const timer = setTimeout(() => {
        setAllowBackdropClick(true);
      }, 500);

      return () => clearTimeout(timer);
    }

    supabase.rpc('cleanup_expired_bookings').then(({ error }) => {
      if (error) {
        console.error('Failed to cleanup expired bookings:', error);
      }
    });
  }, [isOpen]);

  useEffect(() => {
    setPromoApplied(false);
    setPromoCode('');
    setPromoDiscount(0);
    setPromoMessage('');
  }, [items]);

  const handleCheckout = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!customerEmail || !customerName) {
      setError('Please enter your name and email');
      return;
    }

    if (hasJetSki) {
      if (!operatorDob) {
        setError('Operator date of birth is required for jet ski rentals');
        return;
      }

      const operatorAge = calculateOperatorAge(operatorDob);
      if (operatorAge < 14) {
        setError('Operator must be at least 14 years old to operate a jet ski');
        return;
      }

      const bornAfter1988 = new Date(operatorDob) >= new Date('1988-01-01');

      if (bornAfter1988) {
        if (!boatingCompliance.has_boater_card) {
          setError('Please indicate if you have a Boating Safety Education Card');
          return;
        }

        if (boatingCompliance.has_boater_card === 'no') {
          setError(
            'Florida law requires a Boating Safety Education Card for operators born on or after January 1, 1988'
          );
          return;
        }

        if (!boatingSafetyCardFile) {
          setError('Please upload your Boating Safety Education Card');
          return;
        }
      }

      if (!boatingCompliance.certification_agreed) {
        setError('You must certify that the information provided is true and accurate');
        return;
      }

      if (
        !acknowledgments.operator_age ||
        !acknowledgments.passenger_age ||
        !acknowledgments.backwater_only ||
        !acknowledgments.life_jackets
      ) {
        setError('Please confirm all required acknowledgments');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      let boatingSafetyCardUrl: string | null = null;

      if (hasJetSki && boatingSafetyCardFile) {
        setUploadingCard(true);

        const fileExt = boatingSafetyCardFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('boating-cards')
          .upload(fileName, boatingSafetyCardFile);

        if (uploadError) {
          throw new Error('Failed to upload boating safety card');
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('boating-cards').getPublicUrl(uploadData.path);

        boatingSafetyCardUrl = publicUrl;
        setUploadingCard(false);
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`;

      const paymentData = {
        items,
        customerEmail,
        customerName,
        subtotal,
        lodgingTax: promoDiscount > 0 ? adjustedLodgingTax : lodgingTax,
        salesTax: promoDiscount > 0 ? adjustedSalesTax : salesTax,
        totalPrice: finalTotal,
        operatorDob: hasJetSki ? operatorDob : undefined,
        boatingSafetyCardUrl: boatingSafetyCardUrl || undefined,
        acknowledgments: hasJetSki ? acknowledgments : undefined,
        promoCode: promoApplied ? promoCode : undefined,
        promoDiscount: promoApplied ? promoDiscount : undefined,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create checkout session (${response.status})`);
      }

      const data = await response.json();

      if (!data.url) {
        throw new Error('No checkout URL received');
      }

      const stripeWindow = window.open(data.url, '_blank');

      if (!stripeWindow) {
        setError('Please allow popups for this site to complete payment');
        setIsLoading(false);
        return;
      }

      onClose();
      setIsLoading(false);
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Failed to initialize payment');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && allowBackdropClick) {
          onClose();
        }
      }}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between rounded-t-2xl border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-900">Secure Checkout</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full p-2 transition-colors hover:bg-gray-100"
            title="Close"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {items.some((item) => item.type === 'property') && depositAmount > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    $
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-sm font-semibold text-gray-900">
                      ${(depositAmount ?? 0).toFixed(0)} Security Deposit Authorization (Hold)
                    </h3>
                    <p className="text-xs leading-relaxed text-gray-600">
                      Your cart includes vacation rental(s). A ${depositAmount.toFixed(0)} hold
                      will be placed on your card but NOT charged. The hold will be automatically
                      released after checkout if there are no damages.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 rounded-lg bg-gray-50 p-4">
              <h3 className="mb-3 font-semibold text-gray-900">Order Summary</h3>

              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.type === 'activity'
                      ? `${item.activity?.name} - ${item.numPeople} ${
                          item.numPeople === 1 ? 'person' : 'people'
                        }`
                      : item.type === 'property'
                        ? `${item.property?.name} - ${item.guests} ${
                            item.guests === 1 ? 'guest' : 'guests'
                          }`
                        : `${item.name || 'Merchandise Item'} x ${item.quantity || 1}`}
                  </span>
                  <span className="font-medium text-gray-900">
                    ${(item.price ?? 0).toFixed(2)}
                  </span>
                </div>
              ))}

              {(depositAmount > 0 || lodgingTax > 0 || salesTax > 0 || promoApplied) && (
                <>
                  <div className="flex justify-between border-t border-gray-200 pt-2 text-sm">
                    <span className="text-gray-700">Subtotal</span>
                    <span className="font-medium text-gray-900">${(subtotal ?? 0).toFixed(2)}</span>
                  </div>

                  {promoApplied && promoDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-green-600">
                        Discount ({promoDiscount}%) - {promoCode}
                      </span>
                      <span className="font-medium text-green-600">
                        -${(discountAmount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {(adjustedSalesTax > 0 || salesTax > 0) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Sales Tax (6.5%)</span>
                      <span className="font-medium text-gray-900">
                        ${((promoDiscount > 0 ? adjustedSalesTax : salesTax) ?? 0).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {(adjustedLodgingTax > 0 || lodgingTax > 0) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Lodging Tax (11.5%)</span>
                      <span className="font-medium text-gray-900">
                        ((promoDiscount > 0 ? adjustedLodgingTax : lodgingTax) ?? 0).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {depositAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-yellow-700">
                        Security Deposit (Hold - Not Charged)
                      </span>
                      <span className="font-medium text-yellow-700">
                        ${(depositAmount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between border-t-2 border-gray-300 pt-3">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-blue-600">${(finalTotal ?? 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="promo-code"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Promo Code (Optional)
                </label>

                {promoApplied ? (
                  <div className="rounded-lg border border-green-300 bg-green-50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            {promoCode} applied ({promoDiscount}% off)
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePromoCode}
                        className="rounded bg-red-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="promo-code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Enter promo code"
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyPromoCode();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromoCode}
                        disabled={isValidatingPromo || !promoCode.trim()}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isValidatingPromo ? 'Checking...' : 'Apply'}
                      </button>
                    </div>

                    {promoMessage && (
                      <p
                        className={`mt-2 text-xs ${
                          promoApplied ? 'font-medium text-green-600' : 'text-red-600'
                        }`}
                      >
                        {promoMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {hasJetSki && (
                <>
                  <div className="mt-6 rounded-xl bg-gray-900 p-5 text-white">
                    <h3 className="mb-3 text-lg font-bold">Age & Identification Requirements</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 text-cyan-400">•</span>
                        <span>Operators must be at least 14 years old</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 text-cyan-400">•</span>
                        <span>Renters must be at least 18 years old</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 text-cyan-400">•</span>
                        <span>Valid photo ID required</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 text-cyan-400">•</span>
                        <span>Boating safety compliance required before operation</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
                      <Info className="h-5 w-5 text-blue-600" />
                      Jet Ski Operator Requirements
                    </h3>
                    <p className="mb-4 text-sm text-gray-700">
                      Your cart includes a jet ski rental. Florida law requires the following
                      compliance information.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="operator-dob"
                          className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700"
                        >
                          <Calendar className="h-4 w-4 text-cyan-600" />
                          Operator Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="operator-dob"
                          required={hasJetSki}
                          value={operatorDob}
                          onChange={(e) => setOperatorDob(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                          max={new Date().toISOString().split('T')[0]}
                        />
                        {operatorDob && calculateOperatorAge(operatorDob) < 14 && (
                          <p className="mt-1 text-sm font-medium text-red-600">
                            Operator must be at least 14 years old
                          </p>
                        )}
                        {operatorDob && calculateOperatorAge(operatorDob) >= 14 && (
                          <p className="mt-1 text-sm text-green-600">
                            Operator age: {calculateOperatorAge(operatorDob)} years
                          </p>
                        )}
                      </div>

                      {operatorDob && new Date(operatorDob) >= new Date('1988-01-01') && (
                        <>
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Do you currently possess a valid Boating Safety Education Card?{' '}
                              <span className="text-red-500">*</span>
                            </label>
                            <select
                              required={hasJetSki}
                              value={boatingCompliance.has_boater_card}
                              onChange={(e) =>
                                setBoatingCompliance({
                                  ...boatingCompliance,
                                  has_boater_card: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="">Select</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </div>

                          {boatingCompliance.has_boater_card === 'yes' && (
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-700">
                                Upload Your Boating Safety Card{' '}
                                <span className="text-red-500">*</span>
                              </label>
                              <div className="rounded-lg border-2 border-dashed border-cyan-300 bg-white p-4">
                                <input
                                  type="file"
                                  required={hasJetSki}
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
                                  <p className="mt-2 text-sm font-medium text-green-600">
                                    ✓ Card uploaded: {boatingSafetyCardFile.name}
                                  </p>
                                )}
                                <p className="mt-2 text-xs text-gray-500">
                                  Accepted formats: JPG, PNG, PDF
                                </p>
                              </div>
                            </div>
                          )}

                          {boatingCompliance.has_boater_card === 'no' && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                              <p className="mb-3 text-sm font-medium text-red-700">
                                Florida law requires a Boating Safety Education Card for operators
                                born on or after January 1, 1988. You must obtain this card before
                                you can rent a jet ski.
                              </p>
                              <div className="space-y-2 text-sm text-red-700">
                                <p>
                                  <strong>Option 1:</strong> Get your card now at{' '}
                                  <a
                                    href="https://takemyboattest.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold underline hover:text-red-900"
                                  >
                                    takemyboattest.com
                                  </a>
                                </p>
                                <p>
                                  <strong>Option 2:</strong> Already have your card?{' '}
                                  <a
                                    href="/upload-boating-card"
                                    className="font-semibold underline hover:text-red-900"
                                  >
                                    Upload it here
                                  </a>
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            required={hasJetSki}
                            checked={boatingCompliance.certification_agreed}
                            onChange={(e) =>
                              setBoatingCompliance({
                                ...boatingCompliance,
                                certification_agreed: e.target.checked,
                              })
                            }
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                          />
                          <span className="text-sm text-gray-700">
                            I certify that the information provided is true and accurate. I
                            understand that Florida law requires boating safety education to operate
                            a personal watercraft.
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-6">
                    <h4 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      Required Acknowledgments
                    </h4>
                    <div className="space-y-3">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          required={hasJetSki}
                          checked={acknowledgments.operator_age}
                          onChange={(e) =>
                            setAcknowledgments({
                              ...acknowledgments,
                              operator_age: e.target.checked,
                            })
                          }
                          className="mt-1 h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className="text-sm text-gray-700">
                          I confirm the operator is 14 years or older.
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          required={hasJetSki}
                          checked={acknowledgments.passenger_age}
                          onChange={(e) =>
                            setAcknowledgments({
                              ...acknowledgments,
                              passenger_age: e.target.checked,
                            })
                          }
                          className="mt-1 h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className="text-sm text-gray-700">
                          I confirm any passenger is at least 6 years old, fits properly in a
                          USCG-approved life jacket, and can hold on independently.
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          required={hasJetSki}
                          checked={acknowledgments.backwater_only}
                          onChange={(e) =>
                            setAcknowledgments({
                              ...acknowledgments,
                              backwater_only: e.target.checked,
                            })
                          }
                          className="mt-1 h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className="text-sm text-gray-700">
                          I understand this rental is backwater only and not for open Gulf use.
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          required={hasJetSki}
                          checked={acknowledgments.life_jackets}
                          onChange={(e) =>
                            setAcknowledgments({
                              ...acknowledgments,
                              life_jackets: e.target.checked,
                            })
                          }
                          className="mt-1 h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className="text-sm text-gray-700">
                          I understand life jackets are required and provided, and must be worn at
                          all times.
                        </span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {items.some((item) => item.type === 'property') && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                <p className="mb-2 font-semibold text-gray-800">Rental Terms & Conditions:</p>
                <p className="leading-relaxed">
                  By completing this booking, you agree to our rental policies including
                  check-in/check-out times, property rules, and security deposit terms. A $500
                  authorization hold will be placed on your card but will not be charged unless
                  damages occur.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => handleCheckout(e)}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isLoading || uploadingCard || !customerEmail || !customerName}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploadingCard ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Uploading Document...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Redirecting to secure checkout...
                </>
              ) : (
                'Proceed to Secure Checkout'
              )}
            </button>

            <p className="text-center text-xs text-gray-500">
              You will be redirected to Stripe&apos;s secure payment page
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}