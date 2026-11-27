import { memo } from 'react';

import { usePrint } from 'context';
import type { ThermalTransport } from 'context';
import type { OrderRecord } from '../../context/OrderContext';

const TRANSPORT_LABELS: Record<ThermalTransport, string> = {
  network: 'network printer',
  serial: 'Web Serial',
  usb: 'WebUSB',
};

interface Props {
  order: OrderRecord;
  compact: boolean;
}

const PrintActions = memo(({ order, compact }: Props) => {
  const {
    printReceipt,
    printThermal,
    connectThermal,
    canUseThermal,
    thermalReady,
    thermalTransport,
    status,
  } = usePrint();

  return (
    <div className={`print-actions ${compact ? 'print-actions--compact' : ''}`}>
      <button
        className="secondary-button"
        onClick={() => printReceipt(order)}
        type="button"
      >
        Print receipt
      </button>
      <button
        className="secondary-button"
        disabled={!canUseThermal}
        onClick={() => printThermal(order)}
        type="button"
      >
        Thermal ESC/POS
      </button>
      {canUseThermal && !thermalReady && (
        <button
          className="print-actions__link"
          onClick={() => connectThermal()}
          type="button"
        >
          Connect {TRANSPORT_LABELS[thermalTransport]}
        </button>
      )}
      {!canUseThermal && (
        <span className="print-actions__hint">
          {TRANSPORT_LABELS[thermalTransport]} is required for thermal prints.
        </span>
      )}
      {status && (
        <span className="print-actions__status" role="status">
          {status}
        </span>
      )}
    </div>
  );
});

export default PrintActions;
