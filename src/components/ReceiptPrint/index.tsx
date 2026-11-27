import { memo } from 'react';

import { formatNaira } from 'utils/format';
import type { OrderRecord } from '../../context/OrderContext';

interface Props {
  receipt: OrderRecord | null;
}

const ReceiptPrint = memo(({ receipt }: Props) => {
  if (!receipt) {
    return null;
  }

  return (
    <div aria-hidden="true" className="receipt-print" id="receipt-print-root">
      <div className="receipt-print__brand">
        <span className="receipt-print__mark">B</span>
        <div>
          <strong>Bento Kitchen</strong>
          <span>Main counter · Register 02</span>
        </div>
      </div>

      <div className="receipt-print__meta">
        <span>Ticket {receipt.id}</span>
        <span>{receipt.time}</span>
      </div>

      <div className="receipt-print__type">
        {receipt.orderType} · {receipt.channel} · {receipt.tender}
      </div>

      <div className="receipt-print__rule" />

      {receipt.lines.map((line) => (
        <div className="receipt-print__line" key={line.name}>
          <span>
            {line.name} × {line.quantity}
          </span>
          <span>{formatNaira(line.unitPrice * line.quantity)}</span>
        </div>
      ))}

      <div className="receipt-print__rule" />

      <div className="receipt-print__line">
        <span>Subtotal</span>
        <span>{formatNaira(receipt.subtotal)}</span>
      </div>
      <div className="receipt-print__line">
        <span>VAT (7.5%)</span>
        <span>{formatNaira(receipt.vat)}</span>
      </div>
      <div className="receipt-print__line receipt-print__line--total">
        <span>Total</span>
        <span>{formatNaira(receipt.total)}</span>
      </div>

      <div className="receipt-print__rule" />

      <div className="receipt-print__paid">
        {receipt.status} · {receipt.tender}
      </div>
      <p className="receipt-print__footer">Thank you for eating with us.</p>
    </div>
  );
});

export default ReceiptPrint;
