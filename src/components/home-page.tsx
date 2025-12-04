'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Package, Star, TrendingUp, Gift } from 'lucide-react';

import { logger } from '../lib/logger';
import type { Product } from '../lib/types';
import { createClient } from '../lib/supabase/client';
import { useAuth } from '../lib/hooks';
import { isAdminClient } from '../lib/permissions-client';
import { usePageContent } from '../hooks/use-page-content';

import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import HeroUploadDialog from './admin/HeroUploadDialog';
import HeroBanner from './HeroBanner';
import HeroCarousel from './HeroCarousel';
import { ProductCard as UnifiedProductCard } from './products/ProductCard';



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

// Fallback products removed - show empty sections when no products exist

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
        const productFields = 'id, title, name, description, price, popularity, rating, review_count, created_at, status, images, vendor, product_type, offer_price, stock_status, stock_quantity, prioritized';
        
        // Run parallel queries for better performance
        const [newArrivalsRes, trendingRes, featuredRes] = await Promise.all([
          // New Arrivals
          supabase
            .from('products')
            .select(productFields)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(8),
            
          // Trending
          supabase
            .from('products')
            .select(productFields)
            .eq('status', 'active')
            .order('popularity', { ascending: false })
            .limit(8),
            
          // Featured (using prioritized flag)
          supabase
            .from('products')
            .select(productFields)
            .eq('status', 'active')
            .eq('prioritized', true)
            .limit(8)
        ]);

        if (newArrivalsRes.error) throw newArrivalsRes.error;
        if (trendingRes.error) throw trendingRes.error;
        if (featuredRes.error) throw featuredRes.error;

        const processProducts = (data: any[] | null) => {
          return (data || [])
            .map(p => {
              const resolvedTitle = [p.title, p.name]
                .map((value) => (typeof value === 'string' ? value.trim() : ''))
                .find((value) => value.length > 0) || 'Unnamed Product';

              if (!p.id || !resolvedTitle) return null;
              
              // Extract primary image
              let primaryImage = null;
              if (Array.isArray(p.images) && p.images.length > 0) {
                const firstImage = p.images[0];
                primaryImage = typeof firstImage === 'string' ? firstImage : firstImage?.url;
              }
              
              return {
                ...p,
                title: resolvedTitle,
                name: resolvedTitle,
                image: primaryImage,
                price: Number(p.price) || 0,
                rating: Number(p.rating) || 0,
                reviewCount: Number(p.review_count) || 0,
                popularity: Number(p.popularity) || 0,
                offer_price: p.offer_price ? Number(p.offer_price) : undefined
              } as Product;
            })
            .filter(Boolean) as Product[];
        };

        setNewArrivals(processProducts(newArrivalsRes.data));
        setTrendingProducts(processProducts(trendingRes.data));
        setFeaturedProducts(processProducts(featuredRes.data));
        
        // For deals, we can reuse trending or fetch separately if needed, 
        // but for now let's use trending products that have offers
        const trending = processProducts(trendingRes.data);
        setDealProducts(trending.filter(p => p.offer_price && p.offer_price < p.price));

      } catch (err: any) {
        logger.warn('Unable to fetch products:', { error: err.message });
        setError(err.message || 'Unable to fetch products');
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
              <UnifiedProductCard key={product.id} product={product} />
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
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 py-16 text-white sm:py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="mb-6 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{heroData.title}</h1>
            <p className="mx-auto mb-6 max-w-2xl text-base opacity-90 sm:mb-8 sm:text-lg lg:text-xl">{heroData.subtitle}</p>
            {heroData.description && (
              <p className="mx-auto mb-8 max-w-xl text-sm opacity-80 sm:text-base lg:text-lg">{heroData.description}</p>
            )}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
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

  {/* Additional Hero Carousel */}
      {!sectionFilter && !loading && (
        <HeroCarousel pageKey="homepage" className="pt-4 sm:pt-6" />
      )}

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