import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Activity = {
  id: string;
  name: string;
  description: string;
  duration_hours: number;
  capacity: number;
  base_price: number;
  image_url: string;
  gallery_images?: string[];
  active: boolean;
  created_at?: string;
};

export default function ActivitiesAdmin() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    void loadActivities();
  }, []);

  async function loadActivities() {
    setLoading(true);

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at');

    if (error) {
      console.error('Error loading activities:', error);
    } else {
      setActivities((data as Activity[]) || []);
    }

    setLoading(false);
  }

  function updateLocalActivity(
    id: string,
    field: keyof Activity,
    value: string | number | boolean | string[]
  ) {
    setActivities((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              [field]: value,
            }
          : a
      )
    );
  }

  async function saveActivity(activity: Activity) {
    setSavingId(activity.id);

    const payload = {
      name: activity.name || '',
      description: activity.description || '',
      duration_hours: Number(activity.duration_hours || 0),
      capacity: Number(activity.capacity || 0),
      base_price: Number(activity.base_price || 0),
      image_url: activity.image_url || '',
      gallery_images: activity.gallery_images || [],
      active: !!activity.active,
    };

    const { error } = await supabase
      .from('activities')
      .update(payload)
      .eq('id', activity.id);

    if (error) {
      console.error('Error saving activity:', error);
      alert('Error saving activity');
    } else {
      alert('Saved');
      await loadActivities();
    }

    setSavingId(null);
  }

  if (loading) {
    return <div className="p-6">Loading activities...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Activities Admin</h2>

      {activities.map((activity) => (
        <div
          key={activity.id}
          className="border rounded-lg p-4 bg-white shadow space-y-4"
        >
          <div className="font-semibold text-lg">
            {activity.name || 'Untitled Activity'}
          </div>

          {activity.image_url ? (
            <img
              src={activity.image_url}
              alt={activity.name}
              className="w-64 h-40 object-cover rounded"
            />
          ) : null}

          <div>
            <label className="block text-xs mb-1">Activity Name</label>
            <input
              type="text"
              value={activity.name ?? ''}
              onChange={(e) =>
                updateLocalActivity(activity.id, 'name', e.target.value)
              }
              className="border p-2 w-full rounded"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Description</label>
            <textarea
              value={activity.description ?? ''}
              onChange={(e) =>
                updateLocalActivity(activity.id, 'description', e.target.value)
              }
              className="border p-2 w-full rounded min-h-[120px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs mb-1">Duration (hours)</label>
              <input
                type="number"
                value={activity.duration_hours ?? ''}
                onChange={(e) =>
                  updateLocalActivity(
                    activity.id,
                    'duration_hours',
                    Number(e.target.value)
                  )
                }
                className="border p-2 w-full rounded"
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Capacity</label>
              <input
                type="number"
                value={activity.capacity ?? ''}
                onChange={(e) =>
                  updateLocalActivity(
                    activity.id,
                    'capacity',
                    Number(e.target.value)
                  )
                }
                className="border p-2 w-full rounded"
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Base Price</label>
              <input
                type="number"
                value={activity.base_price ?? ''}
                onChange={(e) =>
                  updateLocalActivity(
                    activity.id,
                    'base_price',
                    Number(e.target.value)
                  )
                }
                className="border p-2 w-full rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1">Main Image URL</label>
            <input
              type="text"
              value={activity.image_url ?? ''}
              onChange={(e) =>
                updateLocalActivity(activity.id, 'image_url', e.target.value)
              }
              className="border p-2 w-full rounded"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">
              Gallery Image URLs (one per line)
            </label>
            <textarea
              value={(activity.gallery_images || []).join('\n')}
              onChange={(e) =>
                updateLocalActivity(
                  activity.id,
                  'gallery_images',
                  e.target.value
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              className="border p-2 w-full rounded min-h-[120px]"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Active</label>
            <input
              type="checkbox"
              checked={!!activity.active}
              onChange={(e) =>
                updateLocalActivity(activity.id, 'active', e.target.checked)
              }
            />
          </div>

          <button
            type="button"
            onClick={() => void saveActivity(activity)}
            disabled={savingId === activity.id}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {savingId === activity.id ? 'Saving...' : 'Save Activity'}
          </button>
        </div>
      ))}
    </div>
  );
}