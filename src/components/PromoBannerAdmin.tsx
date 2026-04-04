import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PromoBanner {
  id: string;
  message: string;
  background_color: string;
  text_color: string;
  is_active: boolean;
  created_at: string;
}

export function PromoBannerAdmin() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    message: '',
    background_color: '#3b82f6',
    text_color: '#ffffff',
    is_active: true,
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingBanner) {
        const { error } = await supabase
          .from('promo_banners')
          .update(formData)
          .eq('id', editingBanner.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('promo_banners')
          .insert([formData]);

        if (error) throw error;
      }

      setFormData({
        message: '',
        background_color: '#3b82f6',
        text_color: '#ffffff',
        is_active: true,
      });
      setEditingBanner(null);
      setIsCreating(false);
      fetchBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
      alert('Failed to save banner');
    }
  };

  const handleEdit = (banner: PromoBanner) => {
    setEditingBanner(banner);
    setFormData({
      message: banner.message,
      background_color: banner.background_color,
      text_color: banner.text_color,
      is_active: banner.is_active,
    });
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      const { error } = await supabase
        .from('promo_banners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('Failed to delete banner');
    }
  };

  const toggleActive = async (banner: PromoBanner) => {
    try {
      const { error } = await supabase
        .from('promo_banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);

      if (error) throw error;
      fetchBanners();
    } catch (error) {
      console.error('Error toggling banner:', error);
      alert('Failed to update banner');
    }
  };

  const cancelEdit = () => {
    setEditingBanner(null);
    setIsCreating(false);
    setFormData({
      message: '',
      background_color: '#3b82f6',
      text_color: '#ffffff',
      is_active: true,
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading banners...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Promo Banners</h2>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Banner
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingBanner ? 'Edit Banner' : 'Create New Banner'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <input
                type="text"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 🎉 Special offer: 20% off all bookings this weekend!"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.text_color}
                    onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.text_color}
                    onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Active (show on website)
              </label>
            </div>

            <div
              className="p-4 rounded-lg text-center"
              style={{
                backgroundColor: formData.background_color,
                color: formData.text_color,
              }}
            >
              <p className="font-medium">Preview: {formData.message || 'Your message here'}</p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingBanner ? 'Update Banner' : 'Create Banner'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {banners.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            No banners created yet. Click "Create Banner" to add one.
          </div>
        ) : (
          banners.map((banner) => (
            <div
              key={banner.id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div
                className="p-4"
                style={{
                  backgroundColor: banner.background_color,
                  color: banner.text_color,
                }}
              >
                <p className="font-medium text-center">{banner.message}</p>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      banner.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {banner.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-sm text-gray-500">
                    Created: {new Date(banner.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(banner)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title={banner.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {banner.is_active ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleEdit(banner)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
