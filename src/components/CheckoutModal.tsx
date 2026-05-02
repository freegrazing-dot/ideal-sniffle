import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { CartItem } from '../lib/cart-context';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items?: CartItem[];
  subtotal: number;
  lodgingTax: number;
  salesTax: number;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  items = [],
  subtotal,
  lodgingTax,
  salesTax,
}: Props) {
  const safeItems = Array.isArray(items) ? items : [];

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const hasProperties = safeItems.some(i => i.type === 'property');

  // 💥 PROMO APPLY
  function applyPromo() {
    const code = promoCode.trim().toUpperCase();

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

    alert('Invalid promo code');
    setPromoDiscount(0);
  }

  // 💥 TOTALS
  const discountAmount = (subtotal * promoDiscount) / 100;
  const discountedSubtotal = subtotal - discountAmount;

  const adjustedSalesTax =
    promoDiscount > 0 ? discountedSubtotal * 0.065 : salesTax;

  const adjustedLodgingTax =
    promoDiscount > 0 && hasProperties
      ? discountedSubtotal * 0.115
      : lodgingTax;

  const total =
    discountedSubtotal + adjustedSalesTax + adjustedLodgingTax;

  // 💥 CHECKOUT
  async function handleCheckout() {
    setError('');

    if (!customerName || !customerEmail) {
      setError('Enter name and email');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: safeItems,
            customerEmail,
            customerName,
            salesTax: adjustedSalesTax,
            lodgingTax: adjustedLodgingTax,
            promoCode,
            promoDiscount,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white p-6 rounded-xl w-full max-w-lg">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Checkout</h2>
          <button onClick={onClose}><X /></button>
        </div>

        <div className="space-y-4">
          <input
            placeholder="Full Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <input
            placeholder="Email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="w-full border p-3 rounded"
          />

          {/* PROMO */}
          <div className="flex gap-2">
            <input
              placeholder="Promo Code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1 border p-3 rounded"
            />
            <button
              onClick={applyPromo}
              className="bg-gray-800 text-white px-4 rounded"
            >
              Apply
            </button>
          </div>

          {promoDiscount > 0 && (
            <div className="text-green-600">
              {promoDiscount}% discount applied
            </div>
          )}

          {/* SUMMARY */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            {promoDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>- ${discountAmount.toFixed(2)}</span>
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

            <div className="flex justify-between font-bold text-lg mt-2">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {error && <div className="text-red-500">{error}</div>}

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded flex justify-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  );
}