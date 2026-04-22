import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Activity = {
  id: string;
  name: string;
  description: string;
  base_price: number;
  image_url: string;
  gallery_images?: string[];
  active: boolean;
};

export default function ActivitiesAdmin() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  async function loadActivities() {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .order('created_at');

    setActivities(data || []);
    setLoading(false);
  }

  async function updateField(id: string, field: string, value: any) {
    await supabase
      .from('activities')
      .update({ [field]: value })
      .eq('id', id);

    loadActivities();
  }

  if (loading) return <div>Loading activities...</div>;

  return (
    <div className="space-y-6">

      <h2 className="text-2xl font-bold">Activities Admin</h2>

      {activities.map((a) => (
        <div key={a.id} className="border p-4 rounded bg-white space-y-3">

          <input
            value={a.name}
            onChange={(e) => updateField(a.id, 'name', e.target.value)}
            className="border p-2 w-full"
            placeholder="Name"
          />

          <textarea
            value={a.description}
            onChange={(e) => updateField(a.id, 'description', e.target.value)}
            className="border p-2 w-full"
            placeholder="Description"
          />

          <input
            type="number"
            value={a.base_price}
            onChange={(e) => updateField(a.id, 'base_price', Number(e.target.value))}
            className="border p-2 w-full"
          />

          <input
            value={a.image_url}
            onChange={(e) => updateField(a.id, 'image_url', e.target.value)}
            className="border p-2 w-full"
            placeholder="Main Image URL"
          />

          <textarea
            value={(a.gallery_images || []).join('\n')}
            onChange={(e) =>
              updateField(a.id, 'gallery_images', e.target.value.split('\n'))
            }
            className="border p-2 w-full"
            placeholder="Gallery image URLs (one per line)"
          />

          <button
            onClick={() => updateField(a.id, 'active', !a.active)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {a.active ? 'Active' : 'Inactive'}
          </button>

        </div>
      ))}

    </div>
  );
}