import { useEffect, useState } from 'react';
import { Eye, FlaskConical } from 'lucide-react';
import { getSiteSettings } from '../lib/site-settings';

export default function PreviewModeBanner() {
  const [mode, setMode] = useState<string>('live');

  useEffect(() => {
    getSiteSettings().then((settings) => {
      setMode(settings.site_mode);
    });
  }, []);

  if (mode === 'live') return null;

  if (mode === 'testing') {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          <FlaskConical className="w-5 h-5" />
          <p className="text-sm font-medium">
            Testing Mode - Bookings enabled for private testing. Use test card: 4242 4242 4242 4242
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'preview') {
    return (
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          <Eye className="w-5 h-5" />
          <p className="text-sm font-medium">
            Preview Mode - Bookings are currently disabled. Site is not yet live to the public.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
