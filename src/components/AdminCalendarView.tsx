import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Clock,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Activity, Booking, AvailabilityException } from '../types';

interface DayBooking extends Booking {
  activities?: Activity;
}

interface DayData {
  date: Date;
  bookings: DayBooking[];
  exceptions: AvailabilityException[];
  isBlocked: boolean;
}

export function AdminCalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthData, setMonthData] = useState<Map<string, DayData>>(new Map());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState({
    activity_id: '',
    start_time: '',
    end_time: '',
    reason: 'blocked',
    notes: '',
  });

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    loadMonthData();
  }, [currentMonth]);

  async function loadActivities() {
    const { data } = await supabase.from('activities').select('*');
    setActivities(Array.isArray(data) ? data : []);
  }

  async function loadMonthData() {
    setLoading(true);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDateStr = firstDay.toISOString().split('T')[0];
    const endDateStr = lastDay.toISOString().split('T')[0];

    const [bookingsResult, exceptionsResult] = await Promise.all([
      supabase
        .from('bookings')
        .select('*, activities(*)')
        .gte('booking_date', startDateStr)
        .lte('booking_date', endDateStr)
        .in('status', ['pending', 'confirmed']),
      supabase
        .from('availability_exceptions')
        .select('*')
        .gte('exception_date', startDateStr)
        .lte('exception_date', endDateStr),
    ]);

    const bookings = Array.isArray(bookingsResult.data)
      ? (bookingsResult.data as DayBooking[])
      : [];

    const exceptions = Array.isArray(exceptionsResult.data)
      ? (exceptionsResult.data as AvailabilityException[])
      : [];

    const dataMap = new Map<string, DayData>();

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];

      const dayBookings = bookings.filter((b) => b.booking_date === dateStr);
      const dayExceptions = exceptions.filter((e) => e.exception_date === dateStr);

      const isBlocked = dayExceptions.some((e) => !e.start_time && !e.end_time);

      dataMap.set(dateStr, {
        date,
        bookings: dayBookings,
        exceptions: dayExceptions,
        isBlocked,
      });
    }

    setMonthData(dataMap);
    setLoading(false);
  }

  function getDaysInMonth() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }

  function previousMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  }

  function formatMonthYear() {
    return currentMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  function getDayClassName(date: Date | null, isSelected: boolean) {
    if (!date) return '';

    const dateStr = date.toISOString().split('T')[0];
    const dayData = monthData.get(dateStr);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let className =
      'min-h-24 p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors';

    if (date.getTime() === today.getTime()) className += ' ring-2 ring-cyan-500';
    if (isSelected) className += ' bg-cyan-50';
    if (dayData?.isBlocked) className += ' bg-red-50';
    else if (dayData && dayData.bookings.length > 0) className += ' bg-blue-50';

    return className;
  }

  async function handleBlockDate() {
    if (!selectedDate) return;

    try {
      const exception: Partial<AvailabilityException> = {
        activity_id: blockForm.activity_id || null,
        exception_date: selectedDate,
        start_time: blockForm.start_time || null,
        end_time: blockForm.end_time || null,
        reason: blockForm.reason as any,
        notes: blockForm.notes,
      };

      const { error } = await supabase.from('availability_exceptions').insert(exception);
      if (error) throw error;

      setShowBlockModal(false);
      setBlockForm({
        activity_id: '',
        start_time: '',
        end_time: '',
        reason: 'blocked',
        notes: '',
      });

      loadMonthData();
    } catch (error) {
      console.error('Error blocking date:', error);
      alert('Failed to block date. Please try again.');
    }
  }

  async function handleRemoveException(exceptionId: string) {
    if (!confirm('Remove this blocked time?')) return;

    try {
      const { error } = await supabase
        .from('availability_exceptions')
        .delete()
        .eq('id', exceptionId);

      if (error) throw error;

      loadMonthData();
    } catch (error) {
      console.error('Error removing exception:', error);
    }
  }

  const days = getDaysInMonth();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const selectedDayData: DayData | null = selectedDate
    ? monthData.get(selectedDate) || {
        date: new Date(`${selectedDate}T00:00:00`),
        bookings: [],
        exceptions: [],
        isBlocked: false,
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-cyan-600" />
            Booking Calendar
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
            <div
              key={day}
              className="bg-gray-50 text-center text-sm font-semibold text-gray-700 py-3"
            >
              {day}
            </div>
          ))}

          {loading ? (
            <div className="col-span-7 bg-white p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
            </div>
          ) : (
            days.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="bg-white min-h-24" />;

              const dateStr = day.toISOString().split('T')[0];
              const dayData = monthData.get(dateStr);
              const isSelected = dateStr === selectedDate;
              const safeBookings = dayData?.bookings || [];

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={getDayClassName(day, isSelected)}
                >
                  <div className="font-semibold text-gray-900 mb-1">{day.getDate()}</div>

                  {dayData && (
                    <div className="space-y-1">
                      {safeBookings.slice(0, 2).map((booking) => (
                        <div
                          key={booking.id}
                          className="text-xs bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded truncate"
                        >
                          {booking.booking_time} -{' '}
                          {booking.activities?.name?.substring(0, 15) || 'Booking'}
                        </div>
                      ))}

                      {safeBookings.length > 2 && (
                        <div className="text-xs text-gray-600 font-medium">
                          +{safeBookings.length - 2} more
                        </div>
                      )}

                      {dayData.isBlocked && (
                        <div className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                          Blocked
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedDate && selectedDayData && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              {selectedDayData.date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h3>

            <button
              onClick={() => setShowBlockModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Block Time
            </button>
          </div>

          {(selectedDayData.bookings || []).length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-600" />
                Bookings ({(selectedDayData.bookings || []).length})
              </h4>

              <div className="space-y-3">
                {(selectedDayData.bookings || []).map((booking) => (
                  <div key={booking.id} className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-gray-900">{booking.booking_time}</span>
                      <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs font-medium rounded">
                        {booking.activities?.name || 'Activity'}
                      </span>
                    </div>

                    <div className="text-sm text-gray-700">
                      <p className="font-medium">{booking.customer_name}</p>
                      <p>
                        {booking.customer_email} • {booking.customer_phone}
                      </p>
                      <p className="mt-1">
                        <span className="font-medium">{booking.num_people} people</span> • $
                        {booking.total_price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(selectedDayData.exceptions || []).length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" />
                Blocked Times
              </h4>

              <div className="space-y-2">
                {(selectedDayData.exceptions || []).map((exception) => (
                  <div
                    key={exception.id}
                    className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {exception.start_time && exception.end_time
                          ? `${exception.start_time} - ${exception.end_time}`
                          : 'All Day'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {exception.notes || exception.reason}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveException(exception.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(selectedDayData.bookings || []).length === 0 &&
            (selectedDayData.exceptions || []).length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No bookings or blocked times for this date
              </p>
            )}
        </div>
      )}

      {showBlockModal && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Block Time Slot</h3>

            <div className="space-y-4">
              <select
                value={blockForm.activity_id}
                onChange={(e) => setBlockForm({ ...blockForm, activity_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Activities</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                  </option>
                ))}
              </select>

              <input
                type="time"
                value={blockForm.start_time}
                onChange={(e) => setBlockForm({ ...blockForm, start_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />

              <input
                type="time"
                value={blockForm.end_time}
                onChange={(e) => setBlockForm({ ...blockForm, end_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />

              <textarea
                value={blockForm.notes}
                onChange={(e) => setBlockForm({ ...blockForm, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Notes..."
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleBlockDate}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Block Time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}