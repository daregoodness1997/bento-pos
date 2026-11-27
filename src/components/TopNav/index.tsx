import React, { memo, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import UserDropdown from '../UserDropdown';

const TITLES: Record<string, string> = {
  '/app': 'Home',
  '/app/pos': 'Point of sale',
  '/app/stock': 'Stock',
  '/app/vendors': 'Vendors',
  '/app/history': 'History',
  '/app/reports': 'Reports',
  '/app/forms': 'Add records',
  '/app/setup': 'Setup',
  '/app/activity': 'Activity log',
  '/app/sales': 'Orders',
  '/app/settings': 'Settings',
};

const getTitle = (pathname: string) => {
  if (pathname.startsWith('/app/sales/')) {
    return 'Order detail';
  }

  return TITLES[pathname] || 'BentoPOS';
};

const formatTime = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const TopNav = () => {
  const { pathname } = useLocation();
  const [time, setTime] = useState(formatTime);

  useEffect(() => {
    const timer = window.setInterval(() => setTime(formatTime()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-context">
        <span className="topbar-title">{getTitle(pathname)}</span>
      </div>
      <div className="topbar-actions">
        <div className="status-chip">
          <span className="status-chip__dot" />
          <span>Register open</span>
        </div>
        <span className="clock">{time}</span>
        <UserDropdown />
      </div>
    </header>
  );
};

export default memo(TopNav);
