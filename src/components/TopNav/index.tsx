import React, { memo } from 'react';
import { Input, Switch } from '@nextui-org/react';
import { Icon } from '@iconify/react';

import { MoonIcon, SearchIcon, SunIcon } from '../icons';
import UserDropdown from '../UserDropdown';

const TopNav = () => {
  const onChange = () => {};

  return (
    <div className="flex justify-end items-center gap-2">
      <Icon icon="mynaui:cloud" width="24" height="24" />

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
        size="md"
        color="primary"
        startContent={<SunIcon />}
        endContent={<MoonIcon />}
        onChange={onChange}
      />

      <UserDropdown />
    </div>
  );
};

export default memo(TopNav);
