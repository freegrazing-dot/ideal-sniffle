import { useState } from 'react';
import { X, Loader2, Tag } from 'lucide-react';
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
  promoDiscount: initialPromoDiscount = 0,
  onPromoChange,
}: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(initialPromoDiscount);
  const [promoApplied, setPromoApplied] = useState(initialPromoDiscount > 0);
  const [promoMessage, setPromoMessage] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const hasProperties = items.some((item) => item.type === 'property');
  const hasMerchandise = items.some((item) => item.type === 'merchandise');
  const isDepositOnly = items.every((item) => item.type === 'security_deposit');

  const safeSubtotal = subtotal || 0;
  const discountAmount = (safeSubtotal * promoDiscount) / 100;
  const discountedSubtotal = safeSubtotal - discountAmount;

  const adjustedSalesTax =
    promoDiscount > 0 ? discountedSubtotal * 0.065 : salesTax;

  const adjustedLodgingTax =
    promoDiscount > 0 && hasProperties ? discountedSubtotal * 0.115 : lodgingTax;

  const finalTotal =
    promoDiscount > 0
      ? discountedSubtotal + adjustedSalesTax + adjustedLodgingTax
      : totalAmount;

async function handleCheckout() {
  setError('');

  if (!customerName || !customerEmail) {
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
          items,
          customerEmail,
          customerName,
          lodgingTax,
          salesTax,
          promoCode,
          promoDiscount,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Payment failed');
    }

    // 🚀 THIS IS THE KEY
    window.location.href = data.url;

  } catch (err: any) {
    console.error('Checkout error:', err);
    setError(err.message || 'Checkout failed');
    setIsLoading(false);
  }
}  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">

        <div className="flex justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Secure Checkout</h2>
          <button onClick={onClose}><X /></button>
        </div>

        <div className="space-y-6 p-6">

          <div>
            <label>Full Name</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border p-2"
            />
          </div>

          <div>
            <label>Email</label>
            <input
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full border p-2"
            />
          </div>

          {!isDepositOnly && (
            <div>
              <label>Promo Code</label>
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="w-full border p-2"
              />
            </div>
          )}

          {error && <div className="text-red-500">{error}</div>}

          <button
            onClick={handleCheckout}
            className="w-full bg-blue-600 text-white p-3"
          >
            {isLoading ? 'Processing...' : 'Checkout'}
          </button>

        </div> {/* closes space-y-6 */}

      </div>
    </div>
  );
}