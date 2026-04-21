import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type PropertyRow = {
  id: string;
  name?: string | null;
  title?: string | null;
  image_url?: string | null;
  short_description?: string | null;
  description?: string | null;
  gallery_images?: string[] | null;
  max_guests?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  price_per_night?: number | null;
};

export default function PropertiesAdmin() {
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    void loadProperties();
  }, []);

  async function loadProperties() {
    setLoading(true);

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at');

    if (error) {
      console.error('Error loading properties:', error);
    } else {
      setProperties((data as PropertyRow[]) || []);
    }

    setLoading(false);
  }

  function updateLocalProperty(
    id: string,
    field: keyof PropertyRow,
    value: string | number | string[]
  ) {
    setProperties((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              [field]: value,
            }
          : p
      )
    );
  }

  async function saveProperty(p: PropertyRow) {
    setSavingId(p.id);

    const payload = {
      title: p.title || p.name || '',
      image_url: p.image_url || '',
      short_description: p.short_description || '',
      description: p.description || '',
      gallery_images: p.gallery_images || [],
      max_guests: Number(p.max_guests || 0),
      bedrooms: Number(p.bedrooms || 0),
      bathrooms: Number(p.bathrooms || 0),
      price_per_night: Number(p.price_per_night || 0),
    };

    const { data, error } = await supabase
      .from('properties')
      .update(payload)
      .eq('id', p.id)
      .select();

    console.log('SAVE RESPONSE', { data, error });

    if (error) {
      console.error('Error saving property:', error);
      alert('Error saving property');
    } else {
      alert('Saved');
      await loadProperties();
    }

    setSavingId(null);
  }

  async function uploadGalleryImages(id: string, files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploadingId(id);

    const currentProperty = properties.find((p) => p.id === id);
    const uploadedUrls: string[] = [];

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `property-gallery/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('site-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Gallery upload error:', uploadError);
        continue;
      }

      const { data } = supabase.storage
        .from('site-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(data.publicUrl);
    }

    const nextGallery = [
      ...(currentProperty?.gallery_images || []),
      ...uploadedUrls,
    ];

    setProperties((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              gallery_images: nextGallery,
              image_url: p.image_url || uploadedUrls[0] || p.image_url,
            }
          : p
      )
    );

    setUploadingId(null);
  }

  function removeGalleryImage(id: string, index: number) {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const nextGallery = [...(p.gallery_images || [])];
        nextGallery.splice(index, 1);

        return {
          ...p,
          gallery_images: nextGallery,
        };
      })
    );
  }

  function setAsMainImage(id: string, url: string) {
    setProperties((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              image_url: url,
            }
          : p
      )
    );
  }

  if (loading) {
    return <div className="p-6">Loading properties...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Property Admin</h2>

      {properties.map((p) => (
        <div
          key={p.id}
          className="border rounded-lg p-4 bg-white shadow space-y-4"
        >
          <div className="font-semibold text-lg">{p.title || p.name || 'Property'}</div>

          {p.image_url ? (
            <img
              src={p.image_url}
              alt={p.title || p.name || 'Property'}
              className="w-64 h-40 object-cover rounded"
            />
          ) : null}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs mb-1">Guests</label>
              <input
                type="number"
                value={p.max_guests ?? ''}
                onChange={(e) => updateLocalProperty(p.id, 'max_guests', Number(e.target.value))}
                className="border p-2 w-full rounded"
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Bedrooms</label>
              <input
                type="number"
                value={p.bedrooms ?? ''}
                onChange={(e) => updateLocalProperty(p.id, 'bedrooms', Number(e.target.value))}
                className="border p-2 w-full rounded"
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Bathrooms</label>
              <input
                type="number"
                step="0.5"
                value={p.bathrooms ?? ''}
                onChange={(e) => updateLocalProperty(p.id, 'bathrooms', Number(e.target.value))}
                className="border p-2 w-full rounded"
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Price / Night</label>
              <input
                type="number"
                value={p.price_per_night ?? ''}
                onChange={(e) =>
                  updateLocalProperty(p.id, 'price_per_night', Number(e.target.value))
                }
                className="border p-2 w-full rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1">Main Image URL</label>
            <input
              type="text"
              value={p.image_url ?? ''}
              onChange={(e) => updateLocalProperty(p.id, 'image_url', e.target.value)}
              className="border p-2 w-full rounded"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Short Description (for card)</label>
            <textarea
              value={p.short_description ?? ''}
              onChange={(e) => updateLocalProperty(p.id, 'short_description', e.target.value)}
              className="border p-2 w-full rounded min-h-[80px]"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Full Description (for Book Now popup)</label>
            <textarea
              value={p.description ?? ''}
              onChange={(e) => updateLocalProperty(p.id, 'description', e.target.value)}
              className="border p-2 w-full rounded min-h-[180px]"
            />
          </div>

          <div>
            <label className="block text-xs mb-2">Upload Gallery Images</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => void uploadGalleryImages(p.id, e.target.files)}
              className="border p-2 w-full rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload multiple house photos. Use “Set Main” to choose the card image.
            </p>
          </div>

          {p.gallery_images && p.gallery_images.length > 0 && (
            <div>
              <label className="block text-xs mb-2">Gallery Images</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {p.gallery_images.map((url, index) => (
                  <div key={index} className="border rounded p-2 space-y-2">
                    <img
                      src={url}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-24 object-cover rounded"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAsMainImage(p.id, url)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                      >
                        Set Main
                      </button>

                      <button
                        type="button"
                        onClick={() => removeGalleryImage(p.id, index)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => void saveProperty(p)}
            disabled={savingId === p.id || uploadingId === p.id}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {savingId === p.id
              ? 'Saving...'
              : uploadingId === p.id
                ? 'Uploading...'
                : 'Save'}
          </button>
        </div>
      ))}
    </div>
  );
}