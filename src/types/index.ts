export interface Activity {
  id: string;
  name: string;
  description: string;
  duration_hours: number;
  capacity: number;
  base_price: number;
  image_url: string;
  active: boolean;
  created_at: string;
}

export interface Booking {
  id?: string;
  activity_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  booking_date: string;
  booking_time: string;
  num_people: number;
  total_price: number;
  subtotal?: number;
  sales_tax?: number;
  surtax?: number;
  tax_total?: number;
  status?: string;
  payment_status?: string;
  payment_intent_id?: string;
  special_requests?: string;
  source?: string;
  external_id?: string;
  operator_dob?: string;
  boating_safety_card_url?: string;
  acknowledgments?: Record<string, boolean>;
  damage_protection_type?: 'insurance' | 'hold';
  damage_protection_amount?: number;
  damage_hold_authorization_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AvailabilityException {
  id: string;
  activity_id: string | null;
  exception_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string;
  notes: string;
  created_at: string;
}

export interface BusinessHours {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_open: boolean;
  created_at: string;
}

export interface Property {
  id: string;
  name: string;
  description: string;
  location: string;
  price_per_night: number;
  cleaning_fee?: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  image_url: string;
  gallery_images?: string[];
  amenities: string[];
  active: boolean;
  airbnb_ical_url?: string;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExternalCalendarEvent {
  id: string;
  property_id: string;
  source: 'airbnb' | 'vrbo' | 'booking_com' | 'other';
  external_id: string;
  start_date: string;
  end_date: string;
  summary: string;
  description: string;
  status: 'blocked' | 'reserved' | 'unavailable';
  created_at: string;
  updated_at: string;
}

export interface RentalBooking {
  id?: string;
  property_id: string;
  user_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  total_nights: number;
  total_price: number;
  subtotal?: number;
  sales_tax?: number;
  lodging_tax?: number;
  tax_total?: number;
  status?: string;
  payment_status?: string;
  stripe_session_id?: string;
  special_requests?: string;
  created_at?: string;
}

export interface PropertyPricingRule {
  id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  price_per_night: number;
  min_nights: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// CartItem interface is defined in lib/cart-context.tsx
// The database cart_items table exists but is not currently used
// The application uses localStorage-based cart instead

export interface MerchandiseItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sizes: string[];
  colors: string[];
  image_url?: string;
  gallery_images?: string[];
  stock_quantity: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}
