import AdminOrders from './admin-orders';

// Force dynamic rendering so the order list stays fresh in the dashboard
export const dynamic = 'force-dynamic';

export default function Page() {
  return <AdminOrders />;
}
