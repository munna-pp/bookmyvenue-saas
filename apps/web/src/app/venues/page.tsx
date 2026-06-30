'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Search, SlidersHorizontal, MapPin, Users, IndianRupee, Star, Map as MapIcon, List, Navigation } from 'lucide-react';
import { getApiUrl } from '../../utils/api';
import { Venue } from '../../../../../packages/shared-types/src';

const NotificationBell = dynamic(() => import('../../components/NotificationBell'), { ssr: false });
const LeafletMap = dynamic(() => import('../../components/LeafletMap'), { ssr: false });

export default function CustomerVenuesBrowse() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Pagination & Total
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 6;

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ text: string; type: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [city, setCity] = useState('');
  const [venueType, setVenueType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [rating, setRating] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Geo state
  const [useGeo, setUseGeo] = useState(false);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState('10'); // Default 10km
  const [geoError, setGeoError] = useState<string | null>(null);

  // View state
  const [showMap, setShowMap] = useState(false); // Mobile toggle
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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

  const ratingOptions = [
    { value: '', label: 'Any Rating' },
    { value: '4.5', label: '4.5+ ★' },
    { value: '4.0', label: '4.0+ ★' },
    { value: '3.5', label: '3.5+ ★' },
    { value: '3.0', label: '3.0+ ★' },
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest Listings' },
    { value: 'price low-high', label: 'Price: Low to High' },
    { value: 'price high-low', label: 'Price: High to Low' },
    { value: 'highest_rated', label: 'Highest Rated' },
    { value: 'most_reviewed', label: 'Most Reviewed' },
    { value: 'nearest', label: 'Nearest Coordinates' },
  ];

  const radiusOptions = [
    { value: '1', label: 'Within 1 km' },
    { value: '5', label: 'Within 5 km' },
    { value: '10', label: 'Within 10 km' },
    { value: '25', label: 'Within 25 km' },
    { value: '50', label: 'Within 50 km' },
    { value: '100', label: 'Within 100 km' },
  ];

  // Request user geo coordinates
  const handleGeoEnable = () => {
    if (useGeo) {
      setUseGeo(false);
      setGeoCoords(null);
      setGeoError(null);
      return;
    }

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setUseGeo(true);
        setGeoError(null);
        setPage(1);
      },
      (err) => {
        setGeoError(`Unable to retrieve location: ${err.message}`);
        setUseGeo(false);
      }
    );
  };

  // Fetch suggestions with debounce
  useEffect(() => {
    if (!search || search.trim() === '') {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(getApiUrl(`/api/v1/search/suggestions?q=${encodeURIComponent(search)}`));
        const json = await res.json();
        if (res.ok && json.data.suggestions) {
          setSuggestions(json.data.suggestions);
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Click outside suggestions listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search results
  const fetchVenues = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let endpoint = '';
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());

      if (useGeo && geoCoords) {
        // Geospatial radial search
        endpoint = '/api/v1/search/nearby';
        queryParams.append('lat', geoCoords.lat.toString());
        queryParams.append('lng', geoCoords.lng.toString());
        queryParams.append('radius', radius);
      } else {
        // Advanced keyword and filter search
        endpoint = '/api/v1/search/venues';
        if (search) queryParams.append('q', search);
        if (city) queryParams.append('city', city);
        if (venueType) queryParams.append('venueType', venueType);
        if (capacity) queryParams.append('capacity', capacity);
        if (minPrice) queryParams.append('minPrice', minPrice);
        if (maxPrice) queryParams.append('maxPrice', maxPrice);
        if (rating) queryParams.append('rating', rating);
        if (featuredOnly) queryParams.append('featured', 'true');
        if (eventDate) queryParams.append('date', eventDate);
        if (sortBy) queryParams.append('sortBy', sortBy);
        if (selectedAmenities.length > 0) {
          queryParams.append('amenities', selectedAmenities.join(','));
        }
      }

      const res = await fetch(getApiUrl(`${endpoint}?${queryParams.toString()}`));
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.message || 'Failed to fetch search results');
      }

      setVenues(result.data.venues || []);
      setTotalPages(result.data.pages || 1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong while executing search.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, [page, useGeo, geoCoords, radius, city, venueType, capacity, minPrice, maxPrice, rating, selectedAmenities, featuredOnly, eventDate, sortBy]);

  // Handle autocomplete suggestion select
  const selectSuggestion = (text: string) => {
    setSearch(text);
    setShowSuggestions(false);
    setPage(1);
    fetchVenues();
  };

  const toggleAmenity = (amenity: string) => {
    setPage(1);
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
    setMinPrice('');
    setMaxPrice('');
    setRating('');
    setEventDate('');
    setSelectedAmenities([]);
    setFeaturedOnly(false);
    setSortBy('newest');
    setUseGeo(false);
    setGeoCoords(null);
    setGeoError(null);
    setPage(1);
  };

  // Convert Venues to Leaflet markers format
  const mapMarkers = venues
    .filter((v) => v.location && v.location.coordinates)
    .map((v) => ({
      id: v.id,
      title: v.title,
      price: v.pricing.pricePerDay,
      lat: v.location.coordinates[1],
      lng: v.location.coordinates[0],
      slug: v.slug,
      imageUrl: v.featuredImage,
      venueType: v.venueType,
    }));

  return (
    <main className="min-h-screen bg-background text-primary-text flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border-custom bg-surface py-4 px-6 md:px-12 flex justify-between items-center shadow-xs z-10">
        <a href="/" className="text-2xl font-black text-primary tracking-tight">BookMyVenue</a>
        <div className="flex items-center gap-6">
          <a href="/owner" className="text-sm font-bold text-secondary-text hover:text-primary transition">List Your Venue</a>
          <a href="/bookings" className="text-sm font-bold text-secondary-text hover:text-primary transition">My Bookings</a>
          <a href="/wishlist" className="text-sm font-bold text-secondary-text hover:text-primary transition">Wishlist</a>
          <NotificationBell />
          <a href="/login" className="text-sm font-bold text-primary hover:underline">Sign In</a>
        </div>
      </header>

      {/* Hero Section / Airbnb style search bar */}
      <section className="bg-surface border-b border-border-custom px-6 py-6 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between z-10">
        <div className="w-full md:max-w-2xl relative" ref={suggestionsRef}>
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 text-muted-text" size={18} />
            <input
              type="text"
              placeholder="Search wedding halls, banquet halls, convention centers..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full pl-10 pr-4 py-3 bg-card-bg border border-border-custom/80 rounded-2xl text-sm focus:outline-none focus:border-primary transition"
            />
          </div>

          {/* Autocomplete suggestion drop-down */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-surface border border-border-custom rounded-2xl shadow-lg z-30 max-h-60 overflow-y-auto">
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => selectSuggestion(item.text)}
                  className="px-4 py-3 hover:bg-card-bg flex items-center gap-3 cursor-pointer text-sm"
                >
                  {item.type === 'city' ? <MapPin size={16} className="text-primary" /> : item.type === 'type' ? <SlidersHorizontal size={16} className="text-accent" /> : <Star size={16} className="text-yellow-500" />}
                  <span>{item.text}</span>
                  <span className="text-[10px] bg-muted-text/10 text-muted-text px-2 py-0.5 rounded-full capitalize ml-auto">{item.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sorting and view toggle header actions */}
        <div className="flex gap-3 w-full md:w-auto justify-end">
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            disabled={useGeo}
            className="px-4 py-2.5 bg-card-bg border border-border-custom rounded-xl text-sm font-semibold focus:outline-none focus:border-primary transition disabled:opacity-50"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Toggle Map & List split view buttons */}
          <button
            onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-2 bg-primary text-surface px-4 py-2.5 rounded-xl font-bold text-sm shadow-xs hover:bg-primary/95 transition cursor-pointer"
          >
            {showMap ? <List size={16} /> : <MapIcon size={16} />}
            <span>{showMap ? 'Show List' : 'Show Map'}</span>
          </button>
        </div>
      </section>

      {/* Split Screen search layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Result cards list */}
        <div className={`w-full ${showMap ? 'hidden' : 'flex'} lg:flex lg:w-1/2 flex-col overflow-y-auto px-6 py-6 border-r border-border-custom`}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-black tracking-tight">Available Spaces ({venues.length})</h1>
            <button
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
              className="lg:hidden flex items-center gap-2 bg-primary/10 text-primary px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-primary/20 transition"
            >
              <SlidersHorizontal size={14} /> Filter drawer
            </button>
          </div>

          {errorMsg && (
            <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 rounded-2xl text-xs text-red-700 font-semibold">
              {errorMsg}
            </div>
          )}

          {loading ? (
            // Skeleton Loader Grid
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[...Array(limit)].map((_, i) => (
                <div key={i} className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs animate-pulse">
                  <div className="h-44 bg-border-custom/20 w-full" />
                  <div className="p-5 flex flex-col gap-3">
                    <div className="h-4 bg-border-custom/30 rounded-full w-2/3" />
                    <div className="h-3 bg-border-custom/20 rounded-full w-full" />
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
            <div className="flex flex-col justify-center items-center py-20 bg-surface border border-border-custom rounded-3xl text-center px-4">
              <span className="text-4xl mb-4">🏛️</span>
              <h3 className="text-lg font-bold text-primary-text">No Venues Match</h3>
              <p className="text-xs text-body-text max-w-sm mt-1">We couldn't find any approved venues matching your filters. Broaden your search criteria or reset filters.</p>
              <button
                onClick={resetFilters}
                className="mt-6 bg-primary text-surface px-5 py-2.5 rounded-full font-bold text-xs shadow-xs hover:bg-primary/95 transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            // Real Data listings
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {venues.map((venue) => (
                <article
                  key={venue.id}
                  onClick={() => window.location.href = `/venues/${venue.slug}`}
                  className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="h-44 bg-border-custom/20 relative overflow-hidden">
                      <img
                        src={venue.featuredImage || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80'}
                        alt={venue.title}
                        className="w-full h-full object-cover hover:scale-102 transition duration-500"
                      />
                      <span className="absolute top-3 left-3 bg-surface/90 backdrop-blur-xs text-[10px] font-bold text-primary px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {venue.venueType.replace('_', ' ')}
                      </span>
                      {venue.rating > 0 && (
                        <span className="absolute top-3 right-3 bg-yellow-500 text-surface text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Star size={10} fill="currentColor" /> {venue.rating.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <div className="p-5 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{venue.category}</span>
                      <h2 className="text-base font-extrabold text-primary-text line-clamp-1">{venue.title}</h2>
                      <p className="text-xs text-body-text line-clamp-2 mt-1">{venue.city}, {venue.state}</p>
                    </div>
                  </div>

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

          {/* Pagination control panel footer */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8 pt-6 border-t border-border-custom/20">
              <button
                disabled={page === 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="px-4 py-2 bg-card-bg border border-border-custom rounded-xl text-xs font-bold hover:bg-card-bg/85 disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs text-secondary-text font-medium">Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                className="px-4 py-2 bg-card-bg border border-border-custom rounded-xl text-xs font-bold hover:bg-card-bg/85 disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Leaflet OSM Map */}
        <div className={`w-full ${showMap ? 'flex' : 'hidden'} lg:flex lg:w-1/2 h-full bg-card-bg relative`}>
          <LeafletMap
            markers={mapMarkers}
            zoom={useGeo ? 13 : 12}
            radiusCircle={
              useGeo && geoCoords
                ? {
                    lat: geoCoords.lat,
                    lng: geoCoords.lng,
                    radiusInMeters: parseInt(radius, 10) * 1000,
                  }
                : undefined
            }
          />
        </div>

        {/* Advanced Filters Drawer Panel */}
        <div className={`fixed top-0 bottom-0 left-0 w-80 bg-surface border-r border-border-custom shadow-xl z-20 transition duration-300 transform flex flex-col justify-between ${showFiltersMobile || !showFiltersMobile ? 'lg:translate-x-0' : '-translate-x-full'} ${showFiltersMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
            <div className="flex justify-between items-center pb-4 border-b border-border-custom/40">
              <span className="font-extrabold text-base flex items-center gap-2">
                <SlidersHorizontal size={18} /> Filters
              </span>
              <button onClick={resetFilters} className="text-xs font-bold text-primary hover:underline">Reset All</button>
            </div>

            {/* Geolocation Radial Search Toggle */}
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-primary-text flex items-center gap-1.5">
                  <Navigation size={14} className="text-primary" /> Nearby Radial Search
                </span>
                <input
                  type="checkbox"
                  checked={useGeo}
                  onChange={handleGeoEnable}
                  className="rounded accent-primary w-4 h-4 cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-muted-text">Find venues around your current live coordinates.</p>
              
              {geoError && <p className="text-[10px] text-red-500 font-medium">{geoError}</p>}
              
              {useGeo && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-secondary-text font-bold">RADIUS:</span>
                  <select
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    className="flex-1 px-2.5 py-1 bg-card-bg border border-border-custom rounded-lg text-xs"
                  >
                    {radiusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Availability Date Filter */}
            <div>
              <label className="block text-xs font-bold text-secondary-text uppercase mb-2">Availability Date</label>
              <input
                type="date"
                value={eventDate}
                disabled={useGeo}
                onChange={(e) => {
                  setEventDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-card-bg border border-border-custom rounded-xl text-xs focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>

            {/* City location Filter */}
            <div>
              <label className="block text-xs font-bold text-secondary-text uppercase mb-2">City Name</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 text-muted-text" size={15} />
                <input
                  type="text"
                  placeholder="e.g. Goa, Mumbai"
                  value={city}
                  disabled={useGeo}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-card-bg border border-border-custom rounded-xl text-xs focus:outline-none focus:border-primary disabled:opacity-50"
                />
              </div>
            </div>

            {/* Min and Max Budget price inputs */}
            <div>
              <label className="block text-xs font-bold text-secondary-text uppercase mb-2">Budget Range / Day</label>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <IndianRupee className="absolute left-2.5 top-2.5 text-muted-text" size={13} />
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    disabled={useGeo}
                    onChange={(e) => {
                      setMinPrice(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-8 pr-2 py-2 bg-card-bg border border-border-custom rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <span className="text-muted-text text-xs font-bold">-</span>
                <div className="relative flex-1">
                  <IndianRupee className="absolute left-2.5 top-2.5 text-muted-text" size={13} />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    disabled={useGeo}
                    onChange={(e) => {
                      setMaxPrice(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-8 pr-2 py-2 bg-card-bg border border-border-custom rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Capacity filter */}
            <div>
              <label className="block text-xs font-bold text-secondary-text uppercase mb-2">Min Capacity</label>
              <div className="relative">
                <Users className="absolute left-3 top-2.5 text-muted-text" size={15} />
                <input
                  type="number"
                  placeholder="Guests count"
                  value={capacity}
                  disabled={useGeo}
                  onChange={(e) => {
                    setCapacity(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-card-bg border border-border-custom rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Star Rating select filter */}
            <div>
              <label className="block text-xs font-bold text-secondary-text uppercase mb-2">Star Rating</label>
              <select
                value={rating}
                disabled={useGeo}
                onChange={(e) => {
                  setRating(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-card-bg border border-border-custom rounded-xl text-xs focus:outline-none"
              >
                {ratingOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Featured and High Quality only filter */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-secondary-text uppercase">Featured Venues Only</span>
              <input
                type="checkbox"
                checked={featuredOnly}
                disabled={useGeo}
                onChange={(e) => {
                  setFeaturedOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded accent-primary w-4 h-4 cursor-pointer disabled:opacity-50"
              />
            </div>

            {/* Amenities Checklists */}
            <div>
              <label className="block text-xs font-bold text-secondary-text uppercase mb-2">Amenities</label>
              <div className="flex flex-col gap-2">
                {amenityOptions.map((amenity) => (
                  <label key={amenity} className="flex items-center gap-2.5 text-xs font-medium text-body-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(amenity)}
                      disabled={useGeo}
                      onChange={() => toggleAmenity(amenity)}
                      className="rounded accent-primary text-surface border-border-custom w-4 h-4"
                    />
                    {amenity}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-card-bg border-t border-border-custom flex gap-2 lg:hidden">
            <button
              onClick={() => setShowFiltersMobile(false)}
              className="flex-1 bg-primary text-surface py-2.5 rounded-xl font-bold text-xs"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
