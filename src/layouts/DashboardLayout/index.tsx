import React, { memo, FC } from 'react';

import { SideMenu, TopNav } from 'components';
import { CartSection } from 'sections';

interface Props {
  children: React.ReactNode;
  hasCart?: boolean;
}

const DashboardLayout: FC<Props> = ({ children, hasCart }) => {
  return (
    <div className="app-shell">
      <SideMenu />

      <div className="app-main">
        <TopNav />

        <div className={`app-content ${hasCart ? 'has-ticket' : ''}`}>
          <main className="app-page">{children}</main>
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
