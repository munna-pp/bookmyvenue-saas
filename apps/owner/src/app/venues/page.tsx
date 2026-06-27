'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Home, CheckCircle2, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { getApiUrl } from '../../utils/api';
import { Venue } from '@bookmyvenue/shared-types';

export default function OwnerVenuesDashboard() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
  });

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchOwnerVenues = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(getApiUrl('/api/v1/owner/venues'), {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        throw new Error('Please log in again. Your session might have expired.');
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to fetch your venues');
      }

      const list = result.data.venues || [];
      setVenues(list);

      // Compute simple stats
      setStats({
        total: list.length,
        approved: list.filter((v: Venue) => v.approvalStatus === 'APPROVED').length,
        pending: list.filter((v: Venue) => v.approvalStatus === 'PENDING').length,
      });

    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect to the backend services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerVenues();
  }, []);

  const handleDeleteVenue = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(getApiUrl(`/api/v1/venues/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Unexpected response format.');
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Delete operation failed');
      }

      // Refresh list
      fetchOwnerVenues();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <main className="min-h-screen bg-background text-primary-text flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-border-custom bg-surface py-4 px-6 md:px-12 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-2">
          <a href="/owner" className="text-2xl font-bold text-primary tracking-tight">BMV Owner</a>
          <span className="bg-premium/10 text-premium text-xs px-2.5 py-0.5 rounded-full font-medium">Hosting</span>
        </div>
        <nav className="flex items-center gap-6">
          <a href="/venues" className="text-secondary-text hover:text-primary transition font-medium text-sm">Preview Listings</a>
          <button
            onClick={() => window.location.href = '/owner/venues/new'}
            className="bg-primary text-surface px-5 py-2.5 rounded-full hover:bg-primary/95 transition font-bold text-sm shadow-sm cursor-pointer flex items-center gap-1"
          >
            <Plus size={16} /> Create New Venue
          </button>
        </nav>
      </header>

      {/* Main Container */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-10 flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-extrabold text-primary-text tracking-tight">My Listed Venues</h1>
          <p className="text-sm text-body-text">Publish and manage your wedding halls, conference setups, and party spaces.</p>
        </div>

        {/* Status Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Listings', value: stats.total, icon: <Home className="text-accent" /> },
            { label: 'Approved & Active', value: stats.approved, icon: <CheckCircle2 className="text-green-600" /> },
            { label: 'Pending Approvals', value: stats.pending, icon: <AlertTriangle className="text-amber-500" /> },
          ].map((stat, i) => (
            <div key={i} className="bg-surface border border-border-custom rounded-2xl p-6 shadow-xs flex justify-between items-center">
              <div>
                <span className="block text-xs font-bold text-secondary-text uppercase">{stat.label}</span>
                <span className="block text-3xl font-black text-primary-text mt-2">{stat.value}</span>
              </div>
              <div className="p-3 bg-card-bg rounded-xl border border-border-custom/25">{stat.icon}</div>
            </div>
          ))}
        </div>

        {/* Dashboard table */}
        <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
          
          {errorMsg && (
            <div className="p-4 m-6 bg-red-50 border-l-4 border-red-500 rounded-xl text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="p-20 flex flex-col justify-center items-center gap-4 text-center">
              <Loader2 size={36} className="animate-spin text-primary" />
              <span className="text-xs font-bold text-secondary-text uppercase tracking-wide">Syncing listings...</span>
            </div>
          ) : venues.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-3">
              <span className="text-4xl">🏛️</span>
              <h2 className="text-base font-bold text-primary-text">No Venues Listed Yet</h2>
              <p className="text-xs text-body-text max-w-sm">Create your first venue listing to start booking events and accepting secure payments.</p>
              <button
                onClick={() => window.location.href = '/owner/venues/new'}
                className="mt-4 bg-primary text-surface px-5 py-2.5 rounded-full font-bold text-xs shadow-xs hover:bg-primary/95 transition cursor-pointer"
              >
                Get Started
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-custom/30 bg-card-bg text-secondary-text font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Venue details</th>
                    <th className="px-6 py-4">Venue Type</th>
                    <th className="px-6 py-4">Max capacity</th>
                    <th className="px-6 py-4">Price per day</th>
                    <th className="px-6 py-4">Approval status</th>
                    <th className="px-6 py-4">Visibility</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {venues.map((venue) => (
                    <tr key={venue.id} className="border-b border-border-custom/10 hover:bg-card-bg/25 transition duration-150">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="h-10 w-16 bg-border-custom/20 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={venue.featuredImage || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=150&q=80'} alt="Venue" className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <span className="font-extrabold text-primary-text block">{venue.title}</span>
                          <span className="text-[10px] text-body-text block">{venue.address.city}, {venue.address.state}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold capitalize">{venue.venueType.replace('_', ' ')}</td>
                      <td className="px-6 py-4 font-bold text-primary-text">{venue.capacity} guests</td>
                      <td className="px-6 py-4 font-extrabold text-primary">₹{venue.pricing.pricePerDay.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          venue.approvalStatus === 'APPROVED' ? 'bg-green-50 border border-green-200 text-green-700' :
                          venue.approvalStatus === 'PENDING' ? 'bg-amber-50 border border-amber-200 text-amber-700' :
                          'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                          {venue.approvalStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 font-bold text-body-text">
                          {venue.publicationStatus === 'PUBLISHED' ? (
                            <>
                              <Eye size={14} className="text-green-600" /> Published
                            </>
                          ) : (
                            <>
                              <EyeOff size={14} className="text-muted-text" /> Draft
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => window.location.href = `/owner/venues/edit/${venue.id}`}
                          className="p-2 border border-border-custom/50 hover:border-primary/50 text-secondary-text hover:text-primary rounded-lg transition cursor-pointer"
                          title="Edit Listing"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteVenue(venue.id, venue.title)}
                          className="p-2 border border-border-custom/50 hover:border-red-500/50 text-secondary-text hover:text-red-500 rounded-lg transition cursor-pointer"
                          title="Delete Listing"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </section>

      {/* Footer */}
      <footer className="border-t border-border-custom bg-surface py-6 px-6 md:px-12 flex justify-between items-center text-xs text-muted-text">
        <p>© 2026 BookMyVenue Host. All rights reserved.</p>
        <p>BookMyVenue Abstraction Layer V1</p>
      </footer>
    </main>
  );
}
