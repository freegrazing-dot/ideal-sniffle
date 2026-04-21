import { useState } from 'react';
import { X, ShoppingCart, Shirt, ChevronLeft, ChevronRight } from 'lucide-react';
import { MerchandiseItem } from '../types';

interface MerchandiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MerchandiseItem[];
  onAddToCart: (item: MerchandiseItem, size: string, color: string, quantity: number) => void;
}

export default function MerchandiseModal({ isOpen, onClose, items, onAddToCart }: MerchandiseModalProps) {
  const [selectedItem, setSelectedItem] = useState<MerchandiseItem | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!isOpen) return null;

  const handleSelectItem = (item: MerchandiseItem) => {
    setSelectedItem(item);
    setSelectedSize(item.sizes[0] || '');
    setSelectedColor(item.colors[0] || '');
    setQuantity(1);
    setCurrentImageIndex(0);
  };

  const handleAddToCart = () => {
    if (!selectedItem || !selectedSize || !selectedColor) {
      alert('Please select size and color');
      return;
    }
    onAddToCart(selectedItem, selectedSize, selectedColor, quantity);
    setSelectedItem(null);
  };

  const allImages = selectedItem
    ? [
        ...(selectedItem.image_url ? [selectedItem.image_url] : []),
        ...(selectedItem.gallery_images || [])
      ]
    : [];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose}></div>

        <div className="relative inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl">
          <div className="absolute top-0 right-0 pt-4 pr-4 z-10">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-2 shadow-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-8 py-6">
            <div className="flex items-center gap-3">
              <Shirt className="w-10 h-10 text-white" />
              <h2 className="text-3xl font-bold text-white">TKAC Merchandise</h2>
            </div>
            <p className="text-teal-50 mt-2">Take home a piece of your adventure!</p>
          </div>

          <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
            {!selectedItem ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl shadow-md overflow-hidden border-2 border-teal-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    onClick={() => handleSelectItem(item)}
                  >
                    <div className="aspect-square bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Shirt className="w-24 h-24 text-teal-600" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg text-gray-900 mb-1">{item.name}</h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-teal-600">${item.price.toFixed(2)}</span>
                        <span className="text-sm text-gray-500">{item.category}</span>
                      </div>
                      {item.stock_quantity > 0 ? (
                        <div className="mt-3 text-center">
                          <button className="w-full bg-teal-500 text-white py-2 rounded-lg font-medium hover:bg-teal-600 transition-colors">
                            Select Options
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 text-center text-red-600 font-medium">
                          Out of Stock
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="mb-4 text-teal-600 hover:text-teal-700 font-medium flex items-center gap-2"
                >
                  ← Back to all items
                </button>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="aspect-square bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl overflow-hidden relative group">
                    {allImages.length > 0 ? (
                      <>
                        <img
                          src={allImages[currentImageIndex]}
                          alt={`${selectedItem.name} - View ${currentImageIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {allImages.length > 1 && (
                          <>
                            <button
                              onClick={prevImage}
                              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-teal-900 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Previous image"
                            >
                              <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                              onClick={nextImage}
                              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-teal-900 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Next image"
                            >
                              <ChevronRight className="w-6 h-6" />
                            </button>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                              {allImages.map((_, index) => (
                                <button
                                  key={index}
                                  onClick={() => setCurrentImageIndex(index)}
                                  className={`w-3 h-3 rounded-full transition-all ${
                                    index === currentImageIndex
                                      ? 'bg-white w-8'
                                      : 'bg-white/60 hover:bg-white/80'
                                  }`}
                                  aria-label={`Go to image ${index + 1}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Shirt className="w-64 h-64 text-teal-600" />
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">{selectedItem.name}</h3>
                    <p className="text-gray-600 mb-4">{selectedItem.description}</p>
                    <div className="text-4xl font-bold text-teal-600 mb-6">
                      ${selectedItem.price.toFixed(2)}
                    </div>

                    <div className="space-y-4">
                      {selectedItem.sizes.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Size
                          </label>
                          <select
                            value={selectedSize}
                            onChange={(e) => setSelectedSize(e.target.value)}
                            className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-lg"
                          >
                            {selectedItem.sizes.map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {selectedItem.colors.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Color
                          </label>
                          <select
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-lg"
                          >
                            {selectedItem.colors.map((color) => (
                              <option key={color} value={color}>
                                {color}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={Math.min(10, selectedItem.stock_quantity)}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-4 py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
                        />
                      </div>

                      <button
                        onClick={handleAddToCart}
                        className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-4 rounded-lg font-semibold text-lg hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-6"
                      >
                        <ShoppingCart className="w-6 h-6" />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
