'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, FileDown, Loader2, ArrowRight } from 'lucide-react';
import { getApiUrl } from '../../../utils/api';

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id') as string;

  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchSuccessDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/bookings/my'), {
        headers: getAuthHeaders(),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      const found = result.data.bookings.find((b: any) => b.id === bookingId);
      if (!found) throw new Error('Confirmed booking not found.');
      setBooking(found);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment confirmed but failed to load invoice variables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchSuccessDetails();
    }
  }, [bookingId]);

  const handleDownloadInvoice = () => {
    if (!booking) return;
    window.open(getApiUrl(`/api/v1/invoices/download/${bookingId}`));
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center gap-4 text-center">
        <Loader2 size={36} className="animate-spin text-primary" />
        <span className="text-sm font-semibold text-secondary-text">
          Confirming payment transaction...
        </span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-surface border border-border-custom rounded-3xl p-8 text-center shadow-lg space-y-6 flex flex-col items-center">
      <div className="p-3.5 bg-green-500/10 border border-green-500/25 rounded-full text-green-500">
        <CheckCircle2 size={42} />
      </div>

      <div>
        <h1 className="text-2xl font-black text-primary-text">Payment Successful!</h1>
        <p className="text-xs text-body-text mt-1.5 leading-relaxed">
          Your reservation is confirmed. The venue host is notified of your transaction capture.
        </p>
      </div>

      {booking && (
        <div className="w-full bg-card-bg/60 border border-border-custom/30 rounded-2xl p-4 text-xs text-left space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-text">Booking reference</span>
            <span className="font-extrabold text-primary-text">#{booking.bookingNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-text">Amount paid</span>
            <span className="font-black text-primary">
              ₹{booking.totalAmount.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-text">Venue</span>
            <span className="font-bold text-primary-text truncate max-w-[200px]">
              {booking.venue?.title}
            </span>
          </div>
        </div>
      )}

      {errorMsg && <div className="text-xs text-red-500 font-semibold">{errorMsg}</div>}

      <div className="flex flex-col gap-2.5 w-full pt-2">
        <button
          onClick={handleDownloadInvoice}
          className="w-full bg-primary text-surface py-3 rounded-xl font-bold text-xs shadow-sm hover:bg-primary/95 transition flex justify-center items-center gap-1.5 cursor-pointer"
        >
          <FileDown size={14} /> Download PDF Invoice
        </button>

        <button
          onClick={() => (window.location.href = '/bookings')}
          className="w-full border border-border-custom hover:border-primary/50 text-secondary-text py-3 rounded-xl font-bold text-xs transition flex justify-center items-center gap-1 cursor-pointer"
        >
          Go to My Bookings <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen bg-background text-primary-text flex flex-col justify-center items-center px-4">
      <Suspense
        fallback={
          <div className="flex flex-col justify-center items-center gap-4 text-center">
            <Loader2 size={36} className="animate-spin text-primary" />
            <span className="text-sm font-semibold text-secondary-text">
              Loading secure gateway success logs...
            </span>
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </main>
  );
}
