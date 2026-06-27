import React from 'react';

export default function AdminDashboard() {
  return (
    <main className="min-h-screen bg-background text-primary-text flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border-custom flex flex-col justify-between p-6">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">BMV Admin</span>
            <span className="bg-info/10 text-info text-[10px] px-2 py-0.5 rounded-full font-bold">Control</span>
          </div>
          <nav className="flex flex-col gap-2">
            <a href="#" className="bg-primary/10 text-primary px-4 py-2.5 rounded-xl font-bold text-sm">Dashboard</a>
            <a href="#" className="text-secondary-text hover:bg-card-bg px-4 py-2.5 rounded-xl text-sm transition">Manage Users</a>
            <a href="#" className="text-secondary-text hover:bg-card-bg px-4 py-2.5 rounded-xl text-sm transition">Approve Venues</a>
            <a href="#" className="text-secondary-text hover:bg-card-bg px-4 py-2.5 rounded-xl text-sm transition">Bookings</a>
            <a href="#" className="text-secondary-text hover:bg-card-bg px-4 py-2.5 rounded-xl text-sm transition">Reports</a>
            <a href="#" className="text-secondary-text hover:bg-card-bg px-4 py-2.5 rounded-xl text-sm transition">Revenue Panel</a>
          </nav>
        </div>
        <div className="border-t border-border-custom pt-4">
          <a href="/" className="text-xs text-muted-text hover:text-primary transition font-medium">← Back to Main App</a>
        </div>
      </aside>

      {/* Main Content */}
      <section className="flex-1 p-8 md:p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-primary-text tracking-tight">System Overview</h1>
            <p className="text-sm text-body-text">Real-time statistics & system actions.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-muted-text">Server Status: <span className="text-green-600 font-bold">● Healthy</span></span>
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
              AD
            </div>
          </div>
        </header>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Revenue', value: '₹4,82,900', change: '+12.5%', color: 'border-l-primary' },
            { label: 'Active Customers', value: '1,248', change: '+8.2%', color: 'border-l-secondary' },
            { label: 'Listed Venues', value: '382', change: '+15.4%', color: 'border-l-accent' },
            { label: 'Pending Approvals', value: '14', change: 'Action Required', color: 'border-l-pending' },
          ].map((stat, i) => (
            <div key={i} className={`bg-card-bg border-l-4 ${stat.color} border border-border-custom/55 rounded-2xl p-6 shadow-xs`}>
              <span className="block text-xs font-semibold text-body-text uppercase">{stat.label}</span>
              <span className="block text-2xl font-black text-primary-text my-2">{stat.value}</span>
              <span className="text-xs font-bold text-muted-text">{stat.change}</span>
            </div>
          ))}
        </div>

        {/* Lower Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Approvals Panel */}
          <div className="bg-surface border border-border-custom rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4 text-primary-text flex justify-between items-center">
              <span>Pending Venue Approvals</span>
              <span className="bg-pending/10 text-pending text-xs px-2 py-0.5 rounded-full">14 Request(s)</span>
            </h2>
            <div className="flex flex-col gap-4">
              {[
                { name: 'Grand Ballroom & Garden', owner: 'Ramesh Patel', type: 'Wedding Hall', capacity: 800 },
                { name: 'Skyline Meeting Room', owner: 'Sophia Sharma', type: 'Meeting Room', capacity: 25 },
              ].map((venue, i) => (
                <div key={i} className="flex justify-between items-center p-4 border border-border-custom/40 rounded-xl bg-card-bg">
                  <div>
                    <span className="block font-bold text-sm text-primary-text">{venue.name}</span>
                    <span className="block text-xs text-body-text">{venue.type} • Capacity: {venue.capacity} • Owner: {venue.owner}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-primary text-surface text-xs px-3 py-1.5 rounded-lg hover:bg-primary/95 font-bold cursor-pointer">Approve</button>
                    <button className="bg-transparent border border-border-custom text-secondary-text text-xs px-3 py-1.5 rounded-lg hover:bg-background font-bold cursor-pointer">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Logs / Activity */}
          <div className="bg-surface border border-border-custom rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4 text-primary-text">System Audit Logs</h2>
            <div className="flex flex-col gap-4 font-mono text-[11px] text-body-text">
              {[
                { time: '2026-06-26 22:15:02', user: 'SYSTEM', msg: 'Backup completed successfully.' },
                { time: '2026-06-26 22:12:11', user: 'admin_joseph', msg: 'Blocked user ID #9103 due to terms violation.' },
                { time: '2026-06-26 22:04:45', user: 'owner_ramesh', msg: 'Submitted new venue "Grand Ballroom & Garden" for approval.' },
              ].map((log, i) => (
                <div key={i} className="border-b border-border-custom/20 pb-2">
                  <span className="text-muted-text mr-2">[{log.time}]</span>
                  <span className="text-accent font-bold mr-2">({log.user})</span>
                  <span>{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
