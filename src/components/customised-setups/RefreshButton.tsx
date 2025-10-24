'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

export function RefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Add timestamp to force cache invalidation
    const url = new URL(window.location.href);
    url.searchParams.set('refresh', Date.now().toString());
    window.location.href = url.toString();
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={isRefreshing}
      size="sm"
      variant="outline"
      className="text-xs"
    >
      <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing...' : 'Refresh Prices'}
    </Button>
  );
}