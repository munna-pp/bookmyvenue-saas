'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Bell, Check, Trash2, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { getApiUrl } from '../../utils/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const readParam = filter === 'unread' ? 'false' : '';
      const url = getApiUrl(`/api/v1/notifications?page=${page}&limit=10${readParam ? `&read=${readParam}` : ''}`);
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        setNotifications(result.data.notifications || []);
        setTotalPages(result.data.pages || 1);
        setTotalCount(result.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, filter]);

  const handleFilterChange = (newFilter: 'all' | 'unread') => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/notifications/${id}/read`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id || n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(getApiUrl('/api/v1/notifications/read-all'), {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/notifications/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n._id !== id && n.id !== id));
        setTotalCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getStatusBadge = (type: string) => {
    switch (type) {
      case 'BOOKING_ALERT':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'PAYMENT_ALERT':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'VENUE_ALERT':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'ADMIN_ALERT':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  return (
    <main className="min-h-screen bg-background text-primary-text flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-border-custom bg-surface py-4 px-6 md:px-12 flex justify-between items-center shadow-xs">
        <a href="/venues" className="text-2xl font-black text-primary tracking-tight">BookMyVenue</a>
        <nav className="flex items-center gap-6">
          <a href="/venues" className="text-secondary-text hover:text-primary transition font-semibold text-xs">Browse Venues</a>
          <a href="/bookings" className="text-secondary-text hover:text-primary transition font-semibold text-xs">My Bookings</a>
        </nav>
      </header>

      {/* Main Container */}
      <section className="flex-1 max-w-4xl mx-auto w-full px-6 md:px-12 py-10 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-primary-text tracking-tight flex items-center gap-2">
              <Bell size={28} className="text-primary" /> Notification Center
            </h1>
            <p className="text-sm text-body-text">Manage your real-time alerts, booking approvals, and invoice receipts.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition border cursor-pointer ${
                filter === 'all'
                  ? 'bg-primary border-primary text-surface'
                  : 'bg-surface border-border-custom text-secondary-text hover:border-slate-300'
              }`}
            >
              All Alerts
            </button>
            <button
              onClick={() => handleFilterChange('unread')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition border cursor-pointer ${
                filter === 'unread'
                  ? 'bg-primary border-primary text-surface'
                  : 'bg-surface border-border-custom text-secondary-text hover:border-slate-300'
              }`}
            >
              Unread
            </button>
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 rounded-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition border border-indigo-200 cursor-pointer"
            >
              Mark all as read
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-20 flex flex-col justify-center items-center gap-4 text-center">
            <Loader2 size={36} className="animate-spin text-primary" />
            <span className="text-xs font-bold text-secondary-text uppercase tracking-wide">Syncing Inbox...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center gap-4 bg-surface border border-border-custom rounded-3xl">
            <Inbox size={48} className="text-muted-text" />
            <h2 className="text-base font-bold text-primary-text">Inbox Empty</h2>
            <p className="text-xs text-body-text max-w-sm">No notifications found. Active reservation alerts and payout warnings will show up here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden divide-y divide-border-custom/30 shadow-xs">
              {notifications.map((notif) => {
                const id = notif._id || notif.id;
                return (
                  <div
                    key={id}
                    className={`p-5 md:p-6 transition flex gap-5 items-start justify-between ${
                      !notif.read ? 'bg-indigo-50/5' : ''
                    }`}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusBadge(notif.type)}`}>
                          {notif.type.replace('_', ' ')}
                        </span>
                        {!notif.read && (
                          <span className="bg-primary text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            New
                          </span>
                        )}
                        <span className="text-[10px] text-muted-text font-medium">
                          {new Date(notif.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-sm text-primary-text">{notif.title}</h3>
                      <p className="text-xs text-body-text leading-relaxed">{notif.message}</p>
                    </div>

                    <div className="flex gap-2">
                      {!notif.read && (
                        <button
                          onClick={() => handleMarkAsRead(id)}
                          className="bg-surface hover:bg-slate-50 border border-border-custom p-2 rounded-xl transition cursor-pointer text-secondary-text hover:text-primary"
                          title="Mark as Read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(id)}
                        className="bg-surface hover:bg-red-50 border border-border-custom p-2 rounded-xl transition cursor-pointer text-secondary-text hover:text-red-500"
                        title="Delete Alert"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center bg-surface border border-border-custom rounded-2xl p-4">
                <span className="text-xs font-bold text-secondary-text">
                  Showing Page {page} of {totalPages} ({totalCount} alerts)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-2 border border-border-custom rounded-xl hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2 border border-border-custom rounded-xl hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border-custom bg-surface py-6 px-6 md:px-12 text-center text-xs text-muted-text">
        <p>© 2026 BookMyVenue. All rights reserved.</p>
      </footer>
    </main>
  );
}
