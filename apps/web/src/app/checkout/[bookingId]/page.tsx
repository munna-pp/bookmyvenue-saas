'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CreditCard, Calendar, Clock, Loader2, AlertCircle, HelpCircle, ShieldCheck, Ticket, Check } from 'lucide-react';
import { getApiUrl } from '../../../utils/api';
import { Booking } from '@bookmyvenue/shared-types';

export default function CustomerCheckoutPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);

  // Payment trigger state
  const [payLoading, setPayLoading] = useState(false);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchBooking = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Find matching booking from customer history list
      const res = await fetch(getApiUrl('/api/v1/bookings/my'), {
        headers: getAuthHeaders(),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      const found = result.data.bookings.find((b: any) => b.id === bookingId);
      if (!found) throw new Error('Booking query request details not found.');
      setBooking(found);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to retrieve booking information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) return;
    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch(getApiUrl('/api/v1/coupons/apply'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: couponCode, bookingId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Invalid coupon code');

      setAppliedCoupon({
        code: result.data.code,
        discount: result.data.discount,
        newTotal: result.data.newTotal,
      });
    } catch (err: any) {
      setCouponError(err.message || 'Coupon application failed.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const handlePayNow = async () => {
    setPayLoading(true);
    try {
      // 1. Create order on backend
      const res = await fetch(getApiUrl('/api/v1/payments/create-order'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to create payment order');

      // 2. Load Razorpay Checkout dynamically
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        const options = {
          key: result.data.keyId,
          amount: result.data.amount,
          currency: result.data.currency,
          name: 'BookMyVenue',
          description: `Booking Payout #${booking.bookingNumber}`,
          order_id: result.data.orderId,
          handler: async function (response: any) {
            // 3. Verify signature on backend
            setPayLoading(true);
            try {
              const verifyRes = await fetch(getApiUrl('/api/v1/payments/verify'), {
                method: 'POST',
                headers: {
                  ...getAuthHeaders(),
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  bookingId,
                  providerOrderId: response.razorpay_order_id,
                  providerPaymentId: response.razorpay_payment_id,
                  providerSignature: response.razorpay_signature,
                }),
              });

              const verifyResult = await verifyRes.json();
              if (verifyRes.ok) {
                window.location.href = `/payment/success?id=${bookingId}`;
              } else {
                window.location.href = `/payment/failed?id=${bookingId}&reason=${verifyResult.message || 'Signature mismatch'}`;
              }
            } catch (vErr) {
              window.location.href = `/payment/failed?id=${bookingId}&reason=Verification+Failed`;
            }
          },
          prefill: {
            name: reqUserEmail(), // Fallback helper
          },
          theme: { color: '#4F46E5' },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      };
      script.onerror = () => {
        alert('Failed to load Razorpay payment gateway script.');
      };
      document.body.appendChild(script);
    } catch (err: any) {
      alert(`Payment error: ${err.message}`);
    } finally {
      setPayLoading(false);
    }
  };

  const reqUserEmail = () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr).email : '';
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center gap-4">
        <Loader2 size={36} className="animate-spin text-primary" />
        <span className="text-sm font-semibold text-secondary-text">Loading checkout details...</span>
      </div>
    );
  }

  if (errorMsg || !booking) {
    return (
      <main className="min-h-screen bg-background flex flex-col justify-center items-center px-4">
        <div className="w-full max-w-md bg-surface border border-border-custom rounded-3xl p-8 text-center shadow-md">
          <span className="text-4xl">⚠️</span>
          <h1 className="text-lg font-bold text-primary-text mt-3">Checkout Loading Failed</h1>
          <p className="text-xs text-body-text mt-2">{errorMsg || 'The booking reference does not exist.'}</p>
          <button
            onClick={() => window.location.href = '/bookings'}
            className="mt-6 bg-primary text-surface px-6 py-2.5 rounded-full font-bold text-xs shadow-xs hover:bg-primary/95 transition cursor-pointer"
          >
            Go to Bookings History
          </button>
        </div>
      </main>
    );
  }

  // Invoice parameters
  const subtotal = booking.subtotal;
  const taxes = booking.taxes;
  const cleaning = booking.pricingSnapshot.cleaningFee || 0;
  const deposit = booking.pricingSnapshot.securityDeposit || 0;
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const total = subtotal + taxes + cleaning + deposit - discount;

  return (
    <main className="min-h-screen bg-background text-primary-text pb-20">
      {/* Top Navbar */}
      <header className="border-b border-border-custom bg-surface py-5 px-6 md:px-12 flex justify-between items-center shadow-xs">
        <a href="/venues" className="text-2xl font-black text-primary tracking-tight">BookMyVenue</a>
        <a href="/bookings" className="text-xs font-bold text-secondary-text hover:text-primary transition">Cancel & Back</a>
      </header>

      {/* Checkout Content Container */}
      <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-extrabold text-primary-text tracking-tight flex items-center gap-2">
            <CreditCard className="text-primary" /> Invoice Secure Checkout
          </h1>
          <p className="text-sm text-body-text">Review your reservation breakdown and checkout securely using Razorpay Test Mode.</p>
        </div>

        {/* Responsive layout: Checkout Detail & Invoice Summary */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          
          {/* Booking Summary Columns */}
          <div className="md:col-span-3 space-y-6">
            
            {/* Booking Details Card */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xs space-y-4">
              <span className="text-[10px] font-bold text-primary block uppercase tracking-widest">#{booking.bookingNumber}</span>
              <h3 className="font-extrabold text-base text-primary-text">{booking.venue?.title || 'Ballroom Listing'}</h3>
              
              <div className="grid grid-cols-2 gap-4 text-xs text-body-text pt-2 border-t border-border-custom/10">
                <div>
                  <span className="block text-[8px] text-muted-text font-bold uppercase">Date</span>
                  <span className="font-extrabold text-primary-text flex items-center gap-1 mt-0.5"><Calendar size={12} /> {new Date(booking.eventDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="block text-[8px] text-muted-text font-bold uppercase">Timeslot</span>
                  <span className="font-extrabold text-primary-text flex items-center gap-1 mt-0.5"><Clock size={12} /> {booking.startTime} - {booking.endTime}</span>
                </div>
              </div>
            </div>

            {/* Coupons Card */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xs space-y-4">
              <h4 className="font-bold text-xs text-primary-text flex items-center gap-1.5"><Ticket size={14} className="text-primary" /> Apply Coupon</h4>
              
              {appliedCoupon ? (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-2xl flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><Check size={14} /> Coupon {appliedCoupon.code} Applied (-₹{appliedCoupon.discount})</span>
                  <button onClick={handleRemoveCoupon} className="text-[9px] text-red-500 uppercase tracking-wider hover:underline font-extrabold">Remove</button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. WELCOME20, FLAT5000"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 px-3 py-2 bg-card-bg border border-border-custom/50 rounded-xl text-xs uppercase font-extrabold placeholder:font-normal focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={couponLoading}
                    className="bg-primary text-surface px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/95 transition cursor-pointer"
                  >
                    {couponLoading ? 'Checking...' : 'Apply'}
                  </button>
                </form>
              )}

              {couponError && (
                <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold rounded-xl flex gap-1 items-center">
                  <AlertCircle size={12} /> {couponError}
                </div>
              )}
            </div>

          </div>

          {/* Pricing Summary Columns */}
          <div className="md:col-span-2 bg-surface border border-border-custom rounded-3xl p-6 shadow-md flex flex-col gap-6">
            <h3 className="font-black text-sm text-primary-text border-b border-border-custom/10 pb-3">Invoice Summary</h3>
            
            <div className="space-y-3.5 text-xs text-body-text">
              <div className="flex justify-between">
                <span>Rental Subtotal</span>
                <span className="font-bold text-primary-text">₹{subtotal.toLocaleString('en-IN')}</span>
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
                  <span>Security deposit</span>
                  <span className="font-bold text-primary-text">₹{deposit.toLocaleString('en-IN')}</span>
                </div>
              )}

              {appliedCoupon && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>Coupon Discount</span>
                  <span>-₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-primary pt-2 border-t border-border-custom/15">
                <span>Grand Total</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={handlePayNow}
              disabled={payLoading}
              className="w-full bg-primary text-surface py-3.5 rounded-xl font-bold text-sm shadow-sm hover:bg-primary/95 transition flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {payLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Invoking Gateway...
                </>
              ) : (
                `Pay ₹${total.toLocaleString('en-IN')}`
              )}
            </button>

            <div className="flex gap-2 items-center justify-center text-[10px] text-muted-text font-medium pt-2 border-t border-border-custom/10">
              <ShieldCheck size={14} className="text-accent" /> Razorpay Secured Sandbox Payments
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}
