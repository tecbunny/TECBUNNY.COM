'use client';

import { ChevronRight, Sparkles, Package, Truck, Star } from 'lucide-react';

import { useRouter } from 'next/navigation';

import { Button, GlassCard, AnimatedContainer } from '../../components/ui/enhanced-ui';

export function EnhancedHeroSection() {
  const router = useRouter();

  const handleShopNow = () => {
    router.push('/products');
  };

  const handleBrowseCategories = () => {
    router.push('/products?category=all');
  };

  return (
    <section className="relative min-h-screen-mobile flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-black/[0.02] bg-[size:50px_50px]" />
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
      
      <div className="container relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <AnimatedContainer delay={0.1}>
            <div className="mx-auto mb-6 inline-flex items-center rounded-full border bg-white/70 px-4 py-2 text-sm backdrop-blur-sm animate-scale-in border-blue-200">
              <Sparkles className="mr-2 h-4 w-4 text-blue-600" />
              Premium Electronics & Technology
              <ChevronRight className="ml-2 h-4 w-4" />
            </div>
          </AnimatedContainer>

          {/* Main Heading */}
          <AnimatedContainer delay={0.3}>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl animate-fade-in text-gray-800">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">
                TecBunny
              </span>
            </h1>
          </AnimatedContainer>

          {/* Description */}
          <AnimatedContainer delay={0.5}>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 sm:text-xl animate-fade-in">
              Your friendly neighborhood tech store, bringing you the latest gadgets and accessories 
              with style and innovation. Discover premium electronics at unbeatable prices.
            </p>
          </AnimatedContainer>

          {/* CTA Buttons */}
          <AnimatedContainer delay={0.7}>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center animate-slide-up">
              <Button 
                size="lg" 
                variant="gradient" 
                className="text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                onClick={handleShopNow}
              >
                Shop Now
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={handleBrowseCategories}
              >
                Browse Categories
              </Button>
            </div>
          </AnimatedContainer>

          {/* Feature Cards */}
          <AnimatedContainer delay={0.9}>
            <div className="mt-16 grid gap-6 sm:grid-cols-3 animate-fade-in">
              <GlassCard className="text-center bg-white/50 border-blue-100">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-blue-600">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-800">Premium Quality</h3>
                <p className="text-sm text-gray-600">
                  Carefully curated electronics and accessories from trusted brands.
                </p>
              </GlassCard>

              <GlassCard className="text-center bg-white/50 border-blue-100">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-blue-600">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-800">Fast Delivery</h3>
                <p className="text-sm text-gray-600">
                  Quick and reliable shipping with secure packaging nationwide.
                </p>
              </GlassCard>

              <GlassCard className="text-center bg-white/50 border-blue-100">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-orange-600">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-800">Customer First</h3>
                <p className="text-sm text-gray-600">
                  Exceptional customer service and satisfaction guarantee.
                </p>
              </GlassCard>
            </div>
          </AnimatedContainer>
        </div>
      </div>
    </section>
  );
}