import { useState, useEffect } from 'react';
import { Home } from 'lucide-react';
import { supabase } from '../lib/supabase';

type HeroSettings = {
  hero_image_url: string;
  hero_brand_title: string;
  hero_brand_subtitle: string;
  hero_heading: string;
  hero_paragraph: string;
  hero_button_rentals: string;
  hero_button_activities: string;
};

const defaultSettings: HeroSettings = {
  hero_image_url: '',
  hero_brand_title: 'TKAC Vacations & Adventures',
  hero_brand_subtitle: 'North Naples & Bonita Springs',
  hero_heading: 'Your Paradise Awaits',
  hero_paragraph:
    'Luxury vacation rentals and unforgettable water adventures in beautiful North Naples and Bonita Springs',
  hero_button_rentals: 'View Vacation Rentals',
  hero_button_activities: 'Explore Activities',
};

export function Hero() {
  const [settings, setSettings] = useState<HeroSettings>(defaultSettings);

  useEffect(() => {
    fetchHeroSettings();

    const channel = supabase
      .channel('hero-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_settings',
        },
        () => {
          fetchHeroSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const parseSettingValue = (value: unknown) => {
    if (typeof value !== 'string') return '';
    if (value.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(value);
        return parsed.url || parsed.value || '';
      } catch {
        return value;
      }
    }
    return value;
  };

  const fetchHeroSettings = async () => {
    try {
      const keys = Object.keys(defaultSettings);

      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', keys);

      if (error) {
        console.warn('Could not fetch hero settings:', error);
        return;
      }

      const nextSettings = { ...defaultSettings };

      for (const row of data || []) {
        const key = row.setting_key as keyof HeroSettings;
        if (key in nextSettings) {
          nextSettings[key] = parseSettingValue(row.setting_value);
        }
      }

      setSettings(nextSettings);
    } catch (error) {
      console.warn('Could not fetch hero settings:', error);
    }
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative text-white overflow-hidden min-h-[500px]">
      {settings.hero_image_url && settings.hero_image_url.trim() !== '' ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${settings.hero_image_url})` }}
          />
          <div className="absolute inset-0 bg-black opacity-40" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-500" />
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <Home className="w-12 h-12" />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">
                {settings.hero_brand_title}
              </h1>
              <p className="text-sm md:text-base text-blue-100">
                {settings.hero_brand_subtitle}
              </p>
            </div>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {settings.hero_heading}
          </h2>

          <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
            {settings.hero_paragraph}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => scrollToSection('rentals')}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              {settings.hero_button_rentals}
            </button>

            <button
              onClick={() => scrollToSection('activities')}
              className="bg-blue-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-400 transition-colors shadow-lg"
            >
              {settings.hero_button_activities}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}