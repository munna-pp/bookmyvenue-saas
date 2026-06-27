'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, ShieldAlert, AlertCircle, Eye, Loader2, RefreshCw, Wrench, FileText, CheckCircle2 } from 'lucide-react';
import { getApiUrl } from '../../utils/api';
import { Booking } from '@bookmyvenue/shared-types';

export default function AdminBookingsDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Override status states
  const [overridingBooking, setOverridingBooking] = useState<Booking | null>(null);
  const [targetStatus, setTargetStatus] = useState('PENDING');
  const [targetPaymentStatus, setTargetPaymentStatus] = useState('PENDING');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchAllBookings = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(getApiUrl('/api/v1/admin/bookings'), {
        headers: getAuthHeaders(),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Please log in as an administrator.');
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to retrieve system bookings.');
      }

      setBookings(result.data.bookings || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect to the admin database services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBookings();
  }, []);

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overridingBooking) return;
    setOverrideLoading(true);

    try {
      const res = await fetch(getApiUrl(`/api/v1/admin/bookings/${overridingBooking.id}/override`), {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingStatus: targetStatus,
          paymentStatus: targetPaymentStatus,
          notes: overrideNotes || 'Admin override for dispute resolution.',
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      setOverridingBooking(null);
      setOverrideNotes('');
      fetchAllBookings();
    } catch (err: any) {
      alert(`Override failed: ${err.message}`);
    } finally {
      setOverrideLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 border border-amber-200 text-amber-700';
      case 'OWNER_APPROVED':
      case 'CONFIRMED':
      case 'PAID':
        return 'bg-green-50 border border-green-200 text-green-700';
      case 'OWNER_REJECTED':
      case 'CANCELLED':
        return 'bg-red-50 border border-red-200 text-red-700';
      default:
        return 'bg-gray-50 border border-gray-200 text-gray-700';
    }
  };

  return (
    <main className="min-h-screen bg-background text-primary-text flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-border-custom bg-surface py-4 px-6 md:px-12 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">BMV Admin</span>
          <span className="bg-info/10 text-info text-[10px] px-2 py-0.5 rounded-full font-bold">Control</span>
        </div>
        <nav className="flex items-center gap-4">
          <a href="/admin/venues" className="text-xs text-secondary-text hover:text-primary transition font-medium">Venues Queue</a>
          <a href="/admin/bookings" className="text-primary transition font-bold text-xs">Bookings Queue</a>
          <button
            onClick={fetchAllBookings}
            className="p-2 border border-border-custom/50 hover:border-primary/50 text-secondary-text hover:text-primary rounded-xl transition cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </nav>
      </header>

      {/* Main Container */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-10 flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-extrabold text-primary-text tracking-tight">System Bookings Audit Queue</h1>
          <p className="text-sm text-body-text">Monitor all system reservations, override status states, and resolve host-client dispute cases.</p>
        </div>

        {/* Bookings Queue List Table */}
        <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
          {errorMsg && (
            <div className="p-4 m-6 bg-red-50 border-l-4 border-red-500 rounded-xl text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="p-20 flex flex-col justify-center items-center gap-4 text-center">
              <Loader2 size={36} className="animate-spin text-primary" />
              <span className="text-xs font-bold text-secondary-text uppercase tracking-wide">Syncing Queue...</span>
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-3">
              <span className="text-4xl">📋</span>
              <h2 className="text-base font-bold text-primary-text">No Bookings Registered</h2>
              <p className="text-xs text-body-text max-w-sm">No venue reservations or booking records exist in system memory.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-custom/30 bg-card-bg text-secondary-text font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Booking number</th>
                    <th className="px-6 py-4">Client details</th>
                    <th className="px-6 py-4">Venue parameters</th>
                    <th className="px-6 py-4">Event Date</th>
                    <th className="px-6 py-4">Total Amount</th>
                    <th className="px-6 py-4">Booking status</th>
                    <th className="px-6 py-4">Payment status</th>
                    <th className="px-6 py-4 text-right">Dispute Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    const c = (booking as any).customer;
                    const o = (booking as any).owner;
                    const v = (booking as any).venue;
                    
                    return (
                      <tr key={booking.id} className="border-b border-border-custom/10 hover:bg-card-bg/25 transition duration-150">
                        <td className="px-6 py-4 font-extrabold text-primary">#{booking.bookingNumber}</td>
                        <td className="px-6 py-4">
                          <span className="font-extrabold text-primary-text block">{c?.name || 'Seeded client'}</span>
                          <span className="text-[10px] text-body-text block">{c?.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-extrabold text-primary-text block">{v?.title || 'Seeded venue'}</span>
                          <span className="text-[10px] text-body-text block">{v?.address.city}, {v?.address.state}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-extrabold text-primary-text block">{new Date(booking.eventDate).toLocaleDateString()}</span>
                          <span className="text-[10px] text-body-text block">{booking.startTime} - {booking.endTime}</span>
                        </td>
                        <td className="px-6 py-4 font-black text-primary-text">₹{booking.totalAmount.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeClass(booking.bookingStatus)}`}>
                            {booking.bookingStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            booking.paymentStatus === 'PAID' ? 'bg-green-50 border border-green-200 text-green-700' :
                            booking.paymentStatus === 'PENDING' ? 'bg-amber-50 border border-amber-200 text-amber-700' :
                            'bg-red-50 border border-red-200 text-red-700'
                          }`}>
                            {booking.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setOverridingBooking(booking);
                              setTargetStatus(booking.bookingStatus);
                              setTargetPaymentStatus(booking.paymentStatus);
                            }}
                            className="bg-primary hover:bg-primary/95 text-surface px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-xs cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <Wrench size={10} /> Override Status
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Admin Override Overlay Modal */}
      {overridingBooking && (
        <div className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-custom w-full max-w-md rounded-3xl p-6 md:p-8 shadow-lg flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-bold text-primary-text flex items-center gap-1.5"><Wrench className="text-primary" /> Override Dispute Status</h3>
              <p className="text-xs text-body-text mt-1">Force system state transition updates for booking #{(overridingBooking as any).bookingNumber}. These overrides bypass the standard state machine checks.</p>
            </div>

            <form onSubmit={handleOverrideSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold text-secondary-text uppercase mb-1" htmlFor="bookingStatus">Booking Status State</label>
                <select
                  id="bookingStatus"
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary font-bold text-primary-text"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="OWNER_APPROVED">OWNER_APPROVED</option>
                  <option value="OWNER_REJECTED">OWNER_REJECTED</option>
                  <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
                  <option value="PAID">PAID</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-secondary-text uppercase mb-1" htmlFor="paymentStatus">Payment Status State</label>
                <select
                  id="paymentStatus"
                  value={targetPaymentStatus}
                  onChange={(e) => setTargetPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary font-bold text-primary-text"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PAID">PAID</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-secondary-text uppercase mb-1" htmlFor="notes">Dispute / Audit Log Notes</label>
                <textarea
                  id="notes"
                  required
                  rows={3}
                  placeholder="e.g. Host-client conflict resolved via offline dispute arbitration..."
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  className="w-full px-3 py-2.5 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOverridingBooking(null);
                    setOverrideNotes('');
                  }}
                  className="px-5 py-2.5 border border-border-custom/50 hover:border-primary/50 text-secondary-text rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Cancel Override
                </button>
                <button
                  type="submit"
                  disabled={overrideLoading}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-surface rounded-xl font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
                >
                  {overrideLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Override State'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border-custom bg-surface py-6 px-6 md:px-12 text-center text-xs text-muted-text">
        <p>© 2026 BookMyVenue Admin Dispute Panel.</p>
      </footer>
    </main>
  );
}
