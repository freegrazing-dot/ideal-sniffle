import { X, ShoppingCart, Trash2, Calendar, Clock, Users } from 'lucide-react';
import { useCart } from '../lib/cart-context';
import { useState } from 'react';
import CheckoutModal from './CheckoutModal';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function money(value: any) {
  return Number(value || 0).toFixed(2);
}

export function CartModal({ isOpen, onClose }: CartModalProps) {
  const cart = useCart();

  const items = Array.isArray(cart.items) ? cart.items : [];
  const removeItem = cart.removeItem;
  const clearCart = cart.clearCart;

  const totalPrice = Number(cart.totalPrice || 0);
  const subtotal = Number(cart.subtotal || 0);
  const lodgingTax = Number(cart.lodgingTax || 0);
  const salesTax = Number(cart.salesTax || 0);
  const depositAmount = Number(cart.depositAmount || 0);
  const itemCount = Number(cart.itemCount || items.length || 0);

  const [showCheckout, setShowCheckout] = useState(false);

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
                    <p className="text-cyan-100 text-sm">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Clear all items from your cart?')) {
                          clearCart();
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear All
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 hover:bg-white/20 rounded-lg"
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
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {items.map((item: any, index: number) => {
                      const displayName =
                        item.type === 'activity'
                          ? item.activity?.name || item.name || 'Activity'
                          : item.type === 'property'
                          ? item.property?.name || item.name || 'Property Rental'
                          : item.type === 'merchandise'
                          ? item.merchandise?.name || item.merchandiseName || item.name || 'Merchandise'
                          : item.propertyName
                          ? `Security Deposit - ${item.propertyName}`
                          : 'Cart Item';

                      const price = Number(item.price || item.activity?.price || item.merchandise?.price || 0);

                      return (
                        <div
                          key={item.id || `${item.type || 'item'}-${index}`}
                          className="bg-gradient-to-br from-slate-50 to-cyan-50 rounded-xl p-4 border border-cyan-100"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900 text-lg mb-2">
                                {displayName}
                              </h3>

                              <div className="space-y-1 text-sm text-gray-600">
                                {item.type === 'activity' && (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-cyan-600" />
                                      <span>
                                        {item.bookingDate || 'Date not selected'} at {item.bookingTime || 'Time not selected'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4 text-cyan-600" />
                                      <span>
                                        {item.numPeople || item.guests || 1}{' '}
                                        {(item.numPeople || item.guests || 1) === 1 ? 'person' : 'people'}
                                      </span>
                                    </div>

                                    {item.duration && (
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-cyan-600" />
                                        <span>{item.duration} hours</span>
                                      </div>
                                    )}
                                  </>
                                )}

                                {item.type === 'property' && (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-cyan-600" />
                                      <span>Check-in: {item.checkInDate || 'Not selected'}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-cyan-600" />
                                      <span>Check-out: {item.checkOutDate || 'Not selected'}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4 text-cyan-600" />
                                      <span>{item.guests || 1} guests</span>
                                    </div>
                                  </>
                                )}

                                {item.type === 'merchandise' && (
                                  <>
                                    {item.merchandiseSize && <div>Size: {item.merchandiseSize}</div>}
                                    {item.merchandiseColor && <div>Color: {item.merchandiseColor}</div>}
                                    <div>Quantity: {item.quantity || 1}</div>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xl font-bold text-cyan-700 mb-2">
                                ${money(price)}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
  if (item?.id) {
    removeItem(item.id);
  }
}}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200 mb-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-lg text-gray-700">
                          <span>Subtotal</span>
                          <span className="font-semibold">${money(subtotal)}</span>
                        </div>

                        {salesTax > 0 && (
                          <div className="flex justify-between text-lg text-gray-700">
                            <span>Sales Tax</span>
                            <span className="font-semibold">${money(salesTax)}</span>
                          </div>
                        )}

                        {lodgingTax > 0 && (
                          <div className="flex justify-between text-lg text-gray-700">
                            <span>Lodging Tax</span>
                            <span className="font-semibold">${money(lodgingTax)}</span>
                          </div>
                        )}

                        {depositAmount > 0 && (
                          <div className="flex justify-between text-lg text-yellow-700">
                            <span>Security Deposit Hold</span>
                            <span className="font-semibold">${money(depositAmount)}</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-cyan-300 flex justify-between text-2xl font-bold text-cyan-700">
                          <span>Total Amount</span>
                          <span>${money(totalPrice)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold"
                      >
                        Continue Shopping
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCheckout(true)}
                        disabled={items.length === 0}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
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

      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        items={items}
        totalAmount={totalPrice}
        subtotal={subtotal}
        lodgingTax={lodgingTax}
        salesTax={salesTax}
        depositAmount={depositAmount}
      />
    </>
  );
}