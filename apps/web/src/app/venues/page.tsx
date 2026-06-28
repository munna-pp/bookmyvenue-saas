'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Search, SlidersHorizontal, MapPin, Users, IndianRupee, Loader2 } from 'lucide-react';
import { getApiUrl } from '../../utils/api';
import { Venue } from '../../../../../packages/shared-types/src';

const NotificationBell = dynamic(() => import('../../components/NotificationBell'), { ssr: false });

export default function CustomerVenuesBrowse() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [venueType, setVenueType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const amenityOptions = [
    'Air Conditioning', 'WiFi', 'Projector', 'Valet Parking', 
    'Catering Kitchen', 'Outdoor Lawn', 'AV Equipment', 'Swimming Pool'
  ];

  const venueTypes = [
    { value: '', label: 'All Venue Types' },
    { value: 'wedding_hall', label: 'Wedding Hall' },
    { value: 'convention_center', label: 'Convention Center' },
    { value: 'banquet_hall', label: 'Banquet Hall' },
    { value: 'birthday_venue', label: 'Birthday Venue' },
    { value: 'resort', label: 'Resort' },
    { value: 'meeting_room', label: 'Meeting Room' },
    { value: 'sports_ground', label: 'Sports Ground' },
    { value: 'farm_house', label: 'Farm House' },
    { value: 'event_space', label: 'Event Space' },
  ];

  const fetchVenues = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (city) queryParams.append('city', city);
      if (venueType) queryParams.append('venueType', venueType);
      if (capacity) queryParams.append('capacity', capacity);
      if (maxPrice) queryParams.append('maxPrice', maxPrice);
      if (selectedAmenities.length > 0) {
        queryParams.append('amenities', selectedAmenities.join(','));
      }

      const res = await fetch(getApiUrl(`/api/v1/venues?${queryParams.toString()}`));
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned an unexpected error format.');
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to fetch venues');
      }

      setVenues(result.data.venues || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong while loading venues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchVenues();
    }, 400); // Debounce queries slightly to avoid excessive server loads

    return () => clearTimeout(delayDebounceFn);
  }, [search, city, venueType, capacity, maxPrice, selectedAmenities]);

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setCity('');
    setVenueType('');
    setCapacity('');
    setMaxPrice('');
    setSelectedAmenities([]);
  };

  return (
    <main className="min-h-screen bg-background text-primary-text">
      {/* Top Header */}
      <header className="border-b border-border-custom bg-surface py-5 px-6 md:px-12 flex justify-between items-center shadow-xs">
        <a href="/" className="text-2xl font-black text-primary tracking-tight">BookMyVenue</a>
        <div className="flex items-center gap-6">
          <a href="/owner" className="text-sm font-bold text-secondary-text hover:text-primary transition">List Your Venue</a>
          <a href="/bookings" className="text-sm font-bold text-secondary-text hover:text-primary transition">My Bookings</a>
          <NotificationBell />
          <a href="/login" className="text-sm font-bold text-primary hover:underline">Sign In</a>
        </div>
      </header>

      {/* Main Browse Container */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10">
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Explore Unique Venues</h1>
          <p className="text-sm text-body-text">Discover and book the perfect location for weddings, conferences, retreats, and parties.</p>
        </div>

        {/* Search Widget */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface border border-border-custom p-4 rounded-3xl shadow-sm mb-10">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 text-muted-text" size={18} />
            <input
              type="text"
              placeholder="Search title, details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card-bg border border-border-custom/50 rounded-2xl text-sm focus:outline-none focus:border-primary transition"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3.5 text-muted-text" size={18} />
            <input
              type="text"
              placeholder="City (e.g. Mumbai, Goa...)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card-bg border border-border-custom/50 rounded-2xl text-sm focus:outline-none focus:border-primary transition"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={venueType}
              onChange={(e) => setVenueType(e.target.value)}
              className="flex-1 px-4 py-3 bg-card-bg border border-border-custom/50 rounded-2xl text-sm focus:outline-none focus:border-primary transition"
            >
              {venueTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <button
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
              className="md:hidden bg-primary/10 text-primary p-3 rounded-2xl border border-primary/20 hover:bg-primary/20 transition"
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Filters Sidebar (Desktop) */}
          <aside className={`w-full lg:w-64 bg-surface border border-border-custom rounded-3xl p-6 flex flex-col gap-6 shadow-xs ${showFiltersMobile ? 'block' : 'hidden md:block'}`}>
            <div className="flex justify-between items-center pb-2 border-b border-border-custom/20">
              <span className="font-bold text-sm text-primary-text flex items-center gap-2">
                <SlidersHorizontal size={16} /> Filters
              </span>
              <button onClick={resetFilters} className="text-xs font-bold text-primary hover:underline">Reset All</button>
            </div>

            {/* Capacity filter */}
            <div>
              <label className="block text-xs font-bold text-secondary-text uppercase mb-2">Minimum Capacity</label>
              <div className="relative">
                <Users className="absolute left-3 top-3 text-muted-text" size={16} />
                <input
                  type="number"
                  placeholder="e.g. 100 guests"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-card-bg border border-border-custom/60 rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Max Budget filter */}
            <div>
              <label className="block text-xs font-bold text-secondary-text uppercase mb-2">Max Price / Day (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-3 text-muted-text" size={16} />
                <input
                  type="number"
                  placeholder="e.g. 100000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-card-bg border border-border-custom/60 rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Amenities Checklist */}
            <div>
              <label className="block text-xs font-bold text-secondary-text uppercase mb-2">Amenities</label>
              <div className="flex flex-col gap-2">
                {amenityOptions.map((amenity) => (
                  <label key={amenity} className="flex items-center gap-2 text-xs font-medium text-body-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                      className="rounded accent-primary text-surface border-border-custom"
                    />
                    {amenity}
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Venues Grid */}
          <div className="flex-1 w-full">
            {errorMsg && (
              <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 rounded-2xl text-xs text-red-700 font-semibold">
                {errorMsg}
              </div>
            )}

            {loading ? (
              // Skeleton Loading Grid
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-surface border border-border-custom/50 rounded-3xl overflow-hidden shadow-xs animate-pulse">
                    <div className="h-48 bg-border-custom/20 w-full" />
                    <div className="p-5 flex flex-col gap-3">
                      <div className="h-4 bg-border-custom/30 rounded-full w-2/3" />
                      <div className="h-3 bg-border-custom/20 rounded-full w-full" />
                      <div className="h-3 bg-border-custom/20 rounded-full w-5/6" />
                      <div className="flex justify-between items-center mt-2 pt-3 border-t border-border-custom/10">
                        <div className="h-4 bg-border-custom/30 rounded-full w-1/4" />
                        <div className="h-4 bg-border-custom/30 rounded-full w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : venues.length === 0 ? (
              // Empty State
              <div className="flex flex-col justify-center items-center py-20 bg-surface border border-border-custom/50 rounded-3xl text-center px-4">
                <span className="text-4xl mb-4">🏛️</span>
                <h3 className="text-lg font-bold text-primary-text">No Venues Found</h3>
                <p className="text-xs text-body-text max-w-sm mt-1">We couldn't find any approved venues matching your exact filters. Try broadening your criteria or reset filters.</p>
                <button
                  onClick={resetFilters}
                  className="mt-6 bg-primary text-surface px-5 py-2.5 rounded-full font-bold text-xs shadow-xs hover:bg-primary/95 transition cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              // Real Data Grid
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {venues.map((venue) => (
                  <article
                    key={venue.id}
                    onClick={() => window.location.href = `/venues/${venue.slug}`}
                    className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition duration-200 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Image */}
                      <div className="h-48 bg-border-custom/20 relative overflow-hidden">
                        <img
                          src={venue.featuredImage || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80'}
                          alt={venue.title}
                          className="w-full h-full object-cover hover:scale-102 transition duration-500"
                        />
                        <span className="absolute top-3 left-3 bg-surface/90 backdrop-blur-xs text-[10px] font-bold text-primary px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {venue.venueType.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Info Body */}
                      <div className="p-5 flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{venue.category}</span>
                        <h2 className="text-base font-extrabold text-primary-text line-clamp-1">{venue.title}</h2>
                        <p className="text-xs text-body-text line-clamp-2 mt-1">{venue.description}</p>
                      </div>
                    </div>

                    {/* Pricing / Capacity Details footer */}
                    <div className="px-5 py-4 border-t border-border-custom/20 bg-card-bg flex justify-between items-center text-xs font-semibold">
                      <span className="text-body-text flex items-center gap-1">
                        <Users size={14} className="text-muted-text" /> Max {venue.capacity}
                      </span>
                      <span className="text-primary font-bold">
                        ₹{venue.pricing.pricePerDay.toLocaleString('en-IN')} <span className="text-[10px] text-muted-text font-normal">/ day</span>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
