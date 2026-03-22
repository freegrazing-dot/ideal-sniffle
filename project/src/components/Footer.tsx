import { Waves, MapPin, Phone, Mail, Facebook, Instagram } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Waves className="w-8 h-8 text-cyan-400" />
              <span className="text-2xl font-bold">TKAC Adventures</span>
            </div>
            <p className="text-slate-400 leading-relaxed mb-4">
              Experience the beauty of Southwest Florida's backwaters with our premium sunset cruises,
              fishing charters, and boat tours.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="p-2 bg-slate-800 hover:bg-cyan-600 rounded-lg transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 bg-slate-800 hover:bg-cyan-600 rounded-lg transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Contact Us</h3>
            <ul className="space-y-3 text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Bonita Springs & Naples, Florida</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <span>(305) 417-8829</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <span>tkacadventures@gmail.com</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Hours</h3>
            <ul className="space-y-2 text-slate-400">
              <li>Monday - Sunday</li>
              <li className="font-semibold text-white">9:00 AM - 5:00 PM</li>
              <li className="text-sm mt-4">
                Weather permitting. We'll contact you if conditions require rescheduling.
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-800 rounded-lg p-5">
              <h4 className="font-bold text-white mb-3">Age & Identification Requirements</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>• Operators must be at least 14 years old</li>
                <li>• Renters must be at least 18 years old</li>
                <li>• Valid photo ID required</li>
                <li>• Boating safety compliance required before operation</li>
              </ul>
            </div>
            <div className="bg-slate-800 rounded-lg p-5">
              <h4 className="font-bold text-white mb-3">Florida Boating Safety Notice</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Florida law requires boating safety education for the operation of a personal watercraft (PWC). Completion of an approved course or possession of a temporary certificate is mandatory prior to operation. Failure to comply will result in denial of rental.
              </p>
            </div>
          </div>
          <div className="text-center text-slate-400 text-sm">
            <p>&copy; {new Date().getFullYear()} TKAC Adventures. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
