import { useState, useEffect } from 'react';
import { X, Loader as Loader2, Info, TriangleAlert as AlertTriangle, Calendar, Tag } from 'lucide-react';
import type { CartItem } from '../lib/cart-context';
import { supabase } from '../lib/supabase';
import { PromoBanner } from './PromoBanner';

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
  const [promoApplied, setPromoApplied] = useState(!!initialPromoCode && (initialPromoDiscount || 0) > 0);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [allowBackdropClick, setAllowBackdropClick] = useState(false);

  console.log('🏷️ [CHECKOUT] Initial promo state:', {
    initialPromoCode,
    initialPromoDiscount,
    promoCode,
    promoDiscount,
    promoApplied
  });

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

  const hasJetSki = items.some(item =>
    item.type === 'activity' && item.activity?.name.toLowerCase().includes('jet ski')
  );

  const handleApplyPromoCode = async () => {
    console.log('✨ CHECKOUT FIX v3 - 2026-03-25 15:45 UTC');
    console.log('🎟️ [CHECKOUT] Apply promo clicked:', promoCode);
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
      const hasProperties = items.some(item => item.type === 'property');
      const hasActivities = items.some(item => item.type === 'activity');
      const hasMerchandise = items.some(item => item.type === 'merchandise');

      let appliesTo = 'all';
      if (hasProperties && !hasActivities && !hasMerchandise) {
        appliesTo = 'properties';
      } else if (hasActivities && !hasProperties && !hasMerchandise) {
        appliesTo = 'activities';
      } else if (hasMerchandise && !hasProperties && !hasActivities) {
        appliesTo = 'merchandise';
      }

      const { data, error } = await supabase.rpc('validate_promo_code', {
        code_text: codeToUse,
        applies_to_type: appliesTo
      });

      if (error) {
        console.error('Promo code validation error:', error);
        setPromoApplied(false);
        setPromoDiscount(0);
        setPromoMessage('Error validating promo code');
        return;
      }

      const result = data?.[0];

      if (!result) {
        setPromoApplied(false);
        setPromoDiscount(0);
        setPromoMessage('Invalid or expired promo code');
        return;
      }

      console.log('✅ [CHECKOUT] Promo validation result:', result);

      // Handle boolean check for is_valid (could be boolean, string 'true'/'t', etc.)
      const isValid =
        result.is_valid === true ||
        result.is_valid === 'true' ||
        result.is_valid === 't';

      if (isValid) {
        console.log('🎉 [CHECKOUT] Valid promo! Setting state:', {
          code: codeToUse,
          discount: result.discount_value
        });
        setPromoCode(codeToUse);
        setPromoApplied(true);
        setPromoDiscount(Number(result.discount_value) || 0);
        setPromoMessage(result.message || 'Promo code applied!');
        if (onPromoChange) {
          console.log('📤 [CHECKOUT] Notifying parent of promo change');
          onPromoChange(codeToUse, Number(result.discount_value) || 0);
        }
      } else {
        console.log('❌ [CHECKOUT] Invalid promo:', result.message);
        setPromoApplied(false);
        setPromoDiscount(0);
        setPromoMessage(result.message || 'Invalid or expired promo code');
      }
    } catch (error) {
      console.error('Error applying promo code:', error);
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
    if (onPromoChange) {
      onPromoChange('', 0);
    }
  };

  const discountAmount = (subtotal * promoDiscount) / 100;
  const discountedSubtotal = subtotal - discountAmount;

  // Recalculate taxes on the discounted subtotal (proportional to item types)
  const hasProperties = items.some(item => item.type === 'property');
  const hasActivities = items.some(item => item.type === 'activity');
  const hasMerchandise = items.some(item => item.type === 'merchandise');

  // Calculate property and activity/merchandise subtotals after discount
  const propertySubtotal = items.filter(item => item.type === 'property').reduce((sum, item) => sum + item.price, 0);
  const activityMerchandiseSubtotal = items.filter(item => item.type === 'activity' || item.type === 'merchandise').reduce((sum, item) => sum + item.price, 0);

  // Apply proportional discount
  const propertyDiscount = propertySubtotal > 0 ? (discountAmount * propertySubtotal / subtotal) : 0;
  const activityMerchandiseDiscount = activityMerchandiseSubtotal > 0 ? (discountAmount * activityMerchandiseSubtotal / subtotal) : 0;

  const discountedPropertySubtotal = propertySubtotal - propertyDiscount;
  const discountedActivityMerchandiseSubtotal = activityMerchandiseSubtotal - activityMerchandiseDiscount;

  // Calculate taxes on discounted amounts
  const adjustedLodgingTax = hasProperties && promoDiscount > 0 ? (discountedPropertySubtotal * 0.115) : lodgingTax;
  const adjustedSalesTax = (hasActivities || hasMerchandise) && promoDiscount > 0 ? (discountedActivityMerchandiseSubtotal * 0.065) : salesTax;

  const finalTotal = promoDiscount > 0
    ? discountedSubtotal + adjustedLodgingTax + adjustedSalesTax
    : totalAmount;

  console.log('💰 [CHECKOUT] Discount Calculation:', {
    promoCode,
    promoDiscount,
    subtotal,
    discountAmount,
    discountedSubtotal,
    adjustedLodgingTax: promoDiscount > 0 ? adjustedLodgingTax : lodgingTax,
    adjustedSalesTax: promoDiscount > 0 ? adjustedSalesTax : salesTax,
    finalTotal
  });

  useEffect(() => {
    if (isOpen) {
      console.log('🟢 [CHECKOUT] Modal opened, initializing state');
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

      // Prevent backdrop clicks for 500ms after modal opens to prevent click bleed-through
      setAllowBackdropClick(false);
      console.log('🟡 [CHECKOUT] Backdrop clicks disabled for 500ms');
      const timer = setTimeout(() => {
        setAllowBackdropClick(true);
        console.log('🟢 [CHECKOUT] Backdrop clicks now enabled');
      }, 500);

      return () => clearTimeout(timer);
    } else {
      // When modal closes, force cleanup of expired bookings
      if (!isOpen) {
        supabase.rpc('cleanup_expired_bookings').then(({ error }) => {
          if (error) {
            console.error('Failed to cleanup expired bookings:', error);
          }
        });
      }
    }
  }, [isOpen]);

  const handleCheckout = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
    console.log('🚀 [CHECKOUT] Button clicked - starting checkout process');
    console.log('🚀 [CHECKOUT] Customer:', { customerEmail, customerName });
    console.log('🚀 [CHECKOUT] Has Jet Ski:', hasJetSki);

    if (!customerEmail || !customerName) {
      console.log('❌ [CHECKOUT] Missing email or name');
      setError('Please enter your name and email');
      return;
    }

    // Validate jet ski compliance
    if (hasJetSki) {
      console.log('🛟 [CHECKOUT] Validating jet ski compliance...');
      if (!operatorDob) {
        console.log('❌ [CHECKOUT] Missing operator DOB');
        setError('Operator date of birth is required for jet ski rentals');
        return;
      }

      const operatorAge = calculateOperatorAge(operatorDob);
      console.log('🛟 [CHECKOUT] Operator age:', operatorAge);
      if (operatorAge < 14) {
        console.log('❌ [CHECKOUT] Operator too young');
        setError('Operator must be at least 14 years old to operate a jet ski');
        return;
      }

      const bornAfter1988 = new Date(operatorDob) >= new Date('1988-01-01');
      console.log('🛟 [CHECKOUT] Born after 1988:', bornAfter1988);

      if (bornAfter1988) {
        if (!boatingCompliance.has_boater_card) {
          console.log('❌ [CHECKOUT] Boater card status not indicated');
          setError('Please indicate if you have a Boating Safety Education Card');
          return;
        }

        if (boatingCompliance.has_boater_card === 'no') {
          console.log('❌ [CHECKOUT] No boater card');
          setError('Florida law requires a Boating Safety Education Card for operators born on or after January 1, 1988');
          return;
        }

        if (!boatingSafetyCardFile) {
          console.log('❌ [CHECKOUT] No boating card file uploaded');
          setError('Please upload your Boating Safety Education Card');
          return;
        }
      }

      if (!boatingCompliance.certification_agreed) {
        console.log('❌ [CHECKOUT] Certification not agreed');
        setError('You must certify that the information provided is true and accurate');
        return;
      }

      if (!acknowledgments.operator_age || !acknowledgments.passenger_age ||
          !acknowledgments.backwater_only || !acknowledgments.life_jackets) {
        console.log('❌ [CHECKOUT] Missing acknowledgments', acknowledgments);
        setError('Please confirm all required acknowledgments');
        return;
      }
      console.log('✅ [CHECKOUT] All jet ski validations passed');
    }

    console.log('⏳ [CHECKOUT] Setting loading state...');
    setIsLoading(true);
    setError(null);

    try {
      let boatingSafetyCardUrl = null;

      // Upload boating safety card if provided
      if (hasJetSki && boatingSafetyCardFile) {
        console.log('📤 [CHECKOUT] Uploading boating safety card...');
        setUploadingCard(true);
        const fileExt = boatingSafetyCardFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('boating-cards')
          .upload(fileName, boatingSafetyCardFile);

        if (uploadError) {
          console.error('❌ [CHECKOUT] Upload error:', uploadError);
          throw new Error('Failed to upload boating safety card');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('boating-cards')
          .getPublicUrl(uploadData.path);

        boatingSafetyCardUrl = publicUrl;
        console.log('✅ [CHECKOUT] Card uploaded:', publicUrl);
        setUploadingCard(false);
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`;
      console.log('🌐 [CHECKOUT] API URL:', apiUrl);

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

      console.log('💳 [CHECKOUT] Payment data being sent:', {
        subtotal,
        promoCode,
        promoDiscount,
        discountAmount,
        discountedSubtotal,
        adjustedLodgingTax: promoDiscount > 0 ? adjustedLodgingTax : lodgingTax,
        adjustedSalesTax: promoDiscount > 0 ? adjustedSalesTax : salesTax,
        finalTotal,
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      console.log('📡 [CHECKOUT] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [CHECKOUT] Checkout session error:', errorData);
        throw new Error(errorData.error || `Failed to create checkout session (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ [CHECKOUT] Response data:', data);

      if (data.url) {
        console.log('🔗 [CHECKOUT] Opening Stripe URL:', data.url);
        const stripeWindow = window.open(data.url, '_blank');

        if (!stripeWindow) {
          console.log('❌ [CHECKOUT] Popup blocked');
          setError('Please allow popups for this site to complete payment');
          setIsLoading(false);
          return;
        }

        console.log('✅ [CHECKOUT] Stripe window opened, closing modal');
        onClose();
        setIsLoading(false);
      } else {
        console.log('❌ [CHECKOUT] No checkout URL in response');
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('❌ [CHECKOUT] Checkout error:', err);
      setError(err.message || 'Failed to initialize payment');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && allowBackdropClick) {
          console.log('🔵 [CHECKOUT] Backdrop clicked, closing modal');
          onClose();
        } else if (e.target === e.currentTarget && !allowBackdropClick) {
          console.log('🔵 [CHECKOUT] Backdrop clicked but ignoring (within delay window)');
        }
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">Secure Checkout</h2>
          <button
            type="button"
            onClick={() => {
              console.log('🔴 [CHECKOUT] X button clicked, closing modal');
              onClose();
            }}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <PromoBanner placement="checkout" />

        <div className="p-6">
          <div className="space-y-6">

            {items.some(item => item.type === 'property') && depositAmount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
                    $
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">
                      ${depositAmount.toFixed(0)} Security Deposit Authorization (Hold)
                    </h3>
                    <p className="text-gray-600 text-xs leading-relaxed">
                      Your cart includes vacation rental(s). A ${depositAmount.toFixed(0)} hold will be placed on your card but NOT charged. The hold will be automatically released after checkout if there are no damages.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.type === 'activity'
                      ? `${item.activity?.name} - ${item.numPeople} ${item.numPeople === 1 ? 'person' : 'people'}`
                      : `${item.property?.name} - ${item.guests} ${item.guests === 1 ? 'guest' : 'guests'}`
                    }
                  </span>
                  <span className="font-medium text-gray-900">${item.price.toFixed(2)}</span>
                </div>
              ))}
              {(depositAmount > 0 || lodgingTax > 0 || salesTax > 0 || promoApplied) && (
                <>
                  <div className="pt-2 border-t border-gray-200 flex justify-between text-sm">
                    <span className="text-gray-700">Subtotal</span>
                    <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
                  </div>
                  {promoApplied && promoDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 font-medium">Discount ({promoDiscount}%) - {promoCode}</span>
                      <span className="font-medium text-green-600">-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {(adjustedSalesTax > 0 || salesTax > 0) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Sales Tax (6.5%)</span>
                      <span className="font-medium text-gray-900">${(promoDiscount > 0 ? adjustedSalesTax : salesTax).toFixed(2)}</span>
                    </div>
                  )}
                  {(adjustedLodgingTax > 0 || lodgingTax > 0) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Lodging Tax (11.5%)</span>
                      <span className="font-medium text-gray-900">${(promoDiscount > 0 ? adjustedLodgingTax : lodgingTax).toFixed(2)}</span>
                    </div>
                  )}
                  {depositAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-yellow-700 font-medium">Security Deposit (Hold - Not Charged)</span>
                      <span className="font-medium text-yellow-700">${depositAmount.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="pt-3 border-t-2 border-gray-300 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-blue-600">${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="promo-code" className="block text-sm font-medium text-gray-700 mb-2">
                  Promo Code (Optional)
                </label>
                {promoApplied ? (
                  <div className="bg-green-50 border border-green-300 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-800">{promoCode} applied ({promoDiscount}% off)</p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemovePromoCode}
                        className="px-3 py-1 text-xs bg-red-500 text-white rounded font-medium hover:bg-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="promo-code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Enter promo code"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleApplyPromoCode();
                          }
                        }}
                      />
                      <button
                        onClick={handleApplyPromoCode}
                        disabled={isValidatingPromo || !promoCode.trim()}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isValidatingPromo ? 'Checking...' : 'Apply'}
                      </button>
                    </div>
                    {promoMessage && (
                      <p className={`mt-2 text-xs ${promoApplied ? 'text-green-600 font-medium' : 'text-red-600'}`}>
                        {promoMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {hasJetSki && (
                <>
                  <div className="bg-gray-900 text-white rounded-xl p-5 mt-6">
                    <h3 className="font-bold text-lg mb-3">Age & Identification Requirements</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span>Operators must be at least 14 years old</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span>Renters must be at least 18 years old</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span>Valid photo ID required</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span>Boating safety compliance required before operation</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-600" />
                      Jet Ski Operator Requirements
                    </h3>
                    <p className="text-sm text-gray-700 mb-4">
                      Your cart includes a jet ski rental. Florida law requires the following compliance information.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="operator-dob" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 text-cyan-600" />
                          Operator Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="operator-dob"
                          required={hasJetSki}
                          value={operatorDob}
                          onChange={(e) => setOperatorDob(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                          max={new Date().toISOString().split('T')[0]}
                        />
                        {operatorDob && calculateOperatorAge(operatorDob) < 14 && (
                          <p className="text-sm text-red-600 mt-1 font-medium">
                            Operator must be at least 14 years old
                          </p>
                        )}
                        {operatorDob && calculateOperatorAge(operatorDob) >= 14 && (
                          <p className="text-sm text-green-600 mt-1">
                            Operator age: {calculateOperatorAge(operatorDob)} years
                          </p>
                        )}
                      </div>

                      {operatorDob && new Date(operatorDob) >= new Date('1988-01-01') && (
                        <>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Do you currently possess a valid Boating Safety Education Card? <span className="text-red-500">*</span>
                            </label>
                            <select
                              required={hasJetSki}
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
                              <p className="text-sm text-red-700 font-medium mb-3">
                                Florida law requires a Boating Safety Education Card for operators born on or after January 1, 1988.
                                You must obtain this card before you can rent a jet ski.
                              </p>
                              <div className="space-y-2 text-sm text-red-700">
                                <p>
                                  <strong>Option 1:</strong> Get your card now at{' '}
                                  <a href="https://takemyboattest.com/" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-red-900">
                                    takemyboattest.com
                                  </a>
                                </p>
                                <p>
                                  <strong>Option 2:</strong> Already have your card?{' '}
                                  <a href="/upload-boating-card" className="underline font-semibold hover:text-red-900">
                                    Upload it here
                                  </a>
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            required={hasJetSki}
                            checked={boatingCompliance.certification_agreed}
                            onChange={(e) => setBoatingCompliance({ ...boatingCompliance, certification_agreed: e.target.checked })}
                            className="mt-1 w-4 h-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">
                            I certify that the information provided is true and accurate. I understand that Florida law requires boating safety education to operate a personal watercraft.
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      Required Acknowledgments
                    </h4>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          required={hasJetSki}
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
                          required={hasJetSki}
                          checked={acknowledgments.passenger_age}
                          onChange={(e) => setAcknowledgments({ ...acknowledgments, passenger_age: e.target.checked })}
                          className="mt-1 w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                        />
                        <span className="text-sm text-gray-700">
                          I confirm any passenger is at least 6 years old, fits properly in a USCG-approved life jacket, and can hold on independently.
                        </span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          required={hasJetSki}
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
                          required={hasJetSki}
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
                </>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {items.some(item => item.type === 'property') && (
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg text-xs text-gray-600">
                <p className="font-semibold text-gray-800 mb-2">Rental Terms & Conditions:</p>
                <p className="leading-relaxed">
                  By completing this booking, you agree to our rental policies including check-in/check-out times, property rules, and security deposit terms. A $500 authorization hold will be placed on your card but will not be charged unless damages occur.
                </p>
              </div>
            )}

            <button
              onClick={(e) => handleCheckout(e)}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isLoading || uploadingCard || !customerEmail || !customerName}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploadingCard ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading Document...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redirecting to secure checkout...
                </>
              ) : (
                'Proceed to Secure Checkout'
              )}
            </button>

            <p className="text-xs text-center text-gray-500">
              You will be redirected to Stripe's secure payment page
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
