import React, { memo } from 'react';

import { DashboardLayout } from 'layouts';
import { StatCard } from 'components';
import { formatNaira } from 'utils/format';

const STATS = [
  {
    id: 'sales',
    label: 'Net sales',
    value: formatNaira(184500),
    delta: '+12.4% vs yesterday',
    sparkline: [32, 48, 41, 62, 58, 76, 69, 88],
  },
  {
    id: 'orders',
    label: 'Orders',
    value: '86',
    delta: '+8 today',
    sparkline: [28, 36, 44, 40, 52, 61, 58, 72],
  },
  {
    id: 'average',
    label: 'Average ticket',
    value: formatNaira(2146),
    delta: '+3.1% vs yesterday',
    sparkline: [55, 49, 58, 62, 57, 66, 71, 74],
  },
  {
    id: 'refunds',
    label: 'Refunds',
    value: formatNaira(4200),
    delta: '-2 from yesterday',
    sparkline: [70, 62, 58, 46, 52, 38, 31, 24],
    negative: true,
  },
];

const HOURLY_SALES = [24, 38, 52, 78, 64, 91, 72, 56];
const HOUR_LABELS = ['08', '10', '12', '14', '16', '18', '20', '22'];

const TOP_DISHES = [
  { id: '1', name: 'Chicken Wings', meta: 'Grills · ₦6,000', count: '24' },
  { id: '2', name: 'Fried Rice', meta: 'Rice · ₦2,500', count: '19' },
  { id: '3', name: 'Pepper Soup', meta: 'Bowls · ₦4,000', count: '14' },
  { id: '4', name: 'Zobo', meta: 'Drinks · ₦1,200', count: '11' },
];

const Analytics = () => {
  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">A clear read on today at the counter.</p>
        </div>
      </div>

      <div className="stats-grid">
        {STATS.map((stat) => (
          <StatCard
            delta={stat.delta}
            key={stat.id}
            label={stat.label}
            negative={stat.negative}
            sparkline={stat.sparkline}
            value={stat.value}
          />
        ))}
      </div>

      <div className="analytics-grid">
        <section className="panel">
          <h2 className="panel-title">Sales by hour</h2>
          <p className="panel-subtitle">Where the rush is building.</p>
          <div className="bar-chart" aria-label="Sales by hour">
            {HOURLY_SALES.map((value, index) => (
              <span
                className="bar-chart__bar"
                key={HOUR_LABELS[index]}
                style={{ height: `${value}%` }}
              />
            ))}
          </div>
          <div className="bar-chart__labels">
            {HOUR_LABELS.map((hour) => (
              <span key={hour}>{hour}</span>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 className="panel-title">Top dishes</h2>
          <p className="panel-subtitle">Ordered most today.</p>
          <div className="panel-body">
            {TOP_DISHES.map((dish) => (
              <div className="top-dish" key={dish.id}>
                <div>
                  <div className="top-dish__name">{dish.name}</div>
                  <div className="top-dish__meta">{dish.meta}</div>
                </div>
                <span className="top-dish__count">{dish.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default memo(Analytics);
