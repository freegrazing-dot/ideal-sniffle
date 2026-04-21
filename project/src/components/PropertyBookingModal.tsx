import { useState, useEffect } from 'react'
import { X, Calendar, Users } from 'lucide-react'
import type { Property } from '../types'
import { calculateRentalTaxes, formatCurrency } from '../lib/tax-calculations'
import { useCart } from '../lib/cart-context'

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

  useEffect(() => {
    if (!property) return

    const today = new Date()
    today.setDate(today.getDate() + 1)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    setCheckIn(today.toISOString().split('T')[0])
    setCheckOut(tomorrow.toISOString().split('T')[0])
    setGuests(1)

  }, [property])

  if (!property) return null

  const nights = Math.max(
    0,
    Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime())
      / (1000 * 60 * 60 * 24)
    )
  )

  const cleaningFee = property.cleaning_fee || 150

  const subtotal =
    nights * property.price_per_night +
    cleaningFee

  const taxes = calculateRentalTaxes(subtotal)

  const deposit = 500

  const total =
    taxes.grandTotal + deposit

  function handleAddToCart() {

    if (nights <= 0) return

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

<h2 className="text-xl font-bold">
Book {property.name}
</h2>

<button onClick={onClose}>
<X/>
</button>

</div>

<div className="space-y-3">

<label>
Check in
</label>

<input
type="date"
value={checkIn}
onChange={e => setCheckIn(e.target.value)}
className="w-full border rounded p-2"
/>

<label>
Check out
</label>

<input
type="date"
value={checkOut}
onChange={e => setCheckOut(e.target.value)}
className="w-full border rounded p-2"
/>

<label>
Guests
</label>

<input
type="number"
min={1}
max={property.max_guests}
value={guests}
onChange={e => setGuests(parseInt(e.target.value))}
className="w-full border rounded p-2"
/>

</div>

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

className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"

>

Continue to Checkout

</button>

</div>

</div>

  )

}