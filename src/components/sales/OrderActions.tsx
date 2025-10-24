'use client';

import * as React from 'react';

import { 
  MoreHorizontal, 
  CheckCircle, 
  XCircle, 
  Printer, 
  Package, 
  Truck, 
  Clock,
  Ban,
  CreditCard,
  Eye
} from 'lucide-react';

import { logger } from '../../lib/logger';
import { formatOrderNumber } from '../../lib/order-utils';

import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../hooks/use-toast';
import { createClient } from '../../lib/supabase/client';
import { useAuth } from '../../lib/hooks';
import { isManagerClient, isSalesClient } from '../../lib/permissions-client';
import type { Order, OrderStatus } from '../../lib/types';

const ADMIN_NOTIFICATION_EMAIL = (() => {
  const envValue = (process.env.NEXT_PUBLIC_ORDER_ADMIN_EMAIL || '').trim();
  return envValue || 'tecbunnysolution@gmail.com';
})();

interface OrderActionsProps {
  order: Order;
  onStatusUpdate: () => void;
  variant?: 'dropdown' | 'buttons' | 'compact';
}

interface PaymentConfirmationDialog {
  isOpen: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onClose: () => void;
}

interface OrderConfirmationDialog {
  isOpen: boolean;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

interface CancellationDialog {
  isOpen: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function OrderActions({ order, onStatusUpdate, variant = 'dropdown' }: OrderActionsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = createClient();
  
  const [paymentDialog, setPaymentDialog] = React.useState<PaymentConfirmationDialog>({
    isOpen: false,
    onConfirm: () => {},
    onReject: () => {},
    onClose: () => {}
  });
  
  const [confirmDialog, setConfirmDialog] = React.useState<OrderConfirmationDialog>({
    isOpen: false,
    onAccept: () => {},
    onReject: () => {},
    onClose: () => {}
  });
  
  const [cancelDialog, setCancelDialog] = React.useState<CancellationDialog>({
    isOpen: false,
    onConfirm: () => {},
    onClose: () => {}
  });
  
  const [cancellationReason, setCancellationReason] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  const canManageOrders = isManagerClient(user);
  const canManagePickupOrders = isSalesClient(user); // Both sales and manager can manage pickup orders

  const hasPermission = order.type === 'Pickup' ? canManagePickupOrders : canManageOrders;

  const resolvePaymentStatusUpdate = (newStatus: OrderStatus) => {
    const method = order.payment_method?.toLowerCase() ?? '';
    switch (newStatus) {
      case 'Awaiting Payment':
        return { payment_status: 'Payment Confirmation Pending' };
      case 'Payment Confirmed':
        return { payment_status: 'Payment Confirmed' };
      case 'Confirmed':
        if (method === 'cod' && order.payment_status !== 'Payment Confirmed') {
          return {};
        }
        return order.payment_status === 'Payment Confirmed' ? {} : { payment_status: 'Payment Confirmed' };
      case 'Processing':
      case 'Ready to Ship':
      case 'Shipped':
      case 'Ready for Pickup':
      case 'Completed':
      case 'Delivered':
        if (order.payment_status === 'Payment Confirmed' || method === 'cod') {
          return {};
        }
        return { payment_status: 'Payment Confirmed' };
      case 'Cancelled':
      case 'Rejected':
        return { payment_status: 'Payment Cancelled' };
      default:
        return {};
    }
  };

  const notifyStatusChange = async (status: OrderStatus) => {
    const notifyPickupCustomer = async () => {
      if (!order.customer_email) {
        return;
      }

      try {
        const pickupCode = formatOrderNumber(order.id);
        const response = await fetch('/api/email/pickup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: order.customer_email,
            orderData: {
              id: order.id,
              customer_name: order.customer_name,
              total: order.total,
              type: order.type,
              delivery_address: order.pickup_store || order.delivery_address,
              pickup_store: order.pickup_store || order.delivery_address
            },
            pickupCode
          })
        });

        if (!response.ok) {
          throw new Error(`pickup email failed with status ${response.status}`);
        }
      } catch (error) {
        logger.warn('pickup_notification_email_failed', {
          error: error instanceof Error ? error.message : String(error),
          orderId: order.id
        });
      }
    };

