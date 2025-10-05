'use client';

import { Suspense } from 'react';

import EmailVerificationContent from './EmailVerificationContent';

// Force dynamic rendering for auth page
export const dynamic = 'force-dynamic';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading verification page...</p>
        </div>
      </div>
    }>
      <EmailVerificationContent />
    </Suspense>
  );
}
