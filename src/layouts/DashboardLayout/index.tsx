import React, { memo, FC } from 'react';

import { SideMenu, TopNav } from 'components';
import { CartSection } from 'sections';

interface Props {
  children: React.ReactNode;
  hasCart?: boolean;
  sidePanel?: React.ReactNode;
}

const DashboardLayout: FC<Props> = ({ children, hasCart, sidePanel }) => {
  return (
    <div className="app-shell">
      <SideMenu />

      <div className="app-main">
        <TopNav />

        <div
          className={`app-content ${hasCart || sidePanel ? 'has-ticket' : ''}`}
        >
          <main className="app-page">{children}</main>
          {hasCart && <CartSection />}
          {!hasCart && sidePanel}
        </div>
      </div>
    </div>
  );
};

DashboardLayout.defaultProps = {
  hasCart: false,
  sidePanel: undefined,
};

export default memo(DashboardLayout);
