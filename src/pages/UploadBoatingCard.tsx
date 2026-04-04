import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, AlertTriangle, Loader2, Anchor } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function UploadBoatingCard() {
  const [email, setEmail] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [boatingSafetyCardFile, setBoatingSafetyCardFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!email && !bookingReference) {
      setError('Please enter your email or booking reference');
      return;
    }

    if (!boatingSafetyCardFile) {
      setError('Please select a file to upload');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fileExt = boatingSafetyCardFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('boating-cards')
        .upload(fileName, boatingSafetyCardFile);

      if (uploadError) throw new Error('Failed to upload file');

      const { data: { publicUrl } } = supabase.storage
        .from('boating-cards')
        .getPublicUrl(uploadData.path);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-boating-card`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email || undefined,
          bookingReference: bookingReference || undefined,
          cardUrl: publicUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update booking');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload file');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Success!</h1>
          <p className="text-lg text-gray-700 mb-4">
            Your Boating Safety Education Card has been uploaded successfully.
          </p>
          <p className="text-sm text-gray-600">
            Redirecting you to the home page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <Anchor className="w-12 h-12 mr-3" />
              <h1 className="text-3xl font-bold">Upload Boating Safety Card</h1>
            </div>
            <p className="text-cyan-100 text-center">
              Complete your jet ski rental by uploading your Boating Safety Education Card
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Important Information
              </h3>
              <p className="text-sm text-blue-800">
                If you indicated during checkout that you don't have a Boating Safety Education Card,
                you can obtain one online at{' '}
                <a
                  href="https://takemyboattest.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium hover:text-blue-900"
                >
                  takemyboattest.com
                </a>.
                Once you complete the course, upload your card here to finalize your rental.
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setBookingReference('');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="email@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the email you used when making your booking
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">OR</span>
              </div>
            </div>

            <div>
              <label htmlFor="booking-ref" className="block text-sm font-semibold text-gray-700 mb-2">
                Booking Reference
              </label>
              <input
                type="text"
                id="booking-ref"
                value={bookingReference}
                onChange={(e) => {
                  setBookingReference(e.target.value);
                  setEmail('');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in your booking confirmation email
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Boating Safety Education Card <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-cyan-300 rounded-lg p-6 bg-cyan-50 hover:bg-cyan-100 transition-colors">
                <div className="flex flex-col items-center justify-center">
                  <Upload className="w-12 h-12 text-cyan-600 mb-3" />
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setBoatingSafetyCardFile(file);
                        setError(null);
                      }
                    }}
                    className="w-full text-sm text-gray-700"
                  />
                  {boatingSafetyCardFile && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-green-200 w-full">
                      <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {boatingSafetyCardFile.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(boatingSafetyCardFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Accepted formats: JPG, PNG, PDF (Max 10MB)
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={isLoading || !boatingSafetyCardFile || (!email && !bookingReference)}
              className="w-full px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Boating Safety Card
                </>
              )}
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Back to Home
            </button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mt-6">
              <h3 className="font-bold text-gray-900 mb-2">Florida Boating Safety Notice</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Florida law requires boating safety education for the operation of a personal watercraft (PWC). Completion of an approved course or possession of a temporary certificate is mandatory prior to operation. Failure to comply will result in denial of rental.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
