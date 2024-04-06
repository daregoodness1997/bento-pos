import React, { memo } from 'react';
import { Input, Switch } from '@nextui-org/react';

import { MoonIcon, SearchIcon, SunIcon } from '../icons';

const TopNav = () => {
  const onChange = () => {};

  return (
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
        size="md"
        color="primary"
        startContent={<SunIcon />}
        endContent={<MoonIcon />}
        onChange={onChange}
      />
    </div>
  );
};

export default memo(TopNav);
