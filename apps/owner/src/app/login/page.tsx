'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { getApiUrl } from '../../utils/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

type LoginFields = z.infer<typeof loginSchema>;

export default function OwnerLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFields) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(getApiUrl('/api/v1/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response received from server:', text);
        throw new Error('Server returned an unexpected response format. Please try again later.');
      }

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Authentication failed');
      }

      // Verify that user role is indeed owner
      if (result.data.user.role !== 'owner') {
        throw new Error('Access denied. This dashboard is for venue owners only.');
      }

      setSuccessMsg('Logged in successfully! Redirecting to host dashboard...');
      localStorage.setItem('accessToken', result.data.accessToken);

      setTimeout(() => {
        window.location.href = '/owner';
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-surface border border-border-custom rounded-3xl p-8 shadow-md">
        {/* Header */}
        <div className="text-center mb-8">
          <a href="/owner" className="text-2xl font-bold text-primary tracking-tight block mb-2">BMV Hosting</a>
          <h1 className="text-xl font-extrabold text-primary-text">Sign in to host panel</h1>
          <p className="text-sm text-body-text mt-1">Manage your venues and review requests</p>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-xs text-red-700 font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-xl text-xs text-green-700 font-medium">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-secondary-text uppercase mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              {...register('email')}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={`w-full px-4 py-3 bg-card-bg border ${errors.email ? 'border-red-500' : 'border-border-custom'} rounded-xl text-sm focus:outline-none focus:border-primary transition`}
            />
            {errors.email && (
              <span id="email-error" className="block text-[11px] text-red-500 mt-1 font-semibold">
                {errors.email.message}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary-text uppercase mb-1.5" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={`w-full pl-4 pr-10 py-3 bg-card-bg border ${errors.password ? 'border-red-500' : 'border-border-custom'} rounded-xl text-sm focus:outline-none focus:border-primary transition`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-muted-text hover:text-secondary-text cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <span id="password-error" className="block text-[11px] text-red-500 mt-1 font-semibold">
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-surface py-3.5 rounded-xl font-bold text-sm shadow-sm hover:bg-primary/95 transition flex justify-center items-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In as Host'
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 text-center text-xs text-body-text">
          Want to register your venue?{' '}
          <a href="/owner/register" className="font-bold text-primary hover:underline">
            Register as Owner
          </a>
        </div>
      </div>
    </main>
  );
}
