import { describe, it, expect } from 'vitest';
import { computeAutoFill } from '../src/lib/homepage-auto-fill';

type Product = {
  id: string;
  title?: string | null;
  name?: string | null;
  price: number;
  offer_price?: number | null;
  description?: string | null;
  category?: string | null;
  image?: string | null;
  popularity?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  created_at: string;
  prioritized?: boolean | null;
  discount_percentage?: number | null;
};

const makeProduct = (overrides: Partial<Product> & { id: string }): Product => {
  const { id, ...rest } = overrides;

  return {
    id,
    title: rest.title ?? `Product ${id}`,
    name: rest.name ?? `Product ${id}`,
    price: rest.price ?? 100,
    category: rest.category ?? 'cat',
    image: rest.image ?? 'img.jpg',
    description: rest.description ?? '',
    popularity: rest.popularity ?? 0,
    rating: rest.rating ?? 0,
    reviewCount: rest.reviewCount ?? 0,
    created_at: rest.created_at ?? new Date().toISOString(),
    ...rest,
  };
};

describe('computeAutoFill', () => {
  it('returns up to limit products and computes trending, deals, newArrivals, featured', () => {
    const p1 = makeProduct({ id: 'p1', popularity: 5, rating: 4, price: 200, offer_price: 150 });
    const p2 = makeProduct({ id: 'p2', popularity: 8, rating: 5, price: 250 });
    const p3 = makeProduct({ id: 'p3', popularity: 1, rating: 3, price: 120, offer_price: 100 });
    const p4 = makeProduct({ id: 'p4', popularity: 12, rating: 4.5, price: 300 });

    const products = [p1, p2, p3, p4];

    const salesCounts = new Map<string, number>([['p1', 10], ['p2', 20], ['p3', 3], ['p4', 15]]);

    const result = computeAutoFill(products, salesCounts, { limit: 2 });

    expect(Object.keys(result)).toEqual(expect.arrayContaining(['featured', 'newArrivals', 'trending', 'deals']));

    // limit applied
    expect(result.featured.length).toBeLessThanOrEqual(2);
    expect(result.trending.length).toBeLessThanOrEqual(2);
    expect(result.deals.length).toBeLessThanOrEqual(2);

    // deals include p1 or p3
    expect(result.deals.some(x => x.id === 'p1' || x.id === 'p3')).toBe(true);

    // trending should include the product with highest sale count (p2 or p4 depending on score)
    const trendingIds = result.trending.map(x => x.id);
    expect(trendingIds.length).toBeGreaterThan(0);
    expect(trendingIds).toContain('p2');
  });
});
