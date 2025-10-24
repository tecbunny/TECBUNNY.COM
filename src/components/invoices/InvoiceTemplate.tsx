
'use client';

import * as React from 'react';

import { Printer } from 'lucide-react';

import type { Order } from '../../lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Separator } from '../../components/ui/separator';
import { Button } from '../../components/ui/button';
import { Logo } from '../../components/ui/logo';
import { formatOrderNumber } from '../../lib/order-utils';

export interface CompanySettings {
    name: string;
    logoUrl?: string;
    address: string;
    gstin?: string;
    pan?: string;
    tan?: string;
    cin?: string;
    supportEmail?: string;
    supportPhone?: string;
}

interface InvoiceTemplateProps {
    order: Order;
    settings: CompanySettings;
    autoPrint?: boolean;
}

export function InvoiceTemplate({ order, settings, autoPrint }: InvoiceTemplateProps) {
    const invoiceRef = React.useRef<HTMLDivElement>(null);
    const hasAutoPrintedRef = React.useRef(false);
    type CompanyInfoJson = {
        companyName?: string;
        registeredAddress?: string;
        gstin?: string;
        pan?: string;
        tan?: string;
        cin?: string;
        logoUrl?: string;
        supportEmail?: string;
        supportPhone?: string;
    };
    const [companyInfo, setCompanyInfo] = React.useState<CompanyInfoJson | null>(null);

    React.useEffect(() => {
        fetch('/company-info.json')
          .then(r => r.ok ? r.json() : null)
          .then((data) => data && setCompanyInfo(data))
          .catch(() => {});
    }, []);

    const merged: CompanySettings = {
        name: companyInfo?.companyName || settings.name,
        address: companyInfo?.registeredAddress || settings.address,
        gstin: companyInfo?.gstin || settings.gstin,
        pan: companyInfo?.pan,
        tan: companyInfo?.tan,
        cin: companyInfo?.cin,
        logoUrl: companyInfo?.logoUrl || settings.logoUrl,
        supportEmail: companyInfo?.supportEmail || settings.supportEmail,
        supportPhone: companyInfo?.supportPhone || settings.supportPhone,
    };

    const handlePrint = () => {
        const printContent = invoiceRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '', 'height=800,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Print Invoice</title>');
            printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            printWindow.document.write('<style> body { -webkit-print-color-adjust: exact; font-family: sans-serif; } @page { size: A4; margin: 0; } </style>');
            printWindow.document.write('</head><body class="p-8">');
            printWindow.document.write(printContent.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    React.useEffect(() => {
        if (!autoPrint || hasAutoPrintedRef.current) {
            return;
        }

        hasAutoPrintedRef.current = true;
        const timer = window.setTimeout(() => {
            handlePrint();
        }, 300);

        return () => window.clearTimeout(timer);
    }, [autoPrint]);

    return (
        <div className="space-y-4 px-3 sm:px-0">
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
                 <Button variant="outline" onClick={handlePrint} className="w-full sm:w-auto">
                    <Printer className="mr-2 h-4 w-4" /> Print Invoice
                </Button>
            </div>
            <div ref={invoiceRef}>
                <Card className="mx-auto w-full max-w-4xl border-2 border-primary/20 font-sans shadow-lg">
                    <CardHeader className="p-6 sm:p-8">
                        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                            <div className="flex items-center gap-4">
                                <Logo className="h-14 w-14 text-primary sm:h-16 sm:w-16" />
                                <div className="space-y-1">
                                    <h1 className="text-2xl font-bold text-primary sm:text-3xl">{merged.name}</h1>
                                    <p className="text-sm text-gray-500 sm:text-base">{merged.address}</p>
                                    {merged.gstin && (<p className="text-sm text-gray-500">GSTIN: {merged.gstin}</p>)}
                                    {merged.pan && (<p className="text-sm text-gray-500">PAN: {merged.pan}</p>)}
                                    {merged.tan && (<p className="text-sm text-gray-500">TAN: {merged.tan}</p>)}
                                    {merged.cin && (<p className="text-sm text-gray-500">CIN: {merged.cin}</p>)}
                                </div>
                            </div>
                            <div className="text-left md:text-right">
                                <h2 className="text-xl font-semibold uppercase tracking-widest text-primary sm:text-2xl">Invoice</h2>
                                <p className="text-sm text-gray-500 sm:text-base">#{formatOrderNumber(order.id)}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <Separator />
                    <CardContent className="p-6 sm:p-8">
                        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                             <div>
                                <h3 className="mb-2 font-semibold text-primary">Bill To</h3>
                                <p className="font-medium">{order.customer_name}</p>
                            </div>
                            <div className="text-left sm:text-right">
                                <h3 className="mb-2 font-semibold text-primary">Invoice Date</h3>
                                <p>{order.created_at}</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                        <Table className="min-w-[720px]">
                            <TableHeader>
                                <TableRow className="bg-primary/10 hover:bg-primary/10">
                                    <TableHead className="w-[40%] text-primary">Item Description</TableHead>
                                    <TableHead className="text-center text-primary">HSN/SAC</TableHead>
                                    <TableHead className="text-center text-primary">Qty</TableHead>
                                    <TableHead className="text-right text-primary">Rate</TableHead>
                                    <TableHead className="text-right text-primary">Taxable Value</TableHead>
                                    <TableHead className="text-right text-primary">GST</TableHead>
                                    <TableHead className="text-right text-primary">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {order.items.map(item => {
                                    const gstRate = item.gstRate || 0;
                                    const basePrice = item.price / (1 + (gstRate / 100));
                                    const taxableValue = basePrice * item.quantity;
                                    return (
                                        <React.Fragment key={item.productId}>
                                            <TableRow>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell className="text-center">{item.hsnCode || 'N/A'}</TableCell>
                                                <TableCell className="text-center">{item.quantity}</TableCell>
                                                <TableCell className="text-right">₹{basePrice.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">₹{taxableValue.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">{gstRate}%</TableCell>
                                                <TableCell className="text-right font-medium">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                                            </TableRow>
                                            {item.serialNumbers && item.serialNumbers.length > 0 && (
                                                <TableRow className="bg-muted/50">
                                                    <TableCell colSpan={7} className="py-1 px-6 text-xs text-muted-foreground">
                                                        Serial Numbers: {item.serialNumbers.join(', ')}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    )
                                })}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                     <Separator />
                    <CardFooter className="p-6 sm:p-8">
                        <div className="flex w-full justify-end">
                            <div className="w-full max-w-sm space-y-4 text-sm sm:text-base">
                               <div className="flex justify-between">
                                    <span>Taxable Amount</span>
                                    <span>₹{order.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>CGST (9%)</span>
                                    <span>₹{(order.gst_amount / 2).toFixed(2)}</span>
                                </div>
                                 <div className="flex justify-between">
                                    <span>SGST (9%)</span>
                                    <span>₹{(order.gst_amount / 2).toFixed(2)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between text-lg font-bold text-primary sm:text-xl">
                                    <span>Grand Total</span>
                                    <span>₹{order.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}