import { memo } from 'react';

import { formatNaira } from 'utils/format';
import { RECEIPT_COPIES, RECEIPT_COPY_LABELS } from 'utils/receipt';
import type { ReceiptCopy } from 'utils/receipt';
import type { OrderRecord } from '../../context/OrderContext';

interface ReceiptBrand {
  storeName: string;
  terminalId: string;
}

interface Props extends ReceiptBrand {
  receipt: OrderRecord | null;
}

interface ReceiptCopyProps extends ReceiptBrand {
  receipt: OrderRecord;
  copy: ReceiptCopy;
}

const ReceiptCopyPrint = ({
  copy,
  receipt,
  storeName,
  terminalId,
}: ReceiptCopyProps) => (
  <div aria-hidden="true" className="receipt-print" data-copy={copy}>
    <div className="receipt-print__brand">
      <span className="receipt-print__mark">B</span>
      <div>
        <strong>{storeName}</strong>
        <span>Main counter · {terminalId}</span>
      </div>
    </div>

    <div className="receipt-print__copy">{RECEIPT_COPY_LABELS[copy]}</div>

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
    <p className="receipt-print__footer">
      {copy === 'merchant'
        ? 'Merchant copy · Retain for records.'
        : 'Thank you for eating with us.'}
    </p>
  </div>
);

const ReceiptPrint = memo(
  ({ receipt, storeName, terminalId }: Props) => {
    if (!receipt) {
      return null;
    }

    return (
      <div aria-hidden="true" className="receipt-print-stack">
        {RECEIPT_COPIES.map((copy) => (
          <ReceiptCopyPrint
            key={copy}
            copy={copy}
            receipt={receipt}
            storeName={storeName}
            terminalId={terminalId}
          />
        ))}
      </div>
    );
  },
);

export default ReceiptPrint;