    const notifyPickupAdmin = async () => {
      if (!ADMIN_NOTIFICATION_EMAIL) {
        return;
      }

      try {
        const response = await fetch('/api/email/notify-sales-pickup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: ADMIN_NOTIFICATION_EMAIL,
            orderId: order.id,
            orderType: 'pickup'
          })
        });

        if (!response.ok) {
          throw new Error(`pickup admin email failed with status ${response.status}`);
        }
      } catch (error) {
        logger.warn('pickup_admin_notification_failed', {
          error: error instanceof Error ? error.message : String(error),
          orderId: order.id
        });
      }
    };

    const notifyOrderApproved = async () => {
      if (!ADMIN_NOTIFICATION_EMAIL) {
        return;
      }

      try {
        const response = await fetch('/api/email/order-approved', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: ADMIN_NOTIFICATION_EMAIL,
            orderId: order.id,
            orderTotal: order.total,
            orderType: order.type === 'Pickup' ? 'pickup' : order.type === 'Delivery' ? 'delivery' : undefined,
            customerName: order.customer_name
          })
        });

        if (!response.ok) {
          throw new Error(`order approved email failed with status ${response.status}`);
        }
      } catch (error) {
        logger.warn('order_approved_email_failed', {
          error: error instanceof Error ? error.message : String(error),
          orderId: order.id
        });
      }
    };

    if (status === 'Ready for Pickup' && order.type === 'Pickup') {
      await notifyPickupCustomer();
      await notifyPickupAdmin();
    }

    if (status === 'Confirmed') {
      await notifyOrderApproved();
    }
  };

  const updateOrderStatus = async (newStatus: OrderStatus, additionalData?: any) => {
    setIsProcessing(true);
    try {
      const paymentUpdates = resolvePaymentStatusUpdate(newStatus);
      const updateData = {
        status: newStatus,
        processed_by: user?.id || 'unknown',
        updated_at: new Date().toISOString(),
        ...paymentUpdates,
        ...additionalData
      };

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description: error.message
        });
        return;
      }

      await notifyStatusChange(newStatus);

      onStatusUpdate();
      toast({
        title: 'Order Updated',
        description: `Order ${formatOrderNumber(order.id)} is now ${newStatus}.`
      });
    } catch (error) {
      logger.error('Error updating order', { error, orderId: order.id, newStatus });
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update order status.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentConfirmation = (confirmed: boolean) => {
    if (confirmed) {
      updateOrderStatus('Payment Confirmed');
    } else {
      updateOrderStatus('Cancelled', { 
        cancellation_reason: 'Payment not confirmed' 
      });
    }
    setPaymentDialog(prev => ({ ...prev, isOpen: false }));
  };

  const handleOrderConfirmation = (accepted: boolean) => {
    if (accepted) {
      updateOrderStatus('Confirmed');
    } else {
      updateOrderStatus('Rejected', { 
        cancellation_reason: 'Order rejected by management' 
      });
    }
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  const handleCancellation = (reason: string) => {
    updateOrderStatus('Cancelled', { 
      cancellation_reason: reason || 'No reason provided' 
    });
    setCancelDialog(prev => ({ ...prev, isOpen: false }));
    setCancellationReason('');
  };

  const handlePrintInvoice = () => {
    const invoiceUrl = `/orders/${order.id}/invoice?print=1`;
    window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
  };

  const getAvailableActions = () => {
    const actions: Array<{
      label: string;
      icon: React.ReactNode;
      action: () => void;
      variant?: 'default' | 'destructive' | 'outline';
      disabled?: boolean;
    }> = [];

    // Always available actions
    actions.push({
      label: 'View Details',
      icon: <Eye className="h-4 w-4" />,
      action: () => window.open(`/orders/${order.id}`, '_blank'),
      variant: 'outline'
    });

    actions.push({
      label: 'Print Invoice',
      icon: <Printer className="h-4 w-4" />,
      action: handlePrintInvoice,
      variant: 'outline'
    });

    if (!hasPermission) {
      return actions;
    }

    // Status-specific actions
    switch (order.status) {
      case 'Awaiting Payment':
        actions.push({
          label: 'Confirm Payment',
          icon: <CreditCard className="h-4 w-4" />,
          action: () => setPaymentDialog(prev => ({ 
            ...prev, 
            isOpen: true,
            onConfirm: () => handlePaymentConfirmation(true),
            onReject: () => handlePaymentConfirmation(false),
            onClose: () => setPaymentDialog(prev => ({ ...prev, isOpen: false }))
          }))
        });
        break;

      case 'Pending':
      case 'Payment Confirmed':
        actions.push({
          label: 'Confirm Order',
          icon: <CheckCircle className="h-4 w-4" />,
          action: () => setConfirmDialog(prev => ({
            ...prev,
            isOpen: true,
            onAccept: () => handleOrderConfirmation(true),
            onReject: () => handleOrderConfirmation(false),
            onClose: () => setConfirmDialog(prev => ({ ...prev, isOpen: false }))
          }))
        });
        break;

      case 'Confirmed':
        actions.push({
          label: 'Start Processing',
          icon: <Package className="h-4 w-4" />,
          action: () => updateOrderStatus('Processing')
        });
        break;

      case 'Processing':
        if (order.type === 'Pickup') {
          actions.push({
            label: 'Ready for Pickup',
            icon: <Clock className="h-4 w-4" />,
            action: () => updateOrderStatus('Ready for Pickup')
          });
        } else {
          actions.push({
            label: 'Ready to Ship',
            icon: <Clock className="h-4 w-4" />,
            action: () => updateOrderStatus('Ready to Ship')
          });
        }
        break;

      case 'Ready to Ship':
        if (order.type !== 'Pickup') {
          actions.push({
            label: 'Mark as Shipped',
            icon: <Truck className="h-4 w-4" />,
            action: () => updateOrderStatus('Shipped')
          });
        }
        break;

      case 'Shipped':
        if (order.type !== 'Pickup') {
          actions.push({
            label: 'Mark as Delivered',
            icon: <CheckCircle className="h-4 w-4" />,
            action: () => updateOrderStatus('Delivered')
          });
        }
        break;

      case 'Ready for Pickup':
        actions.push({
          label: 'Mark as Completed',
          icon: <CheckCircle className="h-4 w-4" />,
          action: () => updateOrderStatus('Completed')
        });
        break;
    }

    // Cancellation option (except for completed/cancelled orders)
    if (!['Delivered', 'Cancelled', 'Rejected'].includes(order.status)) {
      actions.push({
        label: 'Cancel Order',
        icon: <Ban className="h-4 w-4" />,
        action: () => setCancelDialog(prev => ({
          ...prev,
          isOpen: true,
          onConfirm: handleCancellation,
          onClose: () => setCancelDialog(prev => ({ ...prev, isOpen: false }))
        })),
        variant: 'destructive'
      });
    }

    return actions;
  };

  const getBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case 'Awaiting Payment': return 'destructive';
      case 'Payment Confirmed': return 'default';
      case 'Confirmed': return 'default';
      case 'Processing': return 'default';
  case 'Ready for Pickup': return 'default';
      case 'Ready to Ship': return 'default';
      case 'Shipped': return 'secondary';
      case 'Delivered': return 'outline';
      case 'Cancelled': case 'Rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const actions = getAvailableActions();
  const manageActions = actions.filter(action => action.label !== 'View Details' && action.label !== 'Print Invoice');

  if (variant === 'buttons') {
    return (
      <>
        <div className="flex items-center gap-2 flex-wrap">
          {actions.slice(0, 3).map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'outline'}
              size="sm"
              onClick={action.action}
              disabled={action.disabled || isProcessing}
              className="gap-2"
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
          {actions.length > 3 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.slice(3).map((action, index) => (
                  <DropdownMenuItem
                    key={index + 3}
                    onClick={action.action}
                    disabled={action.disabled || isProcessing}
                    className="gap-2"
                  >
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {renderDialogs()}
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <div className="flex items-center gap-2">
          <Badge variant={getBadgeVariant(order.status)}>
            {order.status}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {actions.map((action, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={action.action}
                  disabled={action.disabled || isProcessing}
                  className="gap-2"
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {renderDialogs()}
      </>
    );
  }

  // Default dropdown variant
  return (
    <>
      <div className="flex items-center gap-2">
        {hasPermission && manageActions.length > 0 ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/orders/${order.id}`, '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {order.type === 'Pickup' ? 'Sales Actions' : 'Manager Actions'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handlePrintInvoice}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print Invoice
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {manageActions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={action.action}
                    disabled={action.disabled || isProcessing}
                    className="gap-2"
                  >
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/orders/${order.id}`, '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintInvoice}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Invoice
            </Button>
            {!hasPermission && (
              <div className="text-xs text-muted-foreground">
                {order.type === 'Pickup' ? 'Sales Required' : 'Manager Required'}
              </div>
            )}
          </div>
        )}
      </div>
      {renderDialogs()}
    </>
  );

  function renderDialogs() {
    return (
      <>
        {/* Payment Confirmation Dialog */}
        <Dialog open={paymentDialog.isOpen} onOpenChange={(open) => 
          !open && setPaymentDialog(prev => ({ ...prev, isOpen: false }))
        }>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Payment Confirmation</DialogTitle>
              <DialogDescription>
                Has the payment for order {formatOrderNumber(order.id)} been confirmed?
                <br />
                <strong>Amount: ₹{order.total.toFixed(2)}</strong>
                <br />
                <strong>Payment Method: {order.payment_method || 'Not specified'}</strong>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => handlePaymentConfirmation(false)}
                disabled={isProcessing}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Payment Not Received
              </Button>
              <Button 
                onClick={() => handlePaymentConfirmation(true)}
                disabled={isProcessing}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Payment Confirmed
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Order Confirmation Dialog */}
        <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => 
          !open && setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        }>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Order Confirmation</DialogTitle>
              <DialogDescription>
                Do you want to accept or reject order {formatOrderNumber(order.id)}?
                <br />
                <strong>Customer: {order.customer_name}</strong>
                <br />
                <strong>Total: ₹{order.total.toFixed(2)}</strong>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button 
                variant="destructive" 
                onClick={() => handleOrderConfirmation(false)}
                disabled={isProcessing}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Order
              </Button>
              <Button 
                onClick={() => handleOrderConfirmation(true)}
                disabled={isProcessing}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancellation Dialog */}
        <Dialog open={cancelDialog.isOpen} onOpenChange={(open) => {
          if (!open) {
            setCancelDialog(prev => ({ ...prev, isOpen: false }));
            setCancellationReason('');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel order {formatOrderNumber(order.id)}?
                Please provide a reason for cancellation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Cancellation Reason</Label>
                <Textarea
                  id="reason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setCancelDialog(prev => ({ ...prev, isOpen: false }));
                  setCancellationReason('');
                }}
              >
                Keep Order
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleCancellation(cancellationReason)}
                disabled={isProcessing}
              >
                <Ban className="h-4 w-4 mr-2" />
                Cancel Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
}