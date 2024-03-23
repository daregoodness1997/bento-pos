import React, { memo, FC } from 'react';
import { Divider } from '@nextui-org/react';
import { useLocation } from 'react-router-dom';

import './styles.scss';
import NavLink from '../NavLink';
import { AnalyticsIcon, HomeIcon, ResturantIcon } from '../icons';

interface Props {}

const SideMenu: FC<Props> = () => {
  const { pathname } = useLocation();
  return (
    <div className="side-menu px-2 py-4 ">
      <h4 className="logo">Forge POS</h4>

      <Divider />

      <div className="mt-8 flex flex-col gap-2">
        <NavLink
          name="Menu"
          path="/app"
          isActive={pathname === '/app'}
          icon={<HomeIcon />}
        />
        <NavLink
          name="Analytics"
          path="/app/analytics"
          icon={<AnalyticsIcon />}
          isActive={pathname === '/app/analytics'}
        />
        <NavLink
          name="Sales"
          path="/app/sales"
          isActive={pathname === '/app/sales'}
          icon={<ResturantIcon />}
        />
        <NavLink
          name="Settings"
          path="/app/settings"
          isActive={pathname === '/app/settings'}
          icon={<ResturantIcon />}
        />
      </div>
    </div>
  );
};

export default memo(SideMenu);
