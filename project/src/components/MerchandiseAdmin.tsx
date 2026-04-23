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

const emptyForm = {
  id: '',
  name: '',
  description: '',
  category: '',
  price: '',
  sizes: '',
  active: true,
};

export default function MerchandiseAdmin() {
  const [products, setProducts] = useState<MerchandiseRow[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [editing, setEditing] = useState(false);

  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [backImageFile, setBackImageFile] = useState<File | null>(null);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('merchandise_items')
      .select('*')
      .order('created_at', { ascending: false });

    setProducts(data || []);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(false);
    setMainImageFile(null);
    setBackImageFile(null);
  };

  const upload = async (file: File | null) => {
    if (!file) return null;
    const res = await uploadImage(file, 'merchandise');
    return res?.url || null;
  };

  const handleSave = async () => {
    const front = await upload(mainImageFile);
    const back = await upload(backImageFile);

    const payload = {
      name: form.name,
      description: form.description || null,
      category: form.category || null,
      price: Number(form.price),
      sizes: form.sizes || null,
      image_url: front || form.image_url || null,
      back_image_url: back || form.back_image_url || null,
      active: form.active,
    };

    if (editing) {
      await supabase
        .from('merchandise_items')
        .update(payload)
        .eq('id', form.id);
    } else {
      await supabase.from('merchandise_items').insert([payload]);
    }

    resetForm();
    fetchProducts();
  };

  const handleEdit = (product: MerchandiseRow) => {
    setForm(product);
    setEditing(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('merchandise_items').delete().eq('id', id);
    fetchProducts();
  };

  return (
    <div className="p-6 space-y-6">

      <h2 className="text-xl font-bold">
        {editing ? 'Edit Product' : 'Add Product'}
      </h2>

      {/* FORM */}
      <div className="space-y-3">

        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          placeholder="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />

        <input
          placeholder="Price"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />

        <input
          placeholder="Sizes (S,M,L,XL)"
          value={form.sizes || ''}
          onChange={(e) => setForm({ ...form, sizes: e.target.value })}
        />

        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <div>
          Front Image:
          <input type="file" onChange={(e) => setMainImageFile(e.target.files?.[0] || null)} />
        </div>

        <div>
          Back Image:
          <input type="file" onChange={(e) => setBackImageFile(e.target.files?.[0] || null)} />
        </div>

        <button onClick={handleSave}>
          {editing ? 'Update Product' : 'Save Product'}
        </button>

        {editing && (
          <button onClick={resetForm}>
            Cancel Edit
          </button>
        )}

      </div>

      {/* PRODUCTS */}
      <div className="grid grid-cols-2 gap-4">
        {products.map((p) => (
          <div key={p.id} className="border p-3">

            <img src={p.image_url || ''} className="w-full h-40 object-cover" />

            <h3>{p.name}</h3>
            <p>${p.price}</p>

            <div className="flex gap-2 mt-2">
              <button onClick={() => handleEdit(p)}>Edit</button>
              <button onClick={() => handleDelete(p.id)}>Delete</button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}