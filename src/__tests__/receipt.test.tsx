import '@testing-library/jest-dom';
import { TextDecoder } from 'util';
import { render, screen } from '@testing-library/react';

import ReceiptPrint from '../components/ReceiptPrint';
import { createSeedData } from '../store/seed';
import { buildEscPosReceipt } from '../utils/escpos';

const order = createSeedData().sales[0];
const storeName = 'My Restaurant';
const terminalId = 'Terminal 7';

describe('receipt branding', () => {
  it('uses the configured store name on the printed receipt', () => {
    render(
      <ReceiptPrint
        receipt={order}
        storeName={storeName}
        terminalId={terminalId}
      />,
    );

    expect(screen.getAllByText(storeName)).toHaveLength(2);
    expect(
      screen.getAllByText(`Main counter · ${terminalId}`),
    ).toHaveLength(2);
  });

  it('uses the configured store name on the thermal receipt', () => {
    const bytes = buildEscPosReceipt(
      order,
      'customer',
      storeName,
      terminalId,
    );
    const text = new TextDecoder().decode(Uint8Array.from(bytes));

    expect(text).toContain(storeName.toUpperCase());
    expect(text).toContain(`Main counter · ${terminalId}`);
  });
});
