import { X, ShoppingCart, Trash2, Calendar, Clock, Users } from 'lucide-react';
import { useCart } from '../lib/cart-context';
import { useState } from 'react';
import CheckoutModal from './CheckoutModal';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartModal({ isOpen, onClose }: CartModalProps) {
  const { items, removeItem, clearCart, totalPrice, subtotal, lodgingTax, salesTax, depositAmount, itemCount } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);

  console.log('🛒 CartModal render - isOpen:', isOpen, 'showCheckout:', showCheckout);

  const handleCheckoutSuccess = () => {
    clearCart();
    setShowCheckout(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {!showCheckout && (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6 rounded-t-2xl z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">Your Cart</h2>
                  <p className="text-cyan-100 text-sm">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all items from your cart?')) {
                        clearCart();
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-sm font-medium"
                    title="Clear all items"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Your cart is empty</p>
                <p className="text-gray-400 text-sm mt-2">Add some activities to get started!</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gradient-to-br from-slate-50 to-cyan-50 rounded-xl p-4 border border-cyan-100"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg mb-2">
                            {item.type === 'activity'
                              ? item.activity?.name
                              : item.type === 'property'
                              ? item.property?.name
                              : item.type === 'merchandise'
                              ? item.merchandiseName
                              : `Security Deposit - ${item.propertyName}`}
                          </h3>
                          <div className="space-y-1 text-sm text-gray-600">
                            {item.type === 'activity' ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-cyan-600" />
                                  <span>{item.bookingDate} at {item.bookingTime}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-cyan-600" />
                                  <span>{item.numPeople} {item.numPeople === 1 ? 'person' : 'people'}</span>
                                </div>
                                {item.duration && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-cyan-600" />
                                    <span>{item.duration} hours</span>
                                  </div>
                                )}
                                {item.rentalType && (
                                  <div className="text-cyan-700 font-medium">
                                    {item.rentalType === 'double' ? '2 People (Same Unit)' : '1 Person'}
                                  </div>
                                )}
                                {item.damageProtection && (
                                  <div className={`mt-2 text-sm font-semibold ${item.damageProtection === 'insurance' ? 'text-green-700' : 'text-orange-700'}`}>
                                    {item.damageProtection === 'insurance'
                                      ? '✓ Damage Insurance ($25)'
                                      : '✓ Security Deposit ($500 Hold)'}
                                  </div>
                                )}
                              </>
                            ) : item.type === 'property' ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-cyan-600" />
                                  <span>Check-in: {item.checkInDate}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-cyan-600" />
                                  <span>Check-out: {item.checkOutDate}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-cyan-600" />
                                  <span>{item.guests} {item.guests === 1 ? 'guest' : 'guests'}</span>
                                </div>
                              </>
                            ) : item.type === 'merchandise' ? (
                              <>
                                <div className="text-gray-600">
                                  Size: <span className="font-medium">{item.merchandiseSize}</span>
                                </div>
                                <div className="text-gray-600">
                                  Color: <span className="font-medium">{item.merchandiseColor}</span>
                                </div>
                                <div className="text-gray-600">
                                  Quantity: <span className="font-medium">{item.quantity}</span>
                                </div>
                              </>
                            ) : (
                              <div className="text-yellow-700 font-medium">
                                Authorization Hold - Not Charged
                              </div>
                            )}
                            {item.description && item.type === 'security_deposit' && (
                              <div className="text-gray-600 text-xs mt-2">
                                {item.description}
                              </div>
                            )}
                            {item.specialRequests && (
                              <div className="text-gray-500 italic mt-2">
                                Note: {item.specialRequests}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-cyan-700 mb-2">
                            ${item.price.toFixed(2)}
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove from cart"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200 mb-6">
                    {(depositAmount > 0 || lodgingTax > 0 || salesTax > 0) ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-lg text-gray-700">
                          <span>Subtotal</span>
                          <span className="font-semibold">${subtotal.toFixed(2)}</span>
                        </div>
                        {salesTax > 0 && (
                          <div className="flex justify-between items-center text-lg text-gray-700">
                            <span>Sales Tax (6.5%)</span>
                            <span className="font-semibold">${salesTax.toFixed(2)}</span>
                          </div>
                        )}
                        {lodgingTax > 0 && (
                          <div className="flex justify-between items-center text-lg text-gray-700">
                            <span>Lodging Tax (11.5%)</span>
                            <span className="font-semibold">${lodgingTax.toFixed(2)}</span>
                          </div>
                        )}
                        {depositAmount > 0 && (
                          <div className="flex justify-between items-center text-lg text-yellow-700">
                            <span className="font-medium">Security Deposit (Hold - Not Charged)</span>
                            <span className="font-semibold">${depositAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-cyan-300 flex justify-between items-center text-2xl font-bold text-cyan-700">
                          <span>Total Amount</span>
                          <span>${totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-2xl font-bold text-cyan-700">
                        <span>Total Amount</span>
                        <span>${totalPrice.toFixed(2)}</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-600 mt-4">
                      Secure embedded payment powered by Stripe
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Continue Shopping
                    </button>
                    <button
                      onClick={() => {
                        console.log('🔥 CHECKOUT BUTTON CLICKED');
                        console.log('🔥 showCheckout BEFORE:', showCheckout);
                        setShowCheckout(true);
                        console.log('🔥 showCheckout set to TRUE');
                        setTimeout(() => {
                          console.log('🔥 showCheckout AFTER (100ms):', showCheckout);
                        }, 100);
                      }}
                      disabled={items.length === 0}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      )}

      {console.log('🚀 Rendering CheckoutModal with isOpen:', showCheckout)}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => {
          console.log('🎟️ CheckoutModal onClose called');
          setShowCheckout(false);
        }}
        items={items}
        totalAmount={totalPrice}
        subtotal={subtotal}
        lodgingTax={lodgingTax}
        salesTax={salesTax}
        depositAmount={depositAmount}
        onSuccess={handleCheckoutSuccess}
      />
    </>
  );
}
