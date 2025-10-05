
'use client';

import * as React from 'react';

import { MoreHorizontal, PlusCircle } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { Button } from '../../../../components/ui/button';
import type { Discount } from '../../../../lib/types';
import { Badge } from '../../../../components/ui/badge';
import { CreateDiscountDialog } from '../../../../components/admin/CreateDiscountDialog';
import { useToast } from '../../../../hooks/use-toast';
import { createClient } from '../../../../lib/supabase/client';
import { UniversalSearch } from '../../../../components/shared/UniversalSearch';

export default function DiscountManagementPage() {
  const [discounts, setDiscounts] = React.useState<Discount[]>([]);
  const [filteredDiscounts, setFilteredDiscounts] = React.useState<Discount[]>([]);
  const [searchValue, setSearchValue] = React.useState('');
  const [filters, setFilters] = React.useState<any>({});
  const [sortValue, setSortValue] = React.useState('');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();
  const supabase = createClient();

  React.useEffect(() => {
    const fetchDiscounts = async () => {
  const { data, error } = await supabase.from('discounts').select('*');
        if (error) {
            console.error('Failed to fetch discounts:', error);
        } else {
            setDiscounts(data as Discount[]);
            setFilteredDiscounts(data as Discount[]);
        }
    }
    fetchDiscounts();
  }, [supabase]);
  
  const handleDiscountCreated = (newDiscount: Discount | any) => {
    setDiscounts(prev => [...prev, newDiscount]);
    toast({
      title: 'Discount Created',
  description: `The discount "${newDiscount.name}" has been successfully created.`,
    });
  };

  const applyFilters = React.useCallback(() => {
    let filtered = [...discounts];

    // Apply search term
    if (searchValue) {
      filtered = filtered.filter(discount =>
  discount.name.toLowerCase().includes(searchValue.toLowerCase()) ||
  (discount.applicable_category && discount.applicable_category.toLowerCase().includes(searchValue.toLowerCase()))
      );
    }

    // Apply filters
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(discount => discount.type === filters.type);
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(discount => discount.status === filters.status);
    }

    if (filters.minValue) {
      filtered = filtered.filter(discount => discount.value >= parseFloat(filters.minValue));
    }

    if (filters.maxValue) {
      filtered = filtered.filter(discount => discount.value <= parseFloat(filters.maxValue));
    }

    // Apply sorting
    if (sortValue) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortValue) {
          case 'code':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'type':
            aValue = a.type;
            bValue = b.type;
            break;
          case 'value':
            aValue = a.value;
            bValue = b.value;
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          default:
            aValue = a.name;
            bValue = b.name;
            break;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredDiscounts(filtered);
  }, [discounts, searchValue, filters, sortValue, sortDirection]);

  React.useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleFilterChange = (filterId: string, value: any) => {
    setFilters((prev: any) => ({
      ...prev,
      [filterId]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchValue('');
    setSortValue('');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchValue) count++;
    Object.values(filters).forEach(value => {
      if (value && value !== 'all') count++;
    });
    return count;
  };

  const getStatusVariant = (status: string) => {
    return status === 'active' ? 'secondary' : 'destructive';
  };

  const searchFilters = [
    {
      id: 'type',
      label: 'Type',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'fixed', label: 'Fixed Amount' },
        { value: 'percentage', label: 'Percentage' }
      ],
      value: filters.type || 'all'
    },
    {
      id: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ],
      value: filters.status || 'all'
    },
    {
      id: 'minValue',
      label: 'Min Value',
      type: 'range' as const,
      value: { min: filters.minValue || '', max: filters.maxValue || '' }
    }
  ];

  const sortOptions = [
  { value: 'name', label: 'Name' },
    { value: 'type', label: 'Type' },
    { value: 'value', label: 'Value' },
    { value: 'status', label: 'Status' }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Discount Management</h1>
        <p className="text-muted-foreground">
          Create and manage all store-wide and product-specific discounts.
        </p>
      </div>

      <UniversalSearch
        placeholder="Search by discount code or category..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={searchFilters}
        onFilterChange={handleFilterChange}
        sortOptions={sortOptions}
        sortValue={sortValue}
        sortDirection={sortDirection}
        onSortChange={(value: string, direction: 'asc' | 'desc') => {
          setSortValue(value);
          setSortDirection(direction);
        }}
        activeFiltersCount={getActiveFiltersCount()}
        onClearFilters={handleClearFilters}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Discounts (Auto Applied)</CardTitle>
            <CardDescription>
              This includes automatic discounts and coupon-based offers.
            </CardDescription>
          </div>
          <CreateDiscountDialog onDiscountCreated={handleDiscountCreated} mode="discount">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Discount
            </Button>
          </CreateDiscountDialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDiscounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell className="font-medium">{discount.name}</TableCell>
                  <TableCell className="capitalize">{discount.type}</TableCell>
                  <TableCell>{discount.type === 'fixed' ? `₹${discount.value}` : `${discount.value}%`}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(discount.status)} className="capitalize">{discount.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {discount.applicable_product_id 
                      ? `Product ID: ${discount.applicable_product_id.substring(0,8)}...`
                      : discount.applicable_category || 'All Products'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" disabled>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}