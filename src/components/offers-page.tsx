'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { logger } from '../lib/logger';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';

import HeroCarousel from './HeroCarousel';

interface Offer {
  id: string;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping';
  discount_value?: number;
  minimum_purchase_amount?: number;
  offer_code?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_featured: boolean;
  customer_eligibility: string;
  banner_text?: string;
  banner_color?: string;
  terms_and_conditions?: string;
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [featuredOffers, setFeaturedOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const { toast } = useToast();

  const heroSection = <HeroCarousel pageKey="offers" />;

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      
      // Fetch all active offers
      const offersResponse = await fetch('/api/offers?active=true&homepage=true');
      const offersData = await offersResponse.json();
      
      if (offersResponse.ok) {
        const allOffers = offersData.offers || [];
        setOffers(allOffers);
        setFeaturedOffers(allOffers.filter((offer: Offer) => offer.is_featured));
      }
    } catch (error) {
      logger.error('Error fetching offers:', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleNewsletterSubscribe = async () => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive'
      });
      return;
    }

    setSubscribing(true);
    try {
      // Here you would typically send the email to your newsletter service
      // For now, we'll just show a success message
      toast({
        title: 'Success!',
        description: 'You have been subscribed to our newsletter'
      });
      setEmail('');
    } catch (error) {
      logger.error('Newsletter subscription failed', { error });
      toast({
        title: 'Error',
        description: 'Failed to subscribe to newsletter',
        variant: 'destructive'
      });
    } finally {
      setSubscribing(false);
    }
  };

  const getDiscountDisplay = (offer: Offer) => {
    switch (offer.discount_type) {
      case 'percentage':
        return `${offer.discount_value}% OFF`;
      case 'fixed_amount':
        return `₹${offer.discount_value} OFF`;
      case 'free_shipping':
        return 'FREE SHIPPING';
      case 'buy_x_get_y':
        return 'BUY X GET Y';
      default:
        return 'SPECIAL OFFER';
    }
  };

  const getOfferBadge = (offer: Offer) => {
    const now = new Date();
    const endDate = new Date(offer.end_date);
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (offer.is_featured) {
      return <Badge variant="destructive">Featured</Badge>;
    } else if (daysLeft <= 3) {
      return <Badge variant="destructive">Ending Soon</Badge>;
    } else if (daysLeft <= 7) {
      return <Badge variant="secondary">Limited Time</Badge>;
    } else {
      return <Badge variant="outline">Special Offer</Badge>;
    }
  };

  const getTimeLeft = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return 'Expired';
    if (daysLeft === 1) return 'Ends today';
    if (daysLeft <= 7) return `Ends in ${daysLeft} days`;
    return '';
  };

  if (loading) {
    return (
      <>
        {heroSection}
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
            <p>Loading amazing offers...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {heroSection}
      <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Special Offers</h1>
        <p className="text-lg text-muted-foreground">
          Don't miss out on our amazing deals and exclusive offers
        </p>
      </div>

      {/* Featured Offers */}
      {featuredOffers.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Featured Deals</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {featuredOffers.map((offer) => (
              <Card key={offer.id} className="border-primary shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    {getOfferBadge(offer)}
                    {getTimeLeft(offer.end_date) && (
                      <span className="text-sm text-muted-foreground">
                        {getTimeLeft(offer.end_date)}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-2xl">
                    {offer.title}
                  </CardTitle>
                  <CardDescription className="text-lg">
                    {offer.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold">
                      {getDiscountDisplay(offer)}
                    </div>
                    {offer.minimum_purchase_amount && (
                      <span className="text-sm text-muted-foreground">
                        Min purchase: ₹{offer.minimum_purchase_amount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <Button size="lg" asChild>
                      <Link href="/products">Shop Now</Link>
                    </Button>
                    {offer.offer_code && (
                      <span className="text-sm text-muted-foreground">
                        Use code: <code className="bg-muted px-2 py-1 rounded font-mono">
                          {offer.offer_code}
                        </code>
                      </span>
                    )}
                  </div>
                  {offer.terms_and_conditions && (
                    <p className="text-xs text-muted-foreground mt-4">
                      {offer.terms_and_conditions}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Regular Offers */}
      {offers.filter(o => !o.is_featured).length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">All Offers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.filter(o => !o.is_featured).map((offer) => (
              <Card key={offer.id}>
                <CardHeader>
                  {getOfferBadge(offer)}
                  <CardTitle>{offer.title}</CardTitle>
                  <CardDescription>{offer.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="bg-muted text-foreground px-3 py-2 rounded font-semibold text-center">
                      {getDiscountDisplay(offer)}
                    </div>
                  </div>
                  {offer.minimum_purchase_amount && (
                    <p className="text-sm text-muted-foreground mb-2">
                      Minimum purchase: ₹{offer.minimum_purchase_amount}
                    </p>
                  )}
                  <Button variant="outline" className="w-full mb-3" asChild>
                    <Link href="/products">
                      {offer.discount_type === 'free_shipping' ? 'Shop Now' : 'Claim Offer'}
                    </Link>
                  </Button>
                  {offer.offer_code && (
                    <div className="text-center">
                      <span className="text-xs text-muted-foreground">
                        Code: <code className="bg-muted px-1 py-0.5 rounded text-xs">
                          {offer.offer_code}
                        </code>
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {offers.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No active offers at the moment</h3>
          <p className="text-muted-foreground mb-6">
            Check back soon for exciting deals and discounts!
          </p>
          <Button asChild>
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      )}

      {/* Newsletter Signup */}
      <Card className="mt-12">
        <CardHeader className="text-center">
          <CardTitle>Never Miss a Deal</CardTitle>
          <CardDescription>
            Subscribe to our newsletter for exclusive offers and early access to sales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleNewsletterSubscribe()}
            />
            <Button 
              onClick={handleNewsletterSubscribe}
              disabled={subscribing}
            >
              {subscribing ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}