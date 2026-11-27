import React, { memo, useMemo, useState } from 'react';

import { DashboardLayout } from 'layouts';
import { AppInput, MenuCard, PageHeader, SearchIcon } from 'components';
import { useOrder, useStore } from 'context';
import { CATEGORIES } from './constants';

const Dashboard = () => {
  const [query, setQuery] = useState('');
  const { data } = useStore();
  const { department, setDepartment, itemCount, orderType, setOrderType } =
    useOrder();

  const visibleMenu = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return data.menu.filter((item) => {
      const matchesDepartment = item.category === department;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.name.toLowerCase().includes(normalizedQuery);
      return matchesDepartment && matchesQuery;
    });
  }, [data.menu, department, query]);

  return (
    <DashboardLayout hasCart>
      <PageHeader
        title="Point of sale"
        subtitle={`Tap an item to add it to the ticket. ${itemCount} on the ticket.`}
        actions={
          <div className="segmented" aria-label="Order type">
            {(['Dine in', 'Takeaway', 'Delivery'] as const).map((type) => (
              <button
                className={`segment ${orderType === type ? 'is-active' : ''}`}
                key={type}
                onClick={() => setOrderType(type)}
                type="button"
              >
                {type}
              </button>
            ))}
          </div>
        }
      />

      <div className="menu-toolbar">
        <div className="menu-search">
          <AppInput
            aria-label="Search menu"
            classNames={{
              inputWrapper:
                'h-[42px] min-h-[42px] border-[#1e2a2c] bg-[#11191b] data-[hover=true]:border-[#2b3a3c]',
            }}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search menu"
            startContent={<SearchIcon />}
            value={query}
          />
        </div>

        <div className="category-tabs" aria-label="Departments">
          {CATEGORIES.map((name) => (
            <button
              className={`category-tab ${department === name ? 'is-active' : ''}`}
              key={name}
              onClick={() => setDepartment(name)}
              type="button"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {visibleMenu.length > 0 ? (
        <div className="menu-grid">
          {visibleMenu.map((item) => (
            <MenuCard item={item} key={item.id} />
          ))}
        </div>
      ) : (
        <div className="ticket-empty">
          <strong>No items found</strong>
          <p>Try another name or switch department.</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default memo(Dashboard);
