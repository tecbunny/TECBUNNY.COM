// Order workflow toolkit: seed data, admin ship flow, invoice math, print helpers, and customer visibility.
// All DOM touches are guarded for SSR safety.
// Note: This file contains logic for client-side calculations and print styling.
// Persistent order management should be done via Supabase services (e.g. src/lib/orders/).
// The in-memory store in versions prior to go-live has been removed to prevent state loss.

export interface Order {
  id: string;
  status: OrderStatus;
  items: OrderItem[];
  invoice: InvoiceData;
  customer: CustomerInfo;
}

// Admin modal helper: returns descriptors for rendering per-quantity serial inputs.
export function buildSerialInputDescriptors(order: Order) {
  return order.items.flatMap((item, itemIdx) =>
    Array.from({ length: item.quantity }).map((_, serialIdx) => ({
      key: `${order.id}-${itemIdx}-${serialIdx}`,
      label: `${item.name} #${serialIdx + 1}`,
      itemIndex: itemIdx,
      serialIndex: serialIdx,
    }))
  );
}

// Ship + persist serials, then generate invoice. Serial numbers are optional; pass blanks as needed.
export function shipAndGenerate(
  orderId: string,
  serialsByItem: Record<number, Record<number, string | undefined>>
): Order {
  const order = orders.find(o => o.id === orderId);
  if (!order) throw new Error('Order not found');

  order.items = order.items.map((item, itemIdx) => {
    const serials: string[] = [];
    for (let i = 0; i < item.quantity; i += 1) {
      const value = serialsByItem[itemIdx]?.[i];
      if (value && value.trim().length > 0) serials.push(value.trim());
    }
    return { ...item, serials };
  });

  order.status = 'Shipped';
  order.invoice = generateInvoice(order.id);
  return order;
}

// Invoice math: subtotal, 18% GST, grand total, persisted onto the order.
export function generateInvoice(orderId: string): InvoiceData {
  const order = orders.find(o => o.id === orderId);
  if (!order) throw new Error('Order not found');

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount = +(subtotal * 0.18).toFixed(2);
  const totalAmount = +(subtotal + taxAmount).toFixed(2);

  order.invoice = {
    invoiceId: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    taxAmount,
    totalAmount,
    generatedDate: new Date().toISOString(),
  };

  return order.invoice;
}

// Print helpers --------------------------------------------------------------

export const PRINT_CSS = `
@media print {
  body * { visibility: hidden; }
  #invoice-template, #invoice-template * { visibility: visible; }
  #invoice-template {
    position: absolute;
    inset: 0;
    background: #fff;
    color: #000;
    padding: 32px;
    font-family: 'Inter', Arial, sans-serif;
  }
  .invoice-letterhead { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .invoice-logo { height: 48px; }
  .invoice-title { font-size: 20px; font-weight: 700; letter-spacing: 1px; }
  .invoice-section { margin-bottom: 16px; }
  .invoice-table { width: 100%; border-collapse: collapse; }
  .invoice-table th, .invoice-table td { border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: left; }
  nav, aside, button, .btn, .sidebar { display: none !important; }
}
`;

export function injectPrintStyles(doc: Document | undefined = typeof document !== 'undefined' ? document : undefined) {
  if (!doc) return;
  if (doc.getElementById('invoice-print-css')) return;
  const style = doc.createElement('style');
  style.id = 'invoice-print-css';
  style.textContent = PRINT_CSS;
  doc.head.appendChild(style);
}

export function renderInvoiceTemplate(order: Order, doc: Document | undefined = typeof document !== 'undefined' ? document : undefined) {
  if (!doc) return;
  const tpl = doc.getElementById('invoice-template');
  if (!tpl) return;

  const customer = tpl.querySelector('.customer');
  const items = tpl.querySelector('.items');
  const totals = tpl.querySelector('.totals');

  if (customer) {
    customer.innerHTML = `
      <strong>${escapeHtml(order.customer.name)}</strong><br>
      ${escapeHtml(order.customer.address)}<br>
      ${escapeHtml(order.customer.phone)}
    `;
  }

  if (items) {
    items.innerHTML = order.items
      .map(item => {
        const serials = item.serials.length ? `<div><small>Serials: ${item.serials.map(escapeHtml).join(', ')}</small></div>` : '';
        return `
          <div class="invoice-item">
            <div><strong>${escapeHtml(item.name)}</strong> x ${item.quantity} @ ₹${item.price}</div>
            ${serials}
          </div>
        `;
      })
      .join('');
  }

  if (totals) {
    const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    totals.innerHTML = `
      <div>Subtotal: ₹${formatInr(subtotal)}</div>
      <div>GST (18%): ₹${formatInr(order.invoice.taxAmount)}</div>
      <div><strong>Total: ₹${formatInr(order.invoice.totalAmount)}</strong></div>
      <div>Invoice ID: ${order.invoice.invoiceId ?? 'Pending'}</div>
      <div>Date: ${order.invoice.generatedDate ? new Date(order.invoice.generatedDate).toLocaleString() : 'Pending'}</div>
    `;
  }
}

export function printInvoice(order: Order) {
  if (typeof document === 'undefined') return;
  injectPrintStyles(document);
  renderInvoiceTemplate(order, document);
  const tpl = document.getElementById('invoice-template');
  if (tpl) tpl.style.display = 'block';
  window.print();
  if (tpl) tpl.style.display = 'none';
}

// Customer portal helper: show download button only when shipped or delivered.
export function canDownloadInvoice(status: OrderStatus) {
  return status === 'Shipped' || status === 'Delivered';
}

// Utilities -----------------------------------------------------------------

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInr(amount: number) {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
