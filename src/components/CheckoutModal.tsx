import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { CartItem } from '../lib/cart-context';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items?: CartItem[];
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
  items = [],
  totalAmount,
  subtotal,
  lodgingTax,
  salesTax,
  depositAmount,
  promoDiscount: initialPromoDiscount = 0,
}: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(initialPromoDiscount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const safeItems = Array.isArray(items) ? items : [];

  const hasProperties = safeItems.some((item) => item?.type === 'property');
  const isDepositOnly =
    safeItems.length > 0 &&
    safeItems.every((item) => item?.type === 'security_deposit');

  const safeSubtotal = Number(subtotal || 0);
  const safeLodgingTax = Number(lodgingTax || 0);
  const safeSalesTax = Number(salesTax || 0);
  const safeDepositAmount = Number(depositAmount || 0);
  const safeTotalAmount = Number(totalAmount || 0);

  function applyPromoCode() {
    const code = promoCode.trim().toUpperCase();

    if (!code) {
      setPromoDiscount(0);
      return;
    }

    if (code === 'TKAC20') {
      setPromoDiscount(20);
      return;
    }

    if (code === 'VVH2026') {
      setPromoDiscount(10);
      return;
    }

    if (code === 'TEST100') {
      setPromoDiscount(100);
      return;
    }

    setPromoDiscount(0);
    setError('Invalid promo code');
  }

  const discountAmount = (safeSubtotal * promoDiscount) / 100;
  const discountedSubtotal = Math.max(0, safeSubtotal - discountAmount);

  const adjustedSalesTax =
    promoDiscount > 0 ? discountedSubtotal * 0.065 : safeSalesTax;

  const adjustedLodgingTax =
    promoDiscount > 0 && hasProperties
      ? discountedSubtotal * 0.115
      : safeLodgingTax;

  const finalTotal =
    safeTotalAmount > 0 && promoDiscount === 0
      ? safeTotalAmount
      : discountedSubtotal + adjustedSalesTax + adjustedLodgingTax;

  async function handleCheckout() {
    setError('');

    if (!customerName.trim() || !customerEmail.trim()) {
      setError('Please enter name and email');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: safeItems,
            customerEmail: customerEmail.trim(),
            customerName: customerName.trim(),
            subtotal: safeSubtotal,
            lodgingTax: adjustedLodgingTax,
            salesTax: adjustedSalesTax,
            totalPrice: finalTotal,
            promoCode: promoCode.trim().toUpperCase(),
            promoDiscount,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Payment failed');
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
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex justify-between border-b p-6">
          <h2 className="text-xl font-bold">Secure Checkout</h2>
          <button onClick={onClose} type="button">
            <X />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-xl bg-gray-50 p-4">
            <h3 className="mb-4 font-semibold">Order Summary</h3>

            <div className="flex justify-between">
  <span>Rental Subtotal</span>
  <span>${safeSubtotal.toFixed(2)}</span>
</div>

{hasProperties && (
  <div className="flex justify-between text-gray-600">
    <span>Includes Cleaning Fee</span>
    <span>$190.00</span>
  </div>
)}

            {promoDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Promo Discount ({promoDiscount}%)</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Sales Tax</span>
              <span>${adjustedSalesTax.toFixed(2)}</span>
            </div>

            {hasProperties && (
              <div className="flex justify-between">
                <span>Lodging Tax</span>
                <span>${adjustedLodgingTax.toFixed(2)}</span>
              </div>
            )}

            {safeDepositAmount > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Security Deposit Hold</span>
                <span>${safeDepositAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="mt-4 flex justify-between border-t pt-4 text-lg font-bold">
              <span>Total</span>
              <span className="text-blue-600">${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="font-semibold">Full Name</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-2 w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="font-semibold">Email Address</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border p-3"
            />
          </div>

          {!isDepositOnly && (
            <div>
              <label className="font-semibold">Promo Code</label>
              <div className="mt-2 flex gap-2">
                <input
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  className="w-full rounded-lg border p-3"
                  placeholder="Enter promo code"
                />
                <button
                  onClick={applyPromoCode}
                  className="rounded-lg bg-gray-900 px-4 font-semibold text-white"
                  type="button"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {error && <div className="text-red-500">{error}</div>}

          <button
            onClick={handleCheckout}
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-lg bg-blue-600 p-3 font-semibold text-white disabled:opacity-50"
            type="button"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : 'Proceed to Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}