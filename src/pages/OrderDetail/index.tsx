import { memo, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { DashboardLayout } from 'layouts';
import {
  ArrowLeftIcon,
  CardIcon,
  CashIcon,
  CheckIcon,
  PrintActions,
  ReceiptIcon,
} from 'components';
import { useOrder, useStore } from 'context';
import { formatNaira } from 'utils/format';

const OrderDetail = () => {
  const { id } = useParams();
  const { orders } = useOrder();
  const { currentUser } = useStore();
  const navigate = useNavigate();

  const order = useMemo(
    () =>
      orders.find(
        (record) =>
          record.id === id &&
          (currentUser?.role !== 'Cashier' ||
            record.staffId === currentUser.id),
      ),
    [currentUser, id, orders],
  );

  if (!order) {
    return (
      <DashboardLayout>
        <div className="page-header">
          <div>
            <h1 className="page-title">Order not found</h1>
            <p className="page-subtitle">
              This ticket is no longer available in this service.
            </p>
          </div>
        </div>
        <button
          className="secondary-button"
          onClick={() => navigate('/app/sales')}
          type="button"
        >
          Back to orders
        </button>
      </DashboardLayout>
    );
  }

  const itemCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <DashboardLayout>
      <div className="detail-header">
        <button
          className="back-button"
          onClick={() => navigate('/app/sales')}
          type="button"
        >
          <ArrowLeftIcon />
          Orders
        </button>

        <div>
          <h1 className="page-title">Ticket {order.id}</h1>
          <p className="page-subtitle">
            Opened at {order.time} · {order.channel}
          </p>
        </div>
      </div>

      <div className="order-detail-grid">
        <section className="order-detail-card">
          <div className="ticket-eyebrow">
            <span>Receipt</span>
            <span className="status-pill" data-status={order.status}>
              {order.status}
            </span>
          </div>

          <div className="order-detail__heading">
            <span className="order-detail__mark">
              <ReceiptIcon />
            </span>
            <div>
              <h2>{order.orderType}</h2>
              <p>Paid by {order.tender}</p>
            </div>
          </div>

          <div className="receipt-lines">
            {order.lines.map((line) => (
              <div className="receipt-line" key={line.name}>
                <div>
                  <strong>{line.name}</strong>
                  <span>
                    {formatNaira(line.unitPrice)} × {line.quantity}
                  </span>
                </div>
                <span className="tabular">
                  {formatNaira(line.unitPrice * line.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="ticket-row">
            <span>Subtotal</span>
            <span>{formatNaira(order.subtotal)}</span>
          </div>
          <div className="ticket-row">
            <span>VAT (7.5%)</span>
            <span>{formatNaira(order.vat)}</span>
          </div>
          <div className="ticket-row ticket-row--total">
            <span>Total</span>
            <span>{formatNaira(order.total)}</span>
          </div>

          <div className="order-detail__paid">
            <CheckIcon />
            Payment received
          </div>
        </section>

        <aside className="order-detail-side">
          <div className="detail-stat">
            <span>Items sold</span>
            <strong className="tabular">{itemCount}</strong>
          </div>
          <div className="detail-stat">
            <span>Average item</span>
            <strong className="tabular">
              {formatNaira(
                itemCount > 0 ? Math.round(order.subtotal / itemCount) : 0,
              )}
            </strong>
          </div>
          <div className="detail-stat">
            <span>Tender</span>
            <strong className="detail-stat__tender">
              {order.tender === 'Cash' ? <CashIcon /> : <CardIcon />}
              {order.tender}
            </strong>
          </div>
          <PrintActions compact={false} order={order} />

          <button
            className="primary-button"
            onClick={() => navigate('/app')}
            type="button"
          >
            Start another order
          </button>
          <button
            className="secondary-button"
            onClick={() => navigate('/app/sales')}
            type="button"
          >
            All orders
          </button>
        </aside>
      </div>
    </DashboardLayout>
  );
};

export default memo(OrderDetail);
