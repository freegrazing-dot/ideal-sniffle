import { useEffect, useState } from 'react';
import { Plus, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminMerchandiseModal from './AdminMerchandiseModal';

type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  active: boolean | null;
  image_url: string | null;
  created_at?: string | null;
};

export default function AdminMerchView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  async function loadProducts() {
    const { data, error } = await supabase
      .from('merchandise_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading merchandise items:', error);
      alert(`Could not load merchandise: ${error.message}`);
      return;
    }

    setProducts((data as Product[]) || []);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function deleteProduct(id: string) {
    const confirmed = window.confirm('Delete product?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('merchandise_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting merchandise item:', error);
      alert(`Could not delete product: ${error.message}`);
      return;
    }

    await loadProducts();
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Merchandise</h2>

        <button
          type="button"
          onClick={() => {
            setSelectedProduct(null);
            setShowModal(true);
          }}
          className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {showModal && (
        <AdminMerchandiseModal
          product={selectedProduct}
          onClose={() => {
            setShowModal(false);
            setSelectedProduct(null);
            loadProducts();
          }}
        />
      )}

      <div className="space-y-3">
        {products.length === 0 ? (
          <div className="text-gray-500 text-sm">No products found.</div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="flex justify-between items-center border p-3 rounded"
            >
              <div className="flex gap-3 items-center">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                    <Package size={20} className="text-gray-500" />
                  </div>
                )}

                <div>
                  <div className="font-semibold">{product.name}</div>
                  <div className="text-sm text-gray-500">
                    ${Number(product.price || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {product.category || 'No category'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {product.active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowModal(true);
                  }}
                  className="bg-slate-900 text-white px-3 py-2 rounded text-sm"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => deleteProduct(product.id)}
                  className="bg-red-600 text-white px-3 py-2 rounded text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}