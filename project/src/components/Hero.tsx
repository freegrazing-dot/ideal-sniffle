import { useState, useEffect } from 'react';
import { Home } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Hero() {
  const [heroImage, setHeroImage] = useState('');

  useEffect(() => {
    fetchHeroImage();

    const channel = supabase
      .channel('hero-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_settings',
          filter: 'setting_key=eq.hero_image_url',
        },
        (payload) => {
          if (payload.new && 'setting_value' in payload.new) {
            let newImage = payload.new.setting_value as string;

            // Handle JSON object format
            if (typeof newImage === 'string' && newImage.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(newImage);
                newImage = parsed.url || '';
              } catch (e) {
                console.warn('Could not parse hero image JSON:', e);
              }
            }

            if (newImage && newImage.trim()) {
              setHeroImage(newImage);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchHeroImage = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'hero_image_url')
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch hero image:', error);
        return;
      }

      if (data && data.setting_value) {
        let imageUrl = data.setting_value;

        // Handle JSON object format
        if (typeof imageUrl === 'string' && imageUrl.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(imageUrl);
            imageUrl = parsed.url || '';
          } catch (e) {
            console.warn('Could not parse hero image JSON:', e);
          }
        }

        if (imageUrl && imageUrl.trim()) {
          setHeroImage(imageUrl);
        }
      }
    } catch (error) {
      console.warn('Could not fetch hero image:', error);
    }
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative text-white overflow-hidden min-h-[500px]">
      {heroImage && heroImage.trim() !== '' ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroImage})` }}
          ></div>
          <div className="absolute inset-0 bg-black opacity-40"></div>
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-500"></div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <Home className="w-12 h-12" />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">TKAC Vacations & Adventures</h1>
              <p className="text-sm md:text-base text-blue-100">North Naples & Bonita Springs</p>
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Your Paradise Awaits
          </h2>
          <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
            Luxury vacation rentals and unforgettable water adventures in beautiful North Naples and Bonita Springs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => scrollToSection('rentals')}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              View Vacation Rentals
            </button>
            <button
              onClick={() => scrollToSection('activities')}
              className="bg-blue-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-400 transition-colors shadow-lg"
            >
              Explore Activities
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
