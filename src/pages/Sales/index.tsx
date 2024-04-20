import React, { memo } from 'react';

import { DashboardLayout } from 'layouts';
import { Table } from 'components';

const Sales = () => {
  return (
    <DashboardLayout>
      <Table />
    </DashboardLayout>
  );
};

export default memo(Sales);
