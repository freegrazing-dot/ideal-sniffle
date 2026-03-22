import { CheckCircle, X } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SuccessModal({ isOpen, onClose }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 text-white p-8 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-20 h-20 text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-bold mb-2">Booking Confirmed!</h2>
          <p className="text-green-100">Your adventure awaits</p>
        </div>

        <div className="p-8 text-center">
          <p className="text-gray-600 leading-relaxed mb-6">
            Thank you for booking with us! We've sent a confirmation email with all the details of your booking.
          </p>

          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-cyan-900">
              <strong>Next Steps:</strong><br />
              Check your email for payment instructions and additional information about your adventure.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all transform hover:scale-105"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
