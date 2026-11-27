import { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardLayout } from 'layouts';
import { AppInput, PageHeader, SearchIcon } from 'components';
import { useOrder, useStore } from 'context';
import { formatNaira } from 'utils/format';

const FILTERS = ['All', 'Paid', 'Credit', 'Preparing', 'Refunded'];

const Sales = () => {
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const { orders } = useOrder();
  const { currentUser } = useStore();
  const navigate = useNavigate();

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStaff =
        currentUser?.role !== 'Cashier' || order.staffId === currentUser.id;
      const matchesFilter = filter === 'All' || order.status === filter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        order.id.toLowerCase().includes(normalizedQuery) ||
        order.channel.toLowerCase().includes(normalizedQuery) ||
        order.items.toLowerCase().includes(normalizedQuery);

      return matchesStaff && matchesFilter && matchesQuery;
    });
  }, [currentUser, filter, query, orders]);

  const handleView = (id: string) => {
    navigate(`/app/sales/${encodeURIComponent(id)}`);
  };

  return (
    <DashboardLayout>
      <PageHeader
        subtitle="Every ticket from this service, in one place."
        title="Orders"
      />

      <div className="table-tools">
        <div className="filter-tabs" aria-label="Order status">
          {FILTERS.map((name) => (
            <button
              className={`category-tab ${filter === name ? 'is-active' : ''}`}
              key={name}
              onClick={() => setFilter(name)}
              type="button"
            >
              {name}
            </button>
          ))}
        </div>

        <div className="menu-search">
          <AppInput
            aria-label="Search orders"
            classNames={{
              inputWrapper:
                'h-[42px] min-h-[42px] border-[#1e2a2c] bg-[#11191b] data-[hover=true]:border-[#2b3a3c]',
            }}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search ticket, channel, or item"
            startContent={<SearchIcon />}
            value={query}
          />
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Time</th>
              <th>Channel</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((order) => (
              <tr key={order.id}>
                <td>
                  <button
                    className="ticket-link"
                    onClick={() => handleView(order.id)}
                    type="button"
                  >
                    {order.id}
                  </button>
                </td>
                <td className="tabular">{order.time}</td>
                <td>{order.channel}</td>
                <td>{order.items}</td>
                <td className="tabular">{formatNaira(order.total)}</td>
                <td>
                  <span className="status-pill" data-status={order.status}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visibleOrders.length === 0 && (
          <div className="ticket-empty">
            <strong>No matching orders</strong>
            <p>Try another ticket number, channel, or status.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default memo(Sales);
