import { useState } from 'react';
import { X, Loader2, Tag } from 'lucide-react';
import type { CartItem } from '../lib/cart-context';
import { supabase } from '../lib/supabase';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  totalAmount: number;
  subtotal: number;
  lodgingTax: number;
  salesTax: number;
  depositAmount: number;
  promoDiscount?: number;
  onSuccess: () => void;
  onPromoChange?: (code: string, discount: number) => void;
}

type FulfillmentMethod = 'pickup' | 'shipping';

const SHIPPING_FEE = 10;

export function CartModal({
  isOpen,
  onClose,
  items,
  subtotal,
  lodgingTax,
  salesTax,
  depositAmount,
  promoDiscount: initialPromoDiscount = 0,
  onPromoChange,
}: CartModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<FulfillmentMethod>('pickup');
  const [shippingAddress, setShippingAddress] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(initialPromoDiscount);
  const [promoApplied, setPromoApplied] = useState(initialPromoDiscount > 0);
  const [promoMessage, setPromoMessage] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const safeItems = Array.isArray(items) ? items : [];

  const hasProperties = safeItems.some((item) => item.type === 'property');
  const hasMerchandise = safeItems.some((item) => item.type === 'merchandise');
  const hasActivities = safeItems.some((item) => item.type === 'activity');

  const isDepositOnly =
    safeItems.length > 0 &&
    safeItems.every((item) => item.type === 'security_deposit');

  const safeSubtotal = Number(subtotal || 0);
  const safeLodgingTax = Number(lodgingTax || 0);
  const safeSalesTax = Number(salesTax || 0);
  const safeDepositAmount = Number(depositAmount || 0);

  const shippingFee =
  fulfillmentMethod === 'shipping' ? SHIPPING_FEE : 0;
);

  const discountAmount = (safeSubtotal * promoDiscount) / 100;
  const discountedSubtotal = Math.max(0, safeSubtotal - discountAmount);

  const adjustedSalesTax = safeSalesTax;
  const adjustedLodgingTax = safeLodgingTax;

  const finalTotal = Number(
  (
    discountedSubtotal +
    adjustedSalesTax +
    adjustedLodgingTax +
    safeDepositAmount +
    shippingFee
  ).toFixed(2)
);

  function getOrderType() {
    if (hasProperties) return 'property';
    if (hasActivities) return 'activity';
    if (hasMerchandise) return 'merch';
    return 'all';
  }

  async function handleApplyPromoCode() {
    const codeToUse = promoCode.trim().toUpperCase();

    if (!codeToUse) {
      setPromoMessage('Enter a promo code');
      return;
    }

    setIsValidatingPromo(true);
    setPromoMessage('');
    setError('');

    try {
      const orderType = getOrderType();

      const { data, error } = await supabase.rpc('validate_promo_code_v2', {
        p_code: codeToUse,
        p_order_type: orderType,
        p_subtotal: safeSubtotal,
      });

      console.log('PROMO RPC RESULT:', {
        code: codeToUse,
        orderType,
        subtotal: safeSubtotal,
        data,
        error,
      });

      if (error) throw error;

      if (!data?.valid) {
        setPromoApplied(false);
        setPromoDiscount(0);
        setPromoMessage(data?.message || 'Invalid promo code');
        onPromoChange?.('', 0);
        return;
      }

      const nextDiscount =
        Number(
          data.discount_percent ??
            data.discount_percentage ??
            data.discount_value ??
            0
        ) || 0;

      setPromoCode(data.code || codeToUse);
      setPromoDiscount(nextDiscount);
      setPromoApplied(true);
      setPromoMessage(`Promo applied: ${nextDiscount}% off`);
      onPromoChange?.(data.code || codeToUse, nextDiscount);
    } catch (err) {
      console.error('Promo error:', err);
      setPromoApplied(false);
      setPromoDiscount(0);
      setPromoMessage('Error applying promo code');
      onPromoChange?.('', 0);
    } finally {
      setIsValidatingPromo(false);
    }
  }

  function handleRemovePromoCode() {
    setPromoCode('');
    setPromoDiscount(0);
    setPromoApplied(false);
    setPromoMessage('');
    onPromoChange?.('', 0);
  }

  async function handleCheckout() {
    setError('');

    if (!customerName.trim() || !customerEmail.trim()) {
      setError('Please enter your name and email.');
      return;
    }

    if (
      hasMerchandise &&
      fulfillmentMethod === 'shipping' &&
      !shippingAddress.trim()
    ) {
      setError('Please enter a shipping address.');
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: safeItems,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          fulfillmentMethod: hasMerchandise ? fulfillmentMethod : undefined,
          shippingAddress:
            hasMerchandise && fulfillmentMethod === 'shipping'
              ? shippingAddress.trim()
              : undefined,
          shippingFee,
          subtotal: safeSubtotal,
          lodgingTax: adjustedLodgingTax,
          salesTax: adjustedSalesTax,
          totalPrice: finalTotal,
          promoCode: promoApplied ? promoCode : undefined,
          promoDiscount: promoApplied ? promoDiscount : 0,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || 'Failed to create checkout session'
        );
      }

      if (!data?.url) {
        throw new Error('No checkout URL received');
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err?.message || 'Checkout failed');
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-900">Secure Checkout</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-lg bg-gray-50 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Order Summary</h3>

            {safeItems.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 text-sm">
                <span className="text-gray-600">
                  {item.type === 'activity'
                    ? `${item.activity?.name || 'Activity'} - ${
                        item.numPeople || 1
                      } people`
                    : item.type === 'property'
                    ? `${item.property?.name || 'Property'} - ${
                        item.guests || 1
                      } guests`
                    : item.type === 'merchandise'
                    ? `${item.merchandiseName || item.name || 'Merchandise'} x ${
                        item.quantity || 1
                      }`
                    : `Security Deposit - ${
                        item.propertyName || 'Property'
                      }`}
                </span>

                <span className="font-medium">
                  ${Number(item.price || 0).toFixed(2)}
                </span>
              </div>
            ))}

            <div className="border-t pt-2 flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${safeSubtotal.toFixed(2)}</span>
            </div>

            {promoApplied && promoDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>
                  Discount ({promoDiscount}%) - {promoCode}
                </span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}

            {adjustedSalesTax > 0 && (
              <div className="flex justify-between text-sm">
                <span>Sales Tax</span>
                <span>${adjustedSalesTax.toFixed(2)}</span>
              </div>
            )}

            {adjustedLodgingTax > 0 && (
              <div className="flex justify-between text-sm">
                <span>Lodging Tax</span>
                <span>${adjustedLodgingTax.toFixed(2)}</span>
              </div>
            )}

            {shippingFee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span>${shippingFee.toFixed(2)}</span>
              </div>
            )}

            {safeDepositAmount > 0 && (
              <div className="flex justify-between text-sm text-yellow-700">
                <span>Security Deposit Hold</span>
                <span>${safeDepositAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="border-t-2 pt-3 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-blue-600">
                ${finalTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Full Name</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-lg border px-4 py-3"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Email Address
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full rounded-lg border px-4 py-3"
              placeholder="john@example.com"
            />
          </div>

          {hasMerchandise && (
            <div className="rounded-lg border p-4">
              <label className="mb-3 block text-sm font-medium">
                Delivery Option
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFulfillmentMethod('pickup')}
                  className={`rounded-lg border px-4 py-3 text-left ${
                    fulfillmentMethod === 'pickup'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <div className="font-semibold">Local Pickup</div>
                  <div className="text-sm">No shipping charge</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillmentMethod('shipping')}
                  className={`rounded-lg border px-4 py-3 text-left ${
                    fulfillmentMethod === 'shipping'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <div className="font-semibold">Ship It</div>
                  <div className="text-sm">${SHIPPING_FEE.toFixed(2)} flat shipping</div>
                </button>
              </div>

              {fulfillmentMethod === 'shipping' && (
  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
    <h4 className="mb-4 text-base font-semibold text-gray-900">
      Shipping Address
    </h4>

    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          type="text"
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
          placeholder="Full name"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Street Address
        </label>
        <input
          type="text"
          value={shippingAddress}
          onChange={(e) => setShippingAddress(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
          placeholder="Street address"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Apt, Suite, Unit, etc. (optional)
        </label>
        <input
          type="text"
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
          placeholder="Apartment, suite, unit, etc."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            City
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            placeholder="City"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            State
          </label>

          <select className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3">
            <option value="">Select state</option>
            <option value="FL">Florida</option>
            <option value="CO">Colorado</option>
            <option value="TX">Texas</option>
            <option value="CA">California</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            ZIP Code
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            placeholder="ZIP code"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Country
        </label>

        <select className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3">
          <option value="US">United States</option>
        </select>
      </div>
    </div>
  </div>
)}
            </div>
          )}

          {!isDepositOnly && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Promo Code
              </label>

              {promoApplied ? (
                <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <Tag className="h-4 w-4" />
                    <span>
                      {promoCode} applied ({promoDiscount}% off)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemovePromoCode}
                    className="rounded bg-red-500 px-3 py-1 text-xs text-white"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={promoCode}
                    onChange={(e) =>
                      setPromoCode(e.target.value.toUpperCase())
                    }
                    className="flex-1 rounded-lg border px-3 py-2"
                    placeholder="Enter promo code"
                  />

                  <button
                    type="button"
                    onClick={handleApplyPromoCode}
                    disabled={isValidatingPromo}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                  >
                    {isValidatingPromo ? 'Checking...' : 'Apply'}
                  </button>
                </div>
              )}

              {promoMessage && (
                <p
                  className={`mt-2 text-sm ${
                    promoApplied ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {promoMessage}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleCheckout}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 font-semibold text-white disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Redirecting to checkout...
              </>
            ) : (
              'Proceed to Secure Checkout'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}