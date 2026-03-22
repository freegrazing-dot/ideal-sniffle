import { useState, useEffect } from 'react';
import { Settings, Globe, CheckCircle, AlertTriangle, Megaphone, Plus, Trash2, Image, Upload } from 'lucide-react';
import { getSiteSettings, updateSiteSetting } from '../lib/site-settings';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/storage';

interface PromoBanner {
  id: string;
  message: string;
  background_color: string;
  text_color: string;
  is_active: boolean;
}

export function SiteSettings() {
  const [bookingsEnabled, setBookingsEnabled] = useState(false);
  const [siteMode, setSiteMode] = useState<'live' | 'preview' | 'testing' | 'maintenance'>('preview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [promoBanners, setPromoBanners] = useState<PromoBanner[]>([]);
  const [newBanner, setNewBanner] = useState({ message: '', background_color: '#3b82f6', text_color: '#ffffff' });
  const [heroImage, setHeroImage] = useState<string>('');
  const [uploadingHero, setUploadingHero] = useState(false);

  useEffect(() => {
    loadSettings();
    loadPromoBanners();
    loadHeroImage();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await getSiteSettings();
      setBookingsEnabled(settings.bookings_enabled);
      setSiteMode(settings.site_mode);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPromoBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading promo banners:', error);
        setMessage({ type: 'error', text: `Failed to load banners: ${error.message}` });
        throw error;
      }
      setPromoBanners(data || []);
    } catch (error) {
      console.error('Error loading promo banners:', error);
    }
  };

  const loadHeroImage = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'hero_image_url')
        .maybeSingle();

      if (error) {
        console.error('Error loading hero image:', error);
        return;
      }

      if (data?.setting_value) {
        setHeroImage(data.setting_value);
      }
    } catch (error) {
      console.error('Error loading hero image:', error);
    }
  };

  const handleHeroImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 5MB' });
      return;
    }

    setUploadingHero(true);
    setMessage(null);

    try {
      const result = await uploadImage(file, 'hero-images');

      if (!result || result.error) {
        throw new Error(result?.error || 'Failed to upload image');
      }

      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'hero_image_url',
          setting_value: result.url
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      setHeroImage(result.url);
      setMessage({ type: 'success', text: 'Hero image updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error uploading hero image:', error);
      setMessage({ type: 'error', text: `Failed to upload image: ${error.message}` });
    } finally {
      setUploadingHero(false);
    }
  };

  const createBanner = async () => {
    if (!newBanner.message.trim()) {
      setMessage({ type: 'error', text: 'Please enter a banner message' });
      return;
    }

    try {
      const { error } = await supabase
        .from('promo_banners')
        .insert([{ ...newBanner, is_active: false }]);

      if (error) {
        console.error('Create banner error:', error);
        setMessage({ type: 'error', text: `Failed to create banner: ${error.message}` });
        return;
      }

      setMessage({ type: 'success', text: 'Banner created successfully!' });
      setNewBanner({ message: '', background_color: '#3b82f6', text_color: '#ffffff' });
      loadPromoBanners();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Create banner error:', error);
      setMessage({ type: 'error', text: `Failed to create banner: ${error.message || 'Unknown error'}` });
    }
  };

  const toggleBannerActive = async (bannerId: string, currentActive: boolean) => {
    try {
      if (!currentActive) {
        await supabase
          .from('promo_banners')
          .update({ is_active: false })
          .neq('id', bannerId);
      }

      const { error } = await supabase
        .from('promo_banners')
        .update({ is_active: !currentActive })
        .eq('id', bannerId);

      if (error) throw error;

      setMessage({ type: 'success', text: currentActive ? 'Banner deactivated' : 'Banner activated!' });
      loadPromoBanners();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update banner' });
    }
  };

  const deleteBanner = async (bannerId: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      const { error } = await supabase
        .from('promo_banners')
        .delete()
        .eq('id', bannerId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Banner deleted successfully!' });
      loadPromoBanners();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete banner' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const success1 = await updateSiteSetting('bookings_enabled', bookingsEnabled.toString());
      const success2 = await updateSiteSetting('site_mode', siteMode);

      if (success1 && success2) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleGoLive = async () => {
    if (confirm('Are you ready to go live? This will enable bookings and make your site public.')) {
      setSaving(true);
      try {
        await updateSiteSetting('bookings_enabled', 'true');
        await updateSiteSetting('site_mode', 'live');
        setBookingsEnabled(true);
        setSiteMode('live');
        setMessage({ type: 'success', text: 'Site is now LIVE!' });
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to go live. Please try again.' });
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-8 h-8 text-blue-600" />
          <h2 className="text-3xl font-bold text-gray-900">Site Settings</h2>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        <div className="space-y-8">
          <div className="border-b pb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Site Status</h3>
            <div className={`p-6 rounded-xl ${
              siteMode === 'live' ? 'bg-green-50 border-2 border-green-500' :
              siteMode === 'testing' ? 'bg-blue-50 border-2 border-blue-500' :
              'bg-amber-50 border-2 border-amber-500'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Globe className={`w-8 h-8 ${
                    siteMode === 'live' ? 'text-green-600' :
                    siteMode === 'testing' ? 'text-blue-600' :
                    'text-amber-600'
                  }`} />
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">
                      {siteMode === 'live' ? 'LIVE' :
                       siteMode === 'testing' ? 'Testing Mode' :
                       siteMode === 'preview' ? 'Preview Mode' :
                       'Maintenance Mode'}
                    </h4>
                    <p className="text-sm text-gray-700">
                      {siteMode === 'live' && 'Your site is live and accepting bookings'}
                      {siteMode === 'testing' && 'Private testing - bookings enabled with test payments'}
                      {siteMode === 'preview' && 'Your site is in preview mode - bookings disabled'}
                      {siteMode === 'maintenance' && 'Your site is in maintenance mode'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                Site Mode
              </label>
              <select
                value={siteMode}
                onChange={(e) => setSiteMode(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="preview">Preview Mode - Site visible, bookings disabled</option>
                <option value="testing">Testing Mode - Private live testing with bookings enabled</option>
                <option value="live">Live - Full public launch with real payments</option>
                <option value="maintenance">Maintenance Mode - Show maintenance page</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-semibold text-gray-900">Enable Bookings</h4>
                <p className="text-sm text-gray-600">Allow customers to make bookings</p>
              </div>
              <button
                onClick={() => setBookingsEnabled(!bookingsEnabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  bookingsEnabled ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    bookingsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            {siteMode !== 'live' && (
              <button
                onClick={handleGoLive}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Going Live...' : 'GO LIVE NOW!'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 p-6 bg-white rounded-xl border-2 border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <Image className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Hero Banner Image</h3>
          </div>

          <div className="space-y-4">
            {heroImage && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-200">
                <img
                  src={heroImage}
                  alt="Hero banner"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block">
                <div className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors cursor-pointer">
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {uploadingHero ? 'Uploading...' : 'Click to upload hero image'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended: 1920x600px, max 5MB
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleHeroImageUpload}
                  disabled={uploadingHero}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 bg-white rounded-xl border-2 border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <Megaphone className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Promotional Banners</h3>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create New Banner
              </label>
              <input
                type="text"
                placeholder="Enter banner message (e.g., '20% off all bookings this week!')"
                value={newBanner.message}
                onChange={(e) => setNewBanner({ ...newBanner, message: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex gap-4 mb-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Background Color</label>
                  <input
                    type="color"
                    value={newBanner.background_color}
                    onChange={(e) => setNewBanner({ ...newBanner, background_color: e.target.value })}
                    className="w-full h-10 rounded border border-gray-300"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Text Color</label>
                  <input
                    type="color"
                    value={newBanner.text_color}
                    onChange={(e) => setNewBanner({ ...newBanner, text_color: e.target.value })}
                    className="w-full h-10 rounded border border-gray-300"
                  />
                </div>
              </div>
              <div
                className="p-3 rounded-lg mb-3 text-center font-medium"
                style={{
                  backgroundColor: newBanner.background_color,
                  color: newBanner.text_color
                }}
              >
                {newBanner.message || 'Banner preview will appear here'}
              </div>
              <button
                onClick={createBanner}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Banner
              </button>
            </div>

            {promoBanners.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Existing Banners</h4>
                {promoBanners.map((banner) => (
                  <div
                    key={banner.id}
                    className={`p-4 rounded-lg border-2 ${
                      banner.is_active ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div
                      className="p-3 rounded mb-3 text-center font-medium"
                      style={{
                        backgroundColor: banner.background_color,
                        color: banner.text_color
                      }}
                    >
                      {banner.message}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleBannerActive(banner.id, banner.is_active)}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                          banner.is_active
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {banner.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteBanner(banner.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Pre-Launch Checklist</h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Database configured and migrations applied
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Stripe payment integration configured
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Email notifications configured (Resend)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Edge functions deployed
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Calendar sync configured
            </li>
          </ul>
          <p className="mt-4 text-sm text-blue-900 font-medium">
            When ready, click "GO LIVE NOW" to enable bookings and launch your site!
          </p>
        </div>
      </div>
    </div>
  );
}
