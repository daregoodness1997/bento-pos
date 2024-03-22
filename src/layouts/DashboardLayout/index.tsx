import React, { memo, FC } from 'react';

import { Input } from '@nextui-org/react';

import { SearchIcon, SideMenu } from '../../components';

interface Props {
  children: React.ReactNode;
}

const DashboardLayout: FC<Props> = ({ children }) => {
  return (
    <div className="flex items-start ">
      <SideMenu />
      <div className="px-2 py-4 w-full">
        <Input
          placeholder="Search for product"
          fullWidth
          variant="bordered"
          isClearable
          radius="sm"
          startContent={
            <SearchIcon className="text-black/50 mb-0.5 dark:text-white/90 text-slate-400 pointer-events-none flex-shrink-0" />
          }
        />
        {children}
      </div>
    </div>
  );
};

export default memo(DashboardLayout);
