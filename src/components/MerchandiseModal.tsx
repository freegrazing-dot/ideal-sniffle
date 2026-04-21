import { useState } from 'react';
import { X, ShoppingCart, Shirt, ChevronLeft, ChevronRight } from 'lucide-react';
import { MerchandiseItem } from '../types';

interface MerchandiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MerchandiseItem[];
 onAddToCart: (
  item: MerchandiseItem,
  size: string,
  color: string,
  quantity: number,
  price?: number
) => void;
}

export default function MerchandiseModal({
  isOpen,
  onClose,
  items,
  onAddToCart
}: MerchandiseModalProps) {
  const [selectedItem, setSelectedItem] = useState<MerchandiseItem | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!isOpen) return null;

  const handleSelectItem = (item: MerchandiseItem) => {
    setSelectedItem(item);

    const hasSizes = Array.isArray(item.sizes) && item.sizes.length > 0;
    const hasColors = Array.isArray(item.colors) && item.colors.length > 0;

    setSelectedSize(hasSizes ? item.sizes[0] : '');
    setSelectedColor(hasColors ? item.colors[0] : '');
    setQuantity(1);
    setCurrentImageIndex(0);
  };

  const handleAddToCartClick = () => {
    if (!selectedItem) return;

    const needsSize =
      Array.isArray(selectedItem.sizes) && selectedItem.sizes.length > 0;

    const needsColor =
      Array.isArray(selectedItem.colors) && selectedItem.colors.length > 0;

    if (needsSize && !selectedSize) {
      alert('Please select a size');
      return;
    }

    if (needsColor && !selectedColor) {
      alert('Please select a color');
      return;
    }

   onAddToCart(
  selectedItem,
  selectedSize || 'N/A',
  selectedColor || 'N/A',
  quantity,
  selectedItem.price
);

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
    setCurrentImageIndex(
      (prev) => (prev - 1 + allImages.length) % allImages.length
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">

        <div
          className="fixed inset-0 bg-black/70"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl z-10 overflow-hidden">

          <div className="flex justify-between items-center border-b p-4">
            <h2 className="text-xl font-semibold">
              TKAC Merchandise
            </h2>

            <button onClick={onClose}>
              <X />
            </button>
          </div>

          <div className="p-6 max-h-[80vh] overflow-y-auto">

            {!selectedItem && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

                {items.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 cursor-pointer hover:shadow-md"
                    onClick={() => handleSelectItem(item)}
                  >

                    <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">

                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Shirt />
                      )}

                    </div>

                    <h3 className="mt-3 font-semibold">
                      {item.name}
                    </h3>

                    <p className="text-sm text-gray-500">
                      {item.category}
                    </p>

                    <div className="mt-2 font-bold">
                      ${item.price.toFixed(2)}
                    </div>

                  </div>
                ))}

              </div>
            )}

            {selectedItem && (

              <div>

                <button
                  className="mb-4 text-sm underline"
                  onClick={() => setSelectedItem(null)}
                >
                  back
                </button>

                <div className="grid md:grid-cols-2 gap-6">

                  <div className="aspect-square bg-gray-100 relative">

                    {allImages.length > 0 && (
                      <img
                        src={allImages[currentImageIndex]}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {allImages.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-2 top-1/2"
                        >
                          <ChevronLeft />
                        </button>

                        <button
                          onClick={nextImage}
                          className="absolute right-2 top-1/2"
                        >
                          <ChevronRight />
                        </button>
                      </>
                    )}

                  </div>

                  <div>

                    <h3 className="text-xl font-semibold">
                      {selectedItem.name}
                    </h3>

                    <p className="mt-2 text-gray-600">
                      {selectedItem.description}
                    </p>

                    <div className="mt-3 font-bold text-lg">
                      ${selectedItem.price.toFixed(2)}
                    </div>

                    {selectedItem.sizes?.length > 0 && (

                      <select
                        className="mt-4 border p-2 w-full"
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                      >
                        {selectedItem.sizes.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>

                    )}

                    {selectedItem.colors?.length > 0 && (

                      <select
                        className="mt-2 border p-2 w-full"
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                      >
                        {selectedItem.colors.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>

                    )}

                    <input
                      type="number"
                      className="mt-2 border p-2 w-full"
                      min="1"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(parseInt(e.target.value) || 1)
                      }
                    />

                    <button
                      onClick={handleAddToCartClick}
                      className="mt-4 bg-black text-white px-4 py-2 w-full flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={18} />
                      Add to Cart
                    </button>

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