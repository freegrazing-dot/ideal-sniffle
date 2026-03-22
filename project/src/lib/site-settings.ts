import { supabase } from './supabase';

export interface SiteSettings {
  bookings_enabled: boolean;
  site_mode: 'live' | 'preview' | 'maintenance';
  hero_image_url?: string;
  admin_email?: string;
}

let cachedSettings: SiteSettings | null = null;
let lastFetch = 0;
const CACHE_DURATION = 60000; // 1 minute

export async function getSiteSettings(): Promise<SiteSettings> {
  const now = Date.now();

  if (cachedSettings && (now - lastFetch) < CACHE_DURATION) {
    return cachedSettings;
  }

  const { data, error } = await supabase
    .from('site_settings')
    .select('setting_key, setting_value');

  if (error) {
    console.error('Error fetching site settings:', error);
    return {
      bookings_enabled: false,
      site_mode: 'preview',
    };
  }

  const settings: SiteSettings = {
    bookings_enabled: false,
    site_mode: 'preview',
  };

  data?.forEach((setting) => {
    if (setting.setting_key === 'bookings_enabled') {
      settings.bookings_enabled = setting.setting_value === 'true';
    } else if (setting.setting_key === 'site_mode') {
      settings.site_mode = setting.setting_value as 'live' | 'preview' | 'maintenance';
    } else if (setting.setting_key === 'hero_image_url') {
      settings.hero_image_url = setting.setting_value;
    } else if (setting.setting_key === 'admin_email') {
      settings.admin_email = setting.setting_value;
    }
  });

  cachedSettings = settings;
  lastFetch = now;

  return settings;
}

export async function updateSiteSetting(key: string, value: string): Promise<boolean> {
  const { error } = await supabase
    .from('site_settings')
    .upsert(
      { setting_key: key, setting_value: value },
      { onConflict: 'setting_key' }
    );

  if (error) {
    console.error('Error updating site setting:', error);
    return false;
  }

  cachedSettings = null;
  return true;
}
