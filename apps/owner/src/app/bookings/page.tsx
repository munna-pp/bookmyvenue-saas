'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Check,
  X,
  ShieldAlert,
  AlertCircle,
  FileText,
  Info,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import { getApiUrl } from '../../utils/api';
import { Booking } from '@bookmyvenue/shared-types';

export default function OwnerBookingsDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected date on calendar to filter requests
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Current month of calendar view
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchOwnerBookings = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(getApiUrl('/api/v1/owner/bookings'), {
        headers: getAuthHeaders(),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Please log in again. Your host session expired.');
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to retrieve bookings list.');
      }

      setBookings(result.data.bookings || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong while retrieving host bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerBookings();
  }, []);

  const handleApprove = async (id: string) => {
    if (!window.confirm('Approve this reservation query?')) return;
    try {
      const res = await fetch(getApiUrl(`/api/v1/bookings/${id}/approve`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      fetchOwnerBookings();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Specify decline reason:');
    if (reason === null) return; // cancelled prompt
    try {
      // Cancellation endpoint or reject endpoint
      const res = await fetch(getApiUrl(`/api/v1/bookings/${id}/reject`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      fetchOwnerBookings();
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    }
  };

  // Generate calendar days for currentMonth
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0 is Sunday, etc.

    // Total days in month
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Padding days for previous month offset
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    // Days in current month
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Count active bookings on a specific date string (YYYY-MM-DD)
  const getBookingsOnDate = (date: Date) => {
    const dateStr = date.toISOString().slice(0, 10);
    return bookings.filter(
      (b) =>
        new Date(b.eventDate).toISOString().slice(0, 10) === dateStr &&
        b.bookingStatus !== 'CANCELLED' &&
        b.bookingStatus !== 'OWNER_REJECTED'
    );
  };

  const calendarDays = getCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Filter bookings to display
  const filteredBookings = selectedDate
    ? bookings.filter((b) => new Date(b.eventDate).toISOString().slice(0, 10) === selectedDate)
    : bookings;

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
          <a href="/owner/venues" className="text-2xl font-bold text-primary tracking-tight">
            BMV Owner
          </a>
          <span className="bg-premium/10 text-premium text-[10px] px-2 py-0.5 rounded-full font-bold">
            Hosting
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <a
            href="/owner/venues"
            className="text-secondary-text hover:text-primary transition font-semibold text-xs"
          >
            My Venues
          </a>
          <a href="/owner/bookings" className="text-primary transition font-bold text-xs">
            Reservations
          </a>
        </nav>
      </header>

      {/* Main Container */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-10 flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-extrabold text-primary-text tracking-tight">
            Reservations Manager
          </h1>
          <p className="text-sm text-body-text">
            Audit incoming booking query requests, manage busy calendars, and accept payments.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-2xl text-xs text-red-700 font-semibold">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="p-20 flex flex-col justify-center items-center gap-4 text-center">
            <Loader2 size={36} className="animate-spin text-primary" />
            <span className="text-xs font-bold text-secondary-text uppercase tracking-wide">
              Syncing Reservations...
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Interactive Grid Calendar */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xs flex flex-col gap-4">
              <div className="flex justify-between items-center pb-2 border-b border-border-custom/10">
                <h3 className="font-extrabold text-sm text-primary-text flex items-center gap-1.5">
                  <CalendarIcon size={16} className="text-primary" /> Calendar View
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevMonth}
                    className="p-1.5 hover:bg-card-bg rounded-lg border border-border-custom/50"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-bold px-2">
                    {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    onClick={nextMonth}
                    className="p-1.5 hover:bg-card-bg rounded-lg border border-border-custom/50"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Grid Header */}
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-secondary-text pb-1 uppercase tracking-wider">
                {weekDays.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>

              {/* Grid Days */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((day, idx) => {
                  if (!day) return <div key={idx} className="h-9"></div>;

                  const dateStr = day.toISOString().slice(0, 10);
                  const isSelected = selectedDate === dateStr;
                  const dayBookings = getBookingsOnDate(day);
                  const hasBookings = dayBookings.length > 0;
                  const isToday = new Date().toISOString().slice(0, 10) === dateStr;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className={`h-9 w-full rounded-lg text-xs font-bold flex flex-col items-center justify-center relative cursor-pointer transition ${
                        isSelected
                          ? 'bg-primary text-surface border border-primary'
                          : isToday
                            ? 'bg-info/10 text-info border border-info/20'
                            : 'bg-card-bg border border-border-custom/30 text-primary-text hover:border-primary/50'
                      }`}
                    >
                      <span>{day.getDate()}</span>

                      {/* Booking indicators */}
                      {hasBookings && (
                        <span
                          className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-surface' : 'bg-red-500'}`}
                        ></span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <div className="pt-2 text-[10px] font-bold text-accent flex justify-between items-center bg-card-bg/40 p-2 border border-border-custom/30 rounded-xl">
                  <span>Selected Date: {new Date(selectedDate).toLocaleDateString()}</span>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-secondary-text hover:text-red-500 uppercase tracking-widest text-[8px]"
                  >
                    Clear Filter
                  </button>
                </div>
              )}
            </div>

            {/* Bookings Queue */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-primary-text">
                  {selectedDate
                    ? `Reservations for ${new Date(selectedDate).toLocaleDateString()}`
                    : 'All Bookings Queue'}
                </h2>
                <span className="text-[10px] font-bold bg-card-bg border border-border-custom px-3 py-1 rounded-full text-secondary-text">
                  {filteredBookings.length} entries found
                </span>
              </div>

              {filteredBookings.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center gap-3 bg-surface border border-border-custom rounded-3xl">
                  <span className="text-4xl">📋</span>
                  <h3 className="font-bold text-sm text-primary-text">No Reservations Found</h3>
                  <p className="text-xs text-body-text max-w-sm">
                    No reservations matching current selections were registered in system database.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookings.map((booking) => {
                    const c = (booking as any).customer;
                    const v = (booking as any).venue;
                    const isPending = booking.bookingStatus === 'PENDING';

                    return (
                      <div
                        key={booking.id}
                        className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xs space-y-4 flex flex-col"
                      >
                        {/* Header Details */}
                        <div className="flex justify-between items-start border-b border-border-custom/15 pb-3">
                          <div>
                            <span className="text-[9px] font-extrabold text-primary uppercase tracking-widest">
                              #{booking.bookingNumber}
                            </span>
                            <h4 className="font-extrabold text-sm text-primary-text mt-0.5">
                              {v?.title || 'Unknown Venue'}
                            </h4>
                            <p className="text-[10px] text-body-text mt-1 capitalize">
                              {booking.eventType} event • {booking.guestCount} guests
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeClass(booking.bookingStatus)}`}
                          >
                            {booking.bookingStatus.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Customer & Time fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-body-text">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-card-bg border border-border-custom/25 rounded-lg text-primary">
                              <User size={14} />
                            </div>
                            <div>
                              <span className="block text-[8px] text-muted-text font-bold uppercase">
                                Customer
                              </span>
                              <span className="font-bold text-primary-text">
                                {c?.name || 'Seeded Client'}
                              </span>
                              <span className="block text-[10px] text-muted-text">{c?.email}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-card-bg border border-border-custom/25 rounded-lg text-primary">
                              <CalendarIcon size={14} />
                            </div>
                            <div>
                              <span className="block text-[8px] text-muted-text font-bold uppercase">
                                Event Date
                              </span>
                              <span className="font-bold text-primary-text">
                                {new Date(booking.eventDate).toLocaleDateString('en-US', {
                                  dateStyle: 'medium',
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-card-bg border border-border-custom/25 rounded-lg text-primary">
                              <Clock size={14} />
                            </div>
                            <div>
                              <span className="block text-[8px] text-muted-text font-bold uppercase">
                                Time slot
                              </span>
                              <span className="font-bold text-primary-text">
                                {booking.startTime} - {booking.endTime}
                              </span>
                            </div>
                          </div>
                        </div>

                        {booking.specialRequests && (
                          <div className="bg-card-bg border border-border-custom/20 rounded-2xl p-3.5 text-xs">
                            <span className="block text-[8px] text-muted-text font-extrabold uppercase mb-1">
                              Special guidelines requested:
                            </span>
                            <p className="text-body-text leading-relaxed italic">
                              "{booking.specialRequests}"
                            </p>
                          </div>
                        )}

                        {/* Action buttons or details */}
                        <div className="pt-3 border-t border-border-custom/10 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-muted-text block uppercase">
                              Revenue invoice
                            </span>
                            <span className="font-black text-sm text-primary-text">
                              ₹{booking.totalAmount.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => handleReject(booking.id)}
                                  className="bg-red-500/10 hover:bg-red-600 hover:text-surface text-red-600 border border-red-500/25 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <X size={14} /> Decline Query
                                </button>
                                <button
                                  onClick={() => handleApprove(booking.id)}
                                  className="bg-primary text-surface px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/95 transition shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <Check size={14} /> Accept Booking
                                </button>
                              </>
                            ) : (
                              booking.bookingStatus === 'CANCELLED' &&
                              booking.cancellationReason && (
                                <div className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl flex items-center gap-1 max-w-sm">
                                  <Info size={14} className="flex-shrink-0" />
                                  <span>Reason: {booking.cancellationReason}</span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border-custom bg-surface py-6 px-6 md:px-12 text-center text-xs text-muted-text">
        <p>© 2026 BookMyVenue Host Reservations Suite.</p>
      </footer>
    </main>
  );
}
