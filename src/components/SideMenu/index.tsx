import React, { memo } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth, useStore } from 'context';
import NavLink from '../NavLink';
import { AnalyticsIcon, HomeIcon, ResturantIcon, SettingsIcon } from '../icons';

const SideMenu = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { can } = useStore();

  const links = [
    { name: 'Home', path: '/app', icon: <HomeIcon />, show: true },
    {
      name: 'POS',
      path: '/app/pos',
      icon: <ResturantIcon />,
      show: can('usePos'),
    },
    {
      name: 'Stock',
      path: '/app/stock',
      icon: <HomeIcon />,
      show: can('viewStock'),
    },
    {
      name: 'Vendors',
      path: '/app/vendors',
      icon: <HomeIcon />,
      show: can('viewVendors'),
    },
    {
      name: 'History',
      path: '/app/history',
      icon: <AnalyticsIcon />,
      show: can('viewHistory'),
    },
    {
      name: 'Reports',
      path: '/app/reports',
      icon: <AnalyticsIcon />,
      show: can('viewReports'),
    },
    {
      name: 'Add records',
      path: '/app/forms',
      icon: <ResturantIcon />,
      show: can('recordSale') && user?.role !== 'Auditor',
    },
    {
      name: 'Setup',
      path: '/app/setup',
      icon: <SettingsIcon />,
      show: can('manageSettings'),
    },
    {
      name: 'Activity',
      path: '/app/activity',
      icon: <AnalyticsIcon />,
      show: can('viewHistory') && user?.role !== 'Cashier',
    },
  ].filter((link) => link.show);

  return (
    <aside className="rail">
      <div className="rail-brand" aria-label="BentoPOS">
        B
      </div>

      <nav className="rail-nav" aria-label="Main navigation">
        {links.map((link) => (
          <NavLink
            isActive={
              link.path === '/app'
                ? pathname === '/app'
                : pathname.startsWith(link.path)
            }
            key={link.path}
            name={link.name}
            path={link.path}
            icon={link.icon}
          />
        ))}
      </nav>

      <span className="rail-footer">v4.6</span>
    </aside>
  );
};

export default memo(SideMenu);
