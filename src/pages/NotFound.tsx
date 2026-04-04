import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-red-100 to-orange-100 mb-4">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-3">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
          <p className="text-lg text-gray-600 mb-8">
            Looks like you took a wrong turn. That page moved or never existed.
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Available Pages:</h3>
          <div className="space-y-2 text-left">
            <Link
              to="/"
              className="block p-3 bg-white rounded-lg hover:bg-blue-50 hover:border-blue-300 border border-gray-200 transition-all"
            >
              <div className="font-medium text-gray-900">Home</div>
              <div className="text-sm text-gray-600">Main page with rentals and activities</div>
            </Link>
            <Link
              to="/welcome-guide"
              className="block p-3 bg-white rounded-lg hover:bg-blue-50 hover:border-blue-300 border border-gray-200 transition-all"
            >
              <div className="font-medium text-gray-900">Welcome Guide</div>
              <div className="text-sm text-gray-600">Booking information and instructions</div>
            </Link>
            <Link
              to="/upload-boating-card"
              className="block p-3 bg-white rounded-lg hover:bg-blue-50 hover:border-blue-300 border border-gray-200 transition-all"
            >
              <div className="font-medium text-gray-900">Upload Boating Card</div>
              <div className="text-sm text-gray-600">Upload your boating license</div>
            </Link>
          </div>
        </div>

        <Link
          to="/"
          className="inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-8 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Go Home
        </Link>

        <p className="mt-6 text-sm text-gray-500">
          Need help? Contact support or try the navigation above.
        </p>
      </div>
    </div>
  );
}
