console.log("TKAC FORCE BUILD 2");
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

interface SecurityDepositProduct {
  id: string;
  property_id: string;
  deposit_amount: number;
  description: string;
  active: boolean;
}

interface MerchandiseItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sizes?: string[] | string | null;
  colors?: string[] | null;
  image_url?: string;
  back_image_url?: string | null;
  gallery_images?: string[] | null;
  active: boolean;
}

function HomePage({ openCart }: { openCart: () => void }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [securityDepositProducts, setSecurityDepositProducts] = useState<SecurityDepositProduct[]>(
    []
  );
  const [merchandiseItems, setMerchandiseItems] = useState<MerchandiseItem[]>([]);

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [galleryProperty, setGalleryProperty] = useState<Property | null>(null);

  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isAddToCartModalOpen, setIsAddToCartModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isMerchandiseModalOpen, setIsMerchandiseModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [modalOpenTimestamp, setModalOpenTimestamp] = useState(0);

  const { addSecurityDepositItem, addMerchandiseItem } = useCart();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    void fetchData();

    if (window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      const promoCode =
        urlParams.get('promo') ||
        urlParams.get('code') ||
        urlParams.get('PROMO') ||
        urlParams.get('CODE');

      if (urlParams.toString() !== (promoCode ? `promo=${promoCode}` : '')) {
        const cleanUrl = promoCode
          ? `${window.location.pathname}?promo=${encodeURIComponent(promoCode)}`
          : window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  }, []);

  const fetchData = async () => {
    try {
      const [propertiesResult, activitiesResult, securityDepositsResult, merchandiseResult] =
        await Promise.all([
          supabase.from('properties').select('*').eq('active', true).order('created_at'),
          supabase.from('activities').select('*').eq('active', true).order('created_at'),
          supabase
            .from('security_deposit_products')
            .select('*')
            .eq('active', true)
            .order('created_at'),
          supabase.from('merchandise_items').select('*').eq('active', true).order('created_at'),
        ]);

      if (propertiesResult.error) {
        console.error('Properties error:', propertiesResult.error);
      } else {
        setProperties(propertiesResult.data || []);
      }

      if (activitiesResult.error) {
        console.error('Activities error:', activitiesResult.error);
      } else {
        setActivities(
          (activitiesResult.data || []).map((activity: any) => ({
            ...activity,
            gallery_images: Array.isArray(activity.gallery_images)
              ? activity.gallery_images.filter(Boolean)
              : [],
          }))
        );
      }

      if (securityDepositsResult.error) {
        console.error('Security deposits error:', securityDepositsResult.error);
      } else {
        setSecurityDepositProducts(securityDepositsResult.data || []);
      }

      if (merchandiseResult.error) {
        console.error('Merchandise error:', merchandiseResult.error);
      } else {
        setMerchandiseItems(
          (merchandiseResult.data || []).map((item: any) => ({
            ...item,
            price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyBook = (property: Property) => {
    setSelectedProperty(property);
    setModalOpenTimestamp(Date.now());
    setIsPropertyModalOpen(true);
  };

  const handleViewGallery = (property: Property) => {
    setGalleryProperty(property);
    setIsGalleryOpen(true);
  };

  const handleAddToCart = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsAddToCartModalOpen(true);
  };

  const handleAddSecurityDeposit = async (product: SecurityDepositProduct) => {
    const property = properties.find((p) => p.id === product.property_id);

    await addSecurityDepositItem({
      propertyId: product.property_id,
      propertyName: property?.name || 'Property',
      depositAmount: product.deposit_amount,
      description: product.description,
    });

    openCart();
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
    openCart();
  };

  const handleAddToCartSuccess = () => {
    openCart();
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Hero />

      <div id="rentals" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Home className="w-12 h-12 text-blue-600 mr-3" />
            <h2 className="text-4xl font-bold text-gray-900">Vacation Rentals</h2>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Experience Southwest Florida in style with our carefully selected vacation properties
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onBook={handlePropertyBook}
                onViewGallery={handleViewGallery}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <p className="text-gray-600">No vacation rentals available at this time.</p>
          </div>
        )}
      </div>

      <div id="activities" className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Anchor className="w-12 h-12 text-cyan-600 mr-3" />
              <h2 className="text-4xl font-bold text-gray-900">Water Adventures</h2>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From fishing charters to sunset cruises, create unforgettable memories on the water
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
            </div>
          ) : activities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl shadow-md">
              <p className="text-gray-600">No activities available at this time.</p>
            </div>
          )}
        </div>
      </div>

      {(securityDepositProducts.length > 0 || merchandiseItems.length > 0) && (
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Additional Options</h3>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                Security deposits and merchandise for your perfect trip
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {securityDepositProducts.map((product) => {
                const property = properties.find((p) => p.id === product.property_id);
                return (
                  <SecurityDepositCard
                    key={product.id}
                    product={product}
                    propertyName={property?.name || 'Property'}
                    onAddToCart={handleAddSecurityDeposit}
                  />
                );
              })}

              {merchandiseItems.length > 0 && (
                <MerchandiseShopCard
                  onViewMerchandise={() => setIsMerchandiseModalOpen(true)}
                  itemCount={merchandiseItems.length}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />

      {isPropertyModalOpen && (
        <AddPropertyToCartModal
          key={modalOpenTimestamp}
          property={selectedProperty}
          onClose={() => {
            setIsPropertyModalOpen(false);
            setSelectedProperty(null);
          }}
          onSuccess={() => {
            setIsPropertyModalOpen(false);
            setSelectedProperty(null);
            handleAddToCartSuccess();
          }}
        />
      )}

      {isAddToCartModalOpen && (
        <AddToCartModal
          activity={selectedActivity}
          isOpen={isAddToCartModalOpen}
          onClose={() => {
            setIsAddToCartModalOpen(false);
            setSelectedActivity(null);
          }}
          onSuccess={handleAddToCartSuccess}
        />
      )}

      {isGalleryOpen && galleryProperty && (
        <PropertyGallery
          key={galleryProperty.id}
          property={galleryProperty}
          isOpen={isGalleryOpen}
          onClose={() => {
            setIsGalleryOpen(false);
            setGalleryProperty(null);
          }}
        />
      )}

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

function AppContent() {
  const location = window.location.pathname;
  const showNavigation = location !== '/login';
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {showNavigation && <Navigation onCartClick={() => setIsCartModalOpen(true)} />}

      <Routes>
        <Route path="/" element={<HomePage openCart={() => setIsCartModalOpen(true)} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/success" element={<Success />} />
        <Route path="/welcome-guide" element={<WelcomeGuide />} />
        <Route path="/upload-boating-card" element={<UploadBoatingCard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {showNavigation && isCartModalOpen && (
        <CartModal isOpen={isCartModalOpen} onClose={() => setIsCartModalOpen(false)} />
      )}
    </div>
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('App error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-700 mb-4">
              The application encountered an error. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}

export default App;