import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useOrder, usePrint, useStore } from 'context';
import { formatNaira } from 'utils/format';
import type { Tender } from 'types/store';
import {
  CardIcon,
  CashIcon,
  CheckIcon,
  MinusIcon,
  PlusIcon,
  PrintActions,
  ReceiptIcon,
  TrashIcon,
} from 'components';

const TENDERS: { id: Tender; label: string; icon?: React.ReactNode }[] = [
  { id: 'Cash', label: 'Cash', icon: <CashIcon /> },
  { id: 'Transfer', label: 'Transfer' },
  { id: 'POS', label: 'POS', icon: <CardIcon /> },
  { id: 'Credit', label: 'Credit' },
];

const CartSection = () => {
  const {
    lines,
    orderType,
    tender,
    customerId,
    placed,
    itemCount,
    ticketNumber,
    lastOrder,
    subtotal,
    vat,
    total,
    setQuantity,
    removeItem,
    setTender,
    setCustomer,
    placeOrder,
    startNewOrder,
  } = useOrder();
  const { data } = useStore();
  const { autoPrint, printReceipt } = usePrint();
  const navigate = useNavigate();

  const handleCharge = () => {
    const order = placeOrder();
    if (order && autoPrint) {
      printReceipt(order);
    }
  };

  return (
    <aside aria-label="Live order ticket" className="ticket-rail">
      <div className="ticket-header">
        <div className="ticket-eyebrow">
          <span>Ticket {ticketNumber}</span>
          <ReceiptIcon />
        </div>
        <h2 className="ticket-title">Live order</h2>
        <p className="ticket-type">
          {orderType} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </p>
      </div>

      {placed ? (
        <div className="ticket-success">
          <div className="ticket-success__icon">
            <CheckIcon />
          </div>
          <h3>
            {tender === 'Credit'
              ? 'Added to customer debt'
              : 'Payment received'}
          </h3>
          <p>
            {formatNaira(total)} {tender === 'Credit' ? 'is owed' : 'collected'}{' '}
            by {tender}. Ticket {lastOrder?.id} is ready to view.
          </p>
          {lastOrder && <PrintActions compact order={lastOrder} />}
          <div className="ticket-success__actions">
            <button
              className="secondary-button"
              disabled={!lastOrder}
              onClick={() =>
                lastOrder &&
                navigate(`/app/sales/${encodeURIComponent(lastOrder.id)}`)
              }
              type="button"
            >
              View order
            </button>
            <button
              className="primary-button"
              onClick={startNewOrder}
              type="button"
            >
              Start new order
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="ticket-scroll">
            {lines.length === 0 ? (
              <div className="ticket-empty">
                <span className="ticket-empty__icon">
                  <ReceiptIcon />
                </span>
                <strong>This ticket is empty</strong>
                <p>Tap a dish on the menu to start building this order.</p>
              </div>
            ) : (
              lines.map((line) => (
                <div className="ticket-line" key={line.id}>
                  <div>
                    <div className="ticket-line__name">{line.name}</div>
                    <div className="ticket-line__unit">
                      {formatNaira(line.price)} each
                    </div>
                    <div className="ticket-line__actions">
                      <div className="qty-stepper">
                        <button
                          aria-label={`Remove one ${line.name}`}
                          onClick={() =>
                            setQuantity(line.id, line.quantity - 1)
                          }
                          type="button"
                        >
                          <MinusIcon />
                        </button>
                        <span>{line.quantity}</span>
                        <button
                          aria-label={`Add one ${line.name}`}
                          onClick={() =>
                            setQuantity(line.id, line.quantity + 1)
                          }
                          type="button"
                        >
                          <PlusIcon />
                        </button>
                      </div>
                      <button
                        aria-label={`Remove ${line.name}`}
                        className="ticket-remove"
                        onClick={() => removeItem(line.id)}
                        type="button"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                  <div className="ticket-line__total">
                    {formatNaira(line.price * line.quantity)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="ticket-footer">
            <div className="ticket-row">
              <span>Subtotal</span>
              <span>{formatNaira(subtotal)}</span>
            </div>
            <div className="ticket-row">
              <span>VAT</span>
              <span>{formatNaira(vat)}</span>
            </div>
            <div className="ticket-row ticket-row--total">
              <span>Total</span>
              <span>{formatNaira(total)}</span>
            </div>

            <div className="tender-grid">
              {TENDERS.map((option) => (
                <button
                  className={`tender-button ${tender === option.id ? 'is-active' : ''}`}
                  key={option.id}
                  onClick={() => setTender(option.id)}
                  type="button"
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>

            {tender === 'Credit' && data.settings.creditEnabled && (
              <label
                className="admin-field ticket-credit"
                htmlFor="ticket-customer"
              >
                <span>Customer</span>
                <select
                  id="ticket-customer"
                  onChange={(event) => setCustomer(event.target.value)}
                  value={customerId}
                >
                  <option value="">Select customer</option>
                  {data.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              className="charge-button"
              disabled={
                lines.length === 0 || (tender === 'Credit' && !customerId)
              }
              onClick={handleCharge}
              type="button"
            >
              {tender === 'Credit'
                ? 'Charge to debt'
                : `Charge ${formatNaira(total)}`}
            </button>
          </div>
        </>
      )}
    </aside>
  );
};

export default memo(CartSection);
