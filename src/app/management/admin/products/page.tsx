"use client";
import dynamic from 'next/dynamic';

const AdminProductCatalogPage = dynamic(() => import('./admin-products'), { ssr: false });

export default function Page() {
  return <AdminProductCatalogPage />;
}
