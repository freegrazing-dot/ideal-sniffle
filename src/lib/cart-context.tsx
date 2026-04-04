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
  size: string;
  color: string;
  quantity: number;
  price: number;
  description: string;
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart:', error);
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
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error refreshing cart:', error);
      }
    }
  };

  const addItem = async (params: AddActivityToCartParams) => {
    const cartItem: CartItem = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'activity',
      activity: params.activity,
      rentalType: params.rentalType,
      duration: params.duration,
      numPeople: params.numPeople,
      bookingDate: params.bookingDate,
      bookingTime: params.bookingTime,
      specialRequests: params.specialRequests,
      price: params.price,
      phoneNumber: params.phoneNumber,
      damageProtection: params.damageProtection,
      damageProtectionAmount: params.damageProtectionAmount,
    };

    setItems(prev => [...prev, cartItem]);
  };

  const addPropertyItem = async (params: AddPropertyToCartParams) => {
    const cartItem: CartItem = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'property',
      property: params.property,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      guests: params.guests,
      specialRequests: params.specialRequests,
      price: params.price,
      phoneNumber: params.phoneNumber,
    };

    setItems(prev => [...prev, cartItem]);
  };

  const addSecurityDepositItem = async (params: AddSecurityDepositParams) => {
    const cartItem: CartItem = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'security_deposit',
      propertyName: params.propertyName,
      price: params.depositAmount,
      description: params.description,
    };

    setItems(prev => [...prev, cartItem]);
  };

  const addMerchandiseItem = async (params: AddMerchandiseParams) => {
    const cartItem: CartItem = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'merchandise',
      merchandiseName: params.name,
      merchandiseSize: params.size,
      merchandiseColor: params.color,
      quantity: params.quantity,
      price: params.price * params.quantity,
      description: params.description,
    };

    setItems(prev => [...prev, cartItem]);
  };

  const removeItem = async (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = async () => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const propertyCount = items.filter(item => item.type === 'property').length;
  const propertySubtotal = items.filter(item => item.type === 'property').reduce((sum, item) => sum + item.price, 0);
  const activitySubtotal = items.filter(item => item.type === 'activity').reduce((sum, item) => sum + item.price, 0);
  const merchandiseSubtotal = items.filter(item => item.type === 'merchandise').reduce((sum, item) => sum + item.price, 0);
  const lodgingTax = propertySubtotal * 0.115;
  const salesTax = (activitySubtotal + merchandiseSubtotal) * 0.065;
  const propertyDepositAmount = propertyCount * 500;
  const damageHoldAmount = items
    .filter(item => item.type === 'activity' && item.damageProtection === 'hold')
    .reduce((sum, item) => sum + (item.damageProtectionAmount || 0), 0);
  const depositAmount = propertyDepositAmount + damageHoldAmount;
  // Security deposits are holds, not charges - don't add to total
  const totalPrice = subtotal + lodgingTax + salesTax;
  const itemCount = items.length;

  return (
    <CartContext.Provider value={{ items, addItem, addPropertyItem, addSecurityDepositItem, addMerchandiseItem, removeItem, clearCart, refreshCart, totalPrice, subtotal, lodgingTax, salesTax, depositAmount, itemCount }}>
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
