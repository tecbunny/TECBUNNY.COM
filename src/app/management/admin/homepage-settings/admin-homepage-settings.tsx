
'use client';

import * as React from 'react';

import Image from 'next/image';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import type { Product } from '../../../../lib/types';
import { Checkbox } from '../../../../components/ui/checkbox';
import { useToast } from '../../../../hooks/use-toast';
import { ScrollArea } from '../../../../components/ui/scroll-area';
import { createClient } from '../../../../lib/supabase/client';

interface ProductSelectorProps {
  title: string;
  description: string;
  allProducts: Product[];
  selectedIds: Set<string>;
  onToggle: (productId: string) => void;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ title, description, allProducts, selectedIds, onToggle }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <ScrollArea className="h-96 pr-4">
        <div className="space-y-4">
          {allProducts.map(product => (
            <div key={product.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-4">
                {product.image ? (
                  <Image 
                    src={product.image}
                    alt={product.name}
                    width={48}
                    height={48}
                    className="rounded-md object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-md bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                    {product.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{product.category}</p>
                </div>
              </div>
              <Checkbox
                checked={selectedIds.has(product.id)}
                onCheckedChange={() => onToggle(product.id)}
                aria-label={`Select ${product.name}`}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </CardContent>
  </Card>
);


export default function HomepageSettingsPage() {
  const { toast } = useToast();
  const supabase = createClient();
  const [allProducts, setAllProducts] = React.useState<Product[]>([]);
  
  const [featuredProductIds, setFeaturedProductIds] = React.useState<Set<string>>(new Set());
  const [newArrivalProductIds, setNewArrivalProductIds] = React.useState<Set<string>>(new Set());
  const [trendingProductIds, setTrendingProductIds] = React.useState<Set<string>>(new Set());
  const [dealProductIds, setDealProductIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const fetchData = async () => {
        const { data: products } = await supabase.from('products').select('*');
        setAllProducts(products || []);
        
        const { data: settings } = await supabase.from('settings').select('*');
        
        const settingsMap = new Map(settings?.map(s => [s.key, s.value]));

        const loadIds = (key: string): Set<string> => {
            const storedIds = settingsMap.get(key);
            return storedIds ? new Set(JSON.parse(storedIds)) : new Set();
        }

        setFeaturedProductIds(loadIds('featuredProductIds'));
        setNewArrivalProductIds(loadIds('newArrivalProductIds'));
        setTrendingProductIds(loadIds('trendingProductIds'));
        setDealProductIds(loadIds('dealProductIds'));
    };
    fetchData();
  }, [supabase]);

  const createToggleHandler = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (productId: string) => {
    setter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleSaveChanges = async () => {
    try {
      // Use authenticated API to perform upserts one-by-one to avoid RLS multi-row issues
      const payloads = [
        { key: 'featuredProductIds', value: JSON.stringify(Array.from(featuredProductIds)) },
        { key: 'newArrivalProductIds', value: JSON.stringify(Array.from(newArrivalProductIds)) },
        { key: 'trendingProductIds', value: JSON.stringify(Array.from(trendingProductIds)) },
        { key: 'dealProductIds', value: JSON.stringify(Array.from(dealProductIds)) },
      ];
      for (const p of payloads) {
        const res = await fetch(`/api/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: p.key, value: p.value })
        });
        if (!res.ok) {
          const data = await res.json().catch(()=>({}));
          throw new Error(data.error || `Failed saving ${p.key}`);
        }
      }
      toast({
        title: 'Settings Saved',
        description: 'Your homepage product selections have been updated.',
      });
    } catch (e:any) {
      toast({
        variant: 'destructive',
        title: 'Error Saving Settings',
        description: e.message || 'Unknown error',
      });
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold">Homepage Settings</h1>
            <p className="text-muted-foreground">
              Control the content and layout of your store's homepage.
            </p>
        </div>
        <Button onClick={handleSaveChanges} size="lg">Save All Changes</Button>
      </div>
     
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ProductSelector
          title="Featured Products"
          description="Select products to feature prominently on the homepage."
          allProducts={allProducts}
          selectedIds={featuredProductIds}
          onToggle={createToggleHandler(setFeaturedProductIds)}
        />
         <ProductSelector
          title="New Arrivals"
          description="Choose the products to display in the 'New Arrivals' section."
          allProducts={allProducts}
          selectedIds={newArrivalProductIds}
          onToggle={createToggleHandler(setNewArrivalProductIds)}
        />
         <ProductSelector
          title="Trending Products"
          description="Set the products that are currently trending on your store."
          allProducts={allProducts}
          selectedIds={trendingProductIds}
          onToggle={createToggleHandler(setTrendingProductIds)}
        />
         <ProductSelector
          title="Deal Products"
          description="Select products that will be part of special deals."
          allProducts={allProducts}
          selectedIds={dealProductIds}
          onToggle={createToggleHandler(setDealProductIds)}
        />
      </div>
    </div>
  );
}