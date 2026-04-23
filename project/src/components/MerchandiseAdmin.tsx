import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/storage';

type MerchandiseRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
 
 
  image_url: string | null;
 
  active: boolean | null;
  created_at?: string | null;
};

const emptyForm = {
  name: '',
  description: '',
  category: '',
  price: '',
  
  
  active: true,
};

export default function MerchandiseAdmin() {
  const [products, setProducts] = useState<MerchandiseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase
      .from('merchandise_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading merchandise items:', error);
      setMessage(`Error loading merchandise items: ${error.message}`);
      setProducts([]);
      setLoading(false);
      return;
    }

    setProducts((data as MerchandiseRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setMainImageFile(null);
  };

  const handleMainImageUpload = async (): Promise<string | null> => {
    if (!mainImageFile) return null;

    const result = await uploadImage(mainImageFile, 'merchandise');

    if (!result || result.error || !result.url) {
      throw new Error(result?.error || 'Failed to upload main image');
    }

    return result.url;
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
      const imageUrl = await handleMainImageUpload();

const payload = {
  name: form.name.trim(),
  description: form.description.trim() || null,
  category: form.category.trim() || null,
  price: Number(form.price),
  image_url: imageUrl,
  active: form.active,
};
      const { error } = await supabase.from('merchandise_items').insert([payload]);

      if (error) {
        console.error('Error saving merchandise item:', error);
        throw new Error(error.message || 'Failed to save merchandise item');
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

    const { error } = await supabase.from('merchandise_items').delete().eq('id', id);

    if (error) {
      console.error('Error deleting merchandise item:', error);
      setMessage(`Error deleting product: ${error.message}`);
      return;
    }

    setMessage('Product deleted.');
    await fetchProducts();
  };

  const toggleActive = async (product: MerchandiseRow) => {
    setMessage('');

    const { error } = await supabase
      .from('merchandise_items')
      .update({ active: !product.active })
      .eq('id', product.id);

    if (error) {
      console.error('Error updating merchandise item:', error);
      setMessage(`Error updating product: ${error.message}`);
      return;
    }

    await fetchProducts();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Merchandise Admin</h2>
        <p className="mt-1 text-sm text-gray-600">
          Add merchandise, upload images, and manage stock.
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
            <label className="mb-2 block text-sm font-medium text-gray-700">
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
            <label className="mb-2 block text-sm font-medium text-gray-700">
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
            <label className="mb-2 block text-sm font-medium text-gray-700">
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
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Stock Quantity
            </label>
            <input
              type="number"
              value={form.stock_quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, stock_quantity: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              placeholder="10"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Sizes
            </label>
            <input
              type="text"
              value={form.sizes}
              onChange={(e) => setForm((prev) => ({ ...prev, sizes: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              placeholder="16oz, 20oz, 24oz"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Colors
            </label>
            <input
              type="text"
              value={form.colors}
              onChange={(e) => setForm((prev) => ({ ...prev, colors: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              placeholder="White, Navy, Seafoam"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
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

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
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
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Existing Products</h3>

        {loading ? (
          <div className="text-sm text-gray-600">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="text-sm text-gray-600">No products found.</div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((product) => (
              <div key={product.id} className="rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
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
                  
                  <div>Status: {product.active ? 'Active' : 'Inactive'}</div>
                  
                  
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