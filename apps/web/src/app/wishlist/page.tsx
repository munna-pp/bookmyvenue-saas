'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const NotificationBell = dynamic(() => import('../../components/NotificationBell'), { ssr: false });

interface WishlistItem {
  _id: string;
  venueId: string;
  createdAt: string;
  venue: {
    _id: string;
    title: string;
    slug: string;
    venueType: string;
    city: string;
    rating: number;
    reviewCount: number;
    featuredImage?: string;
    pricing: {
      pricePerDay: number;
    };
  };
}

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [token, setToken] = useState<string | null>(null);

  // Load JWT Token
  useEffect(() => {
    const storedToken = localStorage.getItem('token') || '';
    setToken(storedToken);
  }, []);

  const fetchWishlist = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/wishlist?sortBy=${sortBy}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setWishlist(data.data.wishlist || []);
      } else {
        setError(data.message || 'Failed to fetch wishlist.');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token !== null) {
      if (!token) {
        setError('Please sign in to view your wishlist.');
        setLoading(false);
      } else {
        fetchWishlist();
      }
    }
  }, [token, sortBy]);

  const handleRemove = async (venueId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/wishlist/${venueId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setWishlist((prev) => prev.filter((item) => item.venueId !== venueId));
      } else {
        alert('Failed to remove item from wishlist.');
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
          <a href="/" className="text-2xl font-bold text-primary tracking-tight">
            BookMyVenue
          </a>
          <span className="bg-premium/10 text-premium text-xs px-2.5 py-0.5 rounded-full font-medium">
            Wishlist
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <a
            href="/bookings"
            className="text-secondary-text hover:text-primary transition font-medium text-sm"
          >
            My Bookings
          </a>
          <NotificationBell />
          <a
            href="/"
            className="bg-primary text-surface px-4 py-2 rounded-full hover:bg-primary/95 transition font-medium text-sm shadow-sm cursor-pointer text-center"
          >
            Back to Home
          </a>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-primary-text tracking-tight">
              My Favorite Venues
            </h1>
            <p className="text-sm text-secondary-text mt-1">
              Keep track of spaces you want to book later
            </p>
          </div>

          {/* Sorters */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-secondary-text uppercase">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-surface border border-border-custom px-4 py-2 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary outline-none cursor-pointer"
            >
              <option value="newest">Saved (Newest First)</option>
              <option value="oldest">Saved (Oldest First)</option>
              <option value="highest_rated">Highest Rating</option>
              <option value="lowest_price">Lowest Price</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-secondary-text">Loading your favorites...</p>
          </div>
        ) : error ? (
          <div className="bg-danger/5 border border-danger/10 p-6 rounded-2xl text-center max-w-md mx-auto mt-12">
            <span className="text-3xl">🔒</span>
            <p className="text-sm font-semibold text-danger mt-2">{error}</p>
            {!token && (
              <a
                href="/login"
                className="inline-block mt-4 bg-primary text-surface px-6 py-2 rounded-xl font-bold text-sm"
              >
                Login Now
              </a>
            )}
          </div>
        ) : wishlist.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border-custom rounded-3xl bg-surface/50">
            <span className="text-5xl">❤️</span>
            <h3 className="text-lg font-bold mt-4">Your Wishlist is Empty</h3>
            <p className="text-sm text-secondary-text mt-1 max-w-sm mx-auto">
              Explore our premium venues and click the heart icon to save listings.
            </p>
            <a
              href="/"
              className="inline-block mt-6 bg-primary text-surface px-6 py-2.5 rounded-full font-bold text-sm hover:scale-[1.02] transition shadow-md"
            >
              Browse Venues
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlist.map((item) => (
              <div
                key={item._id}
                className="bg-card-bg border border-border-custom/50 rounded-3xl overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all duration-300 flex flex-col group relative"
              >
                {/* Image & Heart Badge */}
                <div className="relative aspect-video w-full bg-muted overflow-hidden">
                  <img
                    src={item.venue.featuredImage || '/placeholder-venue.jpg'}
                    alt={item.venue.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <button
                    onClick={() => handleRemove(item.venueId)}
                    className="absolute top-4 right-4 bg-surface hover:bg-danger/10 text-danger hover:text-danger/90 p-2.5 rounded-full shadow-md transition cursor-pointer"
                    title="Remove from wishlist"
                  >
                    ❤️
                  </button>
                  <span className="absolute bottom-3 left-3 bg-surface/90 text-primary-text text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider backdrop-blur-xs">
                    {item.venue.venueType.replace('_', ' ')}
                  </span>
                </div>

                {/* Content info */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-lg text-primary-text leading-tight group-hover:text-primary transition">
                      {item.venue.title}
                    </h3>
                    <p className="text-xs font-medium text-secondary-text mt-1">
                      📍 {item.venue.city}
                    </p>
                    <p className="text-[11px] text-muted-text mt-2 font-medium">
                      Saved:{' '}
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-border-custom/30 pt-4">
                    <div className="flex items-center gap-1">
                      <span className="text-amber-500">★</span>
                      <span className="text-xs font-bold">{item.venue.rating}</span>
                      <span className="text-xs text-muted-text font-medium">
                        ({item.venue.reviewCount})
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-text font-medium">Price/Day:</span>
                      <span className="text-sm font-black text-primary ml-1">
                        ₹{item.venue.pricing.pricePerDay}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-custom bg-surface py-6 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-text">
        <p>© 2026 BookMyVenue Inc. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:underline">
            Privacy Policy
          </a>
          <a href="#" className="hover:underline">
            Terms of Service
          </a>
          <a href="#" className="hover:underline">
            Contact Support
          </a>
        </div>
      </footer>
    </div>
  );
}
