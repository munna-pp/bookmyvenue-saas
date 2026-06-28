'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Calendar, Clock, Users, Loader2, AlertCircle, Trash2, ShieldCheck, HelpCircle, Check, Info, FileText } from 'lucide-react';
import { getApiUrl } from '../../utils/api';
import { Booking } from '@bookmyvenue/shared-types';

const NotificationBell = dynamic(() => import('../../components/NotificationBell'), { ssr: false });

export default function CustomerBookingsHistory() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected booking for timeline detail panel
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Cancellation state
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchMyBookings = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(getApiUrl('/api/v1/bookings/my'), {
        headers: getAuthHeaders(),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Please log in to view your bookings.');
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to retrieve your bookings');
      }

      const list = result.data.bookings || [];
      setBookings(list);
      if (list.length > 0) {
        setSelectedBooking(list[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong while retrieving bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const handleCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingId) return;
    setCancelLoading(true);

    try {
      const res = await fetch(getApiUrl(`/api/v1/bookings/${cancellingId}/cancel`), {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancellationReason: cancelReason }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Cancellation request failed');
      }

      setCancellingId(null);
      setCancelReason('');
      fetchMyBookings();
    } catch (err: any) {
      alert(`Error cancelling booking: ${err.message}`);
    } finally {
      setCancelLoading(false);
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
        <a href="/venues" className="text-2xl font-black text-primary tracking-tight">BookMyVenue</a>
        <nav className="flex items-center gap-6">
          <a href="/venues" className="text-secondary-text hover:text-primary transition font-semibold text-xs">Browse Venues</a>
          <a href="/bookings" className="text-primary transition font-bold text-xs">My Bookings</a>
          <NotificationBell />
        </nav>
      </header>

      {/* Main Container */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-10 flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-extrabold text-primary-text tracking-tight">My Booking Queries</h1>
          <p className="text-sm text-body-text">Track your reservation queries, invoice breakdown snapshots, and host reviews.</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-2xl text-xs text-red-700 font-semibold">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="p-20 flex flex-col justify-center items-center gap-4 text-center">
            <Loader2 size={36} className="animate-spin text-primary" />
            <span className="text-xs font-bold text-secondary-text uppercase tracking-wide">Syncing History...</span>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center gap-4 bg-surface border border-border-custom rounded-3xl">
            <span className="text-5xl">📅</span>
            <h2 className="text-base font-bold text-primary-text">No Reservations Found</h2>
            <p className="text-xs text-body-text max-w-md">You haven't requested any venue bookings yet. Explore our luxury wedding halls and party spaces to get started.</p>
            <button
              onClick={() => window.location.href = '/venues'}
              className="bg-primary text-surface px-6 py-3 rounded-full text-xs font-bold shadow-xs hover:bg-primary/95 transition cursor-pointer"
            >
              Browse Venues
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Bookings List */}
            <div className="lg:col-span-2 space-y-4">
              {bookings.map((booking) => {
                const isSelected = selectedBooking?.id === booking.id;
                const v = (booking as any).venue;
                return (
                  <div
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking)}
                    className={`bg-surface border ${isSelected ? 'border-primary shadow-xs' : 'border-border-custom hover:border-primary/50'} rounded-3xl p-5 md:p-6 transition cursor-pointer flex flex-col md:flex-row gap-5 justify-between items-start md:items-center`}
                  >
                    <div className="flex gap-4 items-start">
                      <div className="h-14 w-20 bg-border-custom/20 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={v?.featuredImage || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=150&q=80'}
                          alt="Venue"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-primary block uppercase tracking-wide">#{booking.bookingNumber}</span>
                        <h3 className="font-extrabold text-sm text-primary-text mt-0.5">{v?.title || 'Unknown Venue'}</h3>
                        <p className="text-[10px] text-body-text flex items-center gap-1 mt-1">
                          <Calendar size={12} className="text-muted-text" />
                          <span>{new Date(booking.eventDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                          <Clock size={12} className="text-muted-text ml-2" />
                          <span>{booking.startTime} - {booking.endTime}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col justify-between w-full md:w-auto items-center md:items-end gap-3 pt-3 md:pt-0 border-t border-border-custom/10 md:border-none">
                      <div>
                        <span className="text-[10px] text-muted-text block text-left md:text-right">Total Invoice</span>
                        <span className="font-black text-sm text-primary-text">₹{booking.totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeClass(booking.bookingStatus)}`}>
                          {booking.bookingStatus.replace('_', ' ')}
                        </span>
                        
                        {/* Cancellation trigger */}
                        {['PENDING', 'OWNER_APPROVED', 'PAYMENT_PENDING'].includes(booking.bookingStatus) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancellingId(booking.id);
                            }}
                            className="bg-red-500/10 hover:bg-red-500 hover:text-surface text-red-500 border border-red-500/25 p-1 rounded-lg transition cursor-pointer"
                            title="Cancel Booking"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Panel: Detail view & Timeline */}
            <div className="sticky top-6 flex flex-col gap-6">
              {selectedBooking && (
                <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 shadow-xs space-y-6 flex flex-col">
                  
                  {/* Title & Status */}
                  <div className="border-b border-border-custom/25 pb-4">
                    <span className="text-[10px] font-bold text-muted-text tracking-widest block uppercase">Selected Booking Details</span>
                    <h3 className="font-black text-base text-primary-text mt-1">#{(selectedBooking as any).bookingNumber}</h3>
                    <p className="text-xs text-body-text font-bold mt-1">{(selectedBooking as any).venue?.title}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClass(selectedBooking.bookingStatus)}`}>
                        {selectedBooking.bookingStatus.replace('_', ' ')}
                      </span>
                      
                      {selectedBooking.bookingStatus === 'OWNER_APPROVED' && (
                        <button
                          onClick={() => window.location.href = `/checkout/${selectedBooking.id}`}
                          className="bg-primary hover:bg-primary/95 text-surface text-[10px] font-bold px-4 py-1.5 rounded-full transition shadow-xs cursor-pointer"
                        >
                          💳 Pay Securely
                        </button>
                      )}

                      {['CONFIRMED', 'COMPLETED', 'PAID'].includes(selectedBooking.bookingStatus) && (
                        <button
                          onClick={() => window.open(getApiUrl(`/api/v1/invoices/download/${selectedBooking.id}`))}
                          className="bg-info hover:bg-info/90 text-surface text-[10px] font-bold px-4 py-1.5 rounded-full transition shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          📄 Invoice PDF
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary Parameter Table */}
                  <div className="space-y-3.5 text-xs text-body-text">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-secondary-text flex items-center gap-1.5"><Calendar size={14} /> Date</span>
                      <span className="font-extrabold text-primary-text">{new Date(selectedBooking.eventDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-secondary-text flex items-center gap-1.5"><Clock size={14} /> Duration</span>
                      <span className="font-extrabold text-primary-text">{selectedBooking.startTime} to {selectedBooking.endTime}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-secondary-text flex items-center gap-1.5"><Users size={14} /> Guests Count</span>
                      <span className="font-extrabold text-primary-text">{selectedBooking.guestCount} people</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-border-custom/10">
                      <span className="font-semibold text-secondary-text flex items-center gap-1.5"><FileText size={14} /> Event Scope</span>
                      <span className="font-extrabold text-primary-text capitalize">{selectedBooking.eventType}</span>
                    </div>

                    {/* Invoice detail */}
                    <div className="pt-2 space-y-2">
                      <div className="flex justify-between text-[11px]">
                        <span>Venue Rental (Snapshot)</span>
                        <span className="font-bold text-primary-text">₹{selectedBooking.pricingSnapshot.pricePerDay.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Taxes (18% GST)</span>
                        <span className="font-bold text-primary-text">₹{selectedBooking.taxes.toLocaleString('en-IN')}</span>
                      </div>
                      {selectedBooking.pricingSnapshot.cleaningFee && selectedBooking.pricingSnapshot.cleaningFee > 0 && (
                        <div className="flex justify-between text-[11px]">
                          <span>Cleaning Fee</span>
                          <span className="font-bold text-primary-text">₹{selectedBooking.pricingSnapshot.cleaningFee.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {selectedBooking.pricingSnapshot.securityDeposit && selectedBooking.pricingSnapshot.securityDeposit > 0 && (
                        <div className="flex justify-between text-[11px] pb-2 border-b border-border-custom/5">
                          <span>Security Deposit (Refundable)</span>
                          <span className="font-bold text-primary-text">₹{selectedBooking.pricingSnapshot.securityDeposit.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-black text-primary pt-1">
                        <span>Total amount</span>
                        <span>₹{selectedBooking.totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Timeline step-indicators */}
                  <div className="pt-4 border-t border-border-custom/25 space-y-4">
                    <h4 className="text-xs font-bold text-primary-text flex items-center gap-1.5">📊 Status Activity Log</h4>
                    <div className="relative pl-6 border-l border-border-custom/50 ml-2 space-y-4 pt-1">
                      {selectedBooking.statusHistory.map((hist, idx) => (
                        <div key={idx} className="relative">
                          {/* Timeline dot */}
                          <span className="absolute -left-[30px] top-0.5 bg-primary border-2 border-surface h-3.5 w-3.5 rounded-full flex items-center justify-center">
                            <span className="bg-surface h-1 w-1 rounded-full"></span>
                          </span>
                          <div>
                            <span className="text-[10px] font-black text-primary-text uppercase tracking-wider">{hist.status.replace('_', ' ')}</span>
                            <span className="block text-[8px] text-muted-text mt-0.5">{new Date(hist.updatedAt).toLocaleString()}</span>
                            {hist.notes && <p className="text-[10px] text-body-text mt-1 bg-card-bg p-2 rounded-xl border border-border-custom/25 leading-relaxed">{hist.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        )}
      </section>

      {/* Cancellation Dialog Overlay Modal */}
      {cancellingId && (
        <div className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-custom w-full max-w-md rounded-3xl p-6 md:p-8 shadow-lg flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-bold text-primary-text">Cancel Reservation Query</h3>
              <p className="text-xs text-body-text mt-1">Please provide a reason to notify the host. Cancellation policies are subject to venue guidelines.</p>
            </div>
            
            <form onSubmit={handleCancelBooking} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold text-secondary-text uppercase mb-1" htmlFor="reason">Reason for cancellation</label>
                <textarea
                  id="reason"
                  required
                  rows={3}
                  placeholder="e.g. Schedule conflicts, change in plans, found alternative..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCancellingId(null);
                    setCancelReason('');
                  }}
                  className="px-5 py-2.5 border border-border-custom/50 hover:border-primary/50 text-secondary-text rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-surface rounded-xl font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
                >
                  {cancelLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Booking'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border-custom bg-surface py-6 px-6 md:px-12 text-center text-xs text-muted-text">
        <p>© 2026 BookMyVenue. All rights reserved.</p>
      </footer>
    </main>
  );
}
