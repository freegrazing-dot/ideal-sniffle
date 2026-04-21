import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  images: string[];
  onClose: () => void;
};

export default function ActivityGalleryModal({ images, onClose }: Props) {
  const [index, setIndex] = useState(0);

  function next() {
    setIndex((prev) => (prev + 1) % images.length);
  }

  function prev() {
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  }

  if (!images.length) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white"
        type="button"
      >
        <X size={32} />
      </button>

      {images.length > 1 && (
        <button
          onClick={prev}
          className="absolute left-6 text-white"
          type="button"
        >
          <ChevronLeft size={40} />
        </button>
      )}

      <img
        src={images[index]}
        alt={`Activity image ${index + 1}`}
        className="max-h-[80vh] max-w-[90vw] rounded-xl shadow-xl object-contain"
      />

      {images.length > 1 && (
        <button
          onClick={next}
          className="absolute right-6 text-white"
          type="button"
        >
          <ChevronRight size={40} />
        </button>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-6 text-white text-sm bg-black/40 px-3 py-1 rounded">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}