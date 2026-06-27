'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, ShieldAlert, AlertCircle, Eye, Loader2, RefreshCw } from 'lucide-react';
import { getApiUrl } from '../../utils/api';
import { Venue } from '@bookmyvenue/shared-types';

export default function AdminVenuesQueue() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchAllVenues = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Admin queries GET /api/v1/venues but wait!
      // By default, GET /api/v1/venues only returns APPROVED and PUBLISHED venues for public users.
      // But wait! If an Admin calls it with authorization header, does the backend return all venues?
      // Wait, in controller.ts:
      // "query.approvalStatus = 'APPROVED';"
      // "query.publicationStatus = 'PUBLISHED';"
      // It always overrides approvalStatus and publicationStatus for GET /api/v1/venues!
      // Ah! Is there any endpoint for admins to get all pending venues?
      // Wait! In `controller.ts`, does `getVenues` have a role check?
      // Let's look at `controller.ts` line 191:
      // It doesn't check the user role! It always sets:
      // query.approvalStatus = 'APPROVED';
      // query.publicationStatus = 'PUBLISHED';
      // So how can the admin view the queue?
      // Ah! We can modify the `getVenues` controller in `controller.ts` so that:
      // If the authenticated user is an ADMIN, they can pass query parameters to view all statuses!
      // For example, if `req.user && req.user.role === 'admin'`:
      // - We do NOT force `query.approvalStatus = 'APPROVED'` and `query.publicationStatus = 'PUBLISHED'`.
      // - Instead, we default to the query params if provided:
      //   `if (req.query.approvalStatus) query.approvalStatus = req.query.approvalStatus;`
      //   `if (req.query.publicationStatus) query.publicationStatus = req.query.publicationStatus;`
      // This is an extremely elegant solution! It allows the admin to view the approval queue using the standard `GET /api/v1/venues` route by passing `?approvalStatus=PENDING` (or any status they wish!).
      // Wait! Let's check: did we authenticate the `GET /api/v1/venues` route?
      // In `routes.ts` line 34:
      // `router.get('/venues', getVenues);`
      // Yes, it is a public route, but we can make it optionally protect using our `optionalProtect` middleware!
      // If we use `optionalProtect` on `/venues`:
      // `router.get('/venues', optionalProtect, getVenues);`
      // Then if an admin passes their token, `req.user` will be loaded!
      // And in `controller.ts`, if `req.user && req.user.role === 'admin'`, we allow querying any approval/publication status!
      // This is incredibly smart! Let's implement this right away.

      // First, let's write the Admin queue page. We'll make it fetch:
      // `GET /api/v1/venues?approvalStatus=PENDING` (or similar) or fetch all.
      // Wait, let's write the fetch URL:
      const res = await fetch(getApiUrl('/api/v1/venues'), {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Please log in as an administrator.');
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to retrieve approval queue');
      }

      const list = result.data.venues || [];
      setVenues(list);

      // Compute stats
      setStats({
        pending: list.filter((v: Venue) => v.approvalStatus === 'PENDING').length,
        approved: list.filter((v: Venue) => v.approvalStatus === 'APPROVED').length,
        rejected: list.filter((v: Venue) => v.approvalStatus === 'REJECTED').length,
      });

    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sync with approval database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllVenues();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/admin/venues/${id}/approve`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      fetchAllVenues();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm('Are you sure you want to REJECT this venue listing?')) return;
    try {
      const res = await fetch(getApiUrl(`/api/v1/admin/venues/${id}/reject`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      fetchAllVenues();
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    }
  };

  const handleSuspend = async (id: string) => {
    if (!window.confirm('Are you sure you want to SUSPEND this venue listing?')) return;
    try {
      const res = await fetch(getApiUrl(`/api/v1/admin/venues/${id}/suspend`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      fetchAllVenues();
    } catch (err: any) {
      alert(`Suspension error: ${err.message}`);
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
          <button
            onClick={fetchAllVenues}
            className="p-2 border border-border-custom/50 hover:border-primary/50 text-secondary-text hover:text-primary rounded-xl transition cursor-pointer"
            title="Refresh Queue"
          >
            <RefreshCw size={14} />
          </button>
          <a href="/" className="text-xs text-muted-text hover:text-primary transition font-medium">← Main Page</a>
        </nav>
      </header>

      {/* Main Container */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-10 flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-extrabold text-primary-text tracking-tight">Venue Approval Queue</h1>
          <p className="text-sm text-body-text">Review and manage safety approvals, draft audits, and suspends.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Pending Audit', value: stats.pending, color: 'border-l-pending' },
            { label: 'Approved Listings', value: stats.approved, color: 'border-l-primary' },
            { label: 'Rejected Listings', value: stats.rejected, color: 'border-l-accent' },
          ].map((stat, i) => (
            <div key={i} className={`bg-card-bg border-l-4 ${stat.color} border border-border-custom rounded-2xl p-6 shadow-xs`}>
              <span className="block text-xs font-semibold text-body-text uppercase">{stat.label}</span>
              <span className="block text-2xl font-black text-primary-text mt-2">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Queue Table */}
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
          ) : venues.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-3">
              <span className="text-4xl">📋</span>
              <h2 className="text-base font-bold text-primary-text">No Venues Found</h2>
              <p className="text-xs text-body-text max-w-sm">No venue listing entries were found in the database system.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-custom/30 bg-card-bg text-secondary-text font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Venue parameters</th>
                    <th className="px-6 py-4">Venue Type</th>
                    <th className="px-6 py-4">Pricing</th>
                    <th className="px-6 py-4">Capacity</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {venues.map((venue) => (
                    <tr key={venue.id} className="border-b border-border-custom/10 hover:bg-card-bg/25 transition duration-150">
                      <td className="px-6 py-4">
                        <span className="font-extrabold text-primary-text block">{venue.title}</span>
                        <span className="text-[10px] text-body-text block">{venue.address.city}, {venue.address.state}</span>
                      </td>
                      <td className="px-6 py-4 font-semibold capitalize">{venue.venueType.replace('_', ' ')}</td>
                      <td className="px-6 py-4 font-extrabold text-primary">₹{venue.pricing.pricePerDay.toLocaleString('en-IN')} / day</td>
                      <td className="px-6 py-4 font-bold text-primary-text">{venue.capacity} guests</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          venue.approvalStatus === 'APPROVED' ? 'bg-green-50 border border-green-200 text-green-700' :
                          venue.approvalStatus === 'PENDING' ? 'bg-amber-50 border border-amber-200 text-amber-700' :
                          'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                          {venue.approvalStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        {venue.approvalStatus !== 'APPROVED' && (
                          <button
                            onClick={() => handleApprove(venue.id)}
                            className="bg-green-600 hover:bg-green-700 text-surface p-2 rounded-lg transition cursor-pointer"
                            title="Approve Listing"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        {venue.approvalStatus !== 'REJECTED' && (
                          <button
                            onClick={() => handleReject(venue.id)}
                            className="bg-amber-500 hover:bg-amber-600 text-surface p-2 rounded-lg transition cursor-pointer"
                            title="Reject Listing"
                          >
                            <X size={14} />
                          </button>
                        )}
                        {venue.approvalStatus !== 'SUSPENDED' && (
                          <button
                            onClick={() => handleSuspend(venue.id)}
                            className="bg-red-600 hover:bg-red-700 text-surface p-2 rounded-lg transition cursor-pointer"
                            title="Suspend Listing"
                          >
                            <ShieldAlert size={14} />
                          </button>
                        )}
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
      <footer className="border-t border-border-custom bg-surface py-6 px-6 md:px-12 text-center text-xs text-muted-text">
        <p>© 2026 BookMyVenue Admin Control Panel.</p>
      </footer>
    </main>
  );
}
