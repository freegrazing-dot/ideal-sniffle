import { useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  items?: any[];
  totalAmount?: number;
};

export default function CheckoutModal({
  isOpen,
  onClose,
  items,
  totalAmount,
}: Props) {
  if (!isOpen) return null;

  // 🛡️ ALWAYS SAFE
  const safeItems = Array.isArray(items) ? items : [];

  const subtotal = Number(totalAmount || 0);

  const [promoCode, setPromoCode] = useState('');
  const [promoPercent, setPromoPercent] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);

  // ✅ SIMPLE PROMO LOGIC (matches your backend)
  function applyPromo() {
    const code = promoCode.trim().toUpperCase();

    let percent = 0;

    if (code === 'TKAC20') percent = 20;
    if (code === 'VVH2026') percent = 10;
    if (code === 'TEST100') percent = 100;

    setPromoPercent(percent);
    setPromoApplied(percent > 0);
  }

  const discountAmount =
    promoPercent > 0 ? (subtotal * promoPercent) / 100 : 0;

  const finalTotal = subtotal - discountAmount;

  async function handleCheckout() {
    try {
      const res = await fetch(
        'https://uqlggilqcovmukjivyhq.supabase.co/functions/v1/create-payment-intent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: safeItems,
            promoCode,
            promoDiscount: promoPercent,
          }),
        }
      );

      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert('Checkout error');
      }
    } catch (err) {
      console.error(err);
      alert('Checkout failed');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg p-6 rounded-lg">

        <h2 className="text-xl font-bold mb-4">Checkout</h2>

        {/* PROMO */}
        <div className="flex gap-2 mb-4">
          <input
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Promo Code"
            className="border p-2 flex-1 rounded"
          />
          <button
            onClick={applyPromo}
            className="bg-blue-600 text-white px-3 rounded"
          >
            Apply
          </button>
        </div>

        {/* TOTALS */}
        <div className="space-y-2 mb-4">

          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          {promoApplied && (
            <div className="flex justify-between text-green-600">
              <span>Promo Discount</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>${finalTotal.toFixed(2)}</span>
          </div>

        </div>

        {/* ACTIONS */}
        <div className="flex justify-between gap-2">
          <button
            onClick={onClose}
            className="border px-4 py-2 rounded w-full"
          >
            Cancel
          </button>

          <button
            onClick={handleCheckout}
            className="bg-green-600 text-white px-4 py-2 rounded w-full"
          >
            Pay Now
          </button>
        </div>

      </div>
    </div>
  );
}