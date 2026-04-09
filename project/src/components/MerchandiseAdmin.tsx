import { useState } from 'react';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';

type MerchandiseItem = {
  id: number;
  name: string;
  category: string;
  price: string;
  inventory: number;
  active: boolean;
};

export function MerchandiseAdmin() {
  const [items] = useState<MerchandiseItem[]>([
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

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Merchandise Manager</h2>
          <p className="text-gray-600 mt-1">
            Manage shirts, hats, tumblers, and promo items.
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors">
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
                    <button className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}