import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type BookingData = {
  id?: string;
  customer_name?: string;
  customer_email?: string;
};

export function Success() {
  const [searchParams] = useSearchParams();

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [booking, setBooking] =
    useState<BookingData | null>(
      null
    );

  useEffect(() => {
    let mounted = true;

    async function verifyPayment() {
      try {
        const sessionId =
          searchParams.get(
            'session_id'
          );

        if (!sessionId) {
          throw new Error(
            'Missing session ID'
          );
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              apikey:
                import.meta.env
                  .VITE_SUPABASE_ANON_KEY,

              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },

            body: JSON.stringify({
              sessionId,
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              'Verification failed'
          );
        }

        // CLEAR CART
        localStorage.removeItem(
          'tkac_cart'
        );

        if (
          mounted &&
          data?.bookings?.length
        ) {
          setBooking(
            data.bookings[0]
          );
        }
      } catch (err: any) {
        console.error(err);

        if (mounted) {
          setError(
            err?.message ||
              'Something went wrong'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    verifyPayment();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            Verifying Payment...
          </h1>

          <p>
            Please wait.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="max-w-lg w-full bg-red-50 border border-red-200 rounded-xl p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Payment Error
          </h1>

          <p className="mb-6">
            {error}
          </p>

          <Link
            to="/"
            className="inline-block bg-black text-white px-6 py-3 rounded-lg"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <h1 className="text-4xl font-bold text-green-700 mb-4">
          Payment Successful
        </h1>

        <p className="text-lg mb-6">
          Thank you for your order.
        </p>

        {booking && (
          <div className="bg-white rounded-xl p-4 border border-green-100 mb-6 text-left">
            <p>
              <strong>
                Customer:
              </strong>{' '}
              {booking.customer_name}
            </p>

            <p>
              <strong>
                Email:
              </strong>{' '}
              {booking.customer_email}
            </p>

            {booking.id && (
              <p>
                <strong>
                  Booking ID:
                </strong>{' '}
                {booking.id}
              </p>
            )}
          </div>
        )}

        <Link
          to="/"
          className="inline-block bg-black text-white px-6 py-3 rounded-lg"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

export default Success;