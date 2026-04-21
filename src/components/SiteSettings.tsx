import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type SettingMap = {
  hero_image_url: string;
  hero_brand_title: string;
  hero_brand_subtitle: string;
  hero_heading: string;
  hero_paragraph: string;
  hero_button_rentals: string;
  hero_button_activities: string;
};

const defaultSettings: SettingMap = {
  hero_image_url: '',
  hero_brand_title: 'TKAC Vacations & Adventures',
  hero_brand_subtitle: 'North Naples & Bonita Springs',
  hero_heading: 'Your Paradise Awaits',
  hero_paragraph:
    'Luxury vacation rentals and unforgettable water adventures in beautiful North Naples and Bonita Springs',
  hero_button_rentals: 'View Vacation Rentals',
  hero_button_activities: 'Explore Activities',
};

export default function SiteSettings() {
  const [settings, setSettings] = useState<SettingMap>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    setMessage('');

    const keys = Object.keys(defaultSettings);

    const { data, error } = await supabase
      .from('site_settings')
      .select('setting_key, setting_value')
      .in('setting_key', keys);

    if (error) {
      setMessage(`Error loading settings: ${error.message}`);
      setLoading(false);
      return;
    }

    const next: SettingMap = { ...defaultSettings };

    for (const row of data || []) {
      const key = row.setting_key as keyof SettingMap;
      if (key in next) {
        next[key] = typeof row.setting_value === 'string' ? row.setting_value : '';
      }
    }

    setSettings(next);
    setLoading(false);
  }

  async function upsertSetting(setting_key: keyof SettingMap, setting_value: string) {
    return await supabase.from('site_settings').upsert(
      { setting_key, setting_value },
      { onConflict: 'setting_key' }
    );
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    for (const [key, value] of Object.entries(settings)) {
      const { error } = await upsertSetting(key as keyof SettingMap, value);
      if (error) {
        setMessage(`Error saving settings: ${error.message}`);
        setSaving(false);
        return;
      }
    }

    setMessage('Settings saved successfully.');
    setSaving(false);
  }

  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('');

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `hero-${Date.now()}.${fileExt}`;
    const filePath = `hero/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('site-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Hero upload failed:', uploadError);
      setMessage(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('site-images').getPublicUrl(filePath);

    if (!data?.publicUrl) {
      setMessage('Upload succeeded but URL could not be created.');
      setUploading(false);
      return;
    }

    setSettings((prev) => ({
      ...prev,
      hero_image_url: data.publicUrl,
    }));

    setMessage('Hero image uploaded. Click Save Settings.');
    setUploading(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 6,
    fontWeight: 600,
  };

  const sectionStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading site settings...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>Site Settings</h2>

      <form onSubmit={handleSave}>
        <div style={sectionStyle}>
          <h3 style={{ marginTop: 0 }}>Hero Section</h3>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Hero Image Upload</label>
            <input type="file" accept="image/*" onChange={handleHeroUpload} />
            {uploading && <div style={{ marginTop: 8 }}>Uploading...</div>}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Hero Image URL</label>
            <input
              style={inputStyle}
              value={settings.hero_image_url}
              onChange={(e) =>
                setSettings({ ...settings, hero_image_url: e.target.value })
              }
            />
          </div>

          {settings.hero_image_url ? (
            <div style={{ marginBottom: 14 }}>
              <img
                src={settings.hero_image_url}
                alt="Hero preview"
                style={{
                  maxWidth: 320,
                  borderRadius: 10,
                  border: '1px solid #ddd',
                }}
              />
            </div>
          ) : null}

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Brand Title</label>
            <input
              style={inputStyle}
              value={settings.hero_brand_title}
              onChange={(e) =>
                setSettings({ ...settings, hero_brand_title: e.target.value })
              }
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Brand Subtitle</label>
            <input
              style={inputStyle}
              value={settings.hero_brand_subtitle}
              onChange={(e) =>
                setSettings({ ...settings, hero_brand_subtitle: e.target.value })
              }
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Main Heading</label>
            <input
              style={inputStyle}
              value={settings.hero_heading}
              onChange={(e) =>
                setSettings({ ...settings, hero_heading: e.target.value })
              }
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Paragraph</label>
            <textarea
              style={{ ...inputStyle, minHeight: 100 }}
              value={settings.hero_paragraph}
              onChange={(e) =>
                setSettings({ ...settings, hero_paragraph: e.target.value })
              }
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Rentals Button Text</label>
            <input
              style={inputStyle}
              value={settings.hero_button_rentals}
              onChange={(e) =>
                setSettings({ ...settings, hero_button_rentals: e.target.value })
              }
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Activities Button Text</label>
            <input
              style={inputStyle}
              value={settings.hero_button_activities}
              onChange={(e) =>
                setSettings({ ...settings, hero_button_activities: e.target.value })
              }
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#111827',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>

        {message ? (
          <div style={{ marginTop: 14, fontWeight: 600 }}>{message}</div>
        ) : null}
      </form>
    </div>
  );
}