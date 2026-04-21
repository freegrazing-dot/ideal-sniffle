import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Waves, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Activity = {
  id: string;
  title?: string | null;
  name?: string | null;
  description: string | null;
  image_url: string | null;
  duration_hours: number | null;
  capacity: number | null;
  price: number | null;
  active: boolean | null;
};

type ActivityImage = {
  id: string;
  activity_id: string;
  image_url: string;
  display_order: number | null;
};

type FormState = {
  name: string;
  description: string;
  image_url: string;
  duration_hours: string;
  capacity: string;
  price: string;
  active: boolean;
};

const emptyForm: FormState = {
  name: '',
  description: '',
  image_url: '',
  duration_hours: '',
  capacity: '',
  price: '',
  active: true
};

export default function ActivitiesAdmin() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityImages, setActivityImages] = useState<ActivityImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingPrimaryImage, setUploadingPrimaryImage] = useState(false);
  const [uploadingGalleryImages, setUploadingGalleryImages] = useState(false);

  useEffect(() => {
    loadActivities();
  }, []);

  async function loadActivities() {
    setLoading(true);

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading activities:', error);
      setLoading(false);
      return;
    }

    setActivities((data as Activity[]) || []);
    setLoading(false);
  }

  async function loadActivityImages(activityId: string) {
    const { data, error } = await supabase
      .from('activity_images')
      .select('*')
      .eq('activity_id', activityId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading activity images:', error);
      setActivityImages([]);
      return;
    }

    setActivityImages((data as ActivityImage[]) || []);
  }

  function openNew() {
    setEditingActivity(null);
    setActivityImages([]);
    setForm(emptyForm);
    setShowEditor(true);
  }

  async function openEdit(activity: Activity) {
    setEditingActivity(activity);
    setForm({
      name: activity.title ?? activity.name ?? '',
      description: activity.description ?? '',
      image_url: activity.image_url ?? '',
      duration_hours:
        activity.duration_hours != null ? String(activity.duration_hours) : '',
      capacity: activity.capacity != null ? String(activity.capacity) : '',
      price: activity.price != null ? String(activity.price) : '',
      active: activity.active ?? true
    });
    setShowEditor(true);
    await loadActivityImages(activity.id);
  }

  function closeEditor() {
    setEditingActivity(null);
    setActivityImages([]);
    setForm(emptyForm);
    setShowEditor(false);
    setUploadingPrimaryImage(false);
    setUploadingGalleryImages(false);
  }

  async function handlePrimaryImageUpload(file: File) {
    try {
      setUploadingPrimaryImage(true);

      const safeName = file.name.replace(/\s+/g, '-');
      const filePath = `activities/primary/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Primary upload error:', uploadError);
        alert(uploadError.message || 'Could not upload primary image');
        return;
      }

      const { data } = supabase.storage
        .from('site-images')
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        alert('Upload finished but no public URL was returned');
        return;
      }

      setForm((prev) => ({
        ...prev,
        image_url: data.publicUrl
      }));
    } catch (error: any) {
      console.error('Primary image upload failed:', error);
      alert(error?.message || 'Primary image upload failed');
    } finally {
      setUploadingPrimaryImage(false);
    }
  }

  async function handleGalleryUploads(files: FileList) {
    if (!editingActivity?.id) {
      alert('Save the activity first, then upload gallery images.');
      return;
    }

    try {
      setUploadingGalleryImages(true);

      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/\s+/g, '-');
        const filePath = `activities/gallery/${editingActivity.id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('site-images')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.error('Gallery upload error:', uploadError);
          alert(uploadError.message || `Could not upload ${file.name}`);
          continue;
        }

        const { data } = supabase.storage
          .from('site-images')
          .getPublicUrl(filePath);

        if (!data?.publicUrl) {
          continue;
        }

        const nextOrder =
          activityImages.length > 0
            ? Math.max(...activityImages.map((img) => img.display_order ?? 0)) + 1
            : 0;

        const { error: insertError } = await supabase
          .from('activity_images')
          .insert([
            {
              activity_id: editingActivity.id,
              image_url: data.publicUrl,
              display_order: nextOrder
            }
          ]);

        if (insertError) {
          console.error('Error saving gallery image row:', insertError);
          alert(insertError.message || `Could not attach ${file.name} to activity`);
        }
      }

      await loadActivityImages(editingActivity.id);
    } catch (error: any) {
      console.error('Gallery image upload failed:', error);
      alert(error?.message || 'Gallery image upload failed');
    } finally {
      setUploadingGalleryImages(false);
    }
  }

  async function deleteGalleryImage(imageId: string) {
    const confirmed = window.confirm('Delete this gallery image?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('activity_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      console.error('Error deleting gallery image:', error);
      alert(error.message || 'Could not delete gallery image');
      return;
    }

    if (editingActivity?.id) {
      await loadActivityImages(editingActivity.id);
    }
  }

  async function saveActivity() {
    if (!form.name.trim()) {
      alert('Activity name is required');
      return;
    }

    setSaving(true);

    const payload = {
      title: form.name.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      duration_hours:
        form.duration_hours === '' ? null : Number(form.duration_hours),
      capacity: form.capacity === '' ? null : Number(form.capacity),
      price: form.price === '' ? null : Number(form.price),
      active: form.active
    };

    let result;

    if (editingActivity) {
      result = await supabase
        .from('activities')
        .update(payload)
        .eq('id', editingActivity.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('activities')
        .insert([payload])
        .select()
        .single();
    }

    setSaving(false);

    if (result.error) {
      console.error('Error saving activity:', result.error);
      console.log('Payload sent:', payload);
      alert(result.error.message || JSON.stringify(result.error));
      return;
    }

    const savedActivity = result.data as Activity;
    await loadActivities();
    setEditingActivity(savedActivity);

    if (savedActivity?.id) {
      await loadActivityImages(savedActivity.id);
    }

    alert(editingActivity ? 'Activity updated.' : 'Activity created. You can now upload gallery images.');
  }

  async function deleteActivity(id: string) {
    const confirmed = window.confirm('Delete this activity?');
    if (!confirmed) return;

    const { error } = await supabase.from('activities').delete().eq('id', id);

    if (error) {
      console.error('Error deleting activity:', error);
      alert(error.message || 'Could not delete activity');
      return;
    }

    await loadActivities();
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Activities</h2>

        <button
          type="button"
          onClick={openNew}
          className="bg-cyan-600 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus size={16} />
          Add Activity
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading activities...</div>
      ) : activities.length === 0 ? (
        <div className="text-sm text-gray-500">No activities found.</div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex justify-between items-center border p-3 rounded"
            >
              <div className="flex gap-3 items-center">
                {activity.image_url ? (
                  <img
                    src={activity.image_url}
                    alt={activity.title ?? activity.name ?? 'Activity'}
                    className="w-14 h-14 rounded object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded bg-gray-100 flex items-center justify-center">
                    <Waves size={20} className="text-gray-500" />
                  </div>
                )}

                <div>
                  <div className="font-semibold">
                    {activity.title ?? activity.name ?? 'Untitled Activity'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {activity.description || 'No description'}
                  </div>
                  <div className="text-xs text-gray-400">
                    Duration: {activity.duration_hours ?? 0}h | Capacity:{' '}
                    {activity.capacity ?? 0} | Price: $
                    {Number(activity.price ?? 0).toFixed(2)} |{' '}
                    {activity.active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(activity)}
                  className="bg-slate-900 text-white px-3 py-2 rounded text-sm flex items-center gap-1"
                >
                  <Pencil size={14} />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => deleteActivity(activity.id)}
                  className="bg-red-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-xl p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingActivity ? 'Edit Activity' : 'Add Activity'}
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Primary Activity Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePrimaryImageUpload(file);
                  }}
                  className="w-full border rounded px-3 py-2"
                />

                {uploadingPrimaryImage && (
                  <div className="text-sm text-gray-500 mt-1">
                    Uploading primary image...
                  </div>
                )}

                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Primary preview"
                    className="mt-2 w-32 h-32 object-cover rounded border"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Gallery Images
                </label>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      handleGalleryUploads(files);
                    }
                  }}
                  className="w-full border rounded px-3 py-2"
                />

                {!editingActivity && (
                  <div className="text-xs text-gray-500 mt-1">
                    Save the activity once before uploading multiple gallery images.
                  </div>
                )}

                {uploadingGalleryImages && (
                  <div className="text-sm text-gray-500 mt-1">
                    Uploading gallery images...
                  </div>
                )}

                {activityImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                    {activityImages.map((image) => (
                      <div
                        key={image.id}
                        className="border rounded p-2 bg-gray-50"
                      >
                        <img
                          src={image.image_url}
                          alt="Gallery"
                          className="w-full h-24 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => deleteGalleryImage(image.id)}
                          className="mt-2 w-full text-xs bg-red-600 text-white px-2 py-1 rounded"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Duration Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.duration_hours}
                    onChange={(e) =>
                      setForm({ ...form, duration_hours: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) =>
                      setForm({ ...form, capacity: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />
                Active
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeEditor}
                className="px-4 py-2 border rounded"
              >
                Close
              </button>

              <button
                type="button"
                onClick={saveActivity}
                disabled={saving || uploadingPrimaryImage || uploadingGalleryImages}
                className="px-4 py-2 bg-cyan-600 text-white rounded"
              >
                {saving ? 'Saving...' : 'Save Activity'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}