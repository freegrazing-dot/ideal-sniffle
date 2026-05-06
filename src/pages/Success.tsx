import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

import { Button } from '../components/ui/button';

import {
  CheckCircle,
  Calendar,
  Clock,
  Users,
  Mail,
  Phone,
  User,
  Home,
} from 'lucide-react';

export function Success() {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (sessionId) {
      verifyPayment(sessionId);
    } else {
      setLoading(false);
    }
  }, []);

  async function verifyPayment(sessionId: string) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        }
      );

      const data = await response.json();

      console.log('Verify payment response:', data);

      if (data?.bookings?.length) {
        setBooking(data.bookings[0]);
      }
    } catch (err) {
      console.error('Verify payment error:', err);
    } finally {
      setLoading(false);
    }
  }

  function backHome() {
    window.location.href = '/';
  }

  const isProperty =
    booking?.check_in_date ||
    booking?.check_out_date ||
    booking?.properties;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-cyan-600 mx-auto mb-4"></div>

          <p className="text-gray-600">
            Verifying your payment...
          </p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-100 p-4">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <CardTitle>
              Payment Received
            </CardTitle>

            <CardDescription>
              Your payment was processed successfully.
              Booking details are still syncing.
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center">
            <Button onClick={backHome}>
              Back Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-t-xl">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-white mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>

          <CardTitle className="text-3xl font-bold">
            Booking Confirmed!
          </CardTitle>

          <CardDescription className="text-cyan-100 text-lg">
            Payment processed successfully.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-8">
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-xl border border-cyan-200">
            <h3 className="text-xl font-bold mb-4">
              Booking Details
            </h3>

            <div className="space-y-4">

              {isProperty ? (
                <>
                  <div className="flex items-center gap-3">
                    <Home className="h-5 w-5 text-cyan-600" />

                    <div>
                      <p className="text-sm text-gray-600">
                        Property
                      </p>

                      <p className="font-semibold">
                        {String(
                          booking?.properties?.name ||
                          'Vacation Rental'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-cyan-600" />

                    <div>
                      <p className="text-sm text-gray-600">
                        Check In
                      </p>

                      <p className="font-semibold">
                        {booking?.check_in_date
                          ? new Date(
                              booking.check_in_date
                            ).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-cyan-600" />

                    <div>
                      <p className="text-sm text-gray-600">
                        Check Out
                      </p>

                      <p className="font-semibold">
                        {booking?.check_out_date
                          ? new Date(
                              booking.check_out_date
                            ).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-cyan-600" />

                    <div>
                      <p className="text-sm text-gray-600">
                        Guests
                      </p>

                      <p className="font-semibold">
                        {Number(
                          booking?.guests || 1
                        )}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-cyan-600" />

                    <div>
                      <p className="text-sm text-gray-600">
                        Activity
                      </p>

                      <p className="font-semibold">
                        {String(
                          booking?.activities?.name ||
                          'TKAC Adventure'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-cyan-600" />

                    <div>
                      <p className="text-sm text-gray-600">
                        Date
                      </p>

                      <p className="font-semibold">
                        {booking?.booking_date
                          ? new Date(
                              booking.booking_date
                            ).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-cyan-600" />

                    <div>
                      <p className="text-sm text-gray-600">
                        Time
                      </p>

                      <p className="font-semibold">
                        {String(
                          booking?.booking_time || 'N/A'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-cyan-600" />

                    <div>
                      <p className="text-sm text-gray-600">
                        Guests
                      </p>

                      <p className="font-semibold">
                        {Number(
                          booking?.num_people || 1
                        )}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-green-50 p-6 rounded-xl border border-green-200">
            <h3 className="text-xl font-bold mb-4">
              Contact Information
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-green-600" />

                <span>
                  {String(
                    booking?.customer_name || 'Guest'
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-green-600" />

                <span>
                  {String(
                    booking?.customer_email || 'N/A'
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-green-600" />

                <span>
                  {String(
                    booking?.customer_phone || 'N/A'
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-cyan-50 p-6 rounded-xl border border-cyan-200">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold">
                Total Paid
              </span>

              <span className="text-3xl font-bold text-cyan-700">
                $
                {Number(
                  booking?.total_price || 0
                ).toFixed(2)}
              </span>
            </div>
          </div>

          <Button
            onClick={backHome}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
export default Success;