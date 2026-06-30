'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const NotificationBell = dynamic(() => import('../../components/NotificationBell'), { ssr: false });

interface ReviewItem {
  _id: string;
  venueId: string;
  venueTitle: string;
  customerId: {
    _id: string;
    name: string;
  };
  rating: number;
  title: string;
  review: string;
  images: string[];
  ownerReply?: {
    reply: string;
    repliedAt: string;
  };
  createdAt: string;
}

export default function OwnerReviewsDashboard() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [token, setToken] = useState<string | null>(null);

  // Load JWT Token
  useEffect(() => {
    const storedToken = localStorage.getItem('token') || '';
    setToken(storedToken);
  }, []);

  const fetchOwnerReviews = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/owner/reviews?page=${page}&limit=5`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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
        setError('Please sign in as Host.');
        setLoading(false);
      } else {
        fetchOwnerReviews();
      }
    }
  }, [token, page]);

  const handleReplySubmit = async (reviewId: string) => {
    const text = replyText[reviewId];
    if (!text || !text.trim()) {
      alert('Please enter a response message.');
      return;
    }

    try {
      const res = await fetch(`/api/v1/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reply: text }),
      });

      const data = await res.json();
      if (res.ok) {
        // Clear reply text and reload
        setReplyText(prev => ({ ...prev, [reviewId]: '' }));
        fetchOwnerReviews();
      } else {
        alert(data.message || 'Failed to submit response.');
      }
    } catch (err) {
      alert('Failed communicating with server.');
    }
  };

  // Calculate quick metrics
  const totalReviewsCount = reviews.length;
  const averageRating = totalReviewsCount > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount).toFixed(1)
    : '0.0';
  const pendingReplies = reviews.filter(r => !r.ownerReply).length;

  return (
    <div className="min-h-screen bg-background text-primary-text flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border-custom bg-surface py-4 px-6 md:px-12 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary tracking-tight">BookMyVenue</span>
          <span className="bg-premium/10 text-premium text-xs px-2.5 py-0.5 rounded-full font-medium">
            Hosting Portal
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <a href="/owner" className="text-secondary-text hover:text-primary transition font-medium text-sm">
            Back to Host Dashboard
          </a>
          <NotificationBell />
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-primary-text tracking-tight">Host Reviews Panel</h1>
          <p className="text-sm text-secondary-text mt-1">Review feedback and engage with your guests</p>
        </div>

        {/* Analytics Header Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-surface border border-border-custom p-6 rounded-3xl shadow-xs">
            <span className="text-xs font-bold text-secondary-text uppercase">Average Rating</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black text-primary-text">{averageRating}</span>
              <span className="text-amber-500 text-lg">★</span>
            </div>
            <p className="text-[10px] text-muted-text mt-2 font-medium">Across all active reviews</p>
          </div>

          <div className="bg-surface border border-border-custom p-6 rounded-3xl shadow-xs">
            <span className="text-xs font-bold text-secondary-text uppercase">Total Reviews</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black text-primary-text">{totalReviewsCount}</span>
            </div>
            <p className="text-[10px] text-muted-text mt-2 font-medium">Verified customer submissions</p>
          </div>

          <div className="bg-surface border border-border-custom p-6 rounded-3xl shadow-xs">
            <span className="text-xs font-bold text-secondary-text uppercase">Pending Responses</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black text-danger">{pendingReplies}</span>
            </div>
            <p className="text-[10px] text-muted-text mt-2 font-medium">Reviews requiring attention</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-secondary-text">Loading reviews feed...</p>
          </div>
        ) : error ? (
          <div className="bg-danger/5 border border-danger/10 p-6 rounded-2xl text-center max-w-md mx-auto mt-12">
            <span className="text-3xl">🔑</span>
            <p className="text-sm font-semibold text-danger mt-2">{error}</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border-custom rounded-3xl bg-surface/50">
            <span className="text-5xl">💬</span>
            <h3 className="text-lg font-bold mt-4">No Reviews Received</h3>
            <p className="text-sm text-secondary-text mt-1">Feedback will appear here once bookings are completed.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((r) => (
              <div
                key={r._id}
                className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 shadow-xs flex flex-col gap-5"
              >
                {/* Header info */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {r.venueTitle}
                    </span>
                    <h3 className="font-extrabold text-sm text-primary-text mt-2">
                      By: {r.customerId?.name || 'Anonymous Guest'}
                    </h3>
                  </div>
                  <span className="text-[10px] text-muted-text font-bold uppercase">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Rating stars & title */}
                <div>
                  <div className="text-amber-500 text-sm">
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)}
                  </div>
                  <h4 className="font-extrabold text-primary-text mt-1">{r.title}</h4>
                  <p className="text-xs text-body-text mt-1 leading-relaxed">{r.review}</p>
                </div>

                {/* Images */}
                {r.images && r.images.length > 0 && (
                  <div className="flex gap-2">
                    {r.images.map((img, idx) => (
                      <div key={idx} className="h-12 w-16 rounded-lg overflow-hidden border border-border-custom/50 bg-muted">
                        <img src={img} className="object-cover h-full w-full" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Existing Reply */}
                {r.ownerReply ? (
                  <div className="bg-muted/30 border border-border-custom/40 rounded-2xl p-4 mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-black text-primary uppercase">Your Response</span>
                      <span className="text-[8px] text-muted-text uppercase font-bold">
                        {new Date(r.ownerReply.repliedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-body-text italic">"{r.ownerReply.reply}"</p>
                  </div>
                ) : (
                  /* Reply Form */
                  <div className="border-t border-border-custom/30 pt-4 flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-secondary-text uppercase">Respond to review</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type host response message..."
                        value={replyText[r._id] || ''}
                        onChange={(e) => setReplyText(prev => ({ ...prev, [r._id]: e.target.value }))}
                        className="flex-1 bg-card-bg border border-border-custom/50 px-4 py-2 rounded-xl text-xs outline-none"
                      />
                      <button
                        onClick={() => handleReplySubmit(r._id)}
                        className="bg-primary text-surface px-5 py-2 rounded-xl text-xs font-bold hover:bg-primary/95 transition cursor-pointer"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex justify-between items-center border-t border-border-custom/25 pt-4">
                <span className="text-xs text-secondary-text font-medium">Page {page} of {pages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="bg-surface border border-border-custom text-primary-text px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40 transition cursor-pointer"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page >= pages}
                    onClick={() => setPage(page + 1)}
                    className="bg-surface border border-border-custom text-primary-text px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40 transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-custom bg-surface py-6 px-6 md:px-12 flex justify-between items-center text-xs text-muted-text">
        <p>© 2026 BookMyVenue Hosting Portal.</p>
      </footer>
    </div>
  );
}
