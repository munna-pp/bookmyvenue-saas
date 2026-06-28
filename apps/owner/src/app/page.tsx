'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const NotificationBell = dynamic(() => import('../components/NotificationBell'), { ssr: false });

export default function OwnerDashboard() {
  return (
    <main className="min-h-screen bg-background text-primary-text flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-border-custom bg-surface py-4 px-6 md:px-12 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary tracking-tight">BMV Owner</span>
          <span className="bg-premium/10 text-premium text-xs px-2.5 py-0.5 rounded-full font-medium">
            Hosting
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <a
            href="/"
            className="text-secondary-text hover:text-primary transition font-medium text-sm"
          >
            Switch to Guest Mode
          </a>
          <NotificationBell />
          <button className="bg-primary text-surface px-5 py-2.5 rounded-full hover:bg-primary/95 transition font-bold text-sm shadow-sm cursor-pointer">
            + Create New Venue
          </button>
        </nav>
      </header>

      {/* Main Container */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-10 flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-extrabold text-primary-text tracking-tight">
            Host Dashboard
          </h1>
          <p className="text-sm text-body-text">
            Manage your venues, availability, bookings, and monitor your earnings.
          </p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Monthly Earnings', value: '₹1,45,200', desc: 'Next payout: July 1st' },
            { label: 'Booking Requests', value: '3 Pending', desc: 'Action required within 24h' },
            { label: 'Average Rating', value: '4.85 ★', desc: 'Based on 45 customer reviews' },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-surface border border-border-custom rounded-2xl p-6 shadow-xs"
            >
              <span className="block text-xs font-bold text-secondary-text uppercase">
                {stat.label}
              </span>
              <span className="block text-3xl font-black text-primary-text my-2">{stat.value}</span>
              <span className="text-xs text-muted-text">{stat.desc}</span>
            </div>
          ))}
        </div>

        {/* Dynamic Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Bookings Requests */}
          <div className="lg:col-span-2 bg-surface border border-border-custom rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-primary-text">Pending Booking Requests</h2>
            {[
              {
                guest: 'Amit Kumar',
                venue: 'Grand Ballroom',
                date: 'Oct 14, 2026',
                price: '₹45,000',
              },
              {
                guest: 'Sarah Wilson',
                venue: 'Skyline Meeting Room',
                date: 'Jul 04, 2026',
                price: '₹8,500',
              },
            ].map((req, i) => (
              <div
                key={i}
                className="border border-border-custom/40 bg-card-bg p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div>
                  <span className="block font-bold text-sm text-primary-text">{req.guest}</span>
                  <span className="block text-xs text-body-text">
                    {req.venue} • {req.date}
                  </span>
                  <span className="block text-xs font-bold text-primary mt-1">{req.price}</span>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button className="flex-1 md:flex-initial bg-primary text-surface text-xs px-4 py-2 rounded-lg font-bold hover:bg-primary/95 cursor-pointer">
                    Accept
                  </button>
                  <button className="flex-1 md:flex-initial bg-transparent border border-border-custom text-secondary-text text-xs px-4 py-2 rounded-lg font-bold hover:bg-background cursor-pointer">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Listed Venues Quick View */}
          <div className="bg-surface border border-border-custom rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-primary-text">Your Venues</h2>
            {[
              {
                name: 'Grand Ballroom',
                type: 'Wedding Hall',
                status: 'Approved',
                statusColor: 'bg-green-100 text-green-800',
              },
              {
                name: 'Skyline Meeting Room',
                type: 'Meeting Room',
                status: 'Approved',
                statusColor: 'bg-green-100 text-green-800',
              },
              {
                name: 'Rustic Farmhouse',
                type: 'Farm House',
                status: 'Pending Review',
                statusColor: 'bg-amber-100 text-amber-800',
              },
            ].map((venue, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-2 border-b border-border-custom/20 last:border-0"
              >
                <div>
                  <span className="block font-bold text-xs text-primary-text">{venue.name}</span>
                  <span className="block text-[10px] text-body-text">{venue.type}</span>
                </div>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${venue.statusColor}`}
                >
                  {venue.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-custom bg-surface py-6 px-6 md:px-12 flex justify-between items-center text-xs text-muted-text">
        <p>© 2026 BookMyVenue Host. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:underline">
            Hosting Resources
          </a>
          <a href="#" className="hover:underline">
            Safety Guidelines
          </a>
        </div>
      </footer>
    </main>
  );
}
