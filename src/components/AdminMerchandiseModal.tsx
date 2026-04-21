import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Product = {
  id?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  price: number;
  active?: boolean | null;
  image_url?: string | null;
};

type ExtraImage = {
  id?: string;
  image_url: string;
  display_order?: number;
};

type Props = {
  product?: Product | null;
  onClose: () => void;
};

export default function AdminMerchandiseModal({ product, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [mainImage, setMainImage] = useState('');
  const [galleryImages, setGalleryImages] = useState<ExtraImage[]>([]);
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const bucket = 'Merchandise';

  useEffect(() => {
    async function loadExtraImages() {
      if (!product?.id) {
        setGalleryImages([]);
        return;
      }

      const { data, error } = await supabase
        .from('merchandise_item_images')
        .select('id, image_url, display_order')
        .eq('merchandise_item_id', product.id)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error loading extra merch images:', error);
        setGalleryImages([]);
        return;
      }

      setGalleryImages(data || []);
    }

    if (product) {
      setName(product.name ?? '');
      setDescription(product.description ?? '');
      setCategory(product.category ?? '');
      setPrice(product.price != null ? String(product.price) : '');
      setMainImage(product.image_url ?? '');
      setActive(product.active ?? true);
      loadExtraImages();
    } else {
      setName('');
      setDescription('');
      setCategory('');
      setPrice('');
      setMainImage('');
      setGalleryImages([]);
      setActive(true);
    }
  }, [product]);

  async function uploadFile(file: File, prefix = 'merch') {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);

    if (!data?.publicUrl) {
      throw new Error('Upload completed, but no public URL was returned.');
    }

    return data.publicUrl;
  }

  async function handleMainImageUpload(file: File) {
    try {
      setUploadingImage(true);
      const publicUrl = await uploadFile(file, 'merch-main');
      setMainImage(publicUrl);
    } catch (error: any) {
      console.error('Main image upload error:', error);
      alert(`Main image upload failed: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleGalleryImageUpload(file: File) {
    try {
      setUploadingImage(true);
      const publicUrl = await uploadFile(file, 'merch-gallery');
      setGalleryImages((prev) => [
        ...prev,
        {
          image_url: publicUrl,
          display_order: prev.length,
        },
      ]);
    } catch (error: any) {
      console.error('Gallery image upload error:', error);
      alert(`Gallery image upload failed: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  }

  function removeGalleryImage(indexToRemove: number) {
    setGalleryImages((prev) =>
      prev
        .filter((_, index) => index !== indexToRemove)
        .map((img, index) => ({
          ...img,
          display_order: index,
        }))
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      alert('Product name is required');
      return;
    }

    setSaving(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      price: Number(price || 0),
      image_url: mainImage.trim() || null,
      active,
    };

    let savedItemId = product?.id || null;
    let saveError: any = null;

   if (product?.id) {
  const result = await supabase
    .from('merchandise_items')
    .update(payload)
    .eq('id', product.id);

  saveError = result.error;
  savedItemId = product.id;
} else {
  const result = await supabase
    .from('merchandise_items')
    .insert([payload])
    .select('id')
    .single();

  saveError = result.error;
  if (result.data?.id) savedItemId = result.data.id;
}

    if (saveError || !savedItemId) {
      setSaving(false);
      console.error('Error saving merchandise item:', saveError);
      alert(`Could not save product: ${saveError?.message || 'Unknown error'}`);
      return;
    }

    const { error: deleteImagesError } = await supabase
      .from('merchandise_item_images')
      .delete()
      .eq('merchandise_item_id', savedItemId);

    if (deleteImagesError) {
      setSaving(false);
      console.error('Error clearing old gallery images:', deleteImagesError);
      alert(`Saved product, but could not update gallery: ${deleteImagesError.message}`);
      return;
    }

    if (galleryImages.length > 0) {
      const galleryPayload = galleryImages.map((img, index) => ({
        merchandise_item_id: savedItemId,
        image_url: img.image_url,
        display_order: index,
      }));

      const { error: galleryError } = await supabase
        .from('merchandise_item_images')
        .insert(galleryPayload);

      if (galleryError) {
        setSaving(false);
        console.error('Error saving gallery images:', galleryError);
        alert(`Saved product, but could not save extra images: ${galleryError.message}`);
        return;
      }
    }

    setSaving(false);
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 700,
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 20 }}>
          {product?.id ? 'Edit Product' : 'Add Product'}
        </h2>

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Product Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #d1d5db',
                borderRadius: 8,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #d1d5db',
                borderRadius: 8,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Category
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #d1d5db',
                borderRadius: 8,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Price
            </label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #d1d5db',
                borderRadius: 8,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Main Image Upload
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleMainImageUpload(file);
              }}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #d1d5db',
                borderRadius: 8,
              }}
            />
          </div>

          {mainImage && (
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Main Image Preview
              </label>
              <img
                src={mainImage}
                alt="Main product"
                style={{
                  width: 160,
                  height: 160,
                  objectFit: 'cover',
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Additional Gallery Images
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleGalleryImageUpload(file);
              }}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #d1d5db',
                borderRadius: 8,
              }}
            />
          </div>

          {galleryImages.length > 0 && (
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Gallery Preview
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {galleryImages.map((img, index) => (
                  <div key={img.id || `${img.image_url}-${index}`} style={{ position: 'relative' }}>
                    <img
                      src={img.image_url}
                      alt={`Gallery ${index + 1}`}
                      style={{
                        width: 100,
                        height: 100,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #ddd',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(index)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#111827',
                        color: '#fff',
                        cursor: 'pointer',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadingImage && (
            <div style={{ fontSize: 14, color: '#6b7280' }}>
              Uploading image...
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active
          </label>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 24,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploadingImage}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              background: '#111827',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </div>
    </div>
  );
}