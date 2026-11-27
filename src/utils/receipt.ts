export const RECEIPT_COPIES = ['merchant', 'customer'] as const;

export type ReceiptCopy = (typeof RECEIPT_COPIES)[number];

export const RECEIPT_COPY_LABELS: Record<ReceiptCopy, string> = {
  merchant: 'MERCHANT COPY',
  customer: 'CUSTOMER COPY',
};
