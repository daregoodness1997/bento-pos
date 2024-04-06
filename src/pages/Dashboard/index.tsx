import React, { memo } from 'react';
import { DashboardLayout } from 'layouts';
import { StatCard } from 'components';

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center gap-4">
        <StatCard />
        <StatCard />
        <StatCard />
        <StatCard />
      </div>
    </DashboardLayout>
  );
};

export default memo(Dashboard);
