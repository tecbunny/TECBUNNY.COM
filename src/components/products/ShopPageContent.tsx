
'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

import { 
  Filter, 
  X, 
  Search,
  Grid3X3,
  List,
  SlidersHorizontal
} from 'lucide-react';

import { logger } from '../../lib/logger';

import { ProductCard } from '../../components/products/ProductCard';
import { ProductSort } from '../../components/products/ProductSort';
import type { Product } from '../../lib/types';
import { Skeleton } from '../../components/ui/skeleton';
import { createClient } from '../../lib/supabase/client';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Slider } from '../../components/ui/slider';

export function ShopPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const searchQuery = searchParams.get('q') || '';
  const sortOption = searchParams.get('sort') || 'popularity';
  const categoryFilter = searchParams.get('category') || '';
  const brandFilter = searchParams.get('brand') || '';
  const refresh = searchParams.get('refresh') || '';
  
  const [products, setProducts] = React.useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [brands, setBrands] = React.useState<string[]>([]);
  const [priceRange, setPriceRange] = React.useState<[number, number]>([0, 100000]);
  const [maxPrice, setMaxPrice] = React.useState(100000);
  const [showFilters, setShowFilters] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [localSearchQuery, setLocalSearchQuery] = React.useState(searchQuery);
  
  const supabase = createClient();

  // Update URL parameters
  const updateUrlParams = React.useCallback((params: Record<string, string>) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        currentParams.set(key, value);
      } else {
        currentParams.delete(key);
      }
    });
    
    const queryString = currentParams.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  // Fetch products from database
  React.useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      
      try {
        logger.info('ShopPage: Fetching products...');
        
        // Fetch products sorted by display_order (higher first), then created_at
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('display_order', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
        
        logger.info('ShopPage: Products fetched', { 
          count: data?.length || 0, 
          error: error?.message,
          hasData: !!data 
        });
        
        if (error) {
          logger.warn("Unable to fetch products:", { error: error.message });
          setProducts([]);
          setLoading(false); // Ensure we stop loading even on error
          return; // Exit early
        }
        
        if (!data || data.length === 0) {
          logger.warn("No products found in database");
          setProducts([]);
          setCategories([]);
          setBrands([]);
          setLoading(false);
          return;
        }
        
        // Normalize products to ensure required fields exist and are properly typed
        const normalized = (data || []).map((p: any) => {
          const priceNum = typeof p.price === 'number' ? p.price : Number(p.price) || 0;
          // Normalize image: prefer top-level image, else first item from images[], else first from additional_images
          const firstImage = Array.isArray(p.images) && p.images.length > 0
            ? (typeof p.images[0] === 'string' ? p.images[0] : (p.images[0]?.url || ''))
            : '';
          const firstAdditionalImage = Array.isArray(p.additional_images) && p.additional_images.length > 0
            ? (typeof p.additional_images[0] === 'string' ? p.additional_images[0] : (p.additional_images[0]?.url || ''))
            : '';
          return {
            ...p,
            id: p.id,
            // Ensure name/title always present
            name: p.name || p.title || 'Unnamed Product',
            title: p.title || p.name || 'Product',
            // Map category/brand from alternative fields when missing
            category: p.category || p.product_type || 'General',
            brand: p.brand || p.vendor || undefined,
            // Provide safe defaults
            price: priceNum,
            popularity: p.popularity || 0,
            rating: p.rating || 0,
            reviewCount: p.review_count ?? p.reviewCount ?? 0,
            created_at: p.created_at || new Date().toISOString(),
            image: p.image || firstImage || firstAdditionalImage || 'https://placehold.co/600x400.png?text=No+Image',
          } as Product;
        });

        logger.info('ShopPage: Products normalized', { count: normalized.length });
        setProducts(normalized);
        
        // Extract unique categories and brands
        const uniqueCategories = [...new Set(normalized.map(p => p.category).filter(Boolean))];
        const uniqueBrands = [...new Set(
          normalized
            .map(p => p.brand)
            .filter((b): b is string => typeof b === 'string' && b.length > 0)
        )];
        
        setCategories(uniqueCategories);
        setBrands(uniqueBrands);
        
        // Set price range based on actual product prices
        if (normalized.length === 0) {
          setMaxPrice(100000);
          setPriceRange([0, 100000]);
        } else {
          const prices = normalized.map(p => p.price);
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          setMaxPrice(max);
          setPriceRange([min, max]);
        }
      } catch (error) {
        logger.error('Error fetching products:', { error });
        setProducts([]);
      } finally {
        // Always set loading to false, even if there's an error
        setLoading(false);
        logger.info('ShopPage: Loading complete');
      }
    };

    fetchProducts();
  }, [supabase, refresh]);

  // Filter and sort products
  React.useEffect(() => {
    let filtered = [...products];

    // Apply filters
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.brand || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    if (brandFilter) {
      filtered = filtered.filter(product => product.brand === brandFilter);
    }

    // Price range filter
    filtered = filtered.filter(product => 
      product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    // Apply sorting
    switch (sortOption) {
      case 'price_asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'name_asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'popularity':
      default:
        filtered.sort((a, b) => b.popularity - a.popularity);
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, categoryFilter, brandFilter, priceRange, sortOption]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParams({ q: localSearchQuery });
  };

  const clearFilters = () => {
    setPriceRange([0, maxPrice]);
    updateUrlParams({ 
      category: '', 
      brand: '', 
      q: '',
      sort: 'popularity' 
    });
    setLocalSearchQuery('');
  };

  const activeFiltersCount = [categoryFilter, brandFilter, searchQuery].filter(Boolean).length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Search and View Controls */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
              {searchQuery ? `Search Results for "${searchQuery}"` : 'All Products'}
            </h1>
            <p className="text-muted-foreground">
              {loading ? 'Loading...' : `${filteredProducts.length} products found`}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2 min-w-0 flex-1 lg:flex-initial lg:w-80">
              <Input
                type="text"
                placeholder="Search products..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            
            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters and Sort Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              {/* Category Filter */}
              <Select
                value={categoryFilter || 'all'}
                onValueChange={(value) => updateUrlParams({ category: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Brand Filter */}
              <Select
                value={brandFilter || 'all'}
                onValueChange={(value) => updateUrlParams({ brand: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <Button variant="ghost" onClick={clearFilters} className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Sort */}
          <ProductSort />
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <Card className="mt-4">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Price Range: ₹{priceRange[0].toLocaleString()} - ₹{priceRange[1].toLocaleString()}
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                    max={maxPrice}
                    min={0}
                    step={1000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>₹0</span>
                    <span>₹{maxPrice.toLocaleString()}</span>
                  </div>
                </div>

                {/* Category Checkboxes */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Categories</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {categories.map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`category-${category}`}
                          name="category"
                          checked={categoryFilter === category}
                          onChange={() => updateUrlParams({ category })}
                          className="rounded"
                        />
                        <label htmlFor={`category-${category}`} className="text-sm">
                          {category}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Brand Checkboxes */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Brands</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {brands.map((brand) => (
                      <div key={brand} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`brand-${brand}`}
                          name="brand"
                          checked={brandFilter === brand}
                          onChange={() => updateUrlParams({ brand })}
                          className="rounded"
                        />
                        <label htmlFor={`brand-${brand}`} className="text-sm">
                          {brand}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Filters Display */}
        {(categoryFilter || brandFilter || searchQuery) && (
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-sm font-medium">Active filters:</span>
            {searchQuery && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Search: {searchQuery}
                <button 
                  onClick={() => updateUrlParams({ q: '' })}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {categoryFilter && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Category: {categoryFilter}
                <button 
                  onClick={() => updateUrlParams({ category: '' })}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {brandFilter && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Brand: {brandFilter}
                <button 
                  onClick={() => updateUrlParams({ brand: '' })}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Products Grid/List */}
      {loading ? (
        <div className={`grid gap-6 ${viewMode === 'grid' 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
          : 'grid-cols-1'
        }`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className={`grid gap-6 ${viewMode === 'grid' 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
          : 'grid-cols-1'
        }`}>
          {filteredProducts.map((product: Product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              viewMode={viewMode}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Products Found</h2>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search or filters to find what you're looking for.
          </p>
          {activeFiltersCount > 0 && (
            <Button onClick={clearFilters} variant="outline">
              Clear All Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}