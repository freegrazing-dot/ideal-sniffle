import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { CartItem } from '../lib/cart-context';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items?: CartItem[];
}

export default function CheckoutModal({
  isOpen,
  onClose,
  items = [],
}: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const safeItems = Array.isArray(items) ? items : [];

  const normalizedItems = safeItems.map((item: any, index: number) => {
    const safePrice = Number(
      item?.price ||
      item?.activity?.price ||
      item?.merchandise?.price ||
      item?.property?.price_per_night ||
      item?.property?.price ||
      0
    );

    return {
      ...item,
      price: safePrice,
      quantity: Number(item?.quantity || 1),
      type: item?.type || 'unknown',

      name:
        item?.name ||
        item?.activity?.name ||
        item?.activity?.title ||
        item?.merchandise?.name ||
        item?.property?.name ||
        `TKAC Item ${index + 1}`,

      activity: item?.activity || null,
      property: item?.property || null,
      merchandise: item?.merchandise || null,

      bookingDate: item?.bookingDate || '',
      bookingTime: item?.bookingTime || '',
      checkInDate: item?.checkInDate || '',
      checkOutDate: item?.checkOutDate || '',
      guests: Number(item?.guests || 1),
    };
  });

  const hasProperties = normalizedItems.some(
    (item: any) => item?.type === 'property'
  );

  const cleaningFee = hasProperties ? 190 : 0;

  const subtotal = normalizedItems.reduce((sum: number, item: any) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 1);
  }, 0);

  function applyPromoCode() {
    const code = promoCode.trim().toUpperCase();

    setError('');

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

  const discountAmount =
    Number(subtotal || 0) * (Number(promoDiscount || 0) / 100);

  const discountedSubtotal = Math.max(
    0,
    Number(subtotal || 0) - Number(discountAmount || 0)
  );

  const salesTaxAmount = discountedSubtotal * 0.065;

  const lodgingTaxAmount = hasProperties
    ? discountedSubtotal * 0.115
    : 0;

  const finalTotal =
    discountedSubtotal +
    Number(cleaningFee || 0) +
    Number(salesTaxAmount || 0) +
    Number(lodgingTaxAmount || 0);

  async function handleCheckout() {
    try {
      setError('');
      setIsLoading(true);

      if (!customerName.trim()) {
        throw new Error('Please enter your name');
      }

      if (!customerEmail.trim()) {
        throw new Error('Please enter your email');
      }

      if (!normalizedItems.length) {
        throw new Error('Your cart is empty');
      }

      const badItem = normalizedItems.find(
        (item: any) =>
          !Number(item?.price || 0) ||
          Number(item?.price || 0) <= 0
      );

      if (badItem) {
        console.error('Bad item:', badItem);
        throw new Error(
          'One cart item has an invalid price. Remove it and add it again.'
        );
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: normalizedItems,
            customerName,
            customerEmail,
            subtotal: Number(subtotal || 0),
            cleaningFee: Number(cleaningFee || 0),
            promoCode,
            promoDiscount: Number(promoDiscount || 0),
            salesTax: Number(salesTaxAmount || 0),
            lodgingTax: Number(lodgingTaxAmount || 0),
            totalPrice: Number(finalTotal || 0),
          }),
        }
      );

      const data = await response.json();

      console.log('Checkout response:', data);

      if (!response.ok) {
        throw new Error(data?.error || 'Checkout failed');
      }

      if (!data?.url) {
        throw new Error('Stripe checkout URL missing');
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err?.message || 'Checkout failed');
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            Secure Checkout
          </h2>

          <button onClick={onClose} type="button">
            <X />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>
              ${Number(subtotal || 0).toFixed(2)}
            </span>
          </div>

          {promoDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>
                Promo ({Number(promoDiscount || 0)}%)
              </span>

              <span>
                -$
                {Number(discountAmount || 0).toFixed(2)}
              </span>
            </div>
          )}

          {hasProperties && (
            <div className="flex justify-between">
              <span>Cleaning Fee</span>

              <span>
                ${Number(cleaningFee || 0).toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Sales Tax</span>

            <span>
              ${Number(salesTaxAmount || 0).toFixed(2)}
            </span>
          </div>

          {hasProperties && (
            <div className="flex justify-between">
              <span>Lodging Tax</span>

              <span>
                ${Number(lodgingTaxAmount || 0).toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between font-bold text-blue-600 border-t pt-3 mt-3">
            <span>Total</span>

            <span>
              ${Number(finalTotal || 0).toFixed(2)}
            </span>
          </div>
        </div>

        <input
          type="text"
          placeholder="Full Name"
          className="w-full border rounded p-2 mt-4"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email Address"
          className="w-full border rounded p-2 mt-2"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
        />

        <div className="flex gap-2 mt-2">
          <input
            type="text"
            placeholder="Promo Code"
            className="flex-1 border rounded p-2"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
          />

          <button
            type="button"
            onClick={applyPromoCode}
            className="bg-black text-white px-4 rounded"
          >
            Apply
          </button>
        </div>

        {error && (
          <div className="text-red-500 mt-2 text-sm">
            {String(error)}
          </div>
        )}

        <button
          type="button"
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded p-3 mt-4 flex items-center justify-center"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            'Proceed to Checkout'
          )}
        </button>
      </div>
    </div>
  );
}