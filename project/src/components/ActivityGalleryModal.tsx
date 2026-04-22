import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  images: string[];
  onClose: () => void;
};

export default function ActivityGalleryModal({ images, onClose }: Props) {
  const [index, setIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const next = () => {
    setIndex((prev) => (prev + 1) % images.length);
  };

  const prev = () => {
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white bg-black/40 hover:bg-black/60 rounded-full p-2"
        type="button"
        aria-label="Close gallery"
      >
        <X size={28} />
      </button>

      {images.length > 1 && (
        <button
          onClick={prev}
          className="absolute left-6 text-white bg-black/40 hover:bg-black/60 rounded-full p-2"
          type="button"
          aria-label="Previous image"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      <div className="max-w-5xl w-full flex items-center justify-center">
        <img
          src={images[index]}
          alt={`Activity image ${index + 1}`}
          className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
        />
      </div>

      {images.length > 1 && (
        <button
          onClick={next}
          className="absolute right-6 text-white bg-black/40 hover:bg-black/60 rounded-full p-2"
          type="button"
          aria-label="Next image"
        >
          <ChevronRight size={32} />
        </button>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              type="button"
              aria-label={`Go to image ${i + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                i === index ? 'w-8 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}