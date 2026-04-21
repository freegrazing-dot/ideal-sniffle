import { useState } from 'react';
import ActivityGalleryModal from './ActivityGalleryModal';
import { Clock, Users, Images } from 'lucide-react';
import type { Activity } from '../types';

interface ActivityCardProps {
  activity: Activity;
  onAddToCart: (activity: Activity) => void;
}

export function ActivityCard({ activity, onAddToCart }: ActivityCardProps) {
  const [showGallery, setShowGallery] = useState(false);

  const images =
    activity.gallery_images?.length
      ? [activity.image_url, ...activity.gallery_images].filter(Boolean)
      : [activity.image_url].filter(Boolean);

  const galleryCount = images.length;

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
        <div className="relative h-64 group">
          <div
            onClick={() => setShowGallery(true)}
            style={{ cursor: 'pointer' }}
            className="w-full h-full"
          >
            <img
              src={activity.image_url}
              alt={activity.name}
              className="w-full h-full object-cover"
            />
          </div>

          {galleryCount > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowGallery(true);
              }}
              className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:bg-gray-50 hover:scale-105"
            >
              <Images className="w-4 h-4" />
              <span className="text-sm font-semibold">View {galleryCount} Photos</span>
            </button>
          )}
        </div>

        <div className="p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{activity.name}</h3>

          <p className="text-gray-600 mb-4 line-clamp-3">{activity.description}</p>

          <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-cyan-600 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-sm font-semibold">{activity.duration_hours} hrs</p>
              </div>
            </div>

            <div className="flex items-center">
              <Users className="w-5 h-5 text-cyan-600 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Capacity</p>
                <p className="text-sm font-semibold">{activity.capacity}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAddToCart(activity)}
            className="w-full bg-cyan-600 text-white py-3 rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
          >
            Book Now
          </button>
        </div>
      </div>

      {showGallery && (
        <ActivityGalleryModal
          images={images}
          onClose={() => setShowGallery(false)}
        />
      )}
    </>
  );
}