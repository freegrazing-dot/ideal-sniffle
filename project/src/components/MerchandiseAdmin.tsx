import { useState } from 'react';
import { Plus, Pencil, Trash2, Package, X } from 'lucide-react';

type MerchandiseItem = {
  id: number;
  name: string;
  category: string;
  price: string;
  inventory: number;
  active: boolean;
};

type NewProductForm = {
  name: string;
  category: string;
  price: string;
  inventory: string;
  active: boolean;
};

export function MerchandiseAdmin() {
  const [items, setItems] = useState<MerchandiseItem[]>([
    {
      id: 1,
      name: '20oz Mint Green Tumbler',
      category: 'Tumblers',
      price: '$24.99',
      inventory: 12,
      active: true,
    },
    {
      id: 2,
      name: 'TKAC T-Shirt',
      category: 'Shirts',
      price: '$29.99',
      inventory: 18,
      active: true,
    },
    {
      id: 3,
      name: 'TKAC Hat',
      category: 'Hats',
      price: '$22.99',
      inventory: 9,
      active: false,
    },
  ]);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [form, setForm] = useState<NewProductForm>({
    name: '',
    category: '',
    price: '',
    inventory: '',
    active: true,
  });

  const handleInputChange = (
    field: keyof NewProductForm,
    value: string | boolean
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddProduct = () => {
    if (
      !form.name.trim() ||
      !form.category.trim() ||
      !form.price.trim() ||
      !form.inventory.trim()
    ) {
      alert('Please fill out all product fields.');
      return;
    }

    const inventoryNumber = Number(form.inventory);

    if (Number.isNaN(inventoryNumber)) {
      alert('Inventory must be a number.');
      return;
    }

    const normalizedPrice = form.price.startsWith('$')
      ? form.price
      : `$${form.price}`;

    const newItem: MerchandiseItem = {
      id: Date.now(),
      name: form.name.trim(),
      category: form.category.trim(),
      price: normalizedPrice,
      inventory: inventoryNumber,
      active: form.active,
    };

    setItems((prev) => [newItem, ...prev]);

    setForm({
      name: '',
      category: '',
      price: '',
      inventory: '',
      active: true,
    });

    setShowAddProduct(false);
  };

  const handleDeleteProduct = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
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
          onClick={() => setShowAddProduct(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {showAddProduct && (
        <div className="mb-6 border border-gray-200 rounded-xl p-6 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Add Product</h3>
            <button
              onClick={() => setShowAddProduct(false)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

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

          <div className="flex gap-3">
            <button
              onClick={handleAddProduct}
              className="px-5 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Save Product
            </button>

            <button
              onClick={() => setShowAddProduct(false)}
              className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Product</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Category</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Price</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Inventory</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-500" />
                    </div>
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                </td>

                <td className="px-4 py-4 text-gray-700">{item.category}</td>
                <td className="px-4 py-4 text-gray-700">{item.price}</td>
                <td className="px-4 py-4 text-gray-700">{item.inventory}</td>

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
                      className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                      title="Edit coming next"
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
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No merchandise products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}