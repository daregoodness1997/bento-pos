import React, { memo, FC } from 'react';

import { SideMenu, TopNav } from 'components';
import { CartSection } from 'sections';

interface Props {
  children: React.ReactNode;
  hasCart?: boolean;
}

const DashboardLayout: FC<Props> = ({ children, hasCart }) => {
  return (
    <div className="flex items-start ">
      <SideMenu />
      <div className="px-4 py-4 w-full">
        <TopNav />

        <div className="flex w-full items-start py-8 gap-6">
          <div className="w-full"> {children}</div>
          {hasCart && <CartSection />}
        </div>
      </div>
    </div>
  );
};

DashboardLayout.defaultProps = {
  hasCart: false,
};

export default memo(DashboardLayout);
