import React, { memo, FC } from 'react';

import { Input, Switch } from '@nextui-org/react';
import useDarkMode from 'use-dark-mode';
import { MoonIcon, SearchIcon, SideMenu, SunIcon } from '../../components';

interface Props {
  children: React.ReactNode;
}

const DashboardLayout: FC<Props> = ({ children }) => {
  const darkMode = useDarkMode(true);

  const onChange = () => {
    if (darkMode) darkMode.disable;
    if (darkMode == false) darkMode.enable;
  };

  return (
    <div className="flex items-start ">
      <SideMenu />
      <div className="px-4 py-4 w-full">
        <div className="flex justify-end gap-2">
          <div className="w-48">
            <Input
              placeholder="Search for product"
              radius="full"
              startContent={
                <SearchIcon className="text-black/50 mb-0.5 dark:text-white/90 text-slate-400 pointer-events-none flex-shrink-0" />
              }
            />
          </div>

          <Switch
            defaultSelected
            size="md"
            color="primary"
            startContent={<SunIcon />}
            endContent={<MoonIcon />}
            onChange={onChange}
          />
        </div>

        {children}
      </div>
    </div>
  );
};

export default memo(DashboardLayout);
