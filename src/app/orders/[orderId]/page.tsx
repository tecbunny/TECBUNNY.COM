import OrderConfirmationPage from '../../../components/orders/OrderConfirmationPage';

// Force dynamic rendering for order detail pages
export const dynamic = 'force-dynamic';

interface OrderDetailsPageProps {
  params: { orderId: string };
}

export default function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const { orderId } = params;

  return <OrderConfirmationPage orderId={orderId} />;
}
