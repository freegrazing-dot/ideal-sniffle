import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Activity, Property } from '../types';

interface AddActivityToCartParams {
  activity: Activity;
  rentalType?: 'single' | 'double';
  duration?: number;
  numPeople: number;
  bookingDate: string;
  bookingTime: string;
  specialRequests?: string;
  price: number;
  phoneNumber: string;
  damageProtection?: 'insurance' | 'hold';
  damageProtectionAmount?: number;
}

interface AddPropertyToCartParams {
  property: Property;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  specialRequests?: string;
  price: number;
  phoneNumber: string;
}

interface AddSecurityDepositParams {
  propertyId: string;
  propertyName: string;
  depositAmount: number;
  description: string;
}

interface AddMerchandiseParams {
  merchandiseId: string;
  name: string;
  size?: string;
  color?: string;
  quantity?: number;
  price: number;
  description?: string;
}

export interface CartItem {
  id: string;
  type: 'activity' | 'property' | 'security_deposit' | 'merchandise';
  activity?: Activity;
  property?: Property;
  propertyName?: string;
  rentalType?: 'single' | 'double';
  duration?: number;
  numPeople?: number;
  bookingDate?: string;
  bookingTime?: string;
  checkInDate?: string;
  checkOutDate?: string;
  guests?: number;
  specialRequests?: string;
  price: number;
  description?: string;
  phoneNumber?: string;
  merchandiseId?: string;
  merchandiseName?: string;
  merchandiseSize?: string;
  merchandiseColor?: string;
  quantity?: number;
  damageProtection?: 'insurance' | 'hold';
  damageProtectionAmount?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (params: AddActivityToCartParams) => Promise<void>;
  addPropertyItem: (params: AddPropertyToCartParams) => Promise<void>;
  addSecurityDepositItem: (params: AddSecurityDepositParams) => Promise<void>;
  addMerchandiseItem: (params: AddMerchandiseParams) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  totalPrice: number;
  subtotal: number;
  lodgingTax: number;
  salesTax: number;
  depositAmount: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'tkac_cart';

function toMoneyNumber(value: any): number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function normalizeItem(item: any): CartItem | null {
  if (!item || !item.type) return null;

  const quantity = Math.max(1, Number(item.quantity || 1));
  const price = toMoneyNumber(item.price);

  return {
    ...item,
    id: item.id || `${Date.now()}-${Math.random()}`,
    quantity,
    price,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);

    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        const cleaned = Array.isArray(parsed)
          ? parsed
              .map(normalizeItem)
              .filter((item): item is CartItem => Boolean(item))
          : [];

        setItems(cleaned);
      } catch (error) {
        console.error('Error loading cart:', error);
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const refreshCart = async () => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);

    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        const cleaned = Array.isArray(parsed)
          ? parsed
              .map(normalizeItem)
              .filter((item): item is CartItem => Boolean(item))
          : [];

        setItems(cleaned);
      } catch (error) {
        console.error('Error refreshing cart:', error);
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    }
  };

  const addItem = async (params: AddActivityToCartParams) => {
    const price = toMoneyNumber(params.price);

    if (!price) {
      throw new Error('Invalid activity price');
    }

    const cartItem: CartItem = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'activity',
      activity: params.activity,
      rentalType: params.rentalType,
      duration: params.duration,
      numPeople: Number(params.numPeople || 1),
      bookingDate: params.bookingDate,
      bookingTime: params.bookingTime,
      specialRequests: params.specialRequests || '',
      price,
      quantity: 1,
      phoneNumber: params.phoneNumber,
      damageProtection: params.damageProtection,
      damageProtectionAmount: toMoneyNumber(params.damageProtectionAmount),
    };

    setItems((prev) => [...prev, cartItem]);
  };

  const addPropertyItem = async (params: AddPropertyToCartParams) => {
    const price = toMoneyNumber(params.price);

    if (!price) {
      throw new Error('Invalid rental price');
    }

    const cartItem: CartItem = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'property',
      property: params.property,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      guests: Number(params.guests || 1),
      specialRequests: params.specialRequests || '',
      price,
      quantity: 1,
      phoneNumber: params.phoneNumber,
    };

    setItems((prev) => [...prev, cartItem]);
  };

  const addSecurityDepositItem = async (params: AddSecurityDepositParams) => {
    const price = toMoneyNumber(params.depositAmount);

    const cartItem: CartItem = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'security_deposit',
      propertyName: params.propertyName,
      price,
      quantity: 1,
      description: params.description,
    };

    setItems((prev) => [...prev, cartItem]);
  };

  const addMerchandiseItem = async (params: AddMerchandiseParams) => {
    const quantity = Math.max(1, Number(params.quantity || 1));
    const unitPrice = toMoneyNumber(params.price);

    if (!unitPrice) {
      throw new Error('Invalid merchandise price');
    }

    const cartItem: CartItem = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'merchandise',
      merchandiseId: params.merchandiseId,
      merchandiseName: params.name || 'Merchandise',
      merchandiseSize: params.size || '',
      merchandiseColor: params.color || '',
      quantity,
      price: unitPrice * quantity,
      description: params.description || '',
    };

    setItems((prev) => [...prev, cartItem]);
  };

  const removeItem = async (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const clearCart = async () => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const chargeableItems = items.filter((item) => item.type !== 'security_deposit');

  const subtotal = chargeableItems.reduce(
    (sum, item) => sum + toMoneyNumber(item.price),
    0
  );

  const propertyItems = chargeableItems.filter((item) => item.type === 'property');
  const activityItems = chargeableItems.filter((item) => item.type === 'activity');
  const merchandiseItems = chargeableItems.filter((item) => item.type === 'merchandise');

  const propertySubtotal = propertyItems.reduce(
    (sum, item) => sum + toMoneyNumber(item.price),
    0
  );

  const activitySubtotal = activityItems.reduce(
    (sum, item) => sum + toMoneyNumber(item.price),
    0
  );

  const merchandiseSubtotal = merchandiseItems.reduce(
    (sum, item) => sum + toMoneyNumber(item.price),
    0
  );

  const lodgingTax = propertySubtotal * 0.115;
  const salesTax = (activitySubtotal + merchandiseSubtotal) * 0.065;

  const propertyDepositAmount = propertyItems.length * 500;

  const damageHoldAmount = activityItems
    .filter((item) => item.damageProtection === 'hold')
    .reduce((sum, item) => sum + toMoneyNumber(item.damageProtectionAmount), 0);

  const depositAmount = propertyDepositAmount + damageHoldAmount;

  const totalPrice = subtotal + lodgingTax + salesTax;
  const itemCount = items.length;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        addPropertyItem,
        addSecurityDepositItem,
        addMerchandiseItem,
        removeItem,
        clearCart,
        refreshCart,
        totalPrice,
        subtotal,
        lodgingTax,
        salesTax,
        depositAmount,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }

  return context;
}