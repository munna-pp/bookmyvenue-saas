'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, MapPin, IndianRupee, Users, Loader2 } from 'lucide-react';
import { getApiUrl } from '../../../../utils/api';

const venueFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters long'),
  venueType: z.string().min(1, 'Please select a venue type'),
  category: z.string().min(2, 'Category is required'),
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  country: z.string().min(1, 'Country is required'),
  latitude: z.string().refine((val) => !isNaN(parseFloat(val)), 'Latitude must be a valid number'),
  longitude: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)), 'Longitude must be a valid number'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1 person'),
  pricePerDay: z.number().min(0, 'Price per day must be positive'),
  pricePerHalfDay: z.number().min(0).optional(),
  pricePerHour: z.number().min(0).optional(),
  securityDeposit: z.number().min(0).optional(),
  cleaningFee: z.number().min(0).optional(),
  publicationStatus: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

type VenueFormFields = z.infer<typeof venueFormSchema>;

export default function OwnerEditVenue() {
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Images upload states
  const [images, setImages] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Amenities and Policies
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [policiesList, setPoliciesList] = useState<string[]>([]);
  const [newPolicy, setNewPolicy] = useState('');

  const amenityOptions = [
    'Air Conditioning',
    'WiFi',
    'Projector',
    'Valet Parking',
    'Catering Kitchen',
    'Outdoor Lawn',
    'AV Equipment',
    'Swimming Pool',
    'Bridal Suite',
    'Sound System',
    'Security Guard',
    'Bar Setup',
  ];

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VenueFormFields>({
    resolver: zodResolver(venueFormSchema),
  });

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchVenueDetails = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(getApiUrl(`/api/v1/venues/${id}`), {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an unexpected page format.');
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to retrieve venue details');
      }

      const v = result.data.venue;

      // Populate form
      setValue('title', v.title);
      setValue('description', v.description);
      setValue('venueType', v.venueType);
      setValue('category', v.category);
      setValue('street', v.address.street);
      setValue('city', v.address.city);
      setValue('state', v.address.state);
      setValue('zipCode', v.address.zipCode);
      setValue('country', v.address.country);
      setValue('latitude', v.location.coordinates[1].toString());
      setValue('longitude', v.location.coordinates[0].toString());
      setValue('capacity', v.capacity);
      setValue('pricePerDay', v.pricing.pricePerDay);
      setValue('pricePerHalfDay', v.pricing.pricePerHalfDay);
      setValue('pricePerHour', v.pricing.pricePerHour);
      setValue('securityDeposit', v.pricing.securityDeposit);
      setValue('cleaningFee', v.pricing.cleaningFee);
      setValue('publicationStatus', v.publicationStatus);

      // Pre-fill listings state
      setPreviews(v.images || []);
      setImages(v.images || []);
      setSelectedAmenities(v.amenities || []);
      setPoliciesList(v.policies || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load listing parameters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchVenueDetails();
    }
  }, [id]);

  // Base64 file reader helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const dataUrl = event.target.result as string;
            setPreviews((prev) => [...prev, dataUrl]);
            setImages((prev) => [...prev, dataUrl]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const dataUrl = event.target.result as string;
            setPreviews((prev) => [...prev, dataUrl]);
            setImages((prev) => [...prev, dataUrl]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setPreviews(previews.filter((_, i) => i !== index));
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const addPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPolicy.trim()) {
      setPoliciesList([...policiesList, newPolicy.trim()]);
      setNewPolicy('');
    }
  };

  const removePolicy = (index: number) => {
    setPoliciesList(policiesList.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: VenueFormFields) => {
    setSubmitLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        title: data.title,
        description: data.description,
        venueType: data.venueType,
        category: data.category,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          country: data.country,
        },
        location: {
          coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)],
        },
        capacity: data.capacity,
        pricing: {
          pricePerDay: data.pricePerDay,
          pricePerHalfDay: data.pricePerHalfDay,
          pricePerHour: data.pricePerHour,
          securityDeposit: data.securityDeposit,
          cleaningFee: data.cleaningFee,
        },
        amenities: selectedAmenities,
        policies: policiesList,
        images: images,
        publicationStatus: data.publicationStatus,
      };

      const res = await fetch(getApiUrl(`/api/v1/venues/${id}`), {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON error:', text);
        throw new Error('Server returned an unexpected page instead of API response.');
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Updating venue details failed');
      }

      setSuccessMsg('Venue listing updated successfully! Redirecting to dashboard...');
      setTimeout(() => {
        window.location.href = '/owner/venues';
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please check fields.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center gap-4">
        <Loader2 size={36} className="animate-spin text-primary" />
        <span className="text-sm font-semibold text-secondary-text">
          Retrieving listing parameters...
        </span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-primary-text pb-20">
      {/* Header */}
      <header className="border-b border-border-custom bg-surface py-5 px-6 md:px-12 flex justify-between items-center shadow-xs">
        <span className="text-2xl font-bold text-primary font-serif">Edit Venue Listing</span>
        <a
          href="/owner/venues"
          className="text-xs font-bold text-secondary-text hover:text-primary transition"
        >
          ← Cancel
        </a>
      </header>

      <div className="max-w-4xl mx-auto px-6 mt-10">
        {/* Status Messages */}
        {errorMsg && (
          <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 rounded-xl text-xs text-red-700 font-semibold">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-4 mb-6 bg-green-50 border-l-4 border-green-500 rounded-xl text-xs text-green-700 font-semibold">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Section 1: Overview */}
          <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
            <h3 className="text-lg font-bold border-b border-border-custom/25 pb-3">
              1. Venue Overview
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label
                  className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5"
                  htmlFor="title"
                >
                  Venue Title
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="e.g. Grand Palace Banquets"
                  {...register('title')}
                  className={`w-full px-4 py-3 bg-card-bg border ${errors.title ? 'border-red-500' : 'border-border-custom/50'} rounded-xl text-xs focus:outline-none focus:border-primary`}
                />
                {errors.title && (
                  <span className="text-[10px] text-red-500 mt-1 block">
                    {errors.title.message}
                  </span>
                )}
              </div>

              <div>
                <label
                  className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5"
                  htmlFor="venueType"
                >
                  Venue Type
                </label>
                <select
                  id="venueType"
                  {...register('venueType')}
                  className={`w-full px-4 py-3 bg-card-bg border ${errors.venueType ? 'border-red-500' : 'border-border-custom/50'} rounded-xl text-xs focus:outline-none focus:border-primary`}
                >
                  <option value="">Select Type</option>
                  <option value="wedding_hall">Wedding Hall</option>
                  <option value="convention_center">Convention Center</option>
                  <option value="banquet_hall">Banquet Hall</option>
                  <option value="birthday_venue">Birthday Venue</option>
                  <option value="resort">Resort</option>
                  <option value="meeting_room">Meeting Room</option>
                  <option value="sports_ground">Sports Ground</option>
                  <option value="farm_house">Farm House</option>
                  <option value="event_space">Event Space</option>
                </select>
                {errors.venueType && (
                  <span className="text-[10px] text-red-500 mt-1 block">
                    {errors.venueType.message}
                  </span>
                )}
              </div>

              <div>
                <label
                  className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5"
                  htmlFor="category"
                >
                  Category
                </label>
                <input
                  id="category"
                  type="text"
                  placeholder="e.g. Luxury Banquets"
                  {...register('category')}
                  className={`w-full px-4 py-3 bg-card-bg border ${errors.category ? 'border-red-500' : 'border-border-custom/50'} rounded-xl text-xs focus:outline-none focus:border-primary`}
                />
                {errors.category && (
                  <span className="text-[10px] text-red-500 mt-1 block">
                    {errors.category.message}
                  </span>
                )}
              </div>

              <div className="md:col-span-2">
                <label
                  className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5"
                  htmlFor="description"
                >
                  Detailed Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Tell clients about your venue..."
                  {...register('description')}
                  className={`w-full px-4 py-3 bg-card-bg border ${errors.description ? 'border-red-500' : 'border-border-custom/50'} rounded-xl text-xs focus:outline-none focus:border-primary`}
                />
                {errors.description && (
                  <span className="text-[10px] text-red-500 mt-1 block">
                    {errors.description.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Address */}
          <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
            <h3 className="text-lg font-bold border-b border-border-custom/25 pb-3">
              2. Address & Geolocation
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label
                  className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5"
                  htmlFor="street"
                >
                  Street Address
                </label>
                <input
                  id="street"
                  type="text"
                  placeholder="Street"
                  {...register('street')}
                  className="w-full px-4 py-3 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label
                  className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5"
                  htmlFor="city"
                >
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  placeholder="City"
                  {...register('city')}
                  className="w-full px-4 py-3 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label
                  className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5"
                  htmlFor="state"
                >
                  State
                </label>
                <input
                  id="state"
                  type="text"
                  placeholder="State"
                  {...register('state')}
                  className="w-full px-4 py-3 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label
                  className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5"
                  htmlFor="zipCode"
                >
                  Zip Code
                </label>
                <input
                  id="zipCode"
                  type="text"
                  placeholder="Zip"
                  {...register('zipCode')}
                  className="w-full px-4 py-3 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="md:col-span-3">
                <label
                  className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5"
                  htmlFor="country"
                >
                  Country
                </label>
                <input
                  id="country"
                  type="text"
                  placeholder="Country"
                  {...register('country')}
                  className="w-full px-4 py-3 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label
                  className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5"
                  htmlFor="latitude"
                >
                  Latitude (deg)
                </label>
                <input
                  id="latitude"
                  type="text"
                  {...register('latitude')}
                  className={`w-full px-4 py-3 bg-card-bg border ${errors.latitude ? 'border-red-500' : 'border-border-custom/50'} rounded-xl text-xs focus:outline-none focus:border-primary`}
                />
                {errors.latitude && (
                  <span className="text-[10px] text-red-500 mt-1 block">
                    {errors.latitude.message}
                  </span>
                )}
              </div>

              <div>
                <label
                  className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5"
                  htmlFor="longitude"
                >
                  Longitude (deg)
                </label>
                <input
                  id="longitude"
                  type="text"
                  {...register('longitude')}
                  className={`w-full px-4 py-3 bg-card-bg border ${errors.longitude ? 'border-red-500' : 'border-border-custom/50'} rounded-xl text-xs focus:outline-none focus:border-primary`}
                />
                {errors.longitude && (
                  <span className="text-[10px] text-red-500 mt-1 block">
                    {errors.longitude.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Capacity & Pricing */}
          <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
            <h3 className="text-lg font-bold border-b border-border-custom/25 pb-3">
              3. Capacity & Rental Pricing
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5"
                  htmlFor="capacity"
                >
                  Max Capacity (Guests)
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-3.5 text-muted-text" size={16} />
                  <input
                    id="capacity"
                    type="number"
                    {...register('capacity', { valueAsNumber: true })}
                    className="w-full pl-9 pr-3 py-3 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5"
                  htmlFor="pricePerDay"
                >
                  Day Rate (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-3.5 text-muted-text" size={16} />
                  <input
                    id="pricePerDay"
                    type="number"
                    {...register('pricePerDay', { valueAsNumber: true })}
                    className="w-full pl-9 pr-3 py-3 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-[10px] font-bold text-secondary-text uppercase mb-1.5"
                  htmlFor="securityDeposit"
                >
                  Security Deposit (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-3.5 text-muted-text" size={16} />
                  <input
                    id="securityDeposit"
                    type="number"
                    {...register('securityDeposit', { valueAsNumber: true })}
                    className="w-full pl-9 pr-3 py-3 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Amenities */}
          <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
            <h3 className="text-lg font-bold border-b border-border-custom/25 pb-3">
              4. Amenities & Services
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {amenityOptions.map((amenity) => (
                <label
                  key={amenity}
                  className="flex items-center gap-2 text-xs font-semibold text-body-text cursor-pointer"
                >
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

          {/* Section 5: Image Gallery */}
          <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
            <h3 className="text-lg font-bold border-b border-border-custom/25 pb-3">
              5. Image Gallery Upload
            </h3>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-border-custom hover:border-primary rounded-2xl p-8 text-center bg-card-bg/50 cursor-pointer flex flex-col items-center justify-center gap-3 transition"
            >
              <Upload className="text-muted-text" size={32} />
              <div>
                <span className="font-bold text-xs text-primary-text block">
                  Drag and drop images here
                </span>
                <span className="text-[10px] text-body-text block mt-1">
                  Supports PNG, JPG, JPEG
                </span>
              </div>
              <label className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/20 transition cursor-pointer">
                Select Files
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                {previews.map((preview, i) => (
                  <div
                    key={i}
                    className="relative h-20 bg-border-custom/10 rounded-xl overflow-hidden border border-border-custom/50"
                  >
                    <img src={preview} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-red-500 text-surface p-1 rounded-full hover:bg-red-600 transition cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 6: Policies */}
          <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
            <h3 className="text-lg font-bold border-b border-border-custom/25 pb-3">
              6. Policies & Guidelines
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. No music after 11 PM"
                value={newPolicy}
                onChange={(e) => setNewPolicy(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={addPolicy}
                className="bg-primary/10 border border-primary/20 text-primary px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-primary/20 transition cursor-pointer"
              >
                + Add Rule
              </button>
            </div>

            {policiesList.length > 0 && (
              <ul className="space-y-2">
                {policiesList.map((policy, i) => (
                  <li
                    key={i}
                    className="flex justify-between items-center bg-card-bg/40 px-4 py-2 border border-border-custom/20 rounded-xl text-xs text-body-text"
                  >
                    <span>{policy}</span>
                    <button
                      type="button"
                      onClick={() => removePolicy(i)}
                      className="text-muted-text hover:text-red-500 font-bold text-xs transition cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Section 7: Publication visibility state */}
          <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 flex justify-between items-center shadow-xs">
            <div>
              <h4 className="text-xs font-extrabold text-primary-text uppercase">
                Visibility State
              </h4>
              <p className="text-[10px] text-body-text mt-0.5">
                Edit publication visibility settings.
              </p>
            </div>
            <select
              {...register('publicationStatus')}
              className="px-4 py-2 bg-card-bg border border-border-custom/50 rounded-xl text-xs focus:outline-none focus:border-primary font-semibold"
            >
              <option value="DRAFT">Save as Draft</option>
              <option value="PUBLISHED">Publish Listing</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitLoading}
            className="w-full bg-primary text-surface py-4 rounded-2xl font-bold text-sm shadow-md hover:bg-primary/95 transition flex justify-center items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Updating Venue Parameters...
              </>
            ) : (
              'Save Updates & Resubmit'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
