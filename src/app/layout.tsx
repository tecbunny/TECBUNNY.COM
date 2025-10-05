import type {Metadata, Viewport} from 'next';
import { Inter, Poppins } from 'next/font/google';

import './globals.css';
import {Header} from '../components/layout/Header';
import {Footer} from '../components/layout/Footer';
import {AppProvider} from '../context/AppProvider';
import {OrderProvider} from '../context/OrderProvider';
import {Toaster} from '../components/ui/toaster';
import {ThemeProvider} from '../components/providers/ThemeProvider';
import {DynamicFavicon, DynamicTitle} from '../components/ui/dynamic-head';
import {AuthStateManager} from '../components/auth/AuthStateManager';

export const metadata: Metadata = {
  title: 'TecBunny - Your Tech Store',
  description: 'Discover the latest technology with beautiful design and exceptional user experience.',
  keywords: 'technology, electronics, gadgets, online store',
  authors: [{ name: 'TecBunny Team' }],
  icons: {
    icon: [
      {
        url: '/brand.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/brand.png',
        sizes: '16x16',
        type: 'image/png',
      },
    ],
    shortcut: '/brand.png',
    apple: [
      {
        url: '/brand.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-headline',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} font-body antialiased`}>
        <ThemeProvider>
          <AppProvider>
            <OrderProvider>
              <AuthStateManager />
              <DynamicFavicon />
              <DynamicTitle />
              <div className="flex min-h-screen flex-col bg-background text-foreground">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <Toaster />
            </OrderProvider>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}