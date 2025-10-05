'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Share2, Star, Truck, Shield, RefreshCw } from 'lucide-react';

import { logger } from '../../lib/logger';

import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { AddToCartButton } from '../../components/cart/AddToCartButton';
import { WishlistButton } from '../../components/wishlist/WishlistButton';

import { createClient } from '../../lib/supabase/client';
import type { Product } from '../../lib/types';

import { StarRating } from './StarRating';

interface ProductDetailPageProps {
  productId: string;
}

export function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const supabase = createClient();

  // Prepare product images (main + additional) - moved before early returns
  const productImages = useMemo(() => {
    if (!product) return [];
    
    const images: string[] = [];
    const normalizedArray: string[] = Array.isArray((product as any).images)
      ? (product as any).images.map((img: any) => (typeof img === 'string' ? img : img?.url || ''))
      : [];

    // Prefer images[] if present, else fallback to top-level image
    if (normalizedArray.length > 0) {
      images.push(...normalizedArray.filter(Boolean));
    } else if (product.image) {
      images.push(product.image);
    }

    // Add additional_images if available
    if (product.additional_images && Array.isArray(product.additional_images)) {
      images.push(...product.additional_images);
    }

    // Helper to coerce any placeholder/SVG into a safe PNG URL
    const toPngPlaceholder = (size: string = '600x600') => `https://placehold.co/${size}/0066cc/ffffff.png?text=Product+Image`;
    const ensurePng = (url: string): string => {
      if (!url) return toPngPlaceholder();
      try {
        // Block SVGs and data SVGs outright
        if (url.endsWith('.svg') || url.includes('image/svg+xml') || url.startsWith('data:image/svg+xml')) {
          return toPngPlaceholder();
        }
        // Normalize placehold.co without explicit raster extension to .png
        if (url.includes('placehold.co')) {
          const u = new URL(url);
          const hasRasterExt = /\.(png|jpg|jpeg|webp)$/i.test(u.pathname);
          if (!hasRasterExt) {
            u.pathname = `${u.pathname}.png`;
          }
          return u.toString();
        }
        return url;
      } catch {
        // On malformed URLs fall back to PNG placeholder
        return toPngPlaceholder();
      }
    };

    // Ensure at least one placeholder (use PNG to avoid Next/Image SVG block)
    const finalized = images.length === 0 ? [toPngPlaceholder()] : images;

    // Sanitize all URLs to avoid SVGs
    return finalized.map(ensurePng);
  }, [product]);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) {
        logger.error('Error fetching product:', { error });
      } else {
        setProduct(data);
      }
      setLoading(false);
    };

    fetchProduct();
  }, [productId, supabase]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-gray-200 rounded mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold mb-4">Product Not Found</h2>
          <p className="text-muted-foreground mb-8">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Button type="button" onClick={() => router.push('/products')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.push('/products')}
          className="text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
        <span>/</span>
        <span className="text-blue-600">{product.category}</span>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-harsh">
            <Image
              src={productImages[selectedImage]}
              alt={product.name}
              width={600}
              height={600}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              priority
            />
          </div>
          
          {/* Image Thumbnails */}
          <div className="grid grid-cols-4 gap-2">
            {productImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`aspect-square overflow-hidden rounded-lg transition-all duration-200 ${
                  selectedImage === index 
                    ? 'ring-2 ring-blue-500 ring-offset-2' 
                    : 'hover:opacity-75'
                }`}
              >
                <Image
                  src={image}
                  alt={`${product.name} view ${index + 1}`}
                  width={150}
                  height={150}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {product.category}
              </Badge>
              <Badge variant="outline">In Stock</Badge>
              {product.brand && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  {product.brand}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>
            
            {/* Brand and Model Info */}
            <div className="flex items-center gap-4 mb-3">
              {product.brand_logo && (
                <img 
                  src={product.brand_logo} 
                  alt={`${product.brand} logo`}
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              )}
              {product.model_number && (
                <span className="text-sm text-muted-foreground">
                  Model: <span className="font-medium">{product.model_number}</span>
                </span>
              )}
              {product.product_url && (
                <a 
                  href={product.product_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View Details ↗
                </a>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <StarRating rating={product.rating} size="lg" />
              <span className="text-sm text-muted-foreground">
                ({product.reviewCount} reviews)
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-4">
            <span className="text-4xl font-bold text-blue-600">
              ₹{product.price.toFixed(2)}
            </span>
            <span className="text-lg text-muted-foreground line-through">
              ₹{(product.price * 1.2).toFixed(2)}
            </span>
            <Badge variant="destructive">20% OFF</Badge>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Product Description</h3>
            <p className="text-muted-foreground leading-relaxed">
              {product.description || `Experience the best in ${product.category} technology with the ${product.name}. This premium product combines cutting-edge features with exceptional build quality to deliver outstanding performance and reliability. Perfect for both professionals and enthusiasts who demand the very best.`}
            </p>
          </div>

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="font-medium text-gray-700">{key}</span>
                      <span className="text-gray-600">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Product Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {product.barcode && (
              <div>
                <span className="font-medium">SKU:</span> 
                <span className="text-muted-foreground ml-1">{product.barcode}</span>
              </div>
            )}
            <div>
              <span className="font-medium">Category:</span> 
              <span className="text-muted-foreground ml-1">{product.category}</span>
            </div>
            {product.warranty && (
              <div className="col-span-2">
                <span className="font-medium">Warranty:</span> 
                <span className="text-muted-foreground ml-1">{product.warranty}</span>
              </div>
            )}
          </div>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-blue-600" />
                <span>1 Year Warranty</span>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-blue-600" />
                <span>Free Shipping Nationwide</span>
              </div>
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                <span>7 Days Return Policy</span>
              </div>
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-blue-600" />
                <span>Premium Quality Guaranteed</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <AddToCartButton 
                  product={product} 
                  className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-button"
                />
              </div>
              <WishlistButton 
                product={product}
                className="h-12 w-12 flex-shrink-0"
              />
              <Button 
                variant="outline" 
                size="lg"
                className="h-12 w-12 flex-shrink-0"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">SKU:</span> {product.id}
              </div>
              <div>
                <span className="font-medium">Category:</span> {product.category}
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-8 text-sm text-blue-700">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span>Fast Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  <span>Quality Assured</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}