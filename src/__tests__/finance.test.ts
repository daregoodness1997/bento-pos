import { createSeedData, dateKey } from 'store/seed';
import {
  allocationForVendor,
  dailyReport,
  stockLevels,
  vendorBalance,
  vendorOverdue,
} from 'utils/finance';
import { buildCsv } from 'utils/exportCsv';

describe('vendor allocations', () => {
  it('clears old deliveries first and reports overdue balances', () => {
    const data = createSeedData();
    const rows = allocationForVendor(
      'vendor-1',
      data.deliveries,
      data.vendorPayments,
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].delivery.id).toBe('del-1');
    expect(rows[0].balance).toBe(4000);
    expect(rows[1].balance).toBe(8000);
    expect(vendorBalance(rows)).toBe(12000);
    expect(vendorOverdue(rows)).toBe(4000);
  });
});

describe('stock levels', () => {
  it('includes deliveries, recipe use, losses and counts', () => {
    const data = createSeedData();
    data.deliveries = [];
    data.sales = [];
    data.losses = [];
    data.stockCounts = [];
    data.inventory = [
      {
        id: 'inv-test',
        name: 'Test item',
        category: 'Restaurant',
        unit: 'piece',
        openingStock: 10,
        cost: 100,
        reorderLevel: 3,
        targetLevel: 20,
      },
    ];
    data.menu = [
      {
        id: 'menu-test',
        name: 'Test dish',
        price: 500,
        category: 'Restaurant',
        prepTime: 1,
        tone: 'signal',
        recipe: [{ itemId: 'inv-test', quantity: 2 }],
      },
    ];

    expect(stockLevels(data)['inv-test']).toBe(10);

    data.sales.push({
      id: '#1',
      date: dateKey(),
      time: '12:00',
      createdAt: new Date().toISOString(),
      channel: 'Counter',
      department: 'Restaurant',
      orderType: 'Dine in',
      tender: 'Cash',
      status: 'Paid',
      staffId: 'user-owner',
      items: 'Test dish × 1',
      lines: [
        {
          name: 'Test dish',
          quantity: 1,
          unitPrice: 500,
          cost: 200,
          itemId: 'menu-test',
        },
      ],
      subtotal: 500,
      vat: 38,
      total: 538,
      amountPaid: 538,
    });

    expect(stockLevels(data)['inv-test']).toBe(8);

    data.losses.push({
      id: 'loss-test',
      date: dateKey(),
      itemId: 'inv-test',
      itemName: 'Test item',
      quantity: 2,
      type: 'Loss',
      reason: 'Spoiled',
      value: 200,
      staffId: 'user-owner',
      createdAt: new Date().toISOString(),
    });

    expect(stockLevels(data)['inv-test']).toBe(6);

    data.stockCounts.push({
      id: 'count-test',
      date: dateKey(),
      itemId: 'inv-test',
      itemName: 'Test item',
      previous: 6,
      counted: 7,
      difference: 1,
      value: 100,
      staffId: 'user-owner',
      createdAt: new Date().toISOString(),
    });

    expect(stockLevels(data)['inv-test']).toBe(7);
  });
});

describe('daily report', () => {
  it('summarises seeded sales and cash movement', () => {
    const data = createSeedData();
    const report = dailyReport(data, dateKey());

    expect(report.orderCount).toBe(5);
    expect(report.totalSales).toBe(25909);
    expect(report.cashSales).toBe(12901);
    expect(report.creditOutstanding).toBe(3978);
    expect(report.expenses).toBe(12000);
    expect(report.expectedCash).toBe(85901);
  });

  it('restricts cashier reports to their own sales', () => {
    const data = createSeedData();
    const report = dailyReport(data, dateKey(), 'user-cashier');

    expect(report.orderCount).toBe(4);
    expect(report.byStaff).toHaveLength(1);
    expect(report.expenses).toBe(0);
  });
});

describe('csv export', () => {
  it('includes every record section', () => {
    const csv = buildCsv(createSeedData());

    [
      'Sales',
      'Vendors',
      'Deliveries',
      'Vendor payments',
      'Customers',
      'Debt payments',
      'Inventory',
      'Menu',
      'Expenses',
      'Losses and gains',
      'Stock counts',
      'Day close',
      'Activity log',
    ].forEach((section) => expect(csv).toContain(`"${section}"`));
  });
});
