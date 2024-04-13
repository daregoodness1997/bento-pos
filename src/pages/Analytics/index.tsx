import React, { memo } from 'react';

import { DashboardLayout } from 'layouts';
import { DefaultStatCard } from 'components';

const Analytics = () => {
  const stats = [
    {
      id: '1',
      title: 'Revenue',
      value: '4000',
      icon: 'mynaui:dollar',
    },
    {
      id: '2',
      title: 'Walk-ins',
      value: '4000',
      icon: 'mynaui:users',
    },
    {
      id: '3',
      title: 'Total Orders',
      value: '4000',
      icon: 'mynaui:book',
    },
    {
      id: '4',
      title: 'Online Orders',
      value: '4000',
      icon: 'mynaui:mouse-pointer',
    },
  ];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between gap-4">
        {stats.map((stat) => (
          <DefaultStatCard
            key={stat.id}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
          />
        ))}
      </div>
    </DashboardLayout>
  );
};

export default memo(Analytics);
