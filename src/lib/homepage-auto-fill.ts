import type { Product } from './types';

export type AutoFillResult = {
  featured: Product[];
  newArrivals: Product[];
  trending: Product[];
  deals: Product[];
};

export function computeAutoFill(p: Product[], salesCounts: Map<string, number>, options?: { limit?: number }) {
  const limit = options?.limit ?? 15;
  const products = [...p];

  const featured = [...products]
    .sort((a, b) => {
      const ap = a.prioritized ? 1 : 0;
      const bp = b.prioritized ? 1 : 0;
      if (ap !== bp) return bp - ap;
      if ((b.popularity || 0) !== (a.popularity || 0)) return (b.popularity || 0) - (a.popularity || 0);
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, limit);

  const newArrivals = [...products]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

  const trending = [...products]
    .map(prod => ({ product: prod, sales: salesCounts.get(prod.id) || 0 }))
    .map(x => ({ ...x, score: (x.sales * 0.7) + ((x.product.popularity || 0) * 0.2) + ((x.product.rating || 0) * 0.1) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.product);

  const deals = [...products]
    .filter(prod => (typeof prod.offer_price === 'number' && prod.offer_price < prod.price) || (prod as any).discount_percentage > 0)
    .sort((a, b) => {
      const aDiscount = (a.price || 0) - (a.offer_price || a.price || 0);
      const bDiscount = (b.price || 0) - (b.offer_price || b.price || 0);
      if (bDiscount !== aDiscount) return bDiscount - aDiscount;
      return (b.popularity || 0) - (a.popularity || 0);
    })
    .slice(0, limit);

  return {
    featured,
    newArrivals,
    trending,
    deals,
  } as AutoFillResult;
}
