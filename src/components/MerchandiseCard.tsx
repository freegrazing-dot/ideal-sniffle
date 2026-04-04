import { useState } from 'react';
import { ShoppingCart, Shirt, ChevronLeft, ChevronRight } from 'lucide-react';
import { MerchandiseItem } from '../types';

interface MerchandiseCardProps {
  item: MerchandiseItem;
  onAddToCart: (item: MerchandiseItem, size: string, color: string, quantity: number) => void;
}

export default function MerchandiseCard({ item, onAddToCart }: MerchandiseCardProps) {
  const [selectedSize, setSelectedSize] = useState(item.sizes[0] || '');
  const [selectedColor, setSelectedColor] = useState(item.colors[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const allImages = [
    ...(item.image_url ? [item.image_url] : []),
    ...(item.gallery_images || [])
  ];

  const handleAddToCart = () => {
    // Only validate if there are multiple options to choose from
    if (item.sizes.length > 1 && !selectedSize) {
      alert('Please select a size');
      return;
    }
    if (item.colors.length > 1 && !selectedColor) {
      alert('Please select a color');
      return;
    }
    onAddToCart(item, selectedSize, selectedColor, quantity);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl shadow-lg overflow-hidden border-2 border-teal-400 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      {allImages.length > 0 && (
        <div className="aspect-square bg-gradient-to-br from-teal-100 to-cyan-100 overflow-hidden relative group">
          <img
            src={allImages[currentImageIndex]}
            alt={`${item.name} - View ${currentImageIndex + 1}`}
            className="w-full h-full object-cover"
          />
          {allImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-teal-900 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-teal-900 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {allImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImageIndex
                        ? 'bg-white w-6'
                        : 'bg-white/60 hover:bg-white/80'
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          {!item.image_url && (
            <div className="bg-teal-400 p-3 rounded-lg">
              <Shirt className="w-8 h-8 text-teal-900" />
            </div>
          )}
          <div className={item.image_url ? 'w-full flex justify-between items-start' : 'text-right'}>
            <p className="text-sm text-teal-700 font-medium">{item.category}</p>
            <p className="text-3xl font-bold text-teal-900">
              ${item.price.toFixed(2)}
            </p>
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>

        <p className="text-sm text-gray-700 mb-4 leading-relaxed">
          {item.description}
        </p>

        {item.sizes.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Size
            </label>
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="w-full px-3 py-2 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
            >
              {item.sizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {item.colors.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-full px-3 py-2 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
            >
              {item.colors.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            max={Math.min(10, item.stock_quantity)}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-3 py-2 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        {item.stock_quantity > 0 ? (
          <button
            onClick={handleAddToCart}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            Add to Cart
          </button>
        ) : (
          <button
            disabled
            className="w-full bg-gray-300 text-gray-500 py-3 rounded-lg font-semibold cursor-not-allowed"
          >
            Out of Stock
          </button>
        )}
      </div>
    </div>
  );
}
