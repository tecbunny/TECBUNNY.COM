
'use client';

import * as React from 'react';

import { MoreHorizontal, Settings, Percent, Crown, Star, User as UserIcon, Shield, UserCog, Users, Briefcase, Headphones } from 'lucide-react';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import type { User, CustomerCategory } from '../../../../lib/types';
import { Badge } from '../../../../components/ui/badge';
import { createClient } from '../../../../lib/supabase/client';
import { AddUserDialog } from '../../../../components/admin/AddUserDialog';
import { EditUserDialog } from '../../../../components/admin/EditUserDialog';
import { DiscountOffersDialog } from '../../../../components/admin/DiscountOffersDialog';
import { UniversalSearch, SearchFilter, SortOption } from '../../../../components/shared/UniversalSearch';

export default function UserManagementPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = React.useState<User[]>([]);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [showDiscountDialog, setShowDiscountDialog] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'all' | 'staff' | 'customer' | 'sales'>('all');
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filters, setFilters] = React.useState<Record<string, any>>({});
  const [sortField, setSortField] = React.useState('name');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  
  const supabase = createClient();
  
  const fetchUsers = React.useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        email,
        mobile,
        role,
        address,
        gstin,
        customer_category,
        discount_percentage,
        is_active,
        created_at,
        updated_at,
        customer_type,
        gst_verified,
        business_name,
        business_address,
        credit_limit,
        b2b_category
      `);
    
    if (error) {
      console.error('Failed to fetch users:', error);
    } else {
      // Transform snake_case to camelCase for consistency
      const transformedUsers = data?.map(user => ({
        ...user,
        customerCategory: user.customer_category,
        discountPercentage: user.discount_percentage,
        isActive: user.is_active,
        customerType: user.customer_type,
        gstVerified: user.gst_verified,
        businessName: user.business_name,
        businessAddress: user.business_address,
        creditLimit: user.credit_limit,
        b2bCategory: user.b2b_category
      })) || [];
      
      setUsers(transformedUsers as User[]);
    }
  }, [supabase]);
  
  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter and search logic
  React.useEffect(() => {
    let filtered = [...users];

    // Apply tab-based filtering first
    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'staff':
          filtered = filtered.filter(user => 
            ['admin', 'manager', 'accounts'].includes(user.role)
          );
          break;
        case 'customer':
          filtered = filtered.filter(user => user.role === 'customer');
          break;
        case 'sales':
          filtered = filtered.filter(user => user.role === 'sales');
          break;
      }
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        (user.name || '').toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.mobile || '').toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (filters.role && filters.role.length > 0) {
      filtered = filtered.filter(user => filters.role.includes(user.role));
    }
    
    if (filters.customerCategory && filters.customerCategory.length > 0) {
      filtered = filtered.filter(user => 
        user.customerCategory && filters.customerCategory.includes(user.customerCategory)
      );
    }

    if (filters.status) {
      const isActive = filters.status === 'active';
      filtered = filtered.filter(user => (user.isActive !== false) === isActive);
    }

    if (filters.discountRange?.min || filters.discountRange?.max) {
      filtered = filtered.filter(user => {
        const min = parseFloat(filters.discountRange?.min) || 0;
        const max = parseFloat(filters.discountRange?.max) || 100;
        const discount = user.discountPercentage || 0;
        return discount >= min && discount <= max;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof User];
      let bValue: any = b[sortField as keyof User];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredUsers(filtered);
  }, [users, searchQuery, filters, sortField, sortDirection, activeTab]);

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditDialog(true);
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'sales':
      case 'accounts':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'manager':
        return <Settings className="h-3 w-3" />;
      case 'sales':
      case 'accounts':
        return <UserCog className="h-3 w-3" />;
      default:
        return <UserIcon className="h-3 w-3" />;
    }
  };

  const getCategoryIcon = (category: CustomerCategory | undefined) => {
    if (!category) return null;
    switch (category) {
      case 'Premium':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'Standard':
        return <Star className="h-3 w-3 text-blue-500" />;
      default:
        return <UserIcon className="h-3 w-3 text-gray-500" />;
    }
  };

  const getCategoryVariant = (category: CustomerCategory | undefined) => {
    if (!category) return 'outline';
    switch (category) {
      case 'Premium':
        return 'destructive';
      case 'Standard':
        return 'default';
      default:
        return 'secondary';
    }
  };

  // Filter options
  const searchFilters: SearchFilter[] = [
    {
      id: 'role',
      label: 'User Role',
      type: 'checkbox',
      options: [
        { value: 'customer', label: 'Customer' },
        { value: 'sales', label: 'Sales' },
        { value: 'accounts', label: 'Accounts' },
        { value: 'manager', label: 'Manager' },
        { value: 'admin', label: 'Admin' }
      ],
      value: filters.role || []
    },
    {
      id: 'customerCategory',
      label: 'Customer Category',
      type: 'checkbox',
      options: [
        { value: 'Normal', label: 'Normal' },
        { value: 'Standard', label: 'Standard' },
        { value: 'Premium', label: 'Premium' }
      ],
      value: filters.customerCategory || []
    },
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ],
      value: filters.status || ''
    },
    {
      id: 'discountRange',
      label: 'Discount Percentage',
      type: 'range',
      value: filters.discountRange || {}
    }
  ];

  const sortOptions: SortOption[] = [
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'role', label: 'Role' },
    { value: 'customerCategory', label: 'Category' },
    { value: 'discountPercentage', label: 'Discount' },
    { value: 'created_at', label: 'Join Date' }
  ];

  const handleFilterChange = (filterId: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterId]: value || undefined
    }));
  };

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const activeFiltersCount = Object.values(filters).filter(value => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v);
    }
    return Boolean(value);
  }).length;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            View, manage, and assign roles to all users.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowDiscountDialog(true)}
          className="flex items-center gap-2"
        >
          <Percent className="h-4 w-4" />
          Discounts & Offers
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Users
            <Badge variant="secondary" className="ml-2">
              {users.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Staff
            <Badge variant="secondary" className="ml-2">
              {users.filter(u => ['admin', 'manager', 'accounts'].includes(u.role)).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="customer" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Customers
            <Badge variant="secondary" className="ml-2">
              {users.filter(u => u.role === 'customer').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <Headphones className="h-4 w-4" />
            Sales Agents
            <Badge variant="secondary" className="ml-2">
              {users.filter(u => u.role === 'sales').length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  {activeTab === 'all' && 'All Users'}
                  {activeTab === 'staff' && 'Staff Members'}
                  {activeTab === 'customer' && 'Customers'}
                  {activeTab === 'sales' && 'Sales Agents'}
                </CardTitle>
            <CardDescription>
              A list of all registered users in the system.
            </CardDescription>
          </div>
          <AddUserDialog onUserAdded={fetchUsers} />
        </CardHeader>
        <CardContent className="space-y-4">
          <UniversalSearch
            placeholder="Search users by name, email, mobile, role..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            filters={searchFilters}
            onFilterChange={handleFilterChange}
            sortOptions={sortOptions}
            sortValue={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            activeFiltersCount={activeFiltersCount}
            onClearFilters={clearFilters}
          />

          <div className="text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {users.length} users
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name || 'No Name'}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.mobile || <span className="text-muted-foreground text-sm">Not provided</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleVariant(user.role)} className="capitalize flex items-center gap-1">
                      {getRoleIcon(user.role)}
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.role === 'customer' && user.customerCategory ? (
                      <Badge variant={getCategoryVariant(user.customerCategory)} className="flex items-center gap-1 w-fit">
                        {getCategoryIcon(user.customerCategory)}
                        {user.customerCategory}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.role === 'customer' && typeof user.discountPercentage === 'number' ? (
                      <Badge variant="outline">{user.discountPercentage}%</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive !== false ? "default" : "secondary"}>
                      {user.isActive !== false ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEditUser(user)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      <EditUserDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        user={selectedUser}
        onUserUpdated={fetchUsers}
      />

      <DiscountOffersDialog
        isOpen={showDiscountDialog}
        onClose={() => setShowDiscountDialog(false)}
      />
    </div>
  );
}