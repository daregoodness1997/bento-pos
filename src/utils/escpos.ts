import type { OrderRecord } from '../context/OrderContext';
import { RECEIPT_COPY_LABELS } from './receipt';
import type { ReceiptCopy } from './receipt';

const WIDTH = 32;
const ESC = 27;
const GS = 29;
const encoder = new TextEncoder();

const push = (bytes: number[], values: number[]) => {
  bytes.push(...values);
};

const writeText = (bytes: number[], value: string) => {
  bytes.push(...Array.from(encoder.encode(value)));
};

const writeLine = (bytes: number[], value = '') => {
  writeText(bytes, `${value}\n`);
};

const formatMoney = (value: number) => `NGN ${value.toLocaleString('en-NG')}`;

const fit = (value: string, width: number) =>
  value.length <= width ? value : value.slice(0, Math.max(0, width));

const padLine = (left: string, right: string) => {
  const safeLeft = fit(left, Math.max(1, WIDTH - right.length - 1));
  const spaces = Math.max(1, WIDTH - safeLeft.length - right.length);

  return `${safeLeft}${' '.repeat(spaces)}${right}`;
};

const wrapText = (value: string, width: number) => {
  const lines: string[] = [];
  let current = '';

  value.split(' ').forEach((word) => {
    if (current.length === 0) {
      current = word;
      return;
    }

    if (current.length + 1 + word.length <= width) {
      current = `${current} ${word}`;
      return;
    }

    lines.push(current);
    current = word;
  });

  if (current.length > 0) {
    lines.push(current);
  }

  return lines.length === 0 ? [''] : lines;
};

export const buildEscPosReceipt = (
  order: OrderRecord,
  copy: ReceiptCopy = 'customer',
  storeName = 'BentoPOS',
  terminalId = 'Register 02',
) => {
  const bytes: number[] = [];

  push(bytes, [ESC, 64]);
  push(bytes, [ESC, 116, 0]);
  push(bytes, [ESC, 97, 1]);
  push(bytes, [ESC, 69, 1]);
  push(bytes, [GS, 33, 17]);
  writeLine(bytes, storeName.toUpperCase());
  push(bytes, [GS, 33, 0]);
  push(bytes, [ESC, 69, 0]);
  writeLine(bytes, `Main counter · ${terminalId}`);
  push(bytes, [ESC, 69, 1]);
  writeLine(bytes, RECEIPT_COPY_LABELS[copy]);
  push(bytes, [ESC, 69, 0]);
  writeLine(bytes, `Ticket ${order.id}`);
  push(bytes, [ESC, 97, 0]);
  writeLine(bytes, '-'.repeat(WIDTH));

  order.lines.forEach((line) => {
    const amount = formatMoney(line.unitPrice * line.quantity);
    const label = `${line.name} x${line.quantity}`;

    wrapText(label, WIDTH - amount.length - 1).forEach((part, index) => {
      writeLine(
        bytes,
        padLine(index === 0 ? part : `  ${part}`, index === 0 ? amount : ''),
      );
    });
  });

  writeLine(bytes, '-'.repeat(WIDTH));
  writeLine(bytes, padLine('Subtotal', formatMoney(order.subtotal)));
  writeLine(bytes, padLine('VAT 7.5%', formatMoney(order.vat)));
  push(bytes, [ESC, 69, 1]);
  writeLine(bytes, padLine('TOTAL', formatMoney(order.total)));
  push(bytes, [ESC, 69, 0]);
  writeLine(bytes, '-'.repeat(WIDTH));
  push(bytes, [ESC, 97, 1]);
  writeLine(bytes, order.status.toUpperCase());
  writeLine(bytes, `Paid by ${order.tender}`);
  writeLine(
    bytes,
    copy === 'merchant'
      ? 'Merchant copy - retain for records.'
      : 'Thank you for eating with us.',
  );
  push(bytes, [ESC, 100, 3]);
  push(bytes, [GS, 86, 0]);

  return Uint8Array.from(bytes);
};
