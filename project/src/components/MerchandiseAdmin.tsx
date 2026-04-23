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
  back_image_url: string | null;
  sizes: string | null;
  active: boolean | null;
};

type MerchandiseForm = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: string;
  sizes: string;
  image_url?: string | null;
  back_image_url?: string | null;
  active: boolean;
};

const emptyForm: MerchandiseForm = {
  id: '',
  name: '',
  description: '',
  category: '',
  price: '',
  sizes: '',
  image_url: '',
  back_image_url: '',
  active: true,
};

export default function MerchandiseAdmin() {
  const [products, setProducts] = useState<MerchandiseRow[]>([]);
  const [form, setForm] = useState<MerchandiseForm>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [backImageFile, setBackImageFile] = useState<File | null>(null);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('merchandise_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading merchandise items:', error);
      setMessage(`Error loading merchandise items: ${error.message}`);
      setProducts([]);
      return;
    }

    setProducts((data as MerchandiseRow[]) || []);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(false);
    setMainImageFile(null);
    setBackImageFile(null);
    setMessage('');
  };

  const upload = async (file: File | null) => {
    if (!file) return null;
    const res = await uploadImage(file, 'merchandise');
    if (!res || res.error || !res.url) {
      throw new Error(res?.error || 'Image upload failed');
    }
    return res.url;
  };

  const handleSave = async () => {
    setMessage('');

    if (!form.name.trim()) {
      setMessage('Product name is required.');
      return;
    }

    if (!form.price.trim() || Number.isNaN(Number(form.price))) {
      setMessage('A valid price is required.');
      return;
    }

    setSaving(true);

    try {
      const front = await upload(mainImageFile);
      const back = await upload(backImageFile);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        price: Number(form.price),
        sizes: form.sizes.trim() || null,
        image_url: front || form.image_url || null,
        back_image_url: back || form.back_image_url || null,
        active: form.active,
      };

      if (editing) {
        const { error } = await supabase
          .from('merchandise_items')
          .update(payload)
          .eq('id', form.id);

        if (error) throw error;
        setMessage('Product updated successfully.');
      } else {
        const { error } = await supabase.from('merchandise_items').insert([payload]);

        if (error) throw error;
        setMessage('Product saved successfully.');
      }

      resetForm();
      await fetchProducts();
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: MerchandiseRow) => {
    setForm({
      id: product.id,
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      price: product.price != null ? String(product.price) : '',
      sizes: product.sizes || '',
      image_url: product.image_url || '',
      back_image_url: product.back_image_url || '',
      active: !!product.active,
    });
    setEditing(true);
    setMainImageFile(null);
    setBackImageFile(null);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this product?');
    if (!confirmed) return;

    const { error } = await supabase.from('merchandise_items').delete().eq('id', id);

    if (error) {
      console.error('Delete failed:', error);
      setMessage(`Delete failed: ${error.message}`);
      return;
    }

    if (editing && form.id === id) {
      resetForm();
    }

    setMessage('Product deleted.');
    await fetchProducts();
  };

  const toggleActive = async (product: MerchandiseRow) => {
    const { error } = await supabase
      .from('merchandise_items')
      .update({ active: !product.active })
      .eq('id', product.id);

    if (error) {
      console.error('Status update failed:', error);
      setMessage(`Status update failed: ${error.message}`);
      return;
    }

    await fetchProducts();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {editing ? 'Edit Product' : 'Add Product'}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage shirt sizes, front image, and back image here.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Product Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              placeholder="TKAC T-Shirt"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Category</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              placeholder="Apparel"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Price</label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              placeholder="24.99"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Sizes (comma separated)
            </label>
            <input
              type="text"
              value={form.sizes}
              onChange={(e) => setForm({ ...form, sizes: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              placeholder="S,M,L,XL,XXL"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            placeholder="Comfortable TKAC shirt with front and back print..."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Front Image</label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => setMainImageFile(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
            {mainImageFile && (
              <p className="text-sm text-gray-600">New front image: {mainImageFile.name}</p>
            )}
            {form.image_url && (
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500">Current front image</p>
                <img
                  src={form.image_url}
                  alt="Front"
                  className="h-48 w-full rounded-lg border object-cover"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Back Image</label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => setBackImageFile(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
            {backImageFile && (
              <p className="text-sm text-gray-600">New back image: {backImageFile.name}</p>
            )}
            {form.back_image_url && (
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500">Current back image</p>
                <img
                  src={form.back_image_url}
                  alt="Back"
                  className="h-48 w-full rounded-lg border object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          <span className="text-sm text-gray-700">Active product</span>
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : editing ? 'Update Product' : 'Save Product'}
          </button>

          <button
            type="button"
            onClick={resetForm}
            disabled={saving}
            className="rounded-lg bg-gray-200 px-5 py-2 font-medium text-gray-800 hover:bg-gray-300"
          >
            {editing ? 'Cancel Edit' : 'Clear'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Existing Products</h3>

        {products.length === 0 ? (
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

                <div className="text-sm text-gray-700 space-y-1">
                  <div>Price: ${(product.price ?? 0).toFixed(2)}</div>
                  <div>Status: {product.active ? 'Active' : 'Inactive'}</div>
                  <div>Sizes: {product.sizes || 'None'}</div>
                  <div>Back Image: {product.back_image_url ? 'Yes' : 'No'}</div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(product)}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Edit
                  </button>

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