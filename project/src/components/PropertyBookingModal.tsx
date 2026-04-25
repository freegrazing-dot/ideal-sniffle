import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Property } from '../types'
import { calculateRentalTaxes, formatCurrency } from '../lib/tax-calculations'
import { useCart } from '../lib/cart-context'
import { supabase } from '../lib/supabase'

interface PropertyBookingModalProps {
  property: Property | null
  onClose: () => void
}

export default function PropertyBookingModal({
  property,
  onClose
}: PropertyBookingModalProps) {
  const { addItem } = useCart()

  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')

  useEffect(() => {
    if (!property) return

    const today = new Date()
    today.setDate(today.getDate() + 1)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    setCheckIn(today.toISOString().split('T')[0])
    setCheckOut(tomorrow.toISOString().split('T')[0])
    setGuests(1)
    setAvailabilityError('')
  }, [property])

  if (!property) return null

  const nights = Math.max(
    0,
    Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  )

  const cleaningFee = property.cleaning_fee || 150
  const subtotal = nights * property.price_per_night + cleaningFee
  const taxes = calculateRentalTaxes(subtotal)
  const deposit = 500
  const total = taxes.grandTotal + deposit

  async function checkAvailability() {
    if (!property || !checkIn || !checkOut || nights <= 0) {
      return false
    }

    setCheckingAvailability(true)
    setAvailabilityError('')

    try {
      const { data: internalBookings, error: internalError } = await supabase
        .from('rental_bookings')
        .select('id, check_in_date, check_out_date')
        .eq('property_id', property.id)
        .lt('check_in_date', checkOut)
        .gt('check_out_date', checkIn)

      if (internalError) throw internalError

      if (internalBookings && internalBookings.length > 0) {
        setAvailabilityError('Those dates are already booked on TKAC.')
        return false
      }

      const { data: externalBookings, error: externalError } = await supabase
        .from('external_calendar_events')
        .select('id, source, start_date, end_date')
        .eq('property_id', property.id)
        .lt('start_date', checkOut)
        .gt('end_date', checkIn)

      if (externalError) throw externalError

      if (externalBookings && externalBookings.length > 0) {
        const source = externalBookings[0].source || 'another platform'
        setAvailabilityError(`Those dates are already blocked by ${source}.`)
        return false
      }

      return true
    } catch (error) {
      console.error('Availability check failed:', error)
      setAvailabilityError('Could not check availability. Please try again.')
      return false
    } finally {
      setCheckingAvailability(false)
    }
  }

  async function handleAddToCart() {
    if (nights <= 0) {
      setAvailabilityError('Check-out date must be after check-in date.')
      return
    }

    const available = await checkAvailability()

    if (!available) return

    addItem({
      id: `${property.id}-${checkIn}-${checkOut}`,
      type: 'property',
      property,
      price: taxes.grandTotal,
      guests,
      checkIn,
      checkOut,
      quantity: 1
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Book {property.name}</h2>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="space-y-3">
          <label>Check in</label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => {
              setCheckIn(e.target.value)
              setAvailabilityError('')
            }}
            className="w-full border rounded p-2"
          />

          <label>Check out</label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => {
              setCheckOut(e.target.value)
              setAvailabilityError('')
            }}
            className="w-full border rounded p-2"
          />

          <label>Guests</label>
          <input
            type="number"
            min={1}
            max={property.max_guests}
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value))}
            className="w-full border rounded p-2"
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
          disabled={checkingAvailability}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {checkingAvailability ? 'Checking availability...' : 'Continue to Checkout'}
        </button>
      </div>
    </div>
  )
}