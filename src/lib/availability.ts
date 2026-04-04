import { supabase } from './supabase';

export interface TimeSlot {
  time: string;
  available: boolean;
  bookedCount: number;
  maxCapacity: number;
}

export interface DayAvailability {
  date: string;
  slots: TimeSlot[];
  isFullyBooked: boolean;
  hasException: boolean;
  exceptionReason?: string;
}

export async function checkAvailability(
  activityId: string,
  bookingDate: string,
  bookingTime: string,
  requestedPeople: number
): Promise<{ available: boolean; message: string }> {
  // Clean up expired bookings first
  await supabase.rpc('cleanup_before_calendar_check');

  const { data: activity } = await supabase
    .from('activities')
    .select('*')
    .eq('id', activityId)
    .single();

  if (!activity) {
    return { available: false, message: 'Activity not found' };
  }

  const { data: exceptions } = await supabase
    .from('availability_exceptions')
    .select('*')
    .eq('exception_date', bookingDate)
    .or(`activity_id.eq.${activityId},activity_id.is.null`);

  if (exceptions && exceptions.length > 0) {
    for (const exception of exceptions) {
      if (!exception.start_time || !exception.end_time) {
        return {
          available: false,
          message: `This date is unavailable: ${exception.notes || exception.reason}`,
        };
      }

      const bookingTimeMinutes = timeToMinutes(bookingTime);
      const exceptionStart = timeToMinutes(exception.start_time);
      const exceptionEnd = timeToMinutes(exception.end_time);

      if (bookingTimeMinutes >= exceptionStart && bookingTimeMinutes < exceptionEnd) {
        return {
          available: false,
          message: `This time slot is unavailable: ${exception.notes || exception.reason}`,
        };
      }
    }
  }

  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('*, expires_at')
    .eq('activity_id', activityId)
    .eq('booking_date', bookingDate)
    .in('status', ['pending', 'confirmed']);

  if (!existingBookings) {
    return { available: true, message: 'Available' };
  }

  let totalBookedAtTime = 0;

  for (const booking of existingBookings) {
    // Skip expired pending bookings
    if (booking.status === 'pending' && (booking as any).expires_at) {
      const expiresAt = new Date((booking as any).expires_at);
      if (expiresAt < new Date()) {
        continue; // Skip expired booking
      }
    }

    const bookingTimeMinutes = timeToMinutes(bookingTime);
    const existingTimeMinutes = timeToMinutes(booking.booking_time);
    const durationMinutes = activity.duration_hours * 60;

    if (
      bookingTimeMinutes < existingTimeMinutes + durationMinutes &&
      bookingTimeMinutes + durationMinutes > existingTimeMinutes
    ) {
      totalBookedAtTime += booking.num_people;
    }
  }

  const remainingCapacity = activity.capacity - totalBookedAtTime;

  if (requestedPeople > remainingCapacity) {
    return {
      available: false,
      message: `Only ${remainingCapacity} spot${remainingCapacity !== 1 ? 's' : ''} remaining at this time`,
    };
  }

  return { available: true, message: 'Available' };
}

