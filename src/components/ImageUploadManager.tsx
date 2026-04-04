import { useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { uploadImage, ImageBucket } from '../lib/storage';
import { supabase } from '../lib/supabase';

interface ImageUploadManagerProps {
  onClose: () => void;
}

interface ImageItem {
  id: string;
  name: string;
  current_url: string;
  type: 'property' | 'activity' | 'hero';
  gallery_images?: Array<{ url: string; alt: string; }>;
}

export function ImageUploadManager({ onClose }: ImageUploadManagerProps) {
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<ImageItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchItems();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    if (!session) {
      setMessage('Error: You must be logged in to upload images');
    }
  };

  const fetchItems = async () => {
    try {
      const [propertiesResult, activitiesResult, settingsResult] = await Promise.all([
        supabase.from('properties').select('id, name, image_url, gallery_images'),
        supabase.from('activities').select('id, name, image_url'),
        supabase.from('site_settings').select('*').eq('setting_key', 'hero_image_url').single()
      ]);

      const propertyItems: ImageItem[] = (propertiesResult.data || []).map(p => ({
        id: p.id,
        name: p.name,
        current_url: p.image_url,
        type: 'property',
        gallery_images: p.gallery_images || []
      }));

      const activityItems: ImageItem[] = (activitiesResult.data || []).map(a => ({
        id: a.id,
        name: a.name,
        current_url: a.image_url,
        type: 'activity'
      }));

      const heroItem: ImageItem[] = settingsResult.data ? [{
        id: settingsResult.data.id,
        name: 'Hero Background',
        current_url: settingsResult.data.setting_value,
        type: 'hero'
      }] : [];

      setItems([...heroItem, ...propertyItems, ...activityItems]);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleImageUpload = async (itemId: string, type: 'property' | 'activity' | 'hero', file: File) => {
    setUploadingId(itemId);
    setMessage('');

    try {
      const bucket: ImageBucket = type === 'property' ? 'property-images' : type === 'activity' ? 'activity-images' : 'hero-images';
      const result = await uploadImage(file, bucket);

      if (!result || result.error) {
        throw new Error(result?.error || 'Failed to upload image');
      }

      if (!result.url) {
        throw new Error('No URL returned from upload');
      }

      if (type === 'hero') {
        const { error } = await supabase
          .from('site_settings')
          .update({ setting_value: result.url, updated_at: new Date().toISOString() })
          .eq('id', itemId);

        if (error) {
          console.error('Database update error:', error);
          throw error;
        }
      } else {
        const table = type === 'property' ? 'properties' : 'activities';
        const { error } = await supabase
          .from(table)
          .update({ image_url: result.url })
          .eq('id', itemId);

        if (error) {
          console.error('Database update error:', error);
          throw error;
        }
      }

      const itemName = items.find(i => i.id === itemId)?.name;
      setMessage(`Image updated successfully for ${itemName}`);
      await fetchItems();
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setMessage(`Error: ${error.message || 'Failed to upload image. Please try again.'}`);
    } finally {
      setUploadingId(null);
    }
  };

  const handleGalleryImageUpload = async (propertyId: string, file: File) => {
    setUploadingId(`gallery-${propertyId}`);
    setMessage('');

    try {
      const result = await uploadImage(file, 'property-images');

      if (!result || result.error) {
        throw new Error(result?.error || 'Failed to upload image');
      }

      if (!result.url) {
        throw new Error('No URL returned from upload');
      }

      const property = items.find(i => i.id === propertyId);
      if (!property) throw new Error('Property not found');

      const currentGallery = property.gallery_images || [];
      const newGallery = [...currentGallery, { url: result.url, alt: file.name.replace(/\.[^/.]+$/, '') }];

      const { error } = await supabase
        .from('properties')
        .update({ gallery_images: newGallery })
        .eq('id', propertyId);

      if (error) throw error;

      setMessage(`Gallery image added successfully for ${property.name}`);
      await fetchItems();
    } catch (error: any) {
      console.error('Error uploading gallery image:', error);
      setMessage(`Error: ${error.message || 'Failed to upload gallery image.'}`);
    } finally {
      setUploadingId(null);
    }
  };

  const handleRemoveGalleryImage = async (propertyId: string, imageIndex: number) => {
    setUploadingId(`remove-${propertyId}-${imageIndex}`);
    setMessage('');

    try {
      const property = items.find(i => i.id === propertyId);
      if (!property) throw new Error('Property not found');

      const currentGallery = property.gallery_images || [];
      const newGallery = currentGallery.filter((_, index) => index !== imageIndex);

      const { error } = await supabase
        .from('properties')
        .update({ gallery_images: newGallery })
        .eq('id', propertyId);

      if (error) throw error;

      setMessage(`Gallery image removed successfully`);
      await fetchItems();
    } catch (error: any) {
      console.error('Error removing gallery image:', error);
      setMessage(`Error: ${error.message || 'Failed to remove gallery image.'}`);
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Upload Images</h2>
                <p className="text-blue-100">Update property and activity images</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {message && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.includes('Error')
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}>
              {message}
            </div>
          )}

          {loadingItems ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Main Images</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {items.map(item => (
                    <div key={item.id} className="border rounded-xl p-4 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          <span className="text-xs text-gray-500 uppercase">{item.type}</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <img
                          src={item.current_url}
                          alt={item.name}
                          className="w-full h-40 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image';
                          }}
                        />
                      </div>

                      <label className={`
                        block w-full text-center px-4 py-3 rounded-lg font-medium
                        transition-all
                        ${uploadingId === item.id || !isAuthenticated
                          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                        }
                      `}>
                        {uploadingId === item.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Uploading...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Upload className="w-4 h-4" />
                            {isAuthenticated ? 'Upload New Image' : 'Login Required'}
                          </span>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                          disabled={uploadingId === item.id || !isAuthenticated}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(item.id, item.type, file);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Property Gallery Images</h3>
                <div className="space-y-6">
                  {items.filter(item => item.type === 'property').map(property => (
                    <div key={property.id} className="border rounded-xl p-6">
                      <h4 className="font-semibold text-gray-900 mb-4">{property.name}</h4>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {property.gallery_images?.map((img, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={img.url}
                              alt={img.alt}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => handleRemoveGalleryImage(property.id, index)}
                              disabled={uploadingId === `remove-${property.id}-${index}` || !isAuthenticated}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <label className={`
                        block w-full text-center px-4 py-3 rounded-lg font-medium
                        transition-all
                        ${uploadingId === `gallery-${property.id}` || !isAuthenticated
                          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                        }
                      `}>
                        {uploadingId === `gallery-${property.id}` ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Uploading...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Upload className="w-4 h-4" />
                            {isAuthenticated ? 'Add Gallery Image' : 'Login Required'}
                          </span>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                          disabled={uploadingId === `gallery-${property.id}` || !isAuthenticated}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleGalleryImageUpload(property.id, file);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
