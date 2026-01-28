"use client";

import React from 'react';

import { orders, buildSerialInputDescriptors, shipAndGenerate, printInvoice, canDownloadInvoice, type Order } from '@/lib/order-workflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { injectPrintStyles } from '@/lib/order-workflow';

interface OrderShipModalProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderUpdated?: (order: Order) => void;
}

// Minimal admin modal to capture serials per quantity and ship the order.
export function OrderShipModal({ orderId, open, onOpenChange, onOrderUpdated }: OrderShipModalProps) {
  const order = orders.find(o => o.id === orderId) || null;
  const serialsRef = React.useRef<Record<number, Record<number, string>>>({});
  const [submitting, setSubmitting] = React.useState(false);

  const descriptors = order ? buildSerialInputDescriptors(order) : [];

  const handleChange = (itemIdx: number, serialIdx: number, value: string) => {
    if (!serialsRef.current[itemIdx]) serialsRef.current[itemIdx] = {};
    serialsRef.current[itemIdx][serialIdx] = value;
  };

  const handleShip = () => {
    if (!orderId) return;
    injectPrintStyles(typeof document !== 'undefined' ? document : undefined);
    try {
      setSubmitting(true);
      const updated = shipAndGenerate(orderId, serialsRef.current);
      onOrderUpdated?.(updated);
      onOpenChange(false);
    } catch (err) {
      console.error('Ship failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Order {order.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Serial numbers are optional but recommended for warranty tracking.</p>
          <div className="space-y-3 max-h-[320px] overflow-auto pr-1">
            {descriptors.map(desc => (
              <div key={desc.key} className="space-y-1">
                <div className="text-sm font-medium text-slate-800">{desc.label}</div>
                <Input
                  placeholder="Enter serial (optional)"
                  onChange={(e) => handleChange(desc.itemIndex, desc.serialIndex, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleShip} disabled={submitting}>
              {submitting ? 'Processing…' : 'Ship & Generate'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Customer-facing invoice download button helper
export function DownloadInvoiceButton({ order }: { order: Order }) {
  if (!canDownloadInvoice(order.status)) return null;
  return (
    <Button variant="outline" size="sm" onClick={() => printInvoice(order)}>
      Download Invoice
    </Button>
  );
}

// Hidden print template (to include once near the app root or page root)
export function InvoiceTemplateContainer() {
  return (
    <div id="invoice-template" style={{ display: 'none' }}>
      <div className="invoice-letterhead">
        <img src="/logo.png" alt="Company Logo" className="invoice-logo" />
        <div className="invoice-title">TAX INVOICE</div>
      </div>
      <div className="invoice-section customer"></div>
      <div className="invoice-section items"></div>
      <div className="invoice-section totals"></div>
    </div>
  );
}
