import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Trash2, Clock, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Activity, Booking, AvailabilityException } from '../types';

interface DayBooking extends Booking {
  activities: Activity;
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

  const loadActivities = async () => {
    const { data } = await supabase.from('activities').select('*');
    setActivities(data || []);
  };

  const loadMonthData = async () => {
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

    const bookings = (bookingsResult.data || []) as DayBooking[];
    const exceptions = exceptionsResult.data || [];

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

    const dateStr = date.toISOString().split('T')[0];
    const dayData = monthData.get(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = date.getTime() === today.getTime();

    let className = 'min-h-24 p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors';

    if (isToday) {
      className += ' ring-2 ring-cyan-500';
    }

    if (isSelected) {
      className += ' bg-cyan-50';
    }

    if (dayData?.isBlocked) {
      className += ' bg-red-50';
    } else if (dayData && dayData.bookings.length > 0) {
      className += ' bg-blue-50';
    }

    return className;
  };

  const handleBlockDate = async () => {
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
  };

  const handleRemoveException = async (exceptionId: string) => {
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
            Booking Calendar
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-lg font-semibold text-gray-700 min-w-[180px] text-center">
              {formatMonthYear()}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
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
                return <div key={`empty-${index}`} className="bg-white min-h-24" />;
              }

              const dateStr = day.toISOString().split('T')[0];
              const dayData = monthData.get(dateStr);
              const isSelected = dateStr === selectedDate;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={getDayClassName(day, isSelected)}
                >
                  <div className="font-semibold text-gray-900 mb-1">{day.getDate()}</div>
                  {dayData && (
                    <div className="space-y-1">
                      {dayData.bookings.slice(0, 2).map((booking) => (
                        <div
                          key={booking.id}
                          className="text-xs bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded truncate"
                          title={`${booking.booking_time} - ${booking.activities.name}`}
                        >
                          {booking.booking_time} - {booking.activities.name.substring(0, 15)}
                        </div>
                      ))}
                      {dayData.bookings.length > 2 && (
                        <div className="text-xs text-gray-600 font-medium">
                          +{dayData.bookings.length - 2} more
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

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded" />
            <span className="text-gray-600">Has Bookings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border border-red-200 rounded" />
            <span className="text-gray-600">Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 ring-2 ring-cyan-500 rounded" />
            <span className="text-gray-600">Today</span>
          </div>
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
                day: 'numeric'
              })}
            </h3>
            <button
              onClick={() => setShowBlockModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Block Time
            </button>
          </div>

          {selectedDayData.bookings.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-600" />
                Bookings ({selectedDayData.bookings.length})
              </h4>
              <div className="space-y-3">
                {selectedDayData.bookings.map((booking) => (
                  <div key={booking.id} className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">{booking.booking_time}</span>
                          <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs font-medium rounded">
                            {booking.activities.name}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            booking.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700">
                          <p className="font-medium">{booking.customer_name}</p>
                          <p>{booking.customer_email} • {booking.customer_phone}</p>
                          <p className="mt-1">
                            <span className="font-medium">{booking.num_people} people</span> • ${booking.total_price}
                          </p>
                          {booking.special_requests && (
                            <p className="mt-2 text-gray-600 italic">Note: {booking.special_requests}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDayData.exceptions.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" />
                Blocked Times
              </h4>
              <div className="space-y-2">
                {selectedDayData.exceptions.map((exception) => (
                  <div key={exception.id} className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
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
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDayData.bookings.length === 0 && selectedDayData.exceptions.length === 0 && (
            <p className="text-gray-500 text-center py-8">No bookings or blocked times for this date</p>
          )}
        </div>
      )}

      {showBlockModal && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Block Time Slot</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Activity (Leave empty to block all)
                </label>
                <select
                  value={blockForm.activity_id}
                  onChange={(e) => setBlockForm({ ...blockForm, activity_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">All Activities</option>
                  {activities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={blockForm.start_time}
                    onChange={(e) => setBlockForm({ ...blockForm, start_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={blockForm.end_time}
                    onChange={(e) => setBlockForm({ ...blockForm, end_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason
                </label>
                <select
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="blocked">Blocked</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="weather">Weather</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={blockForm.notes}
                  onChange={(e) => setBlockForm({ ...blockForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 resize-none"
                  placeholder="Additional details..."
                />
              </div>

              <p className="text-xs text-gray-500">
                Leave start/end times empty to block the entire day
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockDate}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
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
