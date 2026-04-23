import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Activity = {
  id: string;
  name: string;
  description: string;
  duration_hours: number;
  capacity: number;
  price: number;
  image_url: string;
  gallery_images?: string[];
  active: boolean;
};

export default function ActivitiesAdmin() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newActivity, setNewActivity] = useState({
    name: '',
    description: '',
    duration_hours: '',
    capacity: '',
    price: '',
    image_url: '',
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  async function loadActivities() {
    const { data } = await supabase.from('activities').select('*').order('created_at');
    setActivities(data || []);
    setLoading(false);
  }

  async function createActivity() {
    if (!newActivity.name.trim()) {
      alert('Name required');
      return;
    }

    const cleanName = newActivity.name.trim();

    const payload = {
      name: cleanName,
      title: cleanName,
      description: newActivity.description,
      duration_hours: Number(newActivity.duration_hours || 0),
      capacity: Number(newActivity.capacity || 0),
      price: Number(newActivity.price || 0),
      image_url: newActivity.image_url,
      gallery_images: [],
      active: true,
    };

    const { error } = await supabase.from('activities').insert([payload]);

    if (error) {
      console.error(error);
      alert('Create failed');
    } else {
      alert('Created');
      setNewActivity({
        name: '',
        description: '',
        duration_hours: '',
        capacity: '',
        price: '',
        image_url: '',
      });
      loadActivities();
    }
  }

  async function saveActivity(activity: Activity) {
    const cleanName = activity.name || '';

    const payload = {
      name: cleanName,
      title: cleanName,
      description: activity.description,
      duration_hours: Number(activity.duration_hours || 0),
      capacity: Number(activity.capacity || 0),
      price: Number(activity.price || 0),
      image_url: activity.image_url,
      gallery_images: activity.gallery_images || [],
      active: activity.active,
    };

    const { error } = await supabase
      .from('activities')
      .update(payload)
      .eq('id', activity.id);

    if (error) {
      console.error(error);
      alert('Save failed');
    } else {
      alert('Saved');
      loadActivities();
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Activities Admin</h2>

      {/* CREATE */}
      <div style={{ marginBottom: 30 }}>
        <h3>Create Activity</h3>

        <input placeholder="Name" onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })} />
        <input placeholder="Description" onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })} />
        <input placeholder="Duration" onChange={(e) => setNewActivity({ ...newActivity, duration_hours: e.target.value })} />
        <input placeholder="Capacity" onChange={(e) => setNewActivity({ ...newActivity, capacity: e.target.value })} />
        <input placeholder="Price" onChange={(e) => setNewActivity({ ...newActivity, price: e.target.value })} />
        <input placeholder="Image URL" onChange={(e) => setNewActivity({ ...newActivity, image_url: e.target.value })} />

        <button onClick={createActivity}>Create</button>
      </div>

      {/* LIST */}
      {activities.map((a) => (
        <div key={a.id} style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10 }}>
          <input value={a.name} onChange={(e) => (a.name = e.target.value)} />
          <input value={a.price} onChange={(e) => (a.price = Number(e.target.value))} />

          <label>
            Active
            <input
              type="checkbox"
              checked={a.active}
              onChange={(e) => (a.active = e.target.checked)}
            />
          </label>

          <button onClick={() => saveActivity(a)}>Save</button>
        </div>
      ))}
    </div>
  );
}