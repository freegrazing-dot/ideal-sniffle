import { Shirt, ShoppingBag } from 'lucide-react';

interface MerchandiseShopCardProps {
  onViewMerchandise: () => void;
  itemCount: number;
}

export default function MerchandiseShopCard({ onViewMerchandise, itemCount }: MerchandiseShopCardProps) {
  return (
    <div className="relative bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 rounded-xl shadow-lg overflow-hidden border-2 border-teal-400 hover:shadow-xl transition-shadow">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: "url('/ChatGPT_Image_Feb_2,_2026,_10_25_50_AM.png')" }}
      />

      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="bg-teal-400 p-3 rounded-lg">
            <Shirt className="w-8 h-8 text-teal-900" />
          </div>
          <div className="text-right">
            <p className="text-sm text-teal-700 font-medium">Shop Now</p>
            <p className="text-3xl font-bold text-teal-900">{itemCount}</p>
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">TKAC Merchandise</h3>

        <p className="text-sm text-gray-700 mb-4 leading-relaxed">
          Take home a piece of your adventure! Browse our exclusive collection of TKAC-branded apparel and accessories.
        </p>

        <div className="bg-white/70 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-700 leading-relaxed">
            <strong>Premium quality</strong> apparel in multiple sizes and colors. Perfect souvenirs to remember your time on the water!
          </p>
        </div>

        <button
          onClick={onViewMerchandise}
          className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-3 rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all flex items-center justify-center gap-2"
        >
          <ShoppingBag className="w-5 h-5" />
          View Merchandise
        </button>
      </div>
    </div>
  );
}