export async function getMonthAvailability(
  activityId: string,
  year: number,
  month: number
): Promise<Map<string, DayAvailability>> {
  // Clean up expired bookings first
  await supabase.rpc('cleanup_before_calendar_check');

  const { data: activity } = await supabase
    .from('activities')
    .select('*')
    .eq('id', activityId)
    .single();

  if (!activity) {
    return new Map();
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  const [bookingsResult, exceptionsResult] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, expires_at')
      .eq('activity_id', activityId)
      .gte('booking_date', startDateStr)
      .lte('booking_date', endDateStr)
      .in('status', ['pending', 'confirmed']),
    supabase
      .from('availability_exceptions')
      .select('*')
      .gte('exception_date', startDateStr)
      .lte('exception_date', endDateStr)
      .or(`activity_id.eq.${activityId},activity_id.is.null`),
  ]);

  const bookings = bookingsResult.data || [];
  const exceptions = exceptionsResult.data || [];

  const availabilityMap = new Map<string, DayAvailability>();
  const times = generateTimeSlots();

  for (let day = 1; day <= endDate.getDate(); day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = date.toISOString().split('T')[0];

    const dayExceptions = exceptions.filter((e) => e.exception_date === dateStr);
    const hasFullDayException = dayExceptions.some((e) => !e.start_time && !e.end_time);

    if (hasFullDayException) {
      availabilityMap.set(dateStr, {
        date: dateStr,
        slots: [],
        isFullyBooked: true,
        hasException: true,
        exceptionReason: dayExceptions[0].notes || dayExceptions[0].reason,
      });
      continue;
    }

    const dayBookings = bookings.filter((b) => b.booking_date === dateStr);
    const slots: TimeSlot[] = times.map((time) => {
      const timeMinutes = timeToMinutes(time);
      const durationMinutes = activity.duration_hours * 60;

      const isBlocked = dayExceptions.some((e) => {
        if (!e.start_time || !e.end_time) return false;
        const exceptionStart = timeToMinutes(e.start_time);
        const exceptionEnd = timeToMinutes(e.end_time);
        return timeMinutes >= exceptionStart && timeMinutes < exceptionEnd;
      });

      if (isBlocked) {
        return {
          time,
          available: false,
          bookedCount: activity.capacity,
          maxCapacity: activity.capacity,
        };
      }

      let bookedCount = 0;
      for (const booking of dayBookings) {
        // Skip expired pending bookings
        if (booking.status === 'pending' && (booking as any).expires_at) {
          const expiresAt = new Date((booking as any).expires_at);
          if (expiresAt < new Date()) {
            continue; // Skip expired booking
          }
        }

        const bookingTimeMinutes = timeToMinutes(booking.booking_time);
        if (
          timeMinutes < bookingTimeMinutes + durationMinutes &&
          timeMinutes + durationMinutes > bookingTimeMinutes
        ) {
          bookedCount += booking.num_people;
        }
      }

      return {
        time,
        available: bookedCount < activity.capacity,
        bookedCount,
        maxCapacity: activity.capacity,
      };
    });

    const isFullyBooked = slots.every((slot) => !slot.available);

    availabilityMap.set(dateStr, {
      date: dateStr,
      slots,
      isFullyBooked,
      hasException: false,
    });
  }

  return availabilityMap;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function generateTimeSlots(): string[] {
  const times: string[] = [];
  for (let hour = 9; hour <= 17; hour++) {
    times.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 17) {
      times.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  return times;
}

export async function checkPropertyAvailability(
  propertyId: string,
  checkInDate: string,
  checkOutDate: string
): Promise<{ available: boolean; message: string }> {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (checkOut <= checkIn) {
    return { available: false, message: 'Check-out date must be after check-in date' };
  }

  // Clean up expired bookings and old calendar events first
  await Promise.all([
    supabase.rpc('cleanup_before_calendar_check'),
    supabase.rpc('cleanup_old_calendar_events')
  ]);

  const [rentalBookingsResult, externalEventsResult] = await Promise.all([
    supabase
      .from('rental_bookings')
      .select('*, expires_at')
      .eq('property_id', propertyId)
      .in('status', ['pending', 'confirmed'])
      .or(`check_in_date.lte.${checkOutDate},check_out_date.gte.${checkInDate}`),
    supabase
      .from('external_calendar_events')
      .select('*')
      .eq('property_id', propertyId)
      .or(`start_date.lte.${checkOutDate},end_date.gte.${checkInDate}`),
  ]);

  const rentalBookings = rentalBookingsResult.data || [];
  const externalEvents = externalEventsResult.data || [];

  for (const booking of rentalBookings) {
    // Skip expired pending bookings
    if (booking.status === 'pending' && (booking as any).expires_at) {
      const expiresAt = new Date((booking as any).expires_at);
      if (expiresAt < new Date()) {
        continue; // Skip expired booking
      }
    }

    const bookingCheckIn = new Date(booking.check_in_date);
    const bookingCheckOut = new Date(booking.check_out_date);

    if (checkIn < bookingCheckOut && checkOut > bookingCheckIn) {
      return {
        available: false,
        message: 'This property is already booked for the selected dates',
      };
    }
  }

  for (const event of externalEvents) {
    const eventStart = new Date(event.start_date);
    let eventEnd = new Date(event.end_date);

    const summary = (event as { summary?: string }).summary;
    const isBlockedPeriod = summary?.toLowerCase().includes('closed') ||
                            summary?.toLowerCase().includes('not available');

    if (isBlockedPeriod) {
      eventEnd = new Date(eventEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    if (checkIn < eventEnd && checkOut > eventStart) {
      return {
        available: false,
        message: `This property is blocked for the selected dates`,
      };
    }
  }

  return { available: true, message: 'Available' };
}

export async function getPropertyBlockedDates(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<string[]> {
  // Clean up expired bookings and old calendar events first
  await Promise.all([
    supabase.rpc('cleanup_before_calendar_check'),
    supabase.rpc('cleanup_old_calendar_events')
  ]);

  const [rentalBookingsResult, externalEventsResult] = await Promise.all([
    supabase
      .from('rental_bookings')
      .select('check_in_date, check_out_date, status, expires_at')
      .eq('property_id', propertyId)
      .in('status', ['pending', 'confirmed'])
      .gte('check_out_date', startDate)
      .lte('check_in_date', endDate),
    supabase
      .from('external_calendar_events')
      .select('start_date, end_date')
      .eq('property_id', propertyId)
      .gte('end_date', startDate)
      .lte('start_date', endDate),
  ]);

  const rentalBookings = rentalBookingsResult.data || [];
  const externalEvents = externalEventsResult.data || [];

  const blockedDates = new Set<string>();

  for (const booking of rentalBookings) {
    // Skip expired pending bookings
    if (booking.status === 'pending' && (booking as any).expires_at) {
      const expiresAt = new Date((booking as any).expires_at);
      if (expiresAt < new Date()) {
        continue; // Skip expired booking
      }
    }

    const checkIn = new Date(booking.check_in_date + 'T00:00:00');
    const checkOut = new Date(booking.check_out_date + 'T00:00:00');

    for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      blockedDates.add(`${year}-${month}-${day}`);
    }
  }

  for (const event of externalEvents) {
    const eventStart = new Date(event.start_date + 'T00:00:00');
    const eventEnd = new Date(event.end_date + 'T00:00:00');

    const summary = (event as { summary?: string }).summary;
    const isBlockedPeriod = summary?.toLowerCase().includes('closed') ||
                            summary?.toLowerCase().includes('not available');

    const endCondition = isBlockedPeriod ?
      ((d: Date) => d <= eventEnd) :
      ((d: Date) => d < eventEnd);

    for (let d = new Date(eventStart); endCondition(d); d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      blockedDates.add(`${year}-${month}-${day}`);
    }
  }

  return Array.from(blockedDates).sort();
}
