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
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at');

    if (!error && data) {
      setActivities(data);
    }

    setLoading(false);
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase
      .from('activities')
      .update({ active: !active })
      .eq('id', id);

    loadActivities();
  }

  if (loading) return <div>Loading activities...</div>;

  return (
    <div>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
        Activities
      </h2>

      <div style={{ display: 'grid', gap: 12 }}>

        {activities.map((activity) => (

          <div
            key={activity.id}
            style={{
              padding: 14,
              borderRadius: 8,
              background: '#fff',
              border: '1px solid #ddd'
            }}
          >

            <strong>{activity.name}</strong>

            <div style={{ marginTop: 6 }}>
              ${activity.base_price}
            </div>

            <div style={{ marginTop: 10 }}>

              <button
                onClick={() => toggleActive(activity.id, activity.active)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: activity.active ? '#16a34a' : '#9ca3af',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                {activity.active ? 'Active' : 'Inactive'}
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}