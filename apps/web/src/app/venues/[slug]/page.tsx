'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MapPin, Users, Info, Calendar, ShieldCheck, CheckCircle2, ChevronLeft, ChevronRight, IndianRupee, Loader2, AlertCircle, Clock, Gift } from 'lucide-react';
import { getApiUrl } from '../../../utils/api';
import { Venue } from '@bookmyvenue/shared-types';

export default function CustomerVenueDetails() {
  const params = useParams();
  const slug = params.slug as string;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Gallery slider state
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  
  // Real booking states
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Form parameters
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [guestCount, setGuestCount] = useState(50);
  const [eventType, setEventType] = useState('wedding');
  const [specialRequests, setSpecialRequests] = useState('');

  // Calendar availability lists
  const [bookedDates, setBookedDates] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchVenueDetails = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(getApiUrl(`/api/v1/venues/${slug}`));
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an unexpected page instead of API response.');
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to load venue details');
      }

      const v = result.data.venue;
      setVenue(v);
      
      // Load availability calendar for this venue
      fetchCalendar(v.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong while retrieving venue details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendar = async (venueId: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/venues/${venueId}/calendar`));
      const result = await res.json();
      if (res.ok) {
        setBookedDates(result.data.booked || []);
        setBlockedDates(result.data.blocked || []);
      }
    } catch (err) {
      console.error('Failed to load availability calendar:', err);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchVenueDetails();
    }
  }, [slug]);

  const handleNextImage = () => {
    if (!venue) return;
    setActiveImgIndex((activeImgIndex + 1) % venue.images.length);
  };

  const handlePrevImage = () => {
    if (!venue) return;
    setActiveImgIndex((activeImgIndex - 1 + venue.images.length) % venue.images.length);
  };

  const handleRequestBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venue) return;
    setBookingLoading(true);
    setBookingError(null);

    const payload = {
      venueId: venue.id,
      eventType,
      eventDate,
      startTime,
      endTime,
      guestCount,
      specialRequests,
    };

    try {
      const res = await fetch(getApiUrl('/api/v1/bookings'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Please log in as a customer to book.');
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to create booking request');
      }

      setBookingSuccess(true);
      // Reload calendar to show new booked slot
      fetchCalendar(venue.id);
    } catch (err: any) {
      setBookingError(err.message || 'Verification failed. Make sure you are logged in as customer.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center gap-4">
        <Loader2 size={36} className="animate-spin text-primary" />
        <span className="text-sm font-semibold text-secondary-text">Loading venue parameters...</span>
      </div>
    );
  }

  if (errorMsg || !venue) {
    return (
      <main className="min-h-screen bg-background flex flex-col justify-center items-center px-4">
        <div className="w-full max-w-md bg-surface border border-border-custom rounded-3xl p-8 text-center shadow-md">
          <span className="text-4xl">⚠️</span>
          <h1 className="text-lg font-bold text-primary-text mt-3">Venue Loading Failed</h1>
          <p className="text-xs text-body-text mt-2">{errorMsg || 'The venue does not exist or has been deleted.'}</p>
          <button
            onClick={() => window.location.href = '/venues'}
            className="mt-6 bg-primary text-surface px-6 py-2.5 rounded-full font-bold text-xs shadow-xs hover:bg-primary/95 transition cursor-pointer"
          >
            Back to Venues Browse
          </button>
        </div>
      </main>
    );
  }

  // Calculate pricing values
  const rate = venue.pricing.pricePerDay;
  const taxes = Math.round(rate * 0.18);
  const cleaning = venue.pricing.cleaningFee || 0;
  const deposit = venue.pricing.securityDeposit || 0;
  const total = rate + taxes + cleaning + deposit;

  // Tomorrow for minimum date picker
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <main className="min-h-screen bg-background text-primary-text pb-20">
      {/* Top Header */}
      <header className="border-b border-border-custom bg-surface py-5 px-6 md:px-12 flex justify-between items-center shadow-xs">
        <a href="/venues" className="text-2xl font-black text-primary tracking-tight">BookMyVenue</a>
        <div className="flex gap-4 items-center">
          <a href="/bookings" className="text-xs font-bold text-secondary-text hover:text-primary transition">My Bookings</a>
          <a href="/venues" className="text-xs font-bold text-secondary-text hover:text-primary transition">← Back to Browse</a>
        </div>
      </header>

      {/* Main Details Body */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 flex flex-col gap-8">
        
        {/* Title and Category Header */}
        <div>
          <span className="text-xs font-bold text-accent uppercase tracking-wider">{venue.category}</span>
          <h1 className="text-3xl font-extrabold text-primary-text mt-1">{venue.title}</h1>
          <p className="text-xs text-body-text flex items-center gap-1 mt-2">
            <MapPin size={14} className="text-muted-text" /> {venue.address.street}, {venue.address.city}, {venue.address.state}, {venue.address.country}
          </p>
        </div>

        {/* Responsive Grid: Image Carousel & Booking Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main info and Carousel columns */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* Image Slider Component */}
            <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-sm relative h-96 md:h-[450px]">
              {venue.images.length > 0 ? (
                <>
                  <img
                    src={venue.images[activeImgIndex]}
                    alt={`${venue.title} - view ${activeImgIndex + 1}`}
                    className="w-full h-full object-cover transition duration-300"
                  />
                  {venue.images.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-surface/90 backdrop-blur-xs p-2 rounded-full border border-border-custom hover:bg-surface transition cursor-pointer"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-surface/90 backdrop-blur-xs p-2 rounded-full border border-border-custom hover:bg-surface transition cursor-pointer"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                  {/* Indicator count */}
                  <span className="absolute bottom-4 right-4 bg-surface/95 backdrop-blur-xs text-[10px] font-bold text-primary px-3 py-1 rounded-full border border-border-custom">
                    {activeImgIndex + 1} / {venue.images.length}
                  </span>
                </>
              ) : (
                <div className="w-full h-full bg-border-custom/10 flex items-center justify-center text-muted-text text-sm">
                  No images uploaded for this venue
                </div>
              )}
            </div>

            {/* Thumbnail previews */}
            {venue.images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {venue.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImgIndex(i)}
                    className={`h-16 w-24 rounded-xl border-2 overflow-hidden flex-shrink-0 cursor-pointer transition ${i === activeImgIndex ? 'border-primary' : 'border-border-custom/50'}`}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Description Card */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 flex flex-col gap-4 shadow-xs">
              <h2 className="text-xl font-bold text-primary-text border-b border-border-custom/20 pb-3">About Venue</h2>
              <p className="text-sm text-body-text leading-relaxed whitespace-pre-line">{venue.description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border-custom/20">
                <div>
                  <span className="block text-[10px] font-bold text-secondary-text uppercase">Capacity</span>
                  <span className="text-sm font-extrabold text-primary-text flex items-center gap-1.5 mt-1">
                    <Users size={16} className="text-primary" /> {venue.capacity} guests
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-secondary-text uppercase">Venue Type</span>
                  <span className="text-sm font-extrabold text-primary-text mt-1 block capitalize">
                    {venue.venueType.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-secondary-text uppercase">Rating</span>
                  <span className="text-sm font-extrabold text-primary-text mt-1 block">
                    ★ {venue.rating || 'New'} <span className="text-[10px] text-muted-text font-normal">({venue.reviewCount} reviews)</span>
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-secondary-text uppercase">Category</span>
                  <span className="text-sm font-extrabold text-primary-text mt-1 block truncate">
                    {venue.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Booking Calendar Busy List */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 flex flex-col gap-4 shadow-xs">
              <h2 className="text-xl font-bold text-primary-text border-b border-border-custom/20 pb-3">Availability Calendar</h2>
              <p className="text-xs text-body-text">The following slots are already booked or reserved by maintenance guidelines:</p>
              
              {bookedDates.length === 0 && blockedDates.length === 0 ? (
                <div className="p-4 bg-green-50/50 border border-green-200/50 rounded-xl text-green-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} /> All dates are currently open and available!
                </div>
              ) : (
                <div className="space-y-2">
                  {bookedDates.map((b, i) => (
                    <div key={i} className="flex justify-between items-center bg-card-bg/60 border border-border-custom/30 rounded-xl p-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-red-500" />
                        <span className="font-extrabold">{new Date(b.date).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-body-text flex items-center gap-1"><Clock size={12} /> {b.startTime} - {b.endTime}</span>
                        <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">RESERVED</span>
                      </div>
                    </div>
                  ))}
                  {blockedDates.map((av, i) => (
                    <div key={i} className="flex justify-between items-center bg-amber-50/30 border border-amber-200/50 rounded-xl p-3 text-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={14} className="text-amber-500" />
                        <span className="font-extrabold">{new Date(av.startDate).toLocaleDateString()} to {new Date(av.endDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-body-text font-medium">{av.reason}</span>
                        <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">BLOCKED</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Amenities Grid */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 flex flex-col gap-4 shadow-xs">
              <h2 className="text-xl font-bold text-primary-text border-b border-border-custom/20 pb-3">Venue Amenities</h2>
              {venue.amenities.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                  {venue.amenities.map((amenity, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-semibold text-body-text">
                      <CheckCircle2 size={16} className="text-primary" /> {amenity}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-text">No amenities specified for this listing.</span>
              )}
            </div>

          </div>

          {/* Booking / Checkout Widget Card Column */}
          <div className="sticky top-6 flex flex-col gap-6">
            
            {/* Booking Card */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 shadow-md flex flex-col gap-6">
              
              <div>
                <span className="text-xs font-bold text-secondary-text uppercase">Day Rate</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-primary-text">₹{venue.pricing.pricePerDay.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-muted-text font-normal">/ day</span>
                </div>
              </div>

              {/* Status approval alert */}
              {venue.approvalStatus !== 'APPROVED' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 font-semibold flex gap-2">
                  <Info size={14} className="flex-shrink-0 mt-0.5" />
                  <span>This venue listing is currently in PENDING approval stage. Online bookings are locked.</span>
                </div>
              )}

              {bookingSuccess ? (
                <div className="p-5 bg-green-50 border border-green-200 rounded-2xl text-center flex flex-col items-center gap-3">
                  <span className="text-3xl">🎉</span>
                  <h4 className="text-sm font-bold text-green-800">Booking Request Created!</h4>
                  <p className="text-xs text-green-700 leading-relaxed">Your reservation request has been successfully submitted to the venue owner for approval.</p>
                  <button
                    onClick={() => window.location.href = '/bookings'}
                    className="w-full mt-2 bg-green-600 hover:bg-green-700 text-surface py-3 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Go to Booking History
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestBooking} className="flex flex-col gap-4">
                  {bookingError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold rounded-xl flex gap-1.5 items-start">
                      <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-secondary-text uppercase mb-1" htmlFor="date">
                      Booking Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3.5 text-muted-text" size={16} />
                      <input
                        id="date"
                        type="date"
                        required
                        min={tomorrowStr}
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-3 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-secondary-text uppercase mb-1" htmlFor="startTime">
                        Start Time
                      </label>
                      <input
                        id="startTime"
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-3 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-secondary-text uppercase mb-1" htmlFor="endTime">
                        End Time
                      </label>
                      <input
                        id="endTime"
                        type="time"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-3 py-3 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-secondary-text uppercase mb-1" htmlFor="guestCount">
                        Guests count
                      </label>
                      <input
                        id="guestCount"
                        type="number"
                        required
                        min={1}
                        max={venue.capacity}
                        value={guestCount}
                        onChange={(e) => setGuestCount(Number(e.target.value))}
                        className="w-full px-3 py-3 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary font-bold text-primary-text"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-secondary-text uppercase mb-1" htmlFor="eventType">
                        Event Type
                      </label>
                      <select
                        id="eventType"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full px-3 py-3 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary font-bold text-primary-text"
                      >
                        <option value="wedding">Wedding</option>
                        <option value="reception">Reception</option>
                        <option value="birthday">Birthday Party</option>
                        <option value="conference">Conference</option>
                        <option value="exhibition">Exhibition</option>
                        <option value="concert">Concert</option>
                        <option value="corporate_event">Corporate Event</option>
                        <option value="gathering">Social Gathering</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-secondary-text uppercase mb-1" htmlFor="specialRequests">
                      Special Guidelines / Requests
                    </label>
                    <textarea
                      id="specialRequests"
                      rows={2}
                      placeholder="e.g. Stage setup guidelines, custom catering vendor permissions..."
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      className="w-full px-3 py-3 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Pricing Details Breakdown */}
                  <div className="space-y-2.5 pt-4 border-t border-border-custom/25 text-xs text-body-text">
                    <div className="flex justify-between">
                      <span>Venue rental (1 day)</span>
                      <span className="font-bold text-primary-text">₹{rate.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>18% GST Service Tax</span>
                      <span className="font-bold text-primary-text">₹{taxes.toLocaleString('en-IN')}</span>
                    </div>
                    {cleaning > 0 && (
                      <div className="flex justify-between">
                        <span>Cleaning fee</span>
                        <span className="font-bold text-primary-text">₹{cleaning.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {deposit > 0 && (
                      <div className="flex justify-between pb-2 border-b border-border-custom/10">
                        <span>Security deposit (Refundable)</span>
                        <span className="font-bold text-primary-text">₹{deposit.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    
                    {/* Total */}
                    <div className="flex justify-between text-sm font-extrabold text-primary pt-1.5">
                      <span>Total Invoice</span>
                      <span>₹{total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={bookingLoading || venue.approvalStatus !== 'APPROVED'}
                    className="w-full bg-primary text-surface py-3.5 rounded-xl font-bold text-sm shadow-sm hover:bg-primary/95 transition flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {bookingLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Creating Request...
                      </>
                    ) : (
                      'Request Booking Now'
                    )}
                  </button>
                </form>
              )}

              <div className="flex gap-2 items-center justify-center text-[10px] text-muted-text font-medium pt-2 border-t border-border-custom/10">
                <ShieldCheck size={14} className="text-accent" /> Secure Payment & Booking Protection
              </div>

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}
