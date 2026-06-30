'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { MapPin, Users, Info, Calendar, ShieldCheck, CheckCircle2, ChevronLeft, ChevronRight, IndianRupee, Loader2, AlertCircle, Clock, Gift, Navigation } from 'lucide-react';
import { getApiUrl } from '../../../utils/api';
import { Venue } from '@bookmyvenue/shared-types';

const NotificationBell = dynamic(() => import('../../../components/NotificationBell'), { ssr: false });
const LeafletMap = dynamic(() => import('../../../components/LeafletMap'), { ssr: false });

export default function CustomerVenueDetails() {
  const params = useParams();
  const slug = params.slug as string;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Gallery slider state
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [nearbyVenues, setNearbyVenues] = useState<any[]>([]);
  
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

  // Wishlist and Reviews state variables
  const [inWishlist, setInWishlist] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPages, setReviewPages] = useState(1);
  const [reviewSort, setReviewSort] = useState('newest');
  const [starDistribution, setStarDistribution] = useState<any>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

  // Review submission inputs
  const [completedBookings, setCompletedBookings] = useState<any[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState('');
  const [newReviewText, setNewReviewText] = useState('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null);

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
      
      // Fetch reviews and wishlist check
      fetchReviews(v.id, reviewPage, reviewSort);
      checkWishlist(v.id);
      fetchCompletedBookings(v.id);

      if (v.location && v.location.coordinates) {
        fetchNearbyVenues(v.location.coordinates[1], v.location.coordinates[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong while retrieving venue details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyVenues = async (lat: number, lng: number) => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/search/nearby?lat=${lat}&lng=${lng}&radius=25&limit=4`));
      const json = await res.json();
      if (res.ok) {
        setNearbyVenues((json.data.venues || []).filter((v: any) => (v.slug || v._id) !== slug).slice(0, 3));
      }
    } catch (err) {
      console.error('Failed to load nearby venues:', err);
    }
  };

  const fetchReviews = async (venueId: string, pageNum: number, sort: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/venues/${venueId}/reviews?page=${pageNum}&limit=5&sortBy=${sort}`));
      const result = await res.json();
      if (res.ok) {
        setReviews(result.data.reviews || []);
        setTotalReviews(result.data.total || 0);
        setReviewPages(result.data.pages || 1);
        setStarDistribution(result.data.starDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
      }
    } catch (err) {
      console.error('Failed to load venue reviews:', err);
    }
  };

  const checkWishlist = async (venueId: string) => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    try {
      const res = await fetch(getApiUrl('/api/v1/wishlist'), { headers });
      const result = await res.json();
      if (res.ok) {
        const found = result.data.wishlist.some((item: any) => item.venueId === venueId);
        setInWishlist(found);
      }
    } catch (err) {
      console.error('Failed to check wishlist status:', err);
    }
  };

  const toggleWishlist = async () => {
    if (!venue) return;
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      alert('Please sign in to save venues to your wishlist.');
      return;
    }

    try {
      const method = inWishlist ? 'DELETE' : 'POST';
      const url = getApiUrl(`/api/v1/wishlist/${venue.id}`);
      const res = await fetch(url, { method, headers });
      if (res.ok) {
        setInWishlist(!inWishlist);
      } else {
        alert('Failed to update wishlist.');
      }
    } catch (err) {
      alert('Network error updating wishlist.');
    }
  };

  const fetchCompletedBookings = async (venueId: string) => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    try {
      const res = await fetch(getApiUrl('/api/v1/bookings/my'), { headers });
      const result = await res.json();
      if (res.ok) {
        // Find bookings matching this venue and status COMPLETED
        const list = (result.data.bookings || []).filter((b: any) => 
          b.venueId === venueId && b.bookingStatus === 'COMPLETED'
        );
        setCompletedBookings(list);
        if (list.length > 0) {
          setSelectedBookingId(list[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user completed bookings:', err);
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId) {
      setReviewSubmitError('Please select a booking to review.');
      return;
    }

    setReviewSubmitError(null);
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    };

    try {
      const res = await fetch(getApiUrl('/api/v1/reviews'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bookingId: selectedBookingId,
          rating: newRating,
          title: newTitle,
          review: newReviewText,
          images: newImages,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setReviewSubmitSuccess(true);
        setNewTitle('');
        setNewReviewText('');
        setNewImages([]);
        // Reload reviews and venue rating updates
        if (venue) {
          fetchReviews(venue.id, reviewPage, reviewSort);
          fetchVenueDetails();
        }
      } else {
        setReviewSubmitError(result.message || 'Failed to submit review.');
      }
    } catch (err) {
      setReviewSubmitError('Error submitting review. Please try again.');
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
        <div className="flex gap-6 items-center">
          <a href="/bookings" className="text-xs font-bold text-secondary-text hover:text-primary transition">My Bookings</a>
          <a href="/venues" className="text-xs font-bold text-secondary-text hover:text-primary transition">← Back to Browse</a>
          <NotificationBell />
        </div>
      </header>

      {/* Main Details Body */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 flex flex-col gap-8">
        
        {/* Title and Category Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-bold text-accent uppercase tracking-wider">{venue.category}</span>
            <h1 className="text-3xl font-extrabold text-primary-text mt-1">{venue.title}</h1>
            <p className="text-xs text-body-text flex items-center gap-1 mt-2">
              <MapPin size={14} className="text-muted-text" /> {venue.address.street}, {venue.address.city}, {venue.address.state}, {venue.address.country}
            </p>
          </div>
          <button
            onClick={toggleWishlist}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-xs font-extrabold shadow-sm transition hover:scale-[1.02] cursor-pointer ${
              inWishlist 
                ? 'bg-red-50 border-red-200 text-red-600' 
                : 'bg-surface border-border-custom text-secondary-text hover:text-primary-text'
            }`}
          >
            <span>{inWishlist ? '❤️ Favorited' : '🤍 Add to Wishlist'}</span>
          </button>
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

            {/* Map Location & Directions */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 flex flex-col gap-4 shadow-xs">
              <div className="flex justify-between items-center border-b border-border-custom/25 pb-3">
                <h2 className="text-xl font-bold text-primary-text">Location & Map</h2>
                {venue.location?.coordinates && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${venue.location.coordinates[1]},${venue.location.coordinates[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                  >
                    <Navigation size={14} /> Get Directions
                  </a>
                )}
              </div>
              
              {venue.location?.coordinates ? (
                <div className="h-64 relative rounded-2xl overflow-hidden border border-border-custom bg-card-bg z-0">
                  <LeafletMap
                    markers={[{
                      id: venue.id || venue._id,
                      title: venue.title,
                      price: venue.pricing.pricePerDay,
                      lat: venue.location.coordinates[1],
                      lng: venue.location.coordinates[0],
                      slug: venue.slug,
                      imageUrl: venue.featuredImage,
                      venueType: venue.venueType,
                    }]}
                    center={[venue.location.coordinates[1], venue.location.coordinates[0]]}
                    zoom={14}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-text">Map location not available for this venue.</p>
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

        {/* ========================================== */}
        {/* REVIEWS & RATINGS SECTION                  */}
        {/* ========================================== */}
        <div className="border-t border-border-custom/30 pt-10 mt-6 flex flex-col gap-10">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-custom/25 pb-6">
            <div>
              <h2 className="text-2xl font-black text-primary-text">Reviews & Ratings</h2>
              <p className="text-xs text-secondary-text mt-1">Verified reviews from hosts and guests</p>
            </div>
            
            {/* Sorter */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-secondary-text uppercase">Sort:</span>
              <select
                value={reviewSort}
                onChange={(e) => {
                  setReviewSort(e.target.value);
                  fetchReviews(venue.id, 1, e.target.value);
                  setReviewPage(1);
                }}
                className="bg-surface border border-border-custom px-4 py-2 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest_rating">Highest Rated</option>
                <option value="lowest_rating">Lowest Rated</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left side: Stats Breakdown summary */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-xs">
              <div className="text-center md:text-left">
                <span className="text-5xl font-black text-primary-text">{venue.rating || '0.0'}</span>
                <div className="flex items-center justify-center md:justify-start gap-1 mt-2 text-xl text-amber-500">
                  {'★'.repeat(Math.round(venue.rating || 0))}
                  {'☆'.repeat(5 - Math.round(venue.rating || 0))}
                </div>
                <span className="block text-xs text-muted-text mt-2 font-medium">Based on {totalReviews} verified reviews</span>
              </div>

              {/* Star Distribution list */}
              <div className="space-y-2.5 border-t border-border-custom/25 pt-5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = starDistribution[stars] || 0;
                  const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3 text-xs">
                      <span className="w-10 font-bold text-secondary-text">{stars} Star</span>
                      <div className="flex-1 h-2 bg-muted/65 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <span className="w-8 text-right font-medium text-muted-text">{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Middle/Right side: Reviews List & Write Review form */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              
              {/* Write Review Form */}
              {completedBookings.length > 0 && !reviewSubmitSuccess && (
                <div className="bg-surface border border-primary/20 rounded-3xl p-6 md:p-8 shadow-xs flex flex-col gap-5">
                  <div>
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                      Share Feedback
                    </span>
                    <h3 className="text-lg font-bold text-primary-text mt-2">Write a Review</h3>
                    <p className="text-xs text-secondary-text mt-1">You have completed a booking at this venue. Share your experience!</p>
                  </div>

                  {reviewSubmitError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                      {reviewSubmitError}
                    </div>
                  )}

                  <form onSubmit={submitReview} className="space-y-4">
                    {/* Booking Selector */}
                    {completedBookings.length > 1 && (
                      <div>
                        <label className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5">
                          Select Booking Number
                        </label>
                        <select
                          value={selectedBookingId}
                          onChange={(e) => setSelectedBookingId(e.target.value)}
                          className="w-full px-4 py-2.5 bg-card-bg border border-border-custom/50 rounded-xl text-xs"
                        >
                          {completedBookings.map((b) => (
                            <option key={b._id} value={b._id}>
                              #{b.bookingNumber} - {new Date(b.eventDate).toLocaleDateString()}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Interactive Star rating */}
                    <div>
                      <label className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5">
                        Your Rating
                      </label>
                      <div className="flex gap-1.5 text-2xl">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewRating(star)}
                            className={`cursor-pointer transition hover:scale-110 ${star <= newRating ? 'text-amber-500' : 'text-muted-text/30'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5" htmlFor="reviewTitle">
                          Review Title
                        </label>
                        <input
                          id="reviewTitle"
                          type="text"
                          required
                          placeholder="Summarize your experience"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="w-full px-4 py-2.5 bg-card-bg border border-border-custom/50 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5" htmlFor="imgUrl">
                          Add Image URL (Optional)
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="imgUrl"
                            type="text"
                            placeholder="https://example.com/image.jpg"
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            className="flex-1 px-4 py-2 bg-card-bg border border-border-custom/50 rounded-xl text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newImageUrl.startsWith('http')) {
                                setNewImages([...newImages, newImageUrl]);
                                setNewImageUrl('');
                              } else {
                                alert('Please provide a valid HTTP URL link');
                              }
                            }}
                            className="bg-primary text-surface px-4 rounded-xl text-xs font-bold"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    {newImages.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {newImages.map((img, idx) => (
                          <div key={idx} className="relative h-10 w-15 border border-border-custom rounded-md overflow-hidden">
                            <img src={img} className="object-cover h-full w-full" />
                            <button
                              type="button"
                              onClick={() => setNewImages(newImages.filter((_, i) => i !== idx))}
                              className="absolute top-0 right-0 bg-danger text-surface text-[8px] font-bold h-4 w-4 flex items-center justify-center rounded-bl-md"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5" htmlFor="reviewBody">
                        Review Message
                      </label>
                      <textarea
                        id="reviewBody"
                        rows={4}
                        required
                        placeholder="Tell others about the facilities, cleanliness, host service, and amenities..."
                        value={newReviewText}
                        onChange={(e) => setNewReviewText(e.target.value)}
                        className="w-full px-4 py-2.5 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="bg-primary text-surface px-6 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:bg-primary/95 transition cursor-pointer"
                    >
                      Submit Review
                    </button>
                  </form>
                </div>
              )}

              {reviewSubmitSuccess && (
                <div className="bg-green-50 border border-green-200 p-6 rounded-3xl text-center">
                  <span className="text-3xl">⭐</span>
                  <h4 className="text-sm font-bold text-green-800 mt-2">Thank you for your feedback!</h4>
                  <p className="text-xs text-green-700 mt-1">Your review has been verified and successfully published to the listing page.</p>
                </div>
              )}

              {/* Reviews List */}
              {reviews.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border-custom rounded-3xl bg-surface/50">
                  <span className="text-4xl">💬</span>
                  <h4 className="text-sm font-bold text-secondary-text mt-4">No Reviews Yet</h4>
                  <p className="text-xs text-muted-text mt-1">Be the first to review this venue after your completed event!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((item) => (
                    <div
                      key={item._id}
                      className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xs flex flex-col gap-4"
                    >
                      {/* Customer Info row */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-sm text-primary-text">{item.customerId?.name || 'Anonymous User'}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-amber-500 text-xs">
                              {'★'.repeat(item.rating)}
                              {'☆'.repeat(5 - item.rating)}
                            </div>
                            {item.isVerifiedPurchase && (
                              <span className="bg-green-50 text-green-600 text-[8px] font-extrabold px-2 py-0.5 rounded-full border border-green-200 uppercase">
                                Verified Purchase
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-text font-bold uppercase">
                          {new Date(item.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </span>
                      </div>

                      {/* Content */}
                      <div>
                        <h4 className="font-extrabold text-sm text-primary-text">{item.title}</h4>
                        <p className="text-xs text-body-text mt-1.5 leading-relaxed">{item.review}</p>
                      </div>

                      {/* Review Images */}
                      {item.images && item.images.length > 0 && (
                        <div className="flex gap-2">
                          {item.images.map((imgUrl: string, i: number) => (
                            <div key={i} className="h-14 w-20 rounded-lg overflow-hidden border border-border-custom">
                              <img src={imgUrl} className="object-cover h-full w-full" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Owner Reply card */}
                      {item.ownerReply && (
                        <div className="bg-muted/40 border border-border-custom/50 rounded-2xl p-4 mt-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-primary uppercase">Host Response</span>
                            <span className="text-[8px] text-muted-text uppercase font-bold">
                              {new Date(item.ownerReply.repliedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-body-text italic">"{item.ownerReply.reply}"</p>
                        </div>
                      )}

                    </div>
                  ))}

                  {/* Reviews Pagination footer */}
                  {reviewPages > 1 && (
                    <div className="flex justify-between items-center border-t border-border-custom/25 pt-4">
                      <span className="text-xs text-secondary-text font-medium">Page {reviewPage} of {reviewPages}</span>
                      <div className="flex gap-2">
                        <button
                          disabled={reviewPage <= 1}
                          onClick={() => {
                            const prev = reviewPage - 1;
                            setReviewPage(prev);
                            fetchReviews(venue.id, prev, reviewSort);
                          }}
                          className="bg-surface border border-border-custom text-primary-text px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40 transition cursor-pointer"
                        >
                          Prev
                        </button>
                        <button
                          disabled={reviewPage >= reviewPages}
                          onClick={() => {
                            const next = reviewPage + 1;
                            setReviewPage(next);
                            fetchReviews(venue.id, next, reviewSort);
                          }}
                          className="bg-surface border border-border-custom text-primary-text px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40 transition cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

          </div>

        </div>

        {/* Geolocation Nearby Similar spaces list */}
        {nearbyVenues.length > 0 && (
          <div className="border-t border-border-custom/30 pt-10 mt-10">
            <h2 className="text-2xl font-black text-primary-text mb-6">Nearby & Similar Venues</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {nearbyVenues.map((v) => (
                <article
                  key={v._id || v.id}
                  onClick={() => window.location.href = `/venues/${v.slug}`}
                  className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="h-36 bg-border-custom/10 relative overflow-hidden">
                      <img
                        src={v.featuredImage || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80'}
                        alt={v.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 bg-surface/90 backdrop-blur-xs text-[8px] font-bold text-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {v.venueType.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="p-4 flex flex-col gap-1">
                      <h3 className="text-sm font-extrabold text-primary-text line-clamp-1">{v.title}</h3>
                      <p className="text-xs text-body-text">{v.city}, {v.state}</p>
                    </div>
                  </div>
                  <div className="px-4 py-3 border-t border-border-custom/15 bg-card-bg flex justify-between items-center text-xs font-semibold">
                    <span className="text-body-text flex items-center gap-1 text-[11px]"><Users size={12} /> Max {v.capacity}</span>
                    <span className="text-primary font-bold text-[11px]">₹{v.pricing.pricePerDay.toLocaleString('en-IN')}/day</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
