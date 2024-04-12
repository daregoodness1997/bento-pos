import React, { memo } from 'react';
import { Input, Button, ScrollShadow, Tabs, Tab } from '@nextui-org/react';

import { DashboardLayout } from 'layouts';
import { MenuCard, SearchIcon } from 'components';
import { MENU } from './constants';

const Dashboard = () => {
  return (
    <DashboardLayout hasSideSection>
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

      <div className="mt-6 mb-4 ">
        <Tabs aria-label="Options">
          <Tab key="all" title="All">
            <ScrollShadow className="w-full h-[75vh] overflow-y-scroll no-scrollbar">
              <div className="mt-4 grid grid-cols-4 gap-4">
                {MENU.map((menu) => (
                  <MenuCard currency="₦" key={menu.id} menu={menu} />
                ))}
              </div>
            </ScrollShadow>
          </Tab>
          <Tab key="dessert" title="Dessert">
            <ScrollShadow className="w-full h-[75vh] overflow-y-scroll no-scrollbar">
              <div className="mt-4 grid grid-cols-4 gap-4">
                {MENU.map((menu) => (
                  <MenuCard currency="₦" key={menu.id} menu={menu} />
                ))}
              </div>
            </ScrollShadow>
          </Tab>
          <Tab key="dinner" title="Dinner">
            <ScrollShadow className="w-full h-[75vh] overflow-y-scroll no-scrollbar">
              <div className="mt-4 grid grid-cols-4 gap-4">
                {MENU.map((menu) => (
                  <MenuCard currency="₦" key={menu.id} menu={menu} />
                ))}
              </div>
            </ScrollShadow>
          </Tab>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default memo(Dashboard);
