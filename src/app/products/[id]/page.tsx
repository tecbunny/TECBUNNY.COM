import type { Metadata } from 'next';

import { ProductDetailPage } from '../../../components/products/ProductDetailPage';
import { createServiceClient, isSupabaseServiceConfigured } from '../../../lib/supabase/server';

const siteUrl = 'https://www.tecbunny.com';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

async function getProduct(id: string) {
  if (!isSupabaseServiceConfigured) return null;
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('products')
      .select('id, name, title, description, price, mrp, brand, category, image, stock_status')
      .eq('id', id)
      .single();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return {
      title: 'Product Not Found',
      robots: { index: false, follow: false },
    };
  }

  const name = product.title || product.name || 'Product';
  const description = product.description
    ? product.description.replace(/<[^>]+>/g, '').slice(0, 160)
    : `Buy ${name} from TecBunny Solutions in Goa. Quality tech hardware at the best price.`;
  const imageUrl = product.image || `${siteUrl}/brand.png`;
  const canonical = `${siteUrl}/products/${id}`;

  return {
    title: `${name} | TecBunny Solutions`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${name} | TecBunny Solutions`,
      description,
      url: canonical,
      type: 'website',
      siteName: 'TecBunny Solutions',
      images: [{ url: imageUrl, width: 800, height: 800, alt: name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | TecBunny Solutions`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProduct(id);

  const productJsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title || product.name,
        description: product.description
          ? product.description.replace(/<[^>]+>/g, '').slice(0, 500)
          : undefined,
        image: product.image,
        brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
        category: product.category,
        sku: product.id,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: product.price,
          availability:
            product.stock_status === 'out_of_stock'
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
          url: `${siteUrl}/products/${product.id}`,
          seller: { '@type': 'Organization', name: 'TecBunny Solutions' },
        },
      }
    : null;

  return (
    <>
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      <ProductDetailPage productId={id} />
    </>
  );
}

export async function generateStaticParams() {
  return [];
}
