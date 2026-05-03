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
  onSuccess,
}: CheckoutModalProps) {
  const safeItems = Array.isArray(items) ? items : [];

  const hasProperties = safeItems.some(
    (item) => item?.type === 'property'
  );

  const isDepositOnly =
    safeItems.length > 0 &&
    safeItems.every((item) => item?.type === 'security_deposit');

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount] = useState(initialPromoDiscount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const safeSubtotal = Number(subtotal || 0);
  const safeLodgingTax = Number(lodgingTax || 0);
  const safeSalesTax = Number(salesTax || 0);
  const safeDepositAmount = Number(depositAmount || 0);
  const safeTotalAmount = Number(totalAmount || 0);

  const discountAmount = (safeSubtotal * promoDiscount) / 100;
  const discountedSubtotal = Math.max(0, safeSubtotal - discountAmount);

  const adjustedSalesTax =
    promoDiscount > 0 ? discountedSubtotal * 0.065 : safeSalesTax;

  const adjustedLodgingTax =
    promoDiscount > 0 && hasProperties
      ? discountedSubtotal * 0.115
      : safeLodgingTax;

  const finalTotal =
    safeTotalAmount > 0
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
            promoCode,
            promoDiscount,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Payment failed');
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