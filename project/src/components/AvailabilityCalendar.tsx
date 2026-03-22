import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Users, AlertCircle } from 'lucide-react';
import { Activity } from '../types';
import { getMonthAvailability, DayAvailability } from '../lib/availability';

interface AvailabilityCalendarProps {
  activity: Activity;
  selectedDate: string;
  selectedTime: string;
  onDateSelect: (date: string) => void;
  onTimeSelect: (time: string) => void;
  requestedPeople: number;
}

export function AvailabilityCalendar({
  activity,
  selectedDate,
  selectedTime,
  onDateSelect,
  onTimeSelect,
  requestedPeople,
}: AvailabilityCalendarProps) {
  const isSunsetActivity = activity.name.toLowerCase().includes('sunset');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<Map<string, DayAvailability>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDayAvailability, setSelectedDayAvailability] = useState<DayAvailability | null>(null);

  useEffect(() => {
    loadAvailability();
  }, [currentMonth, activity.id]);

  useEffect(() => {
    if (selectedDate && availability.has(selectedDate)) {
      setSelectedDayAvailability(availability.get(selectedDate) || null);
    } else {
      setSelectedDayAvailability(null);
    }
  }, [selectedDate, availability]);

  const loadAvailability = async () => {
    setLoading(true);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const data = await getMonthAvailability(activity.id, year, month);
    setAvailability(data);
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

  const isDateInPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const getDayStatus = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayAvailability = availability.get(dateStr);

    if (isDateInPast(date)) return 'past';
    if (!dayAvailability) return 'unknown';
    if (dayAvailability.hasException) return 'blocked';
    if (dayAvailability.isFullyBooked) return 'booked';

    const availableSlots = dayAvailability.slots.filter(
      (slot) => slot.available && slot.maxCapacity - slot.bookedCount >= requestedPeople
    );
    if (availableSlots.length === 0) return 'limited';

    return 'available';
  };

  const getDayClassName = (status: string, isSelected: boolean) => {
    const base = 'aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all cursor-pointer';

    if (isSelected) {
      return `${base} bg-cyan-600 text-white ring-2 ring-cyan-600 ring-offset-2 scale-105`;
    }

    switch (status) {
      case 'past':
        return `${base} text-gray-300 cursor-not-allowed`;
      case 'blocked':
        return `${base} bg-red-50 text-red-400 cursor-not-allowed`;
      case 'booked':
        return `${base} bg-gray-100 text-gray-400 cursor-not-allowed`;
      case 'limited':
        return `${base} bg-orange-50 text-orange-600 hover:bg-orange-100`;
      case 'available':
        return `${base} bg-green-50 text-green-700 hover:bg-green-100`;
      default:
        return `${base} bg-gray-50 text-gray-500 hover:bg-gray-100`;
    }
  };

  const days = getDaysInMonth();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Select Date</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-700 min-w-[150px] text-center">
              {formatMonthYear()}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading availability...</div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} />;
              }

              const dateStr = day.toISOString().split('T')[0];
              const status = getDayStatus(day);
              const isSelected = dateStr === selectedDate;
              const isClickable = status !== 'past' && status !== 'blocked' && status !== 'booked';

              return (
                <button
                  key={dateStr}
                  onClick={() => isClickable && onDateSelect(dateStr)}
                  disabled={!isClickable}
                  className={getDayClassName(status, isSelected)}
                  title={
                    status === 'blocked'
                      ? availability.get(dateStr)?.exceptionReason
                      : undefined
                  }
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded" />
              <span className="text-gray-600">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded" />
              <span className="text-gray-600">Limited</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded" />
              <span className="text-gray-600">Fully Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-200 rounded" />
              <span className="text-gray-600">Unavailable</span>
            </div>
          </div>
        </div>
      </div>

      {!isSunsetActivity && selectedDayAvailability && selectedDayAvailability.slots.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-600" />
            Available Times for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {selectedDayAvailability.slots.map((slot) => {
              const canAccommodate = slot.maxCapacity - slot.bookedCount >= requestedPeople;
              const isAvailable = slot.available && canAccommodate;
              const isSelected = slot.time === selectedTime;
              const remainingSpots = slot.maxCapacity - slot.bookedCount;

              return (
                <button
                  key={slot.time}
                  onClick={() => isAvailable && onTimeSelect(slot.time)}
                  disabled={!isAvailable}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-500 ring-offset-2'
                      : isAvailable
                      ? 'border-gray-200 hover:border-cyan-300 hover:bg-cyan-50'
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{slot.time}</div>
                  {isAvailable ? (
                    <div className="flex items-center justify-center gap-1 mt-1 text-xs text-gray-600">
                      <Users className="w-3 h-3" />
                      <span>{remainingSpots} left</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1 mt-1 text-xs text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      <span>Full</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedDayAvailability.slots.filter((s) => s.available).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">No time slots available for this date</p>
              <p className="text-sm mt-1">Please select a different date</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
