import React, { memo, FC } from 'react';
import { useLocation } from 'react-router-dom';

import './styles.scss';
import NavLink from '../NavLink';
import { AnalyticsIcon, HomeIcon, ResturantIcon, SettingsIcon } from '../icons';

interface Props {}

const SideMenu: FC<Props> = () => {
  const { pathname } = useLocation();
  return (
    <div className="side-menu">
      <div className="flex flex-col">
        <NavLink
          name="New Order"
          path="/app"
          isActive={pathname === '/app'}
          icon={<ResturantIcon />}
        />
        <NavLink
          name="Analytics"
          path="/app/analytics"
          icon={<AnalyticsIcon />}
          isActive={pathname === '/app/analytics'}
        />
        <NavLink
          name="Online Order"
          path="/app/sales"
          isActive={pathname === '/app/sales'}
          icon={<HomeIcon />}
        />
        <NavLink
          name="Settings"
          path="/app/settings"
          isActive={pathname === '/app/settings'}
          icon={<SettingsIcon />}
        />
      </div>
    </div>
  );
};

export default memo(SideMenu);
