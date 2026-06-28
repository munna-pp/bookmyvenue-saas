'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Loader2 } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import { io } from 'socket.io-client';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(getApiUrl('/api/v1/notifications/unread'), {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        setUnreadCount(result.data.count);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const fetchRecentNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/notifications?limit=5'), {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        setNotifications(result.data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    fetchUnreadCount();

    const socketUrl = getApiUrl('').replace('/api/v1', '').replace(/\/$/, '') || '/';
    const socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('🔌 Owner notifications socket connected.');
    });

    socket.on('notification', (newNotif) => {
      console.log('🔔 Owner new notification received:', newNotif);
      setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);
      setUnreadCount((c) => c + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchRecentNotifications();
      fetchUnreadCount();
    }
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(getApiUrl(`/api/v1/notifications/${id}/read`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id || n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
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
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(getApiUrl(`/api/v1/notifications/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n._id !== id && n.id !== id));
        fetchUnreadCount();
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 text-secondary-text hover:text-primary hover:bg-slate-100/50 rounded-full transition cursor-pointer flex items-center justify-center"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-surface border border-border-custom rounded-2xl shadow-lg z-50 overflow-hidden py-1">
          <div className="px-4 py-3 border-b border-border-custom/50 flex justify-between items-center bg-slate-50/50">
            <span className="text-xs font-black text-primary-text uppercase tracking-wide">Owner Alerts</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[10px] text-primary hover:underline font-bold"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-border-custom/30">
            {loading ? (
              <div className="p-6 flex justify-center">
                <Loader2 size={18} className="animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-text">
                No recent alerts.
              </div>
            ) : (
              notifications.map((notif) => {
                const id = notif._id || notif.id;
                return (
                  <div
                    key={id}
                    className={`p-3.5 hover:bg-slate-50/50 transition flex justify-between gap-3 items-start ${
                      !notif.read ? 'bg-indigo-50/10' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                            !notif.read ? 'bg-primary' : 'bg-transparent'
                          }`}
                        />
                        <h4 className="text-xs font-bold text-primary-text truncate">{notif.title}</h4>
                      </div>
                      <p className="text-[10px] text-body-text mt-1 leading-relaxed break-words">{notif.message}</p>
                      <span className="text-[8px] text-muted-text block mt-1.5">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex gap-1.5 flex-shrink-0">
                      {!notif.read && (
                        <button
                          onClick={(e) => handleMarkAsRead(id, e)}
                          className="p-1 text-slate-400 hover:text-primary rounded-md transition hover:bg-slate-100"
                          title="Mark read"
                        >
                          <Check size={12} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(id, e)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded-md transition hover:bg-slate-100"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
