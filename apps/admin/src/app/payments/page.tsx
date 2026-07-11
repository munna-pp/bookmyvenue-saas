'use client';

import React, { useState, useEffect } from 'react';
import {
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  Calendar,
  ShieldCheck,
  CornerUpLeft,
} from 'lucide-react';
import { getApiUrl } from '../../utils/api';
import { Payment } from '@bookmyvenue/shared-types';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchAllPayments = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(getApiUrl('/api/v1/admin/payments'), {
        headers: getAuthHeaders(),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Administrator session expired.');
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to retrieve payment records.');
      }

      setPayments(result.data.payments || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sync payments queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPayments();
  }, []);

  const handleRefund = async (id: string) => {
    if (
      !window.confirm(
        'Are you sure you want to trigger a full refund for this captured transaction? This will transition the booking status to REFUNDED and deduct host earnings.'
      )
    )
      return;
    try {
      const res = await fetch(getApiUrl(`/api/v1/payments/${id}/refund`), {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      alert('Refund processed successfully.');
      fetchAllPayments();
    } catch (err: any) {
      alert(`Refund failed: ${err.message}`);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'FAILED':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'REFUNDED':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  return (
    <main className="min-h-screen bg-background text-primary-text flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-border-custom bg-surface py-4 px-6 md:px-12 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">BMV Admin</span>
          <span className="bg-info/10 text-info text-[10px] px-2 py-0.5 rounded-full font-bold">
            Control
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <a
            href="/admin/venues"
            className="text-xs text-secondary-text hover:text-primary transition font-medium"
          >
            Venues Queue
          </a>
          <a
            href="/admin/bookings"
            className="text-xs text-secondary-text hover:text-primary transition font-medium"
          >
            Bookings Queue
          </a>
          <a href="/admin/payments" className="text-primary transition font-bold text-xs">
            Payments
          </a>
          <button
            onClick={fetchAllPayments}
            className="p-2 border border-border-custom/50 hover:border-primary/50 text-secondary-text hover:text-primary rounded-xl transition cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </nav>
      </header>

      {/* Main Container */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-10 flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-extrabold text-primary-text tracking-tight">
            System Payments & Refunds Dashboard
          </h1>
          <p className="text-sm text-body-text">
            Audit captured transactions, verify gateway identifiers, and execute refund overrides.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-xs text-red-700 font-semibold">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="p-20 flex flex-col justify-center items-center gap-4 text-center">
            <Loader2 size={36} className="animate-spin text-primary" />
            <span className="text-xs font-bold text-secondary-text uppercase tracking-wide">
              Syncing Payments Queue...
            </span>
          </div>
        ) : (
          <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
            {payments.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center gap-3">
                <span className="text-4xl">💳</span>
                <h3 className="font-bold text-sm text-primary-text">No Transactions Logged</h3>
                <p className="text-xs text-body-text max-w-sm">
                  Payments processed through Razorpay will be registered in this audit list.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-custom/30 bg-card-bg text-secondary-text font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Transaction Details</th>
                      <th className="px-6 py-4">Booking Ref</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Host Venue</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Dispute Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const c = (p as any).customer;
                      const o = (p as any).owner;
                      const b = (p as any).booking;

                      return (
                        <tr
                          key={p.id}
                          className="border-b border-border-custom/10 hover:bg-card-bg/25 transition"
                        >
                          <td className="px-6 py-4">
                            <span className="font-extrabold text-primary-text block">
                              {p.providerOrderId}
                            </span>
                            <span className="text-[10px] text-muted-text block mt-0.5">
                              PayID: {p.providerPaymentId || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-secondary-text">
                            #{b?.bookingNumber || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-extrabold text-primary-text block">
                              {c?.name || 'Jane Customer'}
                            </span>
                            <span className="text-[10px] text-body-text block">{c?.email}</span>
                          </td>
                          <td className="px-6 py-4 font-medium text-body-text">
                            {b?.venue?.title || 'Unknown Venue'}
                          </td>
                          <td className="px-6 py-4 font-black text-primary-text">
                            ₹{p.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeClass(p.status)}`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {p.status === 'SUCCESS' && (
                              <button
                                onClick={() => handleRefund(p.id)}
                                className="bg-red-500 hover:bg-red-600 text-surface px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-xs cursor-pointer flex items-center gap-1 ml-auto"
                              >
                                <CornerUpLeft size={10} /> Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border-custom bg-surface py-6 px-6 md:px-12 text-center text-xs text-muted-text">
        <p>© 2026 BookMyVenue Admin Dispute Panel.</p>
      </footer>
    </main>
  );
}
