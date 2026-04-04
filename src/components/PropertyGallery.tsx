import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Property } from '../types';

interface PropertyGalleryProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

export function PropertyGallery({ property, isOpen, onClose }: PropertyGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!isOpen) return null;

  const images = property.gallery_images && property.gallery_images.length > 0
    ? property.gallery_images.map(img => {
        if (typeof img === 'string') return img;
        if (typeof img === 'object' && img !== null && 'url' in img) {
          return (img as { url: string }).url;
        }
        return property.image_url;
      })
    : [property.image_url];

  const handlePrevious = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="p-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{property.name}</h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        {property.description && (
          <div className="max-w-4xl bg-black bg-opacity-50 rounded-lg p-4 max-h-32 overflow-y-auto">
            <div className="text-white text-sm whitespace-pre-line leading-relaxed">
              {property.description}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center relative px-4 pb-4">
        <button
          onClick={handlePrevious}
          className="absolute left-4 z-10 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors text-white"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        <div className="max-w-6xl max-h-[70vh] w-full h-full flex items-center justify-center">
          <img
            src={images[currentImageIndex]}
            alt={`${property.name} - Image ${currentImageIndex + 1}`}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>

        <button
          onClick={handleNext}
          className="absolute right-4 z-10 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors text-white"
        >
          <ChevronRight className="w-8 h-8" />
        </button>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-4 py-2 rounded-full">
          {currentImageIndex + 1} / {images.length}
        </div>
      </div>

      <div className="px-4 pb-4 overflow-x-auto">
        <div className="flex gap-2 justify-center">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all ${
                currentImageIndex === index
                  ? 'ring-4 ring-blue-500 opacity-100'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
