import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Property } from '../types'
import { calculateRentalTaxes, formatCurrency } from '../lib/tax-calculations'
import { useCart } from '../lib/cart-context'
import { supabase } from '../lib/supabase'

interface PropertyBookingModalProps {
  property: Property | null
  onClose: () => void
}

type BlockedSource = 'tkac' | 'airbnb' | 'vrbo' | 'booking' | 'external'

interface BlockedDateInfo {
  date: string
  source: BlockedSource
}

const MIN_NIGHTS = 2

export default function PropertyBookingModal({ property, onClose }: PropertyBookingModalProps) {
  const { addItem } = useCart()

  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)
  const [blockedDates, setBlockedDates] = useState<BlockedDateInfo[]>([])
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [availabilityError, setAvailabilityError] = useState('')
  const [loadingBlockedDates, setLoadingBlockedDates] = useState(false)

  useEffect(() => {
    if (!property) return

    setCheckIn('')
    setCheckOut('')
    setGuests(1)
    setAvailabilityError('')
    setCalendarMonth(new Date())
    loadBlockedDates()

    const refreshTimer = window.setInterval(() => {
      loadBlockedDates()
    }, 60000)

    return () => window.clearInterval(refreshTimer)
  }, [property])

  if (!property) return null

  const toDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const normalizeSource = (source?: string): BlockedSource => {
    const s = (source || '').toLowerCase()
    if (s.includes('airbnb')) return 'airbnb'
    if (s.includes('vrbo')) return 'vrbo'
    if (s.includes('booking')) return 'booking'
    return 'external'
  }

  const expandDates = (start: string, end: string, source: BlockedSource) => {
    const dates: BlockedDateInfo[] = []
    const current = new Date(`${start}T00:00:00`)
    const last = new Date(`${end}T00:00:00`)

    while (current < last) {
      dates.push({
        date: toDateString(current),
        source,
      })
      current.setDate(current.getDate() + 1)
    }

    return dates
  }

  async function loadBlockedDates() {
    if (!property) return

    setLoadingBlockedDates(true)

    try {
      const { data: internal, error: internalError } = await supabase
        .from('rental_bookings')
        .select('check_in_date, check_out_date')
        .eq('property_id', property.id)

      if (internalError) throw internalError

      const { data: external, error: externalError } = await supabase
        .from('external_calendar_events')
        .select('start_date, end_date, source')
        .eq('property_id', property.id)

      if (externalError) throw externalError

      const blocked: BlockedDateInfo[] = []

      internal?.forEach((booking) => {
        blocked.push(...expandDates(booking.check_in_date, booking.check_out_date, 'tkac'))
      })

      external?.forEach((event) => {
        blocked.push(...expandDates(event.start_date, event.end_date, normalizeSource(event.source)))
      })

      const deduped = Array.from(
        new Map(blocked.map((item) => [item.date, item])).values()
      )

      setBlockedDates(deduped)
    } catch (error) {
      console.error('Error loading blocked dates:', error)
      setAvailabilityError('Could not load availability. Please try again.')
    } finally {
      setLoadingBlockedDates(false)
    }
  }

  const isPastDate = (dateStr: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(`${dateStr}T00:00:00`) < today
  }

  const getBlockedInfo = (dateStr: string) => {
    return blockedDates.find((item) => item.date === dateStr)
  }

  const isBlocked = (dateStr: string) => {
    return !!getBlockedInfo(dateStr)
  }

  const rangeHasBlockedDate = (start: string, end: string) => {
    const current = new Date(`${start}T00:00:00`)
    const last = new Date(`${end}T00:00:00`)

    while (current < last) {
      const dateStr = toDateString(current)
      if (isBlocked(dateStr) || isPastDate(dateStr)) return true
      current.setDate(current.getDate() + 1)
    }

    return false
  }

  const getNightsBetween = (start: string, end: string) => {
    return Math.max(
      0,
      Math.ceil(
        (new Date(`${end}T00:00:00`).getTime() -
          new Date(`${start}T00:00:00`).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    )
  }

  const handleDateClick = (dateStr: string) => {
    const blockedInfo = getBlockedInfo(dateStr)

    if (isPastDate(dateStr)) {
      setAvailabilityError('You cannot select a past date.')
      return
    }

    if (blockedInfo) {
      setAvailabilityError(`That date is already booked by ${blockedInfo.source.toUpperCase()}.`)
      return
    }

    setAvailabilityError('')

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(dateStr)
      setCheckOut('')
      return
    }

    if (dateStr <= checkIn) {
      setCheckIn(dateStr)
      setCheckOut('')
      return
    }

    const selectedNights = getNightsBetween(checkIn, dateStr)

    if (selectedNights < MIN_NIGHTS) {
      setAvailabilityError(`Minimum stay is ${MIN_NIGHTS} nights.`)
      return
    }

    if (rangeHasBlockedDate(checkIn, dateStr)) {
      setAvailabilityError('That date range includes unavailable dates.')
      return
    }

    setCheckOut(dateStr)
  }

  const nights = checkIn && checkOut ? getNightsBetween(checkIn, checkOut) : 0

  const cleaningFee = property.cleaning_fee || 150
  const subtotal = nights * property.price_per_night + cleaningFee
  const taxes = calculateRentalTaxes(subtotal)
  const deposit = 500
  const total = taxes.grandTotal + deposit

  function handleAddToCart() {
    if (!checkIn || !checkOut || nights <= 0) {
      setAvailabilityError('Please select a valid check-in and check-out date.')
      return
    }

    if (nights < MIN_NIGHTS) {
      setAvailabilityError(`Minimum stay is ${MIN_NIGHTS} nights.`)
      return
    }

    if (rangeHasBlockedDate(checkIn, checkOut)) {
      setAvailabilityError('Selected dates include unavailable days.')
      return
    }

    addItem({
      id: `${property.id}-${checkIn}-${checkOut}`,
      type: 'property',
      property,
      price: taxes.grandTotal,
      guests,
      checkIn,
      checkOut,
      quantity: 1,
    })

    onClose()
  }

  const getDaysInMonth = () => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const getBlockedClassName = (source: BlockedSource) => {
    switch (source) {
      case 'tkac':
        return 'bg-green-200 text-green-900 border-green-300 line-through cursor-not-allowed'
      case 'airbnb':
        return 'bg-pink-200 text-pink-900 border-pink-300 line-through cursor-not-allowed'
      case 'vrbo':
        return 'bg-purple-200 text-purple-900 border-purple-300 line-through cursor-not-allowed'
      case 'booking':
        return 'bg-yellow-200 text-yellow-900 border-yellow-300 line-through cursor-not-allowed'
      default:
        return 'bg-gray-200 text-gray-500 border-gray-300 line-through cursor-not-allowed'
    }
  }

  const getDayClassName = (date: Date) => {
    const dateStr = toDateString(date)
    const blockedInfo = getBlockedInfo(dateStr)
    const unavailable = isPastDate(dateStr) || !!blockedInfo
    const selected = dateStr === checkIn || dateStr === checkOut
    const inRange = checkIn && checkOut && dateStr > checkIn && dateStr < checkOut

    if (blockedInfo) {
      return getBlockedClassName(blockedInfo.source)
    }

    if (isPastDate(dateStr)) {
      return 'bg-gray-100 text-gray-400 border-gray-200 line-through cursor-not-allowed'
    }

    if (selected) {
      return 'bg-blue-600 text-white border-blue-600 cursor-pointer'
    }

    if (inRange) {
      return 'bg-blue-100 text-blue-800 border-blue-200 cursor-pointer'
    }

    if (unavailable) {
      return 'bg-gray-200 text-gray-400 border-gray-300 line-through cursor-not-allowed'
    }

    return 'bg-white hover:bg-blue-50 text-gray-900 border-gray-200 cursor-pointer'
  }

  const getSourceLabel = (source: BlockedSource) => {
    switch (source) {
      case 'tkac':
        return 'TKAC'
      case 'airbnb':
        return 'Airbnb'
      case 'vrbo':
        return 'VRBO'
      case 'booking':
        return 'Booking.com'
      default:
        return 'Unavailable'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Book {property.name}</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Select check-in first, then check-out. Minimum stay is {MIN_NIGHTS} nights.
        </div>

        <div className="flex items-center justify-between border rounded-lg p-3">
          <button
            onClick={() =>
              setCalendarMonth(
                new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
              )
            }
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronLeft />
          </button>

          <div className="font-semibold">
            {calendarMonth.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </div>

          <button
            onClick={() =>
              setCalendarMonth(
                new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
              )
            }
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronRight />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="font-semibold text-gray-500 py-2">
              {day}
            </div>
          ))}

          {loadingBlockedDates ? (
            <div className="col-span-7 py-8 text-gray-500">Loading availability...</div>
          ) : (
            getDaysInMonth().map((day, index) => {
              if (!day) return <div key={`empty-${index}`} />

              const dateStr = toDateString(day)
              const blockedInfo = getBlockedInfo(dateStr)

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleDateClick(dateStr)}
                  disabled={isPastDate(dateStr) || isBlocked(dateStr)}
                  title={blockedInfo ? getSourceLabel(blockedInfo.source) : dateStr}
                  className={`h-12 rounded-lg text-sm font-medium border transition ${getDayClassName(day)}`}
                >
                  <div>{day.getDate()}</div>
                  {blockedInfo && (
                    <div className="text-[9px] leading-none mt-0.5">
                      {getSourceLabel(blockedInfo.source)}
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-sm border-t pt-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-600" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 border" />
            <span>Selected range</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-200 border border-green-300" />
            <span>TKAC</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-pink-200 border border-pink-300" />
            <span>Airbnb</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-200 border border-purple-300" />
            <span>VRBO</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-200 border border-yellow-300" />
            <span>Booking.com</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="border rounded-lg p-3">
            <div className="text-xs text-gray-500">Check in</div>
            <div className="font-semibold">{checkIn || 'Select date'}</div>
          </div>

          <div className="border rounded-lg p-3">
            <div className="text-xs text-gray-500">Check out</div>
            <div className="font-semibold">{checkOut || 'Select date'}</div>
          </div>
        </div>

        <div>
          <label>Guests</label>
          <input
            type="number"
            min={1}
            max={property.max_guests}
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value))}
            className="w-full border rounded p-2 mt-1"
          />
        </div>

        {availabilityError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
            {availabilityError}
          </div>
        )}

        <div className="bg-gray-50 p-3 rounded space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Nights</span>
            <span>{nights}</span>
          </div>

          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span>Taxes</span>
            <span>{formatCurrency(taxes.taxTotal)}</span>
          </div>

          <div className="flex justify-between">
            <span>Security deposit hold</span>
            <span>$500</span>
          </div>

          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={!checkIn || !checkOut || nights < MIN_NIGHTS}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          Continue to Checkout
        </button>
      </div>
    </div>
  )
}