import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RentalBooking {
  id: string;
  property_id: string;
  customer_name: string;
  customer_email: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  total_nights: number;
  total_price: number;
  status: string;
  payment_status: string;
  properties?: {
    name: string;
  };
}

interface DayData {
  date: Date;
  bookings: RentalBooking[];
}

export function AdminCalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthData, setMonthData] = useState<Map<string, DayData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    loadMonthData();
  }, [currentMonth]);

  const toDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadMonthData = async () => {
    setLoading(true);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDateStr = toDateString(firstDay);
    const endDateStr = toDateString(lastDay);

    const { data, error } = await supabase
      .from('rental_bookings')
      .select('*')
      .lte('check_in_date', endDateStr)
      .gte('check_out_date', startDateStr)
      .in('status', ['pending', 'confirmed']);

    if (error) {
      console.error('Error loading rental bookings:', error);
      setMonthData(new Map());
      setLoading(false);
      return;
    }

    const bookings = (data || []) as RentalBooking[];
    const dataMap = new Map<string, DayData>();

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = toDateString(date);

      const dayBookings = bookings.filter((booking) => {
        return booking.check_in_date <= dateStr && booking.check_out_date >= dateStr;
      });

      dataMap.set(dateStr, {
        date,
        bookings: dayBookings,
      });
    }

    setMonthData(dataMap);
    setLoading(false);
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const formatMonthYear = () => {
    return currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getDayClassName = (date: Date | null, isSelected: boolean) => {
    if (!date) return '';

    const dateStr = toDateString(date);
    const dayData = monthData.get(dateStr);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisDate = new Date(date);
    thisDate.setHours(0, 0, 0, 0);

    let className = 'min-h-28 p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors bg-white';

    if (thisDate.getTime() === today.getTime()) {
      className += ' ring-2 ring-cyan-500';
    }

    if (isSelected) {
      className += ' bg-cyan-50';
    }

    if (dayData && dayData.bookings.length > 0) {
      className += ' bg-green-50';
    }

    return className;
  };

 const getBookingLabel = (booking, dateStr) => {
  if (booking.check_in_date === dateStr) return `Check-in: ${booking.customer_name}`;
  if (booking.check_out_date === dateStr) return `Check-out: ${booking.customer_name}`;
  return booking.customer_name;
};

  const getBookingColor = (booking, dateStr) => {
  if (booking.check_in_date === dateStr) return 'bg-green-100 text-green-800';
  if (booking.check_out_date === dateStr) return 'bg-red-100 text-red-800';
  return 'bg-blue-100 text-blue-800';
};

  const days = getDaysInMonth();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const selectedDayData = selectedDate ? monthData.get(selectedDate) : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-cyan-600" />
            Property Booking Calendar
          </h2>

          <div className="flex items-center gap-2">
            <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <span className="text-lg font-semibold text-gray-700 min-w-[180px] text-center">
              {formatMonthYear()}
            </span>

            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
          {weekDays.map((day) => (
            <div key={day} className="bg-gray-50 text-center text-sm font-semibold text-gray-700 py-3">
              {day}
            </div>
          ))}

          {loading ? (
            <div className="col-span-7 bg-white p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            </div>
          ) : (
            days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="bg-white min-h-28" />;
              }

              const dateStr = toDateString(day);
              const dayData = monthData.get(dateStr);
              const isSelected = dateStr === selectedDate;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={getDayClassName(day, isSelected)}
                >
                  <div className="font-semibold text-gray-900 mb-1">{day.getDate()}</div>

                  {dayData && dayData.bookings.length > 0 && (
                    <div className="space-y-1">
                      {dayData.bookings.slice(0, 3).map((booking) => (
                        <div
                          key={booking.id}
                          className={`text-xs px-1.5 py-0.5 rounded truncate ${getBookingColor(booking, dateStr)}`}
                          title={`${booking.customer_name} - ${'Property Booking'}`}
                        >
                          {getBookingLabel(booking, dateStr)}
                        </div>
                      ))}

                      {dayData.bookings.length > 3 && (
                        <div className="text-xs text-gray-600 font-medium">
                          +{dayData.bookings.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded" />
            <span className="text-gray-600">Check-in</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded" />
            <span className="text-gray-600">Booked Night</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-200 rounded" />
            <span className="text-gray-600">Check-out</span>
          </div>
        </div>
      </div>

      {selectedDate && selectedDayData && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {selectedDayData.date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </h3>

          {selectedDayData.bookings.length > 0 ? (
            <div className="space-y-3">
              {selectedDayData.bookings.map((booking) => (
                <div key={booking.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="font-semibold text-gray-900">
                    {booking.properties?.name || 'Property'}
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    {booking.customer_name} — {booking.customer_email}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {booking.check_in_date} to {booking.check_out_date} • {booking.guests} guest(s)
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    ${Number(booking.total_price || 0).toFixed(2)} • {booking.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No rental bookings for this date</p>
          )}
        </div>
      )}
    </div>
  );
}