import { Home, Users, Bed, Bath, MapPin, Images } from 'lucide-react';
import type { Property } from '../types';

interface PropertyCardProps {
  property: Property;
  onBook: (property: Property) => void;
  onViewGallery?: (property: Property) => void;
}

export default function PropertyCard({ property, onBook, onViewGallery }: PropertyCardProps) {
  const galleryCount = property.gallery_images?.length || 0;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="relative h-64 group">
        <img
          src={property.image_url}
          alt={property.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full shadow-md">
          <span className="text-xl font-bold text-gray-900">
            ${property.price_per_night}
          </span>
          <span className="text-sm text-gray-600">/night</span>
        </div>
        {galleryCount > 0 && onViewGallery && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewGallery(property);
            }}
            className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:bg-gray-50 hover:scale-105"
          >
            <Images className="w-4 h-4" />
            <span className="text-sm font-semibold">View {galleryCount} Photos</span>
          </button>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{property.name}</h3>

        <div className="flex items-center text-gray-600 mb-3">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="text-sm">{property.location}</span>
        </div>

        <p className="text-gray-600 mb-4 line-clamp-3">{property.description}</p>

        <div className="grid grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <p className="text-xs text-gray-500">Guests</p>
              <p className="text-sm font-semibold">{property.max_guests}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Bed className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <p className="text-xs text-gray-500">Bedrooms</p>
              <p className="text-sm font-semibold">{property.bedrooms}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Bath className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <p className="text-xs text-gray-500">Bathrooms</p>
              <p className="text-sm font-semibold">{property.bathrooms}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Home className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <p className="text-xs text-gray-500">Property</p>
              <p className="text-sm font-semibold">House</p>
            </div>
          </div>
        </div>

        {property.amenities && property.amenities.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {property.amenities.slice(0, 4).map((amenity, index) => (
                <span
                  key={index}
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                >
                  {amenity}
                </span>
              ))}
              {property.amenities.length > 4 && (
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  +{property.amenities.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => onBook(property)}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}
