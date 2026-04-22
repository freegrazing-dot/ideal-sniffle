import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/storage';

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  inventory: number | null;
  active: boolean | null;
  main_image: string | null;
  gallery_images: string[] | null;
  created_at?: string | null;
};

const emptyForm = {
  name: '',
  description: '',
  category: '',
  price: '',
  inventory: '',
  active: true,
};

export default function MerchandiseAdmin() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const fetchProducts = async () => {
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading products:', error);
      setMessage(`Error loading products: ${error.message}`);
      setProducts([]);
      setLoading(false);
      return;
    }

    setProducts((data as ProductRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setMainImageFile(null);
    setGalleryFiles([]);
  };

  const handleMainImageUpload = async (): Promise<string | null> => {
    if (!mainImageFile) return null;

    const result = await uploadImage(mainImageFile, 'merchandise');

    if (!result || result.error || !result.url) {
      throw new Error(result?.error || 'Failed to upload main image');
    }

    return result.url;
  };

  const handleGalleryUploads = async (): Promise<string[]> => {
    if (!galleryFiles.length) return [];

    const uploadedUrls: string[] = [];

    for (const file of galleryFiles) {
      const result = await uploadImage(file, 'merchandise');

      if (!result || result.error || !result.url) {
        throw new Error(result?.error || `Failed to upload gallery image: ${file.name}`);
      }

      uploadedUrls.push(result.url);
    }

    return uploadedUrls;
  };

  const handleSave = async () => {
    setMessage('');

    if (!form.name.trim()) {
      setMessage('Product name is required.');
      return;
    }

    if (!form.price.trim() || Number.isNaN(Number(form.price))) {
      setMessage('Valid price is required.');
      return;
    }

    setSaving(true);

    try {
      const mainImageUrl = await handleMainImageUpload();
      const galleryImageUrls = await handleGalleryUploads();

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        price: Number(form.price),
        inventory: form.inventory.trim() ? Number(form.inventory) : 0,
        active: form.active,
        main_image: mainImageUrl,
        gallery_images: galleryImageUrls.length ? galleryImageUrls : [],
      };

      const { error } = await supabase.from('products').insert([payload]);

      if (error) {
        console.error('Error saving product:', error);
        throw new Error(error.message || 'Failed to save product');
      }

      setMessage('Product saved successfully.');
      resetForm();
      await fetchProducts();
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this product?');
    if (!confirmed) return;

    setMessage('');

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      setMessage(`Error deleting product: ${error.message}`);
      return;
    }

    setMessage('Product deleted.');
    await fetchProducts();
  };

  const toggleActive = async (product: ProductRow) => {
    setMessage('');

    const { error } = await supabase
      .from('products')
      .update({ active: !product.active })
      .eq('id', product.id);

    if (error) {
      console.error('Error updating product:', error);
      setMessage(`Error updating product: ${error.message}`);
      return;
    }

    await fetchProducts();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Merchandise Admin</h2>
        <p className="text-sm text-gray-600 mt-1">
          Add products, upload images, and manage inventory.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Add Product</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              placeholder="TKAC Tumbler"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              placeholder="Drinkware"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price
            </label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              placeholder="24.99"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inventory
            </label>
            <input
              type="number"
              value={form.inventory}
              onChange={(e) => setForm((prev) => ({ ...prev, inventory: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              placeholder="10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            placeholder="Stainless tumbler with TKAC logo..."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Main Image
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => setMainImageFile(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
            {mainImageFile && (
              <p className="mt-2 text-sm text-gray-600">{mainImageFile.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gallery Images
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
            {galleryFiles.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                {galleryFiles.length} gallery image(s) selected
              </p>
            )}
          </div>
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
          />
          <span className="text-sm text-gray-700">Active product</span>
        </label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Product'}
          </button>

          <button
            type="button"
            onClick={resetForm}
            disabled={saving}
            className="rounded-lg bg-gray-200 px-5 py-2 font-medium text-gray-800 hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Products</h3>

        {loading ? (
          <div className="text-sm text-gray-600">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="text-sm text-gray-600">No products found.</div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((product) => (
              <div key={product.id} className="rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                  {product.main_image ? (
                    <img
                      src={product.main_image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                      No image
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900">{product.name}</h4>
                  <p className="text-sm text-gray-500">{product.category || 'No category'}</p>
                </div>

                <div className="text-sm text-gray-700">
                  <div>Price: ${(product.price ?? 0).toFixed(2)}</div>
                  <div>Inventory: {product.inventory ?? 0}</div>
                  <div>Status: {product.active ? 'Active' : 'Inactive'}</div>
                  <div>Gallery: {product.gallery_images?.length ?? 0} images</div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleActive(product)}
                    className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
                  >
                    {product.active ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(product.id)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}