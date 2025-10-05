'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Package, ShoppingBag, Star, TrendingUp, Gift } from 'lucide-react';

import { logger } from '../lib/logger';
import type { Product } from '../lib/types';
import { createClient } from '../lib/supabase/client';
import { useAuth } from '../lib/hooks';
import { isAdminClient } from '../lib/permissions-client';
import { usePageContent } from '../hooks/use-page-content';

import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import HeroUploadDialog from './admin/HeroUploadDialog';
import HeroBanner from './HeroBanner';



interface HeroButton {
  text: string;
  link: string;
  type: 'primary' | 'secondary';
  icon?: string;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const section = searchParams.get('section');
  
  // Show filtered products based on section parameter
  return <DefaultHomePage sectionFilter={section} />;
}

function DefaultHomePage({ sectionFilter }: { sectionFilter?: string | null }) {
  const [featuredProducts, setFeaturedProducts] = React.useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = React.useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = React.useState<Product[]>([]);
  const [dealProducts, setDealProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showHeroDialog, setShowHeroDialog] = React.useState(false);
  const { user } = useAuth();
  const isAdmin = isAdminClient(user);
  const supabase = createClient();

  // Load homepage content from database
  const { content: homepageContent } = usePageContent('homepage');

  React.useEffect(() => {
    const getHomePageProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        // First, check if the products table exists and has the expected structure
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, title, description, price, popularity, rating, reviewCount, created_at, status, images, vendor, product_type')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (productsError) {
          logger.warn('Unable to fetch products (using fallback):', { error: productsError.message });
          setLoading(false);
          return;
        }
        
        const allProducts: Product[] = (products || [])
          .map(p => {
            // Ensure required fields are present
            if (!p.id || !p.title) {
              logger.warn('Product missing required fields:', { product: p });
              return null;
            }
            
            return {
              ...p,
              name: p.title, // Backwards compatibility - always set name to title
              title: p.title, // Ensure title is set
              image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : 'https://placehold.co/600x400.png?text=No+Image',
              category: p.product_type || 'General',
              popularity: p.popularity || 0,
              rating: p.rating || 0,
              reviewCount: p.reviewCount || 0,
              description: p.description || 'No description available',
              price: p.price || 0,
              created_at: p.created_at || new Date().toISOString(),
            } as Product;
          })
          .filter((p): p is Product => p !== null);

        // Get settings for product sections
        const { data: settings, error: settingsError } = await supabase
          .from('settings')
          .select('key, value');
        
        if (settingsError) {
          logger.warn('Unable to fetch settings (using defaults):', { error: settingsError.message });
        }
        
        const settingsMap = new Map(settings?.map(s => [s.key, s.value]) || []);

        const getProductsByIds = (ids: string[]): Product[] => {
          const productMap = new Map(allProducts.map(p => [p.id, p]));
          return ids.map(id => productMap.get(id)).filter((p): p is Product => p !== undefined);
        };

        const loadSectionProducts = (key: string, defaultProducts: Product[]): Product[] => {
          try {
            const storedIds = settingsMap.get(key);
            const selectedIds = storedIds && typeof storedIds === 'string' ? JSON.parse(storedIds) : [];
            return Array.isArray(selectedIds) && selectedIds.length > 0 ? getProductsByIds(selectedIds) : defaultProducts;
          } catch (error) {
            logger.warn(`Invalid JSON in setting ${key}, using defaults:`, { error, key });
            return defaultProducts;
          }
        };

        // Create default sections with safe fallbacks
        const defaultFeatured = allProducts.slice(0, 4);
        setFeaturedProducts(loadSectionProducts('featuredProductIds', defaultFeatured));

        const defaultNewArrivals = allProducts
          .sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA;
          })
          .slice(0, 4);
        setNewArrivals(loadSectionProducts('newArrivalProductIds', defaultNewArrivals));

        const defaultTrending = allProducts
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, 4);
        setTrendingProducts(loadSectionProducts('trendingProductIds', defaultTrending));

        const defaultDeals = allProducts
          .filter(p => p.popularity > 90)
          .slice(0, 4);
        setDealProducts(loadSectionProducts('dealProductIds', defaultDeals));
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load homepage data';
        logger.error('Homepage data loading error:', { error: errorMessage });
        setError(errorMessage);
        // Set empty arrays as fallback to prevent UI breaks
        setFeaturedProducts([]);
        setNewArrivals([]);
        setTrendingProducts([]);
        setDealProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    getHomePageProducts();
  }, [supabase]);

  const ProductCard = React.memo(function ProductCard({ product }: { product: Product }) {
    const displayImage = product.image || (Array.isArray((product as any).images) && (product as any).images.length > 0
      ? (typeof (product as any).images[0] === 'string' ? (product as any).images[0] : (product as any).images[0]?.url || '')
      : '');
    const displayPrice = product.offer_price || product.price;
    const hasDiscount = product.offer_price && product.offer_price < product.price;
    
    return (
      <Link href={`/products/${product.id}`}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
          <div className="aspect-video bg-gray-100 rounded-t-lg flex items-center justify-center overflow-hidden">
            {displayImage ? (
              <img 
                src={displayImage} 
                alt={product.title || product.name || 'Product'} 
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== '/placeholder-product.jpg') {
                    target.src = '/placeholder-product.jpg';
                  } else {
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) {
                      fallback.classList.remove('hidden');
                    }
                  }
                }}
              />
            ) : null}
            <div className={`flex items-center justify-center w-full h-full ${displayImage ? 'hidden' : ''}`}>
              <ShoppingBag className="h-12 w-12 text-gray-400" />
            </div>
          </div>
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.title || product.name || 'Product'}</h3>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-lg font-bold text-blue-600">₹{displayPrice}</span>
                {hasDiscount && (
                  <span className="text-sm text-gray-500 line-through">₹{product.price}</span>
                )}
              </div>
              <div className="flex flex-col items-end">
                {(product.popularity || 0) > 80 && <Badge variant="secondary">Popular</Badge>}
                {hasDiscount && (
                  <Badge variant="destructive" className="mt-1">
                    {Math.round(((product.price - (product.offer_price || 0)) / product.price) * 100)}% OFF
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  });

  const ProductSkeleton = () => (
    <Card className="h-full">
      <div className="aspect-video bg-gray-200 rounded-t-lg animate-pulse"></div>
      <CardContent className="p-4">
        <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse mb-3"></div>
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-20"></div>
          <div className="h-5 bg-gray-200 rounded animate-pulse w-16"></div>
        </div>
      </CardContent>
    </Card>
  );

  const renderProductSection = (title: string, icon: React.ReactNode, products: Product[], viewAllLink?: string, loading = false) => (
    <Card className="mb-12 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <CardTitle className="text-2xl font-bold text-gray-800">{title}</CardTitle>
          </div>
          {viewAllLink && (
            <Link href={viewAllLink}>
              <Button variant="outline" className="flex items-center gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
            <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-gray-700">No Products Available</h3>
            <p className="text-gray-500">This section is currently empty. Check back soon for new products!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Get content from database or use defaults
  const pageData = homepageContent?.content || {};
  const heroData = pageData.hero || {
    title: "Welcome to TecBunny Store",
    subtitle: "Your one-stop destination for cutting-edge technology and premium electronics.",
    description: "Discover amazing deals and the latest products with fast delivery.",
    buttons: [
      { text: "Shop Now", link: "/products", type: "primary" },
      { text: "Special Deals & Offers", link: "/offers", type: "secondary", icon: "🔥" }
    ]
  };
  const sectionsData = pageData.sections || {
    featured: { enabled: true, title: "Featured Products" },
    newArrivals: { enabled: true, title: "New Arrivals" },
    trending: { enabled: true, title: "Trending Now" },
    deals: { enabled: true, title: "Best Deals & Special Offers" }
  };
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
      {/* Admin Upload Button */}
      {isAdmin && (
        <div className="absolute top-4 right-4 z-50">
          <Button size="sm" onClick={() => setShowHeroDialog(true)}>
            Upload Hero Banner
          </Button>
        </div>
      )}
      {/* Hero Upload Dialog */}
      {showHeroDialog && (
        <HeroUploadDialog isOpen={showHeroDialog} onClose={() => setShowHeroDialog(false)} />
      )}

      {/* Welcome Banner */}
      {!sectionFilter && !loading && (
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold mb-6">{heroData.title}</h1>
            <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">{heroData.subtitle}</p>
            {heroData.description && (
              <p className="text-lg mb-8 max-w-xl mx-auto opacity-80">{heroData.description}</p>
            )}
            <div className="flex gap-4 justify-center flex-wrap">
              {heroData.buttons && Array.isArray(heroData.buttons) &&
                heroData.buttons.map((button: HeroButton, idx: number) => (
                  <Link key={idx} href={button.link} passHref>
                    <Button
                      size="lg"
                      variant={button.type === 'primary' ? 'secondary' : 'outline'}
                      className={button.type === 'secondary'
                        ? 'text-white hover:bg-white hover:text-blue-600 font-semibold shadow-lg bg-gradient-to-r from-orange-500 to-red-500 border-orange-500 transition-all duration-300 transform hover:scale-105'
                        : ''
                      }
                    >
                      {button.text}
                    </Button>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      )}
      {/* Promo Hero Banner */}
      {!sectionFilter && !loading && <HeroBanner />}

      {/* Error Banner - Only show for actual errors, not missing content */}
      {error && !error.includes('Page not found') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Some content may not load properly. {error}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-12 space-y-8">
        {/* Show all sections or filter by section */}
        {!loading && (
          <>
            {(!sectionFilter || sectionFilter === 'featured') && 
             (sectionsData.featured?.enabled !== false) &&
             renderProductSection(
              sectionsData.featured?.title || 'Featured Products',
              <Star className="h-6 w-6 text-yellow-500" />,
              featuredProducts,
              '/products?section=featured',
              loading
            )}
            {(!sectionFilter || sectionFilter === 'new') && 
             (sectionsData.newArrivals?.enabled !== false) &&
             renderProductSection(
              sectionsData.newArrivals?.title || 'New Arrivals',
              <Package className="h-6 w-6 text-green-500" />,
              newArrivals,
              '/products?section=new',
              loading
            )}
            {(!sectionFilter || sectionFilter === 'trending') && 
             (sectionsData.trending?.enabled !== false) &&
             renderProductSection(
              sectionsData.trending?.title || 'Trending Now',
              <TrendingUp className="h-6 w-6 text-red-500" />,
              trendingProducts,
              '/products?section=trending',
              loading
            )}
            {(!sectionFilter || sectionFilter === 'deals') && 
             (sectionsData.deals?.enabled !== false) &&
             renderProductSection(
              sectionsData.deals?.title || 'Best Deals & Special Offers',
              <Gift className="h-6 w-6 text-purple-500" />,
              dealProducts,
              '/products?section=deals',
              loading
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-lg">Loading...</div></div>}>
      <HomeContent />
    </React.Suspense>
  );
}