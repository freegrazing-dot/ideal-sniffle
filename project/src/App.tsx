import Success from './pages/Success';
import Login from './pages/Login';
import WelcomeGuide from './pages/WelcomeGuide';
import UploadBoatingCard from './pages/UploadBoatingCard';
import { useState, useEffect, Component, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home, Anchor } from 'lucide-react';

import { ActivityCard } from './components/ActivityCard';
import PropertyCard from './components/PropertyCard';
import { AddToCartModal } from './components/AddToCartModal';
import { CartModal } from './components/CartModal';
import AddPropertyToCartModal from './components/AddPropertyToCartModal';
import { PropertyGallery } from './components/PropertyGallery';
import SecurityDepositCard from './components/SecurityDepositCard';
import MerchandiseShopCard from './components/MerchandiseShopCard';
import AdminMerchModal from './components/AdminMerchModal';

import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { Navigation } from './components/Navigation';

import { Activity, Property } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useCart } from './lib/cart-context';
import { NotFound } from './pages/NotFound';
import AdminPanel from './components/AdminPanel';

interface MerchandiseItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sizes: string[];
  colors: string[];
  image_url?: string;
  stock_quantity: number;
  active: boolean;
}

function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [merchandiseItems, setMerchandiseItems] = useState<MerchandiseItem[]>([]);

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [galleryProperty, setGalleryProperty] = useState<Property | null>(null);

  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isAddToCartModalOpen, setIsAddToCartModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isMerchandiseModalOpen, setIsMerchandiseModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const { addMerchandiseItem } = useCart();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [propertiesResult, activitiesResult, merchandiseResult] = await Promise.all([
        supabase.from('properties').select('*').eq('active', true),
        supabase.from('activities').select('*').eq('active', true),
        supabase.from('merchandise_items').select('*').eq('active', true),
      ]);

      setProperties(propertiesResult.data || []);
      setActivities(activitiesResult.data || []);
      setMerchandiseItems(merchandiseResult.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsAddToCartModalOpen(true);
  };
const handleAddMerchandise = async (
  item: MerchandiseItem,
  size: string,
  color: string,
  quantity: number
) => {
  await addMerchandiseItem({
    merchandiseId: item.id,
    name: item.name,
    size: size || '',
    color: color || '',
    quantity,
    price: item.price,
    description: item.description,
  });

  setIsMerchandiseModalOpen(false);
  setIsCartModalOpen(true);
};
  return (
    <div className="min-h-screen bg-slate-50">
      <Hero />

      {/* Activities */}
      <div className="max-w-7xl mx-auto py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} onAddToCart={handleAddToCart} />
          ))}
        </div>
      </div>

      {/* Merch Button */}
      <div className="text-center py-10">
        <MerchandiseShopCard
          onViewMerchandise={() => setIsMerchandiseModalOpen(true)}
          itemCount={merchandiseItems.length}
        />
      </div>

      <Footer />

      {/* MODALS */}

      {isAddToCartModalOpen && (
        <AddToCartModal
          activity={selectedActivity}
          isOpen={isAddToCartModalOpen}
          onClose={() => setIsAddToCartModalOpen(false)}
          onSuccess={() => setIsCartModalOpen(true)}
        />
      )}

      {isCartModalOpen && (
        <CartModal
          isOpen={isCartModalOpen}
          onClose={() => setIsCartModalOpen(false)}
        />
      )}

      {isGalleryOpen && galleryProperty && (
        <PropertyGallery
          property={galleryProperty}
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
        />
      )}

      {/* ✅ FIXED MERCH MODAL */}
      {isMerchandiseModalOpen && (
        <AdminMerchModal
          items={merchandiseItems}
          isOpen={isMerchandiseModalOpen}
          onClose={() => setIsMerchandiseModalOpen(false)}
          onAddToCart={handleAddMerchandise}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/success" element={<Success />} />
        <Route path="/welcome-guide" element={<WelcomeGuide />} />
        <Route path="/upload-boating-card" element={<UploadBoatingCard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;