import { useMemo, useState } from 'react';
import { X, ShoppingCart, Shirt, ChevronLeft, ChevronRight } from 'lucide-react';
import { MerchandiseItem } from '../types';

type ModalMerchandiseItem = MerchandiseItem & {
  sizes?: string[];
  colors?: string[];
  gallery_images?: string[];
  back_image_url?: string;
  stock_quantity?: number | null;
};

interface MerchandiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ModalMerchandiseItem[];
  onAddToCart: (
    item: ModalMerchandiseItem,
    size: string,
    color: string,
    quantity: number
  ) => void;
}

const DEFAULT_APPAREL_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export default function AdminMerchModal({
  isOpen,
  onClose,
  items,
  onAddToCart,
}: MerchandiseModalProps) {
  const [selectedItem, setSelectedItem] = useState<ModalMerchandiseItem | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!isOpen) return null;

  const isApparelItem = (item: ModalMerchandiseItem) =>
    (item.category || '').toLowerCase().includes('apparel') ||
    item.name.toLowerCase().includes('shirt');

 const getAvailableSizes = (item: ModalMerchandiseItem) => {
  if (Array.isArray(item.sizes) && item.sizes.length > 0) {
    return item.sizes;
  }

  if (typeof item.sizes === 'string' && item.sizes.trim()) {
    return item.sizes.split(',').map((s) => s.trim()).filter(Boolean);
  }

  if (isApparelItem(item)) {
    return DEFAULT_APPAREL_SIZES;
  }

  return [];
};

  const getAvailableColors = (item: ModalMerchandiseItem) => {
    if (Array.isArray(item.colors) && item.colors.length > 0) {
      return item.colors;
    }

    return [];
  };

  const handleSelectItem = (item: ModalMerchandiseItem) => {
    const sizes = getAvailableSizes(item);
    const colors = getAvailableColors(item);

    setSelectedItem(item);
    setSelectedSize(sizes[0] || '');
    setSelectedColor(colors[0] || '');
    setQuantity(1);
    setCurrentImageIndex(0);
  };

  const handleAddSelectedItemToCart = () => {
    if (!selectedItem) return;

    const sizes = getAvailableSizes(selectedItem);
    const colors = getAvailableColors(selectedItem);

    if (sizes.length > 0 && !selectedSize) {
      alert('Please select a size');
      return;
    }

    const colorToUse = colors.length > 0 ? selectedColor : '';

    onAddToCart(selectedItem, selectedSize, colorToUse, quantity);
    setSelectedItem(null);
    setSelectedSize('');
    setSelectedColor('');
    setQuantity(1);
    setCurrentImageIndex(0);
  };

  const allImages = useMemo(() => {
    if (!selectedItem) return [];

    return [
      ...(selectedItem.image_url ? [selectedItem.image_url] : []),
      ...(selectedItem.back_image_url ? [selectedItem.back_image_url] : []),
      ...(selectedItem.gallery_images || []),
    ].filter(Boolean);
  }, [selectedItem]);

  const nextImage = () => {
    if (allImages.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    if (allImages.length <= 1) return;
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative my-8 inline-block w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all">
          <div className="absolute top-0 right-0 z-10 pt-4 pr-4">
            <button
              onClick={onClose}
              className="rounded-full bg-white p-2 text-gray-400 shadow-lg transition-colors hover:text-gray-600"
              type="button"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-8 py-6">
            <div className="flex items-center gap-3">
              <Shirt className="h-10 w-10 text-white" />
              <h2 className="text-3xl font-bold text-white">TKAC Merchandise</h2>
            </div>
            <p className="mt-2 text-teal-50">Take home a piece of your adventure!</p>
          </div>

          <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-8">
            {!selectedItem ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="cursor-pointer overflow-hidden rounded-xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                    onClick={() => handleSelectItem(item)}
                  >
                    <div className="flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-teal-100 to-cyan-100">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Shirt className="h-24 w-24 text-teal-600" />
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="mb-1 text-lg font-bold text-gray-900">{item.name}</h3>
                      <p className="mb-2 line-clamp-2 text-sm text-gray-600">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-teal-600">
                          ${(item.price ?? 0).toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500">{item.category}</span>
                      </div>

                      <div className="mt-3 text-center">
                        <button
                          type="button"
                          className="w-full rounded-lg bg-teal-500 py-2 font-medium text-white transition-colors hover:bg-teal-600"
                        >
                          Select Options
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    setSelectedSize('');
                    setSelectedColor('');
                    setQuantity(1);
                    setCurrentImageIndex(0);
                  }}
                  className="mb-4 flex items-center gap-2 font-medium text-teal-600 hover:text-teal-700"
                  type="button"
                >
                  ← Back to all items
                </button>

                <div className="grid gap-8 md:grid-cols-2">
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-100 to-cyan-100 aspect-square">
                    {allImages.length > 0 ? (
                      <>
                        <img
                          src={allImages[currentImageIndex]}
                          alt={`${selectedItem.name} - View ${currentImageIndex + 1}`}
                          className="h-full w-full object-cover"
                        />

                        {allImages.length > 1 && (
                          <>
                            <button
                              onClick={prevImage}
                              type="button"
                              className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-white/90 p-3 text-teal-900 shadow-lg transition-opacity hover:bg-white"
                              aria-label="Previous image"
                            >
                              <ChevronLeft className="h-6 w-6" />
                            </button>

                            <button
                              onClick={nextImage}
                              type="button"
                              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/90 p-3 text-teal-900 shadow-lg transition-opacity hover:bg-white"
                              aria-label="Next image"
                            >
                              <ChevronRight className="h-6 w-6" />
                            </button>

                            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                              {allImages.map((_, index) => (
                                <button
                                  key={index}
                                  onClick={() => setCurrentImageIndex(index)}
                                  type="button"
                                  className={`h-3 rounded-full transition-all ${
                                    index === currentImageIndex
                                      ? 'w-8 bg-white'
                                      : 'w-3 bg-white/60 hover:bg-white/80'
                                  }`}
                                  aria-label={`Go to image ${index + 1}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Shirt className="h-64 w-64 text-teal-600" />
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-2 text-3xl font-bold text-gray-900">
                      {selectedItem.name}
                    </h3>
                    <p className="mb-4 text-gray-600">{selectedItem.description}</p>

                    <div className="mb-6 text-4xl font-bold text-teal-600">
                      ${(selectedItem.price ?? 0).toFixed(2)}
                    </div>

                    <div className="space-y-4">
                      {getAvailableSizes(selectedItem).length > 0 && (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Size
                          </label>
                          <select
                            value={selectedSize}
                            onChange={(e) => setSelectedSize(e.target.value)}
                            className="w-full rounded-lg border border-teal-300 bg-white px-4 py-3 text-lg focus:border-transparent focus:ring-2 focus:ring-teal-500"
                          >
                            {getAvailableSizes(selectedItem).map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {getAvailableColors(selectedItem).length > 0 && (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Color
                          </label>
                          <select
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            className="w-full rounded-lg border border-teal-300 bg-white px-4 py-3 text-lg focus:border-transparent focus:ring-2 focus:ring-teal-500"
                          >
                            {getAvailableColors(selectedItem).map((color) => (
                              <option key={color} value={color}>
                                {color}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) =>
                            setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
                          }
                          className="w-full rounded-lg border border-teal-300 px-4 py-3 text-lg focus:border-transparent focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <button
                        onClick={handleAddSelectedItemToCart}
                        type="button"
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 py-4 text-lg font-semibold text-white shadow-md transition-all hover:from-teal-600 hover:to-cyan-600 hover:shadow-lg"
                      >
                        <ShoppingCart className="h-6 w-6" />
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