import type { Product } from './types';

export type AutoFillResult = {
  featured: Product[];
  newArrivals: Product[];
  trending: Product[];
  deals: Product[];
};

export function computeAutoFill(p: Product[], salesCounts: Map<string, number>, options?: { limit?: number, analyticsData?: Map<string, any> }) {
  const limit = options?.limit ?? 15;
  const analytics = options?.analyticsData || new Map();
  const products = [...p];

  const featured = [...products]
    .sort((a, b) => {
      const ap = a.prioritized ? 1 : 0;
      const bp = b.prioritized ? 1 : 0;
      if (ap !== bp) return bp - ap;
      
      // Use engagement score if available
      const scoreA = analytics.get(a.id)?.engagement_score || 0;
      const scoreB = analytics.get(b.id)?.engagement_score || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;

      if ((b.popularity || 0) !== (a.popularity || 0)) return (b.popularity || 0) - (a.popularity || 0);
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, limit);

  const newArrivals = [...products]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

  const trending = [...products]
    .map(prod => ({ product: prod, sales: salesCounts.get(prod.id) || 0, analytics: analytics.get(prod.id) || {} }))
    // AI Scoring: Sales (50%) + Engagement (30%) + Popularity (10%) + Rating (10%)
    .map(x => {
      const salesScore = x.sales * 10; // Weight sales heavily
      const engagementScore = x.analytics.engagement_score || 0;
      const popularityScore = (x.product.popularity || 0);
      const ratingScore = (x.product.rating || 0) * 2;
      
      const totalScore = (salesScore * 0.5) + (engagementScore * 0.3) + (popularityScore * 0.1) + (ratingScore * 0.1);
      return { ...x, score: totalScore };
    })
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
