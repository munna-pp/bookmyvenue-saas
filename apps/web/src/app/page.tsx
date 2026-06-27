import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-primary-text flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border-custom bg-surface py-4 px-6 md:px-12 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary tracking-tight">BookMyVenue</span>
          <span className="bg-premium/10 text-premium text-xs px-2.5 py-0.5 rounded-full font-medium">SaaS</span>
        </div>
        <nav className="flex items-center gap-6">
          <a href="/owner" className="text-secondary-text hover:text-primary transition font-medium text-sm">Switch to Hosting</a>
          <a href="/admin" className="text-secondary-text hover:text-primary transition font-medium text-sm">Admin Dashboard</a>
          <button className="bg-primary text-surface px-4 py-2 rounded-full hover:bg-primary/95 transition font-medium text-sm shadow-sm cursor-pointer">
            Sign In
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-12 flex flex-col justify-center items-center text-center gap-8">
        <h1 className="text-4xl md:text-6xl font-extrabold text-primary-text tracking-tight max-w-3xl leading-tight">
          Book Premium Venues for Your <span className="text-primary">Perfect Event</span>
        </h1>
        <p className="text-lg md:text-xl text-body-text max-w-2xl">
          Discover and book wedding halls, convention centers, resorts, birthday spaces, and meeting rooms. Seamlessly manage bookings and online payments.
        </p>

        {/* Search Bar Widget Placeholder */}
        <div className="w-full max-w-4xl bg-surface border border-border-custom rounded-full p-2.5 shadow-md flex flex-col md:flex-row gap-2 items-center justify-between">
          <div className="flex-1 px-6 text-left border-r border-border-custom/50 w-full">
            <span className="block text-xs font-bold text-secondary-text uppercase">Where</span>
            <span className="text-sm text-body-text">Search destinations</span>
          </div>
          <div className="flex-1 px-6 text-left border-r border-border-custom/50 w-full">
            <span className="block text-xs font-bold text-secondary-text uppercase">Venue Type</span>
            <span className="text-sm text-body-text">Select venue type</span>
          </div>
          <div className="flex-1 px-6 text-left w-full">
            <span className="block text-xs font-bold text-secondary-text uppercase">When</span>
            <span className="text-sm text-body-text">Add dates</span>
          </div>
          <button className="bg-primary text-surface w-full md:w-auto px-8 py-3 rounded-full hover:bg-primary/95 transition font-bold text-sm tracking-wide cursor-pointer flex items-center justify-center gap-2">
            Search
          </button>
        </div>

        {/* Quick Links / Grid Options */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4 w-full mt-8">
          {[
            { label: 'Wedding Halls', icon: '💍' },
            { label: 'Conventions', icon: '🏛️' },
            { label: 'Banquets', icon: '🍽️' },
            { label: 'Birthdays', icon: '🎈' },
            { label: 'Resorts', icon: '🌴' },
            { label: 'Meetings', icon: '💼' },
            { label: 'Sports', icon: '⚽' },
            { label: 'Farm Houses', icon: '🏡' },
            { label: 'Event Spaces', icon: '🎭' },
          ].map((type, i) => (
            <div key={i} className="bg-card-bg border border-border-custom/40 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary/60 transition cursor-pointer shadow-xs">
              <span className="text-2xl">{type.icon}</span>
              <span className="text-xs font-bold text-secondary-text text-center">{type.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-custom bg-surface py-6 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-text">
        <p>© 2026 BookMyVenue Inc. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Terms of Service</a>
          <a href="#" className="hover:underline">Sitemap</a>
        </div>
      </footer>
    </main>
  );
}
