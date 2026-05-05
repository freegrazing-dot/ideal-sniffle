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
  promoDiscount?: number;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  items = [],
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
  const hasProperties = safeItems.some((item: any) => item?.type === 'property');
  const cleaningFee = hasProperties ? 190 : 0;

  const safeSubtotal = safeItems.reduce((sum: number, item: any) => {
    const price = Number(
      item.price ||
      item.activity?.price ||
      item.merchandise?.price ||
      item.property?.price ||
      0
    );

    const quantity = Number(item.quantity || 1);
    return sum + price * quantity;
  }, 0);

  function applyPromoCode() {
    const code = promoCode.trim().toUpperCase();
    setError('');

    if (code === 'TKAC20') setPromoDiscount(20);
    else if (code === 'VVH2026') setPromoDiscount(10);
    else if (code === 'TEST100') setPromoDiscount(100);
    else {
      setPromoDiscount(0);
      setError('Invalid promo code');
    }
  }

  const discountAmount = (safeSubtotal * promoDiscount) / 100;
  const discountedSubtotal = Math.max(0, safeSubtotal - discountAmount);

  const salesTaxAmount = discountedSubtotal * 0.065;
  const lodgingTaxAmount = hasProperties ? discountedSubtotal * 0.115 : 0;

  const finalTotal =
    discountedSubtotal + cleaningFee + salesTaxAmount + lodgingTaxAmount;

  const normalizedItems = safeItems.map((item: any, index: number) => {
    const price = Number(
      item.price ||
      item.activity?.price ||
      item.merchandise?.price ||
      item.property?.price ||
      0
    );

    return {
      ...item,
      type: item.type,
      price,
      quantity: item.quantity || 1,
      name:
        item.name ||
        item.activity?.name ||
        item.merchandise?.name ||
        item.merchandiseName ||
        item.property?.name ||
        `TKAC Item ${index + 1}`,
      activity: item.activity || null,
      property: item.property || null,
      merchandise: item.merchandise || null,
      bookingDate: item.bookingDate || '',
      bookingTime: item.bookingTime || '',
      checkInDate: item.checkInDate || '',
      checkOutDate: item.checkOutDate || '',
    };
  });

  async function handleCheckout() {
    setError('');

    if (!customerName || !customerEmail) {
      setError('Enter name and email');
      return;
    }

    if (!normalizedItems.length) {
      setError('Your cart is empty');
      return;
    }

    const badItem = normalizedItems.find((item: any) => !item.price || item.price <= 0);

    if (badItem) {
      console.error('Bad checkout item:', badItem);
      setError('One cart item has an invalid price. Remove it and add it again.');
      return;
    }

    setIsLoading(true);

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
            items: normalizedItems,
            customerEmail,
            customerName,
            subtotal: safeSubtotal,
            lodgingTax: lodgingTaxAmount,
            salesTax: salesTaxAmount,
            totalPrice: finalTotal,
            promoCode,
            promoDiscount,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Checkout failed');
      }

      if (!data?.url) {
        throw new Error('No checkout URL');
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Something went wrong');
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h2 className="font-bold text-lg">Secure Checkout</h2>
          <button onClick={onClose} type="button">
            <X />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${safeSubtotal.toFixed(2)}</span>
          </div>

          {promoDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Promo ({promoDiscount}%)</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}

          {hasProperties && (
            <div className="flex justify-between">
              <span>Cleaning Fee</span>
              <span>${cleaningFee.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Sales Tax</span>
            <span>${salesTaxAmount.toFixed(2)}</span>
          </div>

          {hasProperties && (
            <div className="flex justify-between">
              <span>Lodging Tax</span>
              <span>${lodgingTaxAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-blue-600 mt-3 pt-3 border-t">
            <span>Total</span>
            <span>${finalTotal.toFixed(2)}</span>
          </div>
        </div>

        <input
          placeholder="Full Name"
          className="w-full border p-2 mt-4 rounded"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />

        <input
          placeholder="Email"
          className="w-full border p-2 mt-2 rounded"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
        />

        <div className="flex mt-2 gap-2">
          <input
            placeholder="Promo Code"
            className="flex-1 border p-2 rounded"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
          />
          <button
            onClick={applyPromoCode}
            type="button"
            className="bg-black text-white px-3 rounded"
          >
            Apply
          </button>
        </div>

        {error && <div className="text-red-500 mt-2">{error}</div>}

        <button
          onClick={handleCheckout}
          type="button"
          className="w-full bg-blue-600 text-white mt-4 p-3 rounded flex items-center justify-center"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="animate-spin" /> : 'Proceed to Checkout'}
        </button>
      </div>
    </div>
  );
}