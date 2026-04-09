import { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type MerchandiseItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  inventory: number;
  active: boolean;
  main_image: string | null;
  gallery_images: string[];
};

type ProductForm = {
  name: string;
  category: string;
  price: string;
  inventory: string;
  active: boolean;
  mainImage: string;
  galleryImages: string;
};

const emptyForm: ProductForm = {
  name: '',
  category: '',
  price: '',
  inventory: '',
  active: true,
  mainImage: '',
  galleryImages: '',
};

export function MerchandiseAdmin() {
  const [items, setItems] = useState<MerchandiseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('merchandise_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading merchandise products:', error);
      alert('Could not load merchandise products.');
    } else {
      setItems((data || []) as MerchandiseItem[]);
    }

    setLoading(false);
  };

  const handleInputChange = (field: keyof ProductForm, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const parseGalleryImages = (value: string) => {
    return value
      .split(',')
      .map((img) => img.trim())
      .filter(Boolean);
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowProductModal(true);
  };

  const openEditModal = (item: MerchandiseItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      price: String(item.price),
      inventory: String(item.inventory),
      active: item.active,
      mainImage: item.main_image || '',
      galleryImages: (item.gallery_images || []).join(', '),
    });
    setShowProductModal(true);
  };

  const closeModal = () => {
    setShowProductModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSaveProduct = async () => {
    if (
      !form.name.trim() ||
      !form.category.trim() ||
      !form.price.trim() ||
      !form.inventory.trim()
    ) {
      alert('Please fill out product name, category, price, and inventory.');
      return;
    }

    const priceNumber = Number(form.price);
    const inventoryNumber = Number(form.inventory);

    if (Number.isNaN(priceNumber) || Number.isNaN(inventoryNumber)) {
      alert('Price and inventory must be valid numbers.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      price: priceNumber,
      inventory: inventoryNumber,
      active: form.active,
      main_image: form.mainImage.trim() || null,
      gallery_images: parseGalleryImages(form.galleryImages),
    };

    setSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from('merchandise_products')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        console.error('Error updating product:', error);
        alert('Could not update product.');
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('merchandise_products')
        .insert(payload);

      if (error) {
        console.error('Error creating product:', error);
        alert('Could not create product.');
        setSaving(false);
        return;
      }
    }

    await fetchProducts();
    setSaving(false);
    closeModal();
  };

  const handleDeleteProduct = async (id: string) => {
    const confirmed = window.confirm('Delete this product?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('merchandise_products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      alert('Could not delete product.');
      return;
    }

    await fetchProducts();
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Merchandise Manager</h2>
          <p className="text-gray-600 mt-1">
            Manage shirts, hats, tumblers, and promo items.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 rounded-lg p-4 border">
          <p className="text-sm text-gray-600">Total Products</p>
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 border">
          <p className="text-sm text-gray-600">Active Products</p>
          <p className="text-2xl font-bold text-green-600">
            {items.filter((item) => item.active).length}
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 border">
          <p className="text-sm text-gray-600">Low Inventory</p>
          <p className="text-2xl font-bold text-orange-600">
            {items.filter((item) => item.inventory <= 10).length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading merchandise...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Product</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Price</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Inventory</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Images</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {item.main_image ? (
                        <img
                          src={item.main_image}
                          alt={item.name}
                          className="w-10 h-10 object-cover rounded-lg border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-gray-700">{item.category}</td>
                  <td className="px-4 py-4 text-gray-700">${item.price.toFixed(2)}</td>
                  <td className="px-4 py-4 text-gray-700">{item.inventory}</td>

                  <td className="px-4 py-4 text-gray-700">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-gray-500" />
                      <span>{(item.main_image ? 1 : 0) + (item.gallery_images?.length || 0)}</span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        item.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                        title="Edit product"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(item.id)}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No merchandise products yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingId ? 'Edit Product' : 'Add Product'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Product name"
                  value={form.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />

                <input
                  type="text"
                  placeholder="Category"
                  value={form.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />

                <input
                  type="text"
                  placeholder="Price (example: 24.99)"
                  value={form.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />

                <input
                  type="text"
                  placeholder="Inventory"
                  value={form.inventory}
                  onChange={(e) => handleInputChange('inventory', e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />

                <input
                  type="text"
                  placeholder="Main image URL"
                  value={form.mainImage}
                  onChange={(e) => handleInputChange('mainImage', e.target.value)}
                  className="md:col-span-2 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />

                <textarea
                  placeholder="Additional image URLs (comma separated)"
                  value={form.galleryImages}
                  onChange={(e) => handleInputChange('galleryImages', e.target.value)}
                  rows={4}
                  className="md:col-span-2 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <label className="flex items-center gap-3 mb-4 text-gray-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => handleInputChange('active', e.target.checked)}
                  className="w-4 h-4"
                />
                Active product
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveProduct}
                  disabled={saving}
                  className="px-5 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Product'}
                </button>

                <button
                  onClick={closeModal}
                  className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}