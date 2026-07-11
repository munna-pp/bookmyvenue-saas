'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';

function FailedContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id') as string;
  const reason = searchParams.get('reason') as string;

  return (
    <div className="w-full max-w-md bg-surface border border-border-custom rounded-3xl p-8 text-center shadow-lg space-y-6 flex flex-col items-center">
      <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-full text-red-500">
        <AlertCircle size={42} />
      </div>

      <div>
        <h1 className="text-2xl font-black text-primary-text">Payment Checkout Failed</h1>
        <p className="text-xs text-body-text mt-1.5 leading-relaxed">
          {reason
            ? decodeURIComponent(reason)
            : 'The transaction was rejected by your bank or the gateway request timed out.'}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 w-full pt-2">
        {bookingId && (
          <button
            onClick={() => (window.location.href = `/checkout/${bookingId}`)}
            className="w-full bg-primary text-surface py-3 rounded-xl font-bold text-xs shadow-sm hover:bg-primary/95 transition flex justify-center items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={12} /> Retry Secure Payment
          </button>
        )}

        <button
          onClick={() => (window.location.href = '/bookings')}
          className="w-full border border-border-custom hover:border-primary/50 text-secondary-text py-3 rounded-xl font-bold text-xs transition flex justify-center items-center gap-1 cursor-pointer"
        >
          <ArrowLeft size={12} className="mr-1" /> Back to My Bookings
        </button>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <main className="min-h-screen bg-background text-primary-text flex flex-col justify-center items-center px-4">
      <Suspense
        fallback={
          <div className="flex flex-col justify-center items-center gap-4 text-center">
            <Loader2 size={36} className="animate-spin text-primary" />
            <span className="text-sm font-semibold text-secondary-text">
              Loading failed gateway logs...
            </span>
          </div>
        }
      >
        <FailedContent />
      </Suspense>
    </main>
  );
}
