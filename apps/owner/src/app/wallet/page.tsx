'use client';

import React, { useState, useEffect } from 'react';
import { Landmark, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, AlertCircle, Calendar, DollarSign, Wallet } from 'lucide-react';
import { getApiUrl } from '../../utils/api';
import { WalletLedger } from '@bookmyvenue/shared-types';

export default function OwnerWalletPage() {
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState<WalletLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchWalletDetails = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(getApiUrl('/api/v1/payments/wallet'), {
        headers: getAuthHeaders(),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Host session validation expired.');
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to sync wallet data.');
      }

      setBalance(result.data.balance || 0);
      setLedger(result.data.ledger || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to retrieve wallet information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  const getTxTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'CREDIT':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'REFUND':
      case 'DEBIT':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'WITHDRAWAL':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  return (
    <main className="min-h-screen bg-background text-primary-text flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-border-custom bg-surface py-4 px-6 md:px-12 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-2">
          <a href="/owner/venues" className="text-2xl font-bold text-primary tracking-tight">BMV Owner</a>
          <span className="bg-premium/10 text-premium text-[10px] px-2 py-0.5 rounded-full font-bold">Hosting</span>
        </div>
        <nav className="flex items-center gap-6">
          <a href="/owner/venues" className="text-secondary-text hover:text-primary transition font-semibold text-xs">My Venues</a>
          <a href="/owner/bookings" className="text-secondary-text hover:text-primary transition font-semibold text-xs">Reservations</a>
          <a href="/owner/wallet" className="text-primary transition font-bold text-xs">Wallet</a>
        </nav>
      </header>

      {/* Main Container */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-10 flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-primary-text tracking-tight">Host Earnings Wallet</h1>
            <p className="text-sm text-body-text">Track your net payouts, active ledger credits, and withdrawal transactions.</p>
          </div>
          <button
            onClick={fetchWalletDetails}
            className="p-2 border border-border-custom/50 hover:border-primary/50 text-secondary-text hover:text-primary rounded-xl transition cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-2xl text-xs text-red-700 font-semibold">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="p-20 flex flex-col justify-center items-center gap-4 text-center">
            <Loader2 size={36} className="animate-spin text-primary" />
            <span className="text-xs font-bold text-secondary-text uppercase tracking-wide">Syncing Wallet Balance...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Wallet Balance Card */}
            <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 shadow-md flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-secondary-text uppercase tracking-widest">Active Balance</span>
                <Wallet className="text-primary" size={20} />
              </div>
              <div>
                <span className="text-4xl font-black text-primary-text">₹{balance.toLocaleString('en-IN')}</span>
                <span className="block text-[10px] text-muted-text mt-1.5 font-medium">Payout value eligible for withdrawal</span>
              </div>
              <button
                onClick={() => alert('Bank payouts are initiated automatically twice a week. Direct manual withdrawal is currently locked.')}
                className="w-full bg-primary text-surface py-3 rounded-xl font-bold text-xs shadow-sm hover:bg-primary/95 transition flex justify-center items-center gap-1.5 cursor-pointer"
              >
                <Landmark size={14} /> Payout to Bank Account
              </button>
            </div>

            {/* Wallet Ledger History */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-primary-text">Transaction Ledger History</h2>

              {ledger.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center gap-3 bg-surface border border-border-custom rounded-3xl">
                  <span className="text-4xl">💰</span>
                  <h3 className="font-bold text-sm text-primary-text">No Wallet Transactions</h3>
                  <p className="text-xs text-body-text max-w-sm">Payments credited upon booking verification will be logged here.</p>
                </div>
              ) : (
                <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
                  <div className="divide-y divide-border-custom/10">
                    {ledger.map((tx) => (
                      <div key={tx.id} className="p-5 flex justify-between items-center hover:bg-card-bg/25 transition">
                        <div className="flex gap-3 items-center">
                          <div className={`p-2 rounded-xl ${tx.type === 'CREDIT' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                            {tx.type === 'CREDIT' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                          </div>
                          <div>
                            <span className="font-extrabold text-sm text-primary-text block">{tx.description}</span>
                            <span className="text-[10px] text-muted-text block mt-0.5">{new Date(tx.createdAt).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`font-black text-sm block ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                          </span>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${getTxTypeBadgeClass(tx.type)}`}>
                            {tx.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border-custom bg-surface py-6 px-6 md:px-12 text-center text-xs text-muted-text">
        <p>© 2026 BookMyVenue Host Earnings Suite.</p>
      </footer>
    </main>
  );
}
