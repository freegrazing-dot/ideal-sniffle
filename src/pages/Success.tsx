import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { CheckCircle, Calendar, Clock, Users, Mail, Phone, User, Home } from 'lucide-react'

interface ActivityBooking {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  booking_date: string
  booking_time: string
  num_people: number
  total_price: number
  activities: {
    name: string
  }
}

interface PropertyBooking {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  check_in_date: string
  check_out_date: string
  guests: number
  total_price: number
  properties: {
    name: string
  }
}

type Booking = ActivityBooking | PropertyBooking

export function Success() {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')

    if (sessionId) {
      handleSuccessfulPayment(sessionId)
    } else {
      console.warn('No session_id found in URL');
      setLoading(false)
    }
  }, [])

  const isPropertyBooking = (booking: Booking): booking is PropertyBooking => {
    return 'check_in_date' in booking;
  }

  const handleSuccessfulPayment = async (sessionId: string) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Verify payment failed:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to verify payment');
      }

      const data = await response.json();
      if (data.bookings && data.bookings.length > 0) {
        setBooking(data.bookings[0]);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleBackHome = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const promoCode = urlParams.get('promo') || urlParams.get('code');

    if (promoCode) {
      window.location.href = `/?promo=${encodeURIComponent(promoCode)}`;
    } else {
      window.location.href = '/';
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center py-12 px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mb-4"></div>
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-2xl mx-auto shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Unable to Load Booking
            </CardTitle>
            <CardDescription className="text-gray-600">
              We couldn't find your booking details. Please check your email for confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={handleBackHome}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl mx-auto shadow-2xl">
        <CardHeader className="text-center bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-t-xl">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-white mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-bold">
            Booking Confirmed!
          </CardTitle>
          <CardDescription className="text-cyan-100 text-lg">
            Your adventure awaits! Payment processed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          {booking && (
            <>
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-xl border border-cyan-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Booking Details</h3>
                <div className="space-y-4">
                  {isPropertyBooking(booking) ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-cyan-100">
                          <Home className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Property</p>
                          <p className="font-semibold text-gray-900">{booking.properties.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-cyan-100">
                          <Calendar className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Check-In Date</p>
                          <p className="font-semibold text-gray-900">{new Date(booking.check_in_date).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-cyan-100">
                          <Calendar className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Check-Out Date</p>
                          <p className="font-semibold text-gray-900">{new Date(booking.check_out_date).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-cyan-100">
                          <Users className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Number of Guests</p>
                          <p className="font-semibold text-gray-900">{booking.guests}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-cyan-100">
                          <CheckCircle className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Activity</p>
                          <p className="font-semibold text-gray-900">{booking.activities.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-cyan-100">
                          <Calendar className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Date</p>
                          <p className="font-semibold text-gray-900">{new Date(booking.booking_date).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-cyan-100">
                          <Clock className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Time</p>
                          <p className="font-semibold text-gray-900">{booking.booking_time}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-cyan-100">
                          <Users className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Number of People</p>
                          <p className="font-semibold text-gray-900">{booking.num_people}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">{booking.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">{booking.customer_email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">{booking.customer_phone}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 rounded-xl border border-cyan-200">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total Paid</span>
                  <span className="text-3xl font-bold text-cyan-700">${booking.total_price.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  A confirmation email has been sent to <strong>{booking.customer_email}</strong> with all your booking details.
                  {isPropertyBooking(booking)
                    ? ' Check-in instructions will be provided closer to your arrival date.'
                    : ' Please arrive 15 minutes before your scheduled time.'}
                </p>
              </div>
            </>
          )}

          <div className="text-center pt-4">
            <Button
              onClick={handleBackHome}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}