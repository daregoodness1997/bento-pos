import React, { memo } from 'react';
import { Input, Button, Chip } from '@nextui-org/react';

import { DashboardLayout } from 'layouts';
import { MenuCard, MoonIcon, SearchIcon } from 'components';
import { MENU } from './constants';

const Dashboard = () => {
  return (
    <DashboardLayout hasCart>
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search for product"
          className="w-1/3"
          size="md"
          radius="full"
          startContent={
            <SearchIcon className="text-black/50 mb-0.5 dark:text-white/90 text-slate-400 pointer-events-none flex-shrink-0" />
          }
        />

        <Button color="primary" radius="full" size="md">
          Create Order
        </Button>
      </div>

      <div className="mt-6 mb-4 flex items-center gap-2">
        <Chip color="primary" startContent={<MoonIcon />} size="lg">
          All Menu
        </Chip>
        <Chip size="lg" startContent={<MoonIcon />}>
          Main Course
        </Chip>
        <Chip size="lg" startContent={<MoonIcon />}>
          Desserts
        </Chip>
        <Chip size="lg" startContent={<MoonIcon />}>
          Drinks
        </Chip>
        <Chip size="lg" startContent={<MoonIcon />}>
          Asain
        </Chip>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        {MENU.map((menu) => (
          <MenuCard
            key={menu.id}
            name={menu.name}
            price={menu.price}
            imageUrl={menu.imageUrl}
            currency="₦"
          />
        ))}
      </div>
    </DashboardLayout>
  );
};

export default memo(Dashboard);
