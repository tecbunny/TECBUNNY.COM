
'use client';

import * as React from 'react';

import { Users, Package, ShoppingCart, BarChart, TrendingUp, TrendingDown } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';

interface DashboardStats {
    totalUsers: number;
    totalProducts: number;
    totalOrders: number;
    monthlyRevenue: number;
    monthlyOrders: number;
    lastMonthOrders: number;
    recentActivity: Array<{
        id: string;
        type: string;
        description: string;
        date: string;
        status: string;
    }>;
}

export default function AdminDashboard() {
    const [stats, setStats] = React.useState<DashboardStats>({
        totalUsers: 0,
        totalProducts: 0,
        totalOrders: 0,
        monthlyRevenue: 0,
        monthlyOrders: 0,
        lastMonthOrders: 0,
        recentActivity: []
    });
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const response = await fetch('/api/admin/dashboard');
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success && data.stats) {
                    setStats(data.stats);
                } else {
                    throw new Error(data.error || 'Failed to fetch dashboard data');
                }
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                setError(error instanceof Error ? error.message : 'Failed to load dashboard');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    // Calculate growth indicators
    const orderGrowth = stats.lastMonthOrders > 0 
        ? ((stats.monthlyOrders - stats.lastMonthOrders) / stats.lastMonthOrders * 100).toFixed(1)
        : '0';
    const isGrowthPositive = parseFloat(orderGrowth) >= 0;
    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">A complete overview of your store's performance and operations.</p>
            </div>
            
            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <p className="text-red-600">Error loading dashboard: {error}</p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </CardContent>
                </Card>
            )}
            
            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="h-4 bg-gray-300 rounded w-24"></div>
                                <div className="h-4 w-4 bg-gray-300 rounded"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-gray-300 rounded w-16 mb-2"></div>
                                <div className="h-3 bg-gray-300 rounded w-32"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalUsers}</div>
                            <p className="text-xs text-muted-foreground">Registered users</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalProducts}</div>
                             <p className="text-xs text-muted-foreground">Products in catalog</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalOrders}</div>
                             <p className="text-xs text-muted-foreground flex items-center gap-1">
                                {stats.monthlyOrders} this month
                                {isGrowthPositive ? (
                                    <TrendingUp className="h-3 w-3 text-green-600" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 text-red-600" />
                                )}
                                <span className={isGrowthPositive ? 'text-green-600' : 'text-red-600'}>
                                    {orderGrowth}%
                                </span>
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{stats.monthlyRevenue.toLocaleString('en-IN')}</div>
                            <p className="text-xs text-muted-foreground">This month's total</p>
                        </CardContent>
                    </Card>
                </div>
            )}
            
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                     <CardDescription>Latest orders and system activities</CardDescription>
                </CardHeader>
                <CardContent>
                    {stats.recentActivity.length > 0 ? (
                        <div className="space-y-3">
                            {stats.recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                                    <div>
                                        <p className="font-medium text-sm">{activity.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(activity.date).toLocaleDateString()} at {new Date(activity.date).toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        activity.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {activity.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No recent activity to display.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
