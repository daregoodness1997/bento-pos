import type { BentoData } from 'types/store';
import { saleCost, saleOutstanding } from 'utils/finance';

const csvCell = (value: unknown) => {
  const text = value === undefined || value === null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const section = (title: string, headers: string[], rows: unknown[][]) => [
  [title],
  headers,
  ...rows,
];

export const buildCsv = (data: BentoData) => {
  const userName = (id: string) =>
    data.users.find((user) => user.id === id)?.name ?? '';

  const rows: unknown[][] = [
    ...section(
      'Sales',
      [
        'ID',
        'Date',
        'Time',
        'Department',
        'Tender',
        'Staff',
        'Customer',
        'Subtotal',
        'VAT',
        'Total',
        'Paid',
        'Outstanding',
        'Cost',
        'Items',
      ],
      data.sales.map((sale) => [
        sale.id,
        sale.date,
        sale.time,
        sale.department,
        sale.tender,
        userName(sale.staffId),
        data.customers.find((customer) => customer.id === sale.customerId)
          ?.name ?? '',
        sale.subtotal,
        sale.vat,
        sale.total,
        sale.amountPaid,
        saleOutstanding(sale),
        saleCost(sale),
        sale.items,
      ]),
    ),
    [],
    ...section(
      'Vendors',
      ['ID', 'Name', 'Phone', 'Supplies', 'Terms days', 'Created'],
      data.vendors.map((vendor) => [
        vendor.id,
        vendor.name,
        vendor.phone,
        vendor.supplies,
        vendor.termsDays ?? '',
        vendor.createdAt,
      ]),
    ),
    [],
    ...section(
      'Deliveries',
      [
        'ID',
        'Date',
        'Vendor',
        'Item',
        'Quantity',
        'Unit cost',
        'Paid now',
        'Pay by',
        'Invoice',
      ],
      data.deliveries.map((delivery) => [
        delivery.id,
        delivery.date,
        data.vendors.find((vendor) => vendor.id === delivery.vendorId)?.name ??
          '',
        delivery.item,
        delivery.quantity,
        delivery.cost,
        delivery.amountPaid,
        delivery.payByDate ?? '',
        delivery.invoice,
      ]),
    ),
    [],
    ...section(
      'Vendor payments',
      ['ID', 'Date', 'Vendor', 'Amount', 'Method', 'Reference'],
      data.vendorPayments.map((payment) => [
        payment.id,
        payment.date,
        data.vendors.find((vendor) => vendor.id === payment.vendorId)?.name ??
          '',
        payment.amount,
        payment.method,
        payment.reference,
      ]),
    ),
    [],
    ...section(
      'Customers',
      ['ID', 'Name', 'Phone', 'Created'],
      data.customers.map((customer) => [
        customer.id,
        customer.name,
        customer.phone,
        customer.createdAt,
      ]),
    ),
    [],
    ...section(
      'Debt payments',
      ['ID', 'Date', 'Customer', 'Amount', 'Method', 'Reference'],
      data.debtPayments.map((payment) => [
        payment.id,
        payment.date,
        data.customers.find((customer) => customer.id === payment.customerId)
          ?.name ?? '',
        payment.amount,
        payment.method,
        payment.reference,
      ]),
    ),
    [],
    ...section(
      'Inventory',
      [
        'ID',
        'Name',
        'Category',
        'Unit',
        'Opening stock',
        'Cost',
        'Reorder level',
        'Target level',
      ],
      data.inventory.map((item) => [
        item.id,
        item.name,
        item.category,
        item.unit,
        item.openingStock,
        item.cost,
        item.reorderLevel,
        item.targetLevel,
      ]),
    ),
    [],
    ...section(
      'Menu',
      ['ID', 'Name', 'Department', 'Price', 'Prep time', 'Recipe'],
      data.menu.map((item) => [
        item.id,
        item.name,
        item.category,
        item.price,
        item.prepTime,
        item.recipe
          .map((part) => {
            const name =
              data.inventory.find((entry) => entry.id === part.itemId)?.name ??
              part.itemId;
            return `${name}:${part.quantity}`;
          })
          .join('|'),
      ]),
    ),
    [],
    ...section(
      'Expenses',
      ['ID', 'Date', 'Category', 'Description', 'Amount', 'Method'],
      data.expenses.map((expense) => [
        expense.id,
        expense.date,
        expense.category,
        expense.description,
        expense.amount,
        expense.method,
      ]),
    ),
    [],
    ...section(
      'Losses and gains',
      ['ID', 'Date', 'Item', 'Type', 'Quantity', 'Reason', 'Value'],
      data.losses.map((loss) => [
        loss.id,
        loss.date,
        loss.itemName,
        loss.type,
        loss.quantity,
        loss.reason,
        loss.value,
      ]),
    ),
    [],
    ...section(
      'Stock counts',
      ['ID', 'Date', 'Item', 'Previous', 'Counted', 'Difference', 'Value'],
      data.stockCounts.map((count) => [
        count.id,
        count.date,
        count.itemName,
        count.previous,
        count.counted,
        count.difference,
        count.value,
      ]),
    ),
    [],
    ...section(
      'Day close',
      [
        'ID',
        'Date',
        'Expected cash',
        'Cash counted',
        'Difference',
        'Staff',
        'Note',
      ],
      data.dayCloses.map((close) => [
        close.id,
        close.date,
        close.expectedCash,
        close.countedCash,
        close.difference,
        userName(close.staffId),
        close.note,
      ]),
    ),
    [],
    ...section(
      'Activity log',
      ['Timestamp', 'User', 'Action', 'Entity', 'Summary'],
      data.auditEvents.map((event) => [
        event.timestamp,
        event.actorName,
        event.action,
        event.entity,
        event.summary,
      ]),
    ),
  ];

  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
};

export const downloadCsv = (data: BentoData) => {
  const blob = new Blob([buildCsv(data)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bento-pos-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
