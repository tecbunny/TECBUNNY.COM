
'use client';

import * as React from 'react';
import Link from 'next/link';

import {
  TrendingUp, TrendingDown, RefreshCw,
  Users, ShoppingBag, Package, MessageSquare,
  CheckCircle2, Clock, XCircle, BarChart2,
} from 'lucide-react';

import { Button } from '../../../components/ui/button';

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
  contactMessages: {
    total: number;
    newCount: number;
    inProgressCount: number;
    resolvedCount: number;
  };
  serviceRequestBreakdown: Array<{ subject: string; count: number }>;
  ordersByStatus: Array<{ status: string; count: number }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
}

// â”€â”€ Pure CSS bar chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function RevenueChart({ data }: { data: Array<{ month: string; revenue: number }> }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div className="flex h-36 items-end gap-2">
      {data.map((d, i) => {
        const pct = Math.round((d.revenue / max) * 100);
        return (
          <div key={i} className="group relative flex flex-1 flex-col items-center gap-1">
            {/* Tooltip */}
            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
              â‚¹{d.revenue.toLocaleString('en-IN')}
            </div>
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-500"
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
            <span className="text-[9px] text-slate-500">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

// â”€â”€ Horizontal bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = Math.round((count / Math.max(max, 1)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="max-w-[70%] truncate text-slate-300">{label}</span>
        <span className="font-bold text-white">{count}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10">
        <div className={`h-1.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-400',
  delivered: 'bg-emerald-400',
  pending: 'bg-amber-400',
  processing: 'bg-cyan-400',
  cancelled: 'bg-red-400',
  refunded: 'bg-rose-400',
};
const BAR_PALETTE = ['bg-cyan-400', 'bg-violet-400', 'bg-pink-400', 'bg-amber-400', 'bg-emerald-400', 'bg-rose-400'];

function statusBadgeCls(status: string) {
  switch (status) {
    case 'completed': case 'delivered': return 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30';
    case 'pending': return 'bg-amber-500/10 text-amber-300 border border-amber-500/30';
    case 'cancelled': return 'bg-red-500/10 text-red-300 border border-red-500/30';
    default: return 'bg-white/5 text-slate-300 border border-white/10';
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = React.useState<DashboardStats>({
    totalUsers: 0, totalProducts: 0, totalOrders: 0,
    monthlyRevenue: 0, monthlyOrders: 0, lastMonthOrders: 0,
    recentActivity: [],
    contactMessages: { total: 0, newCount: 0, inProgressCount: 0, resolvedCount: 0 },
    serviceRequestBreakdown: [],
    ordersByStatus: [],
    revenueByMonth: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchStats = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/dashboard?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      let data: DashboardStats & { success?: boolean; error?: string; stats?: DashboardStats } | null = null;
      try { data = await response.json(); } catch { data = null; }
      if (!response.ok) throw new Error((data as { error?: string })?.error || `HTTP ${response.status}`);
      if (data && 'success' in data && data.success && data.stats) setStats(data.stats);
      else throw new Error((data as { error?: string })?.error || 'Failed to fetch dashboard data');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchStats(); }, [fetchStats]);

  const orderGrowth = stats.lastMonthOrders > 0
    ? ((stats.monthlyOrders - stats.lastMonthOrders) / stats.lastMonthOrders * 100).toFixed(1)
    : '0';
  const isGrowthPositive = parseFloat(orderGrowth) >= 0;
  const maxServiceReq = stats.serviceRequestBreakdown[0]?.count ?? 1;
  const maxOrderStatus = stats.ordersByStatus[0]?.count ?? 1;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #030712; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #06b6d4; }
      `}</style>

      <div className="relative">
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-5 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-8 lg:px-10 space-y-8">

          {/* â”€â”€ Header â”€â”€ */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Admin Command</p>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-slate-400">Live performance snapshot for TecBunny Solutions.</p>
            </div>
            <Button onClick={fetchStats} disabled={loading} variant="outline"
              className="gap-2 border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
              <p className="text-red-200">Error: {error}</p>
              <button onClick={() => window.location.reload()}
                className="mt-3 rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600">
                Retry
              </button>
            </div>
          )}

          {/* â”€â”€ KPI cards â”€â”€ */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 animate-pulse">
                  <div className="h-3 w-20 rounded bg-white/10 mb-4" />
                  <div className="h-7 w-16 rounded bg-white/10 mb-2" />
                  <div className="h-2 w-24 rounded bg-white/10" />
                </div>
              ))
            ) : (<>
              {/* Monthly Revenue */}
              <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-cyan-950/60 to-slate-900/60 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Revenue</p>
                  <BarChart2 className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-white font-tech">â‚¹{stats.monthlyRevenue.toLocaleString('en-IN')}</div>
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  {isGrowthPositive ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />}
                  <span className={isGrowthPositive ? 'text-emerald-300' : 'text-red-300'}>{orderGrowth}%</span>
                  <span className="text-slate-500">vs last month</span>
                </div>
              </div>
              {/* Total Orders */}
              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Orders</p>
                  <ShoppingBag className="h-4 w-4 text-violet-400" />
                </div>
                <div className="text-2xl font-bold text-white font-tech">{stats.totalOrders}</div>
                <div className="mt-1.5 text-xs text-slate-500">{stats.monthlyOrders} this month</div>
              </div>
              {/* Products */}
              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Products</p>
                  <Package className="h-4 w-4 text-pink-400" />
                </div>
                <div className="text-2xl font-bold text-white font-tech">{stats.totalProducts}</div>
                <div className="mt-1.5 text-xs text-slate-500">In catalogue</div>
              </div>
              {/* Users */}
              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Users</p>
                  <Users className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-white font-tech">{stats.totalUsers}</div>
                <div className="mt-1.5 text-xs text-slate-500">Registered accounts</div>
              </div>
              {/* New Requests */}
              <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-rose-950/60 to-slate-900/60 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Requests</p>
                  <MessageSquare className="h-4 w-4 text-rose-400" />
                </div>
                <div className="flex items-end gap-2">
                  <div className="text-2xl font-bold text-white font-tech">{stats.contactMessages.newCount}</div>
                  {stats.contactMessages.newCount > 0 && (
                    <span className="mb-0.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">NEW</span>
                  )}
                </div>
                <div className="mt-1.5 text-xs text-slate-500">{stats.contactMessages.total} total requests</div>
              </div>
            </>)}
          </div>

          {/* â”€â”€ Analytics row â”€â”€ */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* Revenue trend (6 months) */}
            <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-slate-900/60 p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Revenue Trend</h3>
                  <p className="text-xs text-slate-500">Last 6 months (excl. cancelled)</p>
                </div>
                <BarChart2 className="h-4 w-4 text-cyan-400" />
              </div>
              {loading ? (
                <div className="flex h-36 items-end gap-2">
                  {[40,70,55,90,65,100].map((h, i) => (
                    <div key={i} className="flex-1 animate-pulse rounded-t-md bg-white/10" style={{ height: `${h}%` }} />
                  ))}
                </div>
              ) : stats.revenueByMonth.length > 0 ? (
                <RevenueChart data={stats.revenueByMonth} />
              ) : (
                <div className="flex h-36 items-center justify-center text-sm text-slate-600">No revenue data yet</div>
              )}
            </div>

            {/* Requests by status */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
              <div className="mb-5">
                <h3 className="font-semibold text-white">Service Requests</h3>
                <p className="text-xs text-slate-500">By current status</p>
              </div>
              {loading ? (
                <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-5 animate-pulse rounded bg-white/10" />)}</div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-2.5">
                    <div className="flex items-center gap-2.5 text-sm"><Clock className="h-4 w-4 text-amber-400" /> New</div>
                    <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">{stats.contactMessages.newCount}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-2.5">
                    <div className="flex items-center gap-2.5 text-sm"><TrendingUp className="h-4 w-4 text-cyan-400" /> In Progress</div>
                    <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-bold text-cyan-300">{stats.contactMessages.inProgressCount}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-2.5">
                    <div className="flex items-center gap-2.5 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Resolved</div>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">{stats.contactMessages.resolvedCount}</span>
                  </div>
                  <Link href="/management/admin/contact-messages"
                    className="mt-1 block w-full rounded-xl border border-white/10 py-2 text-center text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white">
                    View All Requests â†’
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* â”€â”€ Second analytics row â”€â”€ */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Service request by type */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
              <div className="mb-5">
                <h3 className="font-semibold text-white">Requests by Service</h3>
                <p className="text-xs text-slate-500">Which services are most requested</p>
              </div>
              {loading ? (
                <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-6 animate-pulse rounded bg-white/10" />)}</div>
              ) : stats.serviceRequestBreakdown.length > 0 ? (
                <div className="space-y-3.5">
                  {stats.serviceRequestBreakdown.slice(0, 6).map((s, i) => (
                    <HBar key={s.subject} label={s.subject} count={s.count} max={maxServiceReq} color={BAR_PALETTE[i % BAR_PALETTE.length]} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-slate-600">No service requests yet</div>
              )}
            </div>

            {/* Orders by status */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
              <div className="mb-5">
                <h3 className="font-semibold text-white">Orders by Status</h3>
                <p className="text-xs text-slate-500">Breakdown across all time</p>
              </div>
              {loading ? (
                <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-6 animate-pulse rounded bg-white/10" />)}</div>
              ) : stats.ordersByStatus.length > 0 ? (
                <div className="space-y-3.5">
                  {stats.ordersByStatus.map(s => (
                    <HBar key={s.status} label={s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                      count={s.count} max={maxOrderStatus}
                      color={STATUS_COLORS[s.status.toLowerCase()] ?? 'bg-slate-400'} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-slate-600">No orders yet</div>
              )}
            </div>
          </div>

          {/* â”€â”€ Recent activity + Quick actions â”€â”€ */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

            {/* Recent transmissions */}
            <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-slate-900/60 overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                <h3 className="font-semibold text-white tracking-wide">Recent Orders</h3>
                <Link href="/management/admin/orders" className="text-xs text-cyan-300 hover:text-white">View All</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="bg-white/5 text-xs font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {stats.recentActivity.length > 0 ? (
                      stats.recentActivity.map(a => (
                        <tr key={a.id} className="transition-colors hover:bg-white/5">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-white">{a.description}</p>
                            <p className="font-mono text-xs text-slate-500">#{a.id}</p>
                          </td>
                          <td className="px-6 py-4">{a.type}</td>
                          <td className="px-6 py-4">{new Date(a.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider ${statusBadgeCls(a.status)}`}>
                              {a.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="px-6 py-6 text-center text-slate-500">No recent activity.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick links + inventory */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
                <h3 className="mb-4 font-semibold text-white tracking-wide">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { href: '/management/admin/products', label: 'Products' },
                    { href: '/management/admin/services', label: 'Services' },
                    { href: '/management/admin/contact-messages', label: 'Requests' },
                    { href: '/management/admin/orders', label: 'Orders' },
                    { href: '/management/admin/innovation', label: 'Innovation' },
                    { href: '/management/admin/users', label: 'Users' },
                  ].map(({ href, label }) => (
                    <Link key={href} href={href}>
                      <div className="rounded-xl border border-white/10 p-3 text-center text-xs font-semibold text-white transition hover:border-cyan-400/50 hover:bg-cyan-400/10 cursor-pointer">
                        {label}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
                <h3 className="mb-4 font-semibold text-white tracking-wide">Inventory Watch</h3>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-400">Total Products</span>
                      <span className="font-semibold text-white">{stats.totalProducts}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10">
                      <div className="h-1.5 rounded-full bg-cyan-400" style={{ width: '40%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-400">Registered Users</span>
                      <span className="font-semibold text-amber-300">{stats.totalUsers}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10">
                      <div className="h-1.5 rounded-full bg-amber-300" style={{ width: '25%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-400">Monthly Orders</span>
                      <span className="font-semibold text-white">{stats.monthlyOrders}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10">
                      <div className="h-1.5 rounded-full bg-violet-400" style={{ width: '55%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-400">New Requests</span>
                      <span className="font-semibold text-rose-300">{stats.contactMessages.newCount}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10">
                      <div className="h-1.5 rounded-full bg-rose-400"
                        style={{ width: `${stats.contactMessages.total > 0 ? Math.round((stats.contactMessages.newCount / stats.contactMessages.total) * 100) : 0}%` }} />
                    </div>
                  </div>
                </div>
                <Link href="/management/admin/products" className="mt-5 block w-full rounded-lg border border-white/10 py-2 text-center text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white">
                  View Full Inventory
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
