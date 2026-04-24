import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Property } from '../types';
import { supabase } from '../lib/supabase';

interface PropertyCalendarProps {
  property: Property;
  checkInDate: string | null;
  checkOutDate: string | null;
  onDateSelect: (checkIn: string, checkOut: string) => void;
}

export default function PropertyCalendar({
  property,
  checkInDate,
  checkOutDate,
  onDateSelect,
}: PropertyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [closedDates, setClosedDates] = useState<Set<string>>(new Set());
  const [checkoutDates, setCheckoutDates] = useState<Set<string>>(new Set());
  const [selectingCheckIn, setSelectingCheckIn] = useState(true);

  // Reset selection state when dates are cleared externally
  useEffect(() => {
    if (!checkInDate && !checkOutDate) {
      setSelectingCheckIn(true);
    }
  }, [checkInDate, checkOutDate]);

  useEffect(() => {
    fetchPricingRules();
    fetchBookedDates();
  }, [property.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchBookedDates();
    }, 2000); // Refresh every 2 seconds to catch abandoned bookings quickly

    return () => clearInterval(interval);
  }, [property.id]);

  // Refresh immediately when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchBookedDates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', () => fetchBookedDates());

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', () => fetchBookedDates());
    };
  }, [property.id]);

 const fetchPricingRules = async () => {
  const { data, error } = await supabase
    .from('property_pricing_rules')
    .select('*')
    .eq('property_id', property.id)
    .eq('active', true);

  if (error) {
    console.error('Error fetching pricing rules:', error);
    return [];
  }

  return data;
};
  };

  const fetchBookedDates = async () => {
    // First, clean up expired bookings
    await supabase.rpc('cleanup_expired_bookings');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Only show events from last 7 days onwards

    const [rentalBookingsResult, externalEventsResult] = await Promise.all([
      supabase
        .from('rental_bookings')
        .select('check_in_date, check_out_date, expires_at, status')
        .eq('property_id', property.id)
        .in('status', ['pending', 'confirmed']),
      supabase
        .from('external_calendar_events')
        .select('start_date, end_date, summary')
        .eq('property_id', property.id)
        .gte('end_date', cutoffDate.toISOString().split('T')[0]) // Only future/recent events
    ]);

    console.log('[PropertyCalendar] Rental bookings:', rentalBookingsResult.data?.length || 0);
    console.log('[PropertyCalendar] External events:', externalEventsResult.data?.length || 0);
    console.log('[PropertyCalendar] External events data:', externalEventsResult.data);

    const booked = new Set<string>();
    const closed = new Set<string>();
    const checkouts = new Set<string>();

    if (!rentalBookingsResult.error && rentalBookingsResult.data) {
      rentalBookingsResult.data.forEach((booking: any) => {
        // Skip expired pending bookings
        if (booking.status === 'pending' && booking.expires_at) {
          const expiresAt = new Date(booking.expires_at);
          if (expiresAt < new Date()) {
            return; // Skip this expired booking
          }
        }

        const start = new Date(booking.check_in_date + 'T00:00:00');
        const end = new Date(booking.check_out_date + 'T00:00:00');

        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          booked.add(`${year}-${month}-${day}`);
        }

        const checkoutYear = end.getFullYear();
        const checkoutMonth = String(end.getMonth() + 1).padStart(2, '0');
        const checkoutDay = String(end.getDate()).padStart(2, '0');
        checkouts.add(`${checkoutYear}-${checkoutMonth}-${checkoutDay}`);
      });
    }

    if (!externalEventsResult.error && externalEventsResult.data) {
      externalEventsResult.data.forEach((event) => {
        const start = new Date(event.start_date + 'T00:00:00');
        const end = new Date(event.end_date + 'T00:00:00');

        const isBlockedPeriod = event.summary?.toLowerCase().includes('closed') ||
                                event.summary?.toLowerCase().includes('not available');

        // For all external events, mark dates from start to < end as booked
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          booked.add(dateStr);

          if (isBlockedPeriod) {
            closed.add(dateStr);
          }
        }

        // Add checkout date for all events (including blocked/closed periods)
        const checkoutYear = end.getFullYear();
        const checkoutMonth = String(end.getMonth() + 1).padStart(2, '0');
        const checkoutDay = String(end.getDate()).padStart(2, '0');
        checkouts.add(`${checkoutYear}-${checkoutMonth}-${checkoutDay}`);
      });
    }

    setBookedDates(booked);
    setClosedDates(closed);
    setCheckoutDates(checkouts);
  };


  const isDateBooked = (date: Date): boolean => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return bookedDates.has(dateStr);
  };

  const isDateClosed = (date: Date): boolean => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return closedDates.has(dateStr);
  };

  const isDateCheckout = (date: Date): boolean => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return checkoutDates.has(dateStr);
  };

  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Checkout dates are available for check-in
    if (isDateCheckout(date)) return false;
    return date < today || isDateBooked(date);
  };

  const hasBookedDatesBetween = (startDateStr: string, endDateStr: string): boolean => {
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      if (bookedDates.has(dateStr) && !checkoutDates.has(dateStr)) {
        return true;
      }
    }
    return false;
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    if (selectingCheckIn || !checkInDate) {
      onDateSelect(dateStr, '');
      setSelectingCheckIn(false);
    } else {
      if (dateStr <= checkInDate) {
        onDateSelect(dateStr, '');
        setSelectingCheckIn(false);
      } else {
        if (hasBookedDatesBetween(checkInDate, dateStr)) {
          alert('There are unavailable dates in your selected range. Please choose different dates.');
          return;
        }
        onDateSelect(checkInDate, dateStr);
        setSelectingCheckIn(true);
      }
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  const monthName = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const isDateInRange = (date: Date): boolean => {
    if (!checkInDate || !checkOutDate) return false;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return dateStr > checkInDate && dateStr < checkOutDate;
  };

  const isDateSelected = (date: Date): boolean => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return dateStr === checkInDate || dateStr === checkOutDate;
  };

  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold">{monthName}</h3>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            day
          );
          const disabled = isDateDisabled(date);
          const selected = isDateSelected(date);
          const inRange = isDateInRange(date);
          const isClosed = isDateClosed(date);
          const isCheckout = isDateCheckout(date);

          return (
            <button
              key={day}
              onClick={() => handleDateClick(date)}
              disabled={disabled}
              className={`
                aspect-square p-1 rounded-lg transition-colors text-center flex flex-col items-center justify-center relative
                ${disabled && isClosed ? 'bg-gray-400 text-gray-100 cursor-not-allowed' : ''}
                ${disabled && !isClosed ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
                ${isCheckout ? 'bg-gray-50 text-gray-800 border-2 border-blue-400 hover:bg-blue-50' : ''}
                ${!disabled && !isCheckout ? 'hover:bg-blue-50' : ''}
                ${selected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                ${inRange ? 'bg-blue-100' : ''}
              `}
            >
              {isCheckout && (
                <div className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-t-blue-500 border-l-[12px] border-l-transparent"></div>
              )}
              <span className="text-sm font-medium">{day}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 text-sm text-gray-600 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span>Selected dates</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded"></div>
          <span>Dates in range</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-50 rounded border-2 border-blue-400 relative">
            <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-t-blue-500 border-l-[6px] border-l-transparent"></div>
          </div>
          <span>Checkout day (available for check-in)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 rounded"></div>
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-400 rounded"></div>
          <span>Closed</span>
        </div>
      </div>
    </div>
  );
}
