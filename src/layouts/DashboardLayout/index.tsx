import React, { memo, FC } from 'react';

import { SideMenu, TopNav } from 'components';
import { SideSection } from 'sections';

interface Props {
  children: React.ReactNode;
  hasSideSection?: boolean;
  sideChildren?: React.ReactNode;
}

const DashboardLayout: FC<Props> = ({
  children,
  hasSideSection,
  sideChildren,
}) => {
  return (
    <div className="flex items-start ">
      <SideMenu />
      <div className="px-4 py-4 w-full">
        <TopNav />

        <div className="flex w-full items-start py-8 gap-6">
          <div className="w-full"> {children}</div>
          {hasSideSection && <SideSection>{sideChildren}</SideSection>}
        </div>
      </div>
    </div>
  );
};

DashboardLayout.defaultProps = {
  hasSideSection: false,
  sideChildren: null,
};

export default memo(DashboardLayout);
