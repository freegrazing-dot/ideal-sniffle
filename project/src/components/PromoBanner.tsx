import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PromoBannerData {
  id: string;
  message: string;
  background_color: string;
  text_color: string;
  is_active: boolean;
}

export function PromoBanner() {
  const [banner, setBanner] = useState<PromoBannerData | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const promoCode = urlParams.get('promo') || urlParams.get('code');

    if (promoCode?.toUpperCase() === 'NOBANNER') {
      setIsVisible(false);
      return;
    }

    fetchActiveBanner();
  }, []);

  const fetchActiveBanner = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching promo banner:', error);
        return;
      }

      if (data) {
        setBanner(data);
      }
    } catch (error) {
      console.error('Error fetching promo banner:', error);
    }
  };

  if (!banner || !isVisible) {
    return null;
  }

  return (
    <div
      className="relative py-3 px-4 text-center transition-all overflow-hidden"
      style={{
        backgroundColor: banner.background_color,
        color: banner.text_color,
      }}
    >
      <div className="relative max-w-7xl mx-auto">
        <p className="font-medium text-sm md:text-base">
          {banner.message}
        </p>
      </div>
    </div>
  );
}
