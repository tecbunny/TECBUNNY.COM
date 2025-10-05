
'use client';

import * as React from 'react';

import { TrendingUp, Users, Package, ShoppingBag } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { useAuth } from '../../../lib/hooks';

export default function SalesDashboard() {
    const { user } = useAuth();
    
    // In a real app, this data would be fetched from an API
    const stats = {
        todayRevenue: 125075.00,
        newCustomers: 5,
        pendingPickups: 8,
        pendingDeliveries: 3, // Manager only
    };

    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold">Sales Dashboard</h1>
                <p className="text-muted-foreground">An overview of today's sales and order activities.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.todayRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">+15.2% from yesterday</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New Customers Today</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{stats.newCustomers}</div>
                         <p className="text-xs text-muted-foreground">From walk-ins</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Pickups</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingPickups}</div>
                         <p className="text-xs text-muted-foreground">Ready for customer</p>
                    </CardContent>
                </Card>
                {user?.role === 'manager' && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.pendingDeliveries}</div>
                            <p className="text-xs text-muted-foreground">Needs processing</p>
                        </CardContent>
                    </Card>
                )}
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                     <CardDescription>A list of the most recent in-store and pickup orders.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">A log of recent orders will be displayed here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
