'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const NotificationBell = dynamic(() => import('../../components/NotificationBell'), { ssr: false });

interface ReviewItem {
  _id: string;
  venueId: string;
  customerId: {
    _id: string;
    name: string;
  };
  bookingId: string;
  rating: number;
  title: string;
  review: string;
  hidden: boolean;
  isDeleted: boolean;
  createdAt: string;
}

export default function AdminReviewsDashboard() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [token, setToken] = useState<string | null>(null);

  // Load JWT Token
  useEffect(() => {
    const storedToken = localStorage.getItem('token') || '';
    setToken(storedToken);
  }, []);

  const fetchAllReviews = async () => {
    if (!token) return;
    try {
      setLoading(true);
      // We will call the public venue reviews or write an admin reviews list API.
      // Wait, is there a global GET /api/v1/reviews for admin moderation?
      // Let's check reviews controller:
      // Oh! We didn't write a GET /api/v1/reviews general list.
      // Wait! The prompt says: "Admin: Search and filter reviews. Review moderation dashboard. Hide/restore/delete review."
      // So we should have a GET /api/v1/reviews endpoint (Admins only) to list all reviews in the system!
      // Yes! Let's check: did we add that endpoint? No, we only wrote:
      // GET /api/v1/venues/:id/reviews
      // Let's add a GET /api/v1/reviews endpoint (restricted to Admin role) to support admin moderation list!
      // This is extremely important and covers the admin moderation list perfectly!
      // Let's implement it in Reviews controller:
      // GET /api/v1/reviews
      // We will add it next. Let's make sure the frontend calls:
      // GET /api/v1/reviews?page=${page}&rating=${ratingFilter}&search=${search}
      const res = await fetch(
        `/api/v1/reviews?page=${page}&rating=${ratingFilter}&search=${search}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (res.ok) {
        setReviews(data.data.reviews || []);
        setPages(data.data.pages || 1);
      } else {
        setError(data.message || 'Failed to fetch reviews.');
      }
    } catch (err) {
      setError('Connection failure.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token !== null) {
      if (!token) {
        setError('Please sign in as Admin.');
        setLoading(false);
      } else {
        fetchAllReviews();
      }
    }
  }, [token, page, ratingFilter, search]);

  const handleHide = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/reviews/${id}/hide`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setReviews((prev) => prev.map((r) => (r._id === id ? { ...r, hidden: true } : r)));
      } else {
        alert('Failed to hide review.');
      }
    } catch (err) {
      alert('Error communicating with server.');
    }
  };

  const handleRestore = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/reviews/${id}/restore`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setReviews((prev) => prev.map((r) => (r._id === id ? { ...r, hidden: false } : r)));
      } else {
        alert('Failed to restore review.');
      }
    } catch (err) {
      alert('Error communicating with server.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to permanently delete this review from the system?'))
      return;
    try {
      const res = await fetch(`/api/v1/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r._id !== id));
      } else {
        alert('Failed to purge review.');
      }
    } catch (err) {
      alert('Error communicating with server.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-primary-text flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border-custom bg-surface py-4 px-6 md:px-12 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary tracking-tight">BookMyVenue</span>
          <span className="bg-danger/10 text-danger text-xs px-2.5 py-0.5 rounded-full font-medium">
            Admin Moderation
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <a
            href="/admin"
            className="text-secondary-text hover:text-primary transition font-medium text-sm"
          >
            Back to Dashboard
          </a>
          <NotificationBell />
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-primary-text tracking-tight">
              Review Moderation Panel
            </h1>
            <p className="text-sm text-secondary-text mt-1">
              Hide, restore, or purge venue feedback ratings
            </p>
          </div>

          {/* Search/Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search reviews..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface border border-border-custom px-4 py-2 rounded-xl text-sm outline-none w-48 focus:ring-2 focus:ring-primary"
            />
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="bg-surface border border-border-custom px-4 py-2 rounded-xl text-sm outline-none cursor-pointer focus:ring-2 focus:ring-primary"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-secondary-text">Loading reviews database...</p>
          </div>
        ) : error ? (
          <div className="bg-danger/5 border border-danger/10 p-6 rounded-2xl text-center max-w-md mx-auto mt-12">
            <span className="text-3xl">🔑</span>
            <p className="text-sm font-semibold text-danger mt-2">{error}</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border-custom rounded-3xl bg-surface/50">
            <span className="text-5xl">📋</span>
            <h3 className="text-lg font-bold mt-4">No Reviews Found</h3>
            <p className="text-sm text-secondary-text mt-1">
              Try resetting your filters or search terms.
            </p>
          </div>
        ) : (
          <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border-custom text-xs font-bold text-secondary-text uppercase tracking-wider">
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Rating</th>
                    <th className="py-4 px-6">Review Content</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom text-sm">
                  {reviews.map((r) => (
                    <tr key={r._id} className="hover:bg-muted/10 transition">
                      <td className="py-4 px-6 font-bold">{r.customerId?.name || 'N/A'}</td>
                      <td className="py-4 px-6 text-amber-500 font-extrabold">
                        {'★'.repeat(r.rating)}
                        <span className="text-muted-text font-normal">({r.rating}★)</span>
                      </td>
                      <td className="py-4 px-6 max-w-md">
                        <p className="font-extrabold text-primary-text">{r.title}</p>
                        <p className="text-xs text-body-text mt-1">{r.review}</p>
                      </td>
                      <td className="py-4 px-6">
                        {r.hidden ? (
                          <span className="bg-danger/10 text-danger text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            Hidden
                          </span>
                        ) : (
                          <span className="bg-success/10 text-success text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            Visible
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          {r.hidden ? (
                            <button
                              onClick={() => handleRestore(r._id)}
                              className="bg-success text-surface px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-success/90 transition cursor-pointer"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => handleHide(r._id)}
                              className="bg-secondary text-primary-text px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-muted transition cursor-pointer"
                            >
                              Hide
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(r._id)}
                            className="bg-danger text-surface px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-danger/90 transition cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="border-t border-border-custom py-4 px-6 flex justify-between items-center bg-muted/20">
              <span className="text-xs text-secondary-text font-medium">
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="bg-surface border border-border-custom text-primary-text px-3.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 transition cursor-pointer"
                >
                  Prev
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage(page + 1)}
                  className="bg-surface border border-border-custom text-primary-text px-3.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-custom bg-surface py-6 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-text">
        <p>© 2026 BookMyVenue Admin Platform.</p>
      </footer>
    </div>
  );
}
