import type {
  BentoData,
  Delivery,
  MenuItem,
  SaleRecord,
  VendorPayment,
} from 'types/store';
import { dateKey } from 'store/seed';

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

export const saleCost = (sale: SaleRecord) =>
  sale.lines.reduce((sum, line) => sum + (line.cost || 0) * line.quantity, 0);

export const saleProfit = (sale: SaleRecord) => sale.total - saleCost(sale);

export const saleOutstanding = (sale: SaleRecord) =>
  Math.max(0, sale.total - sale.amountPaid);

export interface DeliveryAllocation {
  delivery: Delivery;
  allocated: number;
  balance: number;
}

export const allocationForVendor = (
  vendorId: string,
  deliveries: Delivery[],
  payments: VendorPayment[],
): DeliveryAllocation[] => {
  const rows = deliveries
    .filter((delivery) => delivery.vendorId === vendorId)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
    )
    .map((delivery) => {
      const total = delivery.quantity * delivery.cost;
      return {
        delivery,
        allocated: delivery.amountPaid,
        balance: Math.max(0, roundMoney(total - delivery.amountPaid)),
      };
    });

  const sortedPayments = payments
    .filter((payment) => payment.vendorId === vendorId)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
    );

  sortedPayments.forEach((payment) => {
    let remaining = payment.amount;

    rows.forEach((row) => {
      if (remaining <= 0) {
        return;
      }
      const applied = Math.min(row.balance, remaining);
      row.allocated += applied;
      row.balance = roundMoney(row.balance - applied);
      remaining = roundMoney(remaining - applied);
    });
  });

  return rows;
};

export const vendorBalance = (rows: DeliveryAllocation[]) =>
  roundMoney(rows.reduce((sum, row) => sum + row.balance, 0));

export const vendorOverdue = (rows: DeliveryAllocation[]) => {
  const today = dateKey();
  return roundMoney(
    rows.reduce(
      (sum, row) =>
        row.delivery.payByDate && row.delivery.payByDate < today
          ? sum + row.balance
          : sum,
      0,
    ),
  );
};

export interface VendorItemSummary {
  item: string;
  quantity: number;
  spend: number;
  lastPrice: number;
  lastDate: string;
}

export const vendorItemSummary = (
  deliveries: Delivery[],
): VendorItemSummary[] => {
  const summary = new Map<string, VendorItemSummary>();

  deliveries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((delivery) => {
      const current = summary.get(delivery.item) ?? {
        item: delivery.item,
        quantity: 0,
        spend: 0,
        lastPrice: delivery.cost,
        lastDate: delivery.date,
      };
      current.quantity += delivery.quantity;
      current.spend += delivery.quantity * delivery.cost;
      current.lastPrice = delivery.cost;
      current.lastDate = delivery.date;
      summary.set(delivery.item, current);
    });

  return Array.from(summary.values()).sort((a, b) => b.spend - a.spend);
};

export interface StatementRow {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export const vendorStatement = (
  vendorId: string,
  deliveries: Delivery[],
  payments: VendorPayment[],
): StatementRow[] => {
  const entries = [
    ...deliveries
      .filter((delivery) => delivery.vendorId === vendorId)
      .map((delivery) => ({
        id: delivery.id,
        date: delivery.date,
        description: `${delivery.invoice || 'Delivery'} · ${delivery.item} × ${delivery.quantity}`,
        debit: delivery.quantity * delivery.cost,
        credit: delivery.amountPaid,
      })),
    ...payments
      .filter((payment) => payment.vendorId === vendorId)
      .map((payment) => ({
        id: payment.id,
        date: payment.date,
        description: `Payment · ${payment.method}${payment.reference ? ` · ${payment.reference}` : ''}`,
        debit: 0,
        credit: payment.amount,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  let balance = 0;
  return entries.map((entry) => {
    balance = roundMoney(balance + entry.debit - entry.credit);
    return { ...entry, balance };
  });
};

export const stockLevels = (data: BentoData): Record<string, number> => {
  const levels: Record<string, number> = {};
  data.inventory.forEach((item) => {
    levels[item.id] = item.openingStock;
  });

  data.deliveries.forEach((delivery) => {
    if (
      delivery.inventoryItemId &&
      levels[delivery.inventoryItemId] !== undefined
    ) {
      levels[delivery.inventoryItemId] += delivery.quantity;
    }
  });

  data.sales.forEach((sale) => {
    sale.lines.forEach((line) => {
      const menuItem = data.menu.find((item) => item.id === line.itemId);
      menuItem?.recipe.forEach((part) => {
        if (levels[part.itemId] !== undefined) {
          levels[part.itemId] -= part.quantity * line.quantity;
        }
      });
    });
  });

  data.losses.forEach((loss) => {
    if (levels[loss.itemId] !== undefined) {
      levels[loss.itemId] +=
        loss.type === 'Loss' ? -loss.quantity : loss.quantity;
    }
  });

  data.stockCounts.forEach((count) => {
    if (levels[count.itemId] !== undefined) {
      levels[count.itemId] += count.difference;
    }
  });

  Object.keys(levels).forEach((key) => {
    levels[key] = roundMoney(levels[key]);
  });

  return levels;
};

export const availablePortions = (
  menuItem: MenuItem,
  levels: Record<string, number>,
) => {
  if (menuItem.recipe.length === 0) {
    return Infinity;
  }

  return Math.min(
    ...menuItem.recipe.map((part) => {
      const available = levels[part.itemId] ?? 0;
      return part.quantity > 0
        ? Math.floor(available / part.quantity)
        : Infinity;
    }),
  );
};

export const stockValue = (levels: Record<string, number>, data: BentoData) =>
  roundMoney(
    data.inventory.reduce(
      (sum, item) => sum + Math.max(0, levels[item.id] ?? 0) * item.cost,
      0,
    ),
  );

export interface CreditBalance {
  sale: SaleRecord;
  outstanding: number;
}

export const creditBalances = (
  sales: SaleRecord[],
  payments: { date: string; amount: number; createdAt: string }[],
): CreditBalance[] => {
  const rows = sales
    .filter((sale) => sale.tender === 'Credit' || saleOutstanding(sale) > 0)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((sale) => ({
      sale,
      outstanding: roundMoney(saleOutstanding(sale)),
    }));

  payments
    .slice()
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
    )
    .forEach((payment) => {
      let remaining = payment.amount;
      rows.forEach((row) => {
        if (remaining <= 0) {
          return;
        }
        const applied = Math.min(row.outstanding, remaining);
        row.outstanding = roundMoney(row.outstanding - applied);
        remaining = roundMoney(remaining - applied);
      });
    });

  return rows.filter((row) => row.outstanding > 0);
};

export interface DailyReport {
  date: string;
  totalSales: number;
  orderCount: number;
  averageOrder: number;
  grossMargin: number;
  byDepartment: { name: string; value: number }[];
  topItems: { name: string; quantity: number; value: number }[];
  byTender: { name: string; value: number }[];
  byStaff: { name: string; value: number; orders: number }[];
  creditCustomers: { customer: string; amount: number; saleId: string }[];
  cashSales: number;
  transferSales: number;
  posSales: number;
  creditOutstanding: number;
  debtsCollected: number;
  expenses: number;
  vendorPayments: number;
  expectedCash: number;
  countedCash: number | null;
  difference: number | null;
}

export const dailyReport = (
  data: BentoData,
  date: string,
  staffId?: string,
): DailyReport => {
  const sales = data.sales.filter(
    (sale) => sale.date === date && (!staffId || sale.staffId === staffId),
  );
  const salesForMovement = staffId
    ? sales
    : data.sales.filter((sale) => sale.date === date);
  const totalSales = roundMoney(
    sales.reduce((sum, sale) => sum + sale.total, 0),
  );
  const cost = roundMoney(sales.reduce((sum, sale) => sum + saleCost(sale), 0));
  const orderCount = sales.length;
  const departmentMap = new Map<string, number>();
  const itemMap = new Map<string, { quantity: number; value: number }>();
  const tenderMap = new Map<string, number>();
  const staffMap = new Map<string, { value: number; orders: number }>();

  sales.forEach((sale) => {
    departmentMap.set(
      sale.department,
      (departmentMap.get(sale.department) ?? 0) + sale.total,
    );
    tenderMap.set(sale.tender, (tenderMap.get(sale.tender) ?? 0) + sale.total);
    const staffName =
      data.users.find((user) => user.id === sale.staffId)?.name ?? 'Unknown';
    const staffEntry = staffMap.get(staffName) ?? { value: 0, orders: 0 };
    staffEntry.value += sale.total;
    staffEntry.orders += 1;
    staffMap.set(staffName, staffEntry);

    sale.lines.forEach((line) => {
      const entry = itemMap.get(line.name) ?? { quantity: 0, value: 0 };
      entry.quantity += line.quantity;
      entry.value += line.unitPrice * line.quantity;
      itemMap.set(line.name, entry);
    });
  });

  const collected = data.debtPayments.filter(
    (payment) =>
      payment.date === date && (!staffId || payment.staffId === staffId),
  );
  const paidSales = salesForMovement.filter((sale) => sale.tender !== 'Credit');
  const cashSales = roundMoney(
    paidSales
      .filter((sale) => sale.tender === 'Cash')
      .reduce((sum, sale) => sum + sale.total, 0),
  );
  const transferSales = roundMoney(
    paidSales
      .filter((sale) => sale.tender === 'Transfer')
      .reduce((sum, sale) => sum + sale.total, 0),
  );
  const posSales = roundMoney(
    paidSales
      .filter((sale) => sale.tender === 'POS')
      .reduce((sum, sale) => sum + sale.total, 0),
  );
  const creditOutstanding = roundMoney(
    creditBalances(
      salesForMovement.filter((sale) => sale.tender === 'Credit'),
      collected,
    ).reduce((sum, row) => sum + row.outstanding, 0),
  );
  const debtsCollected = roundMoney(
    collected.reduce((sum, payment) => sum + payment.amount, 0),
  );
  const expenses = staffId
    ? 0
    : roundMoney(
        data.expenses
          .filter((expense) => expense.date === date)
          .reduce((sum, expense) => sum + expense.amount, 0),
      );
  const vendorPayments = staffId
    ? 0
    : roundMoney(
        data.vendorPayments
          .filter((payment) => payment.date === date)
          .reduce((sum, payment) => sum + payment.amount, 0),
      );
  const cashDebtCollections = roundMoney(
    collected
      .filter((payment) => payment.method === 'Cash')
      .reduce((sum, payment) => sum + payment.amount, 0),
  );
  const cashExpenses = staffId
    ? 0
    : roundMoney(
        data.expenses
          .filter(
            (expense) => expense.date === date && expense.method === 'Cash',
          )
          .reduce((sum, expense) => sum + expense.amount, 0),
      );
  const cashVendorPayments = staffId
    ? 0
    : roundMoney(
        data.vendorPayments
          .filter(
            (payment) => payment.date === date && payment.method === 'Cash',
          )
          .reduce((sum, payment) => sum + payment.amount, 0),
      );
  const expectedCash = roundMoney(
    data.settings.openingCash +
      cashSales +
      cashDebtCollections -
      cashExpenses -
      cashVendorPayments,
  );
  const close = data.dayCloses
    .filter(
      (entry) => entry.date === date && (!staffId || entry.staffId === staffId),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return {
    date,
    totalSales,
    orderCount,
    averageOrder: orderCount ? roundMoney(totalSales / orderCount) : 0,
    grossMargin: totalSales
      ? roundMoney(((totalSales - cost) / totalSales) * 100)
      : 0,
    byDepartment: Array.from(departmentMap, ([name, value]) => ({
      name,
      value,
    })).sort((a, b) => b.value - a.value),
    topItems: Array.from(itemMap, ([name, values]) => ({ name, ...values }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10),
    byTender: Array.from(tenderMap, ([name, value]) => ({ name, value })).sort(
      (a, b) => b.value - a.value,
    ),
    byStaff: Array.from(staffMap, ([name, values]) => ({
      name,
      ...values,
    })).sort((a, b) => b.value - a.value),
    creditCustomers: creditBalances(
      sales.filter((sale) => sale.tender === 'Credit'),
      collected,
    ).map((row) => ({
      customer:
        data.customers.find((customer) => customer.id === row.sale.customerId)
          ?.name ?? 'Walk-in customer',
      amount: row.outstanding,
      saleId: row.sale.id,
    })),
    cashSales,
    transferSales,
    posSales,
    creditOutstanding,
    debtsCollected,
    expenses,
    vendorPayments,
    expectedCash,
    countedCash: close ? close.countedCash : null,
    difference: close
      ? roundMoney(close.countedCash - close.expectedCash)
      : null,
  };
};

export interface MonthlyReport {
  month: string;
  sales: number;
  profit: number;
  profitByDepartment: { name: string; value: number }[];
  salesByTender: { name: string; value: number }[];
  dayCloseDifferences: { date: string; difference: number }[];
  recentMonths: string[];
}

export const monthlyReport = (
  data: BentoData,
  month: string,
): MonthlyReport => {
  const sales = data.sales.filter((sale) => sale.date.startsWith(month));
  const salesTotal = roundMoney(
    sales.reduce((sum, sale) => sum + sale.total, 0),
  );
  const departmentMap = new Map<string, number>();
  const tenderMap = new Map<string, number>();

  sales.forEach((sale) => {
    const profit = saleProfit(sale);
    departmentMap.set(
      sale.department,
      (departmentMap.get(sale.department) ?? 0) + profit,
    );
    tenderMap.set(sale.tender, (tenderMap.get(sale.tender) ?? 0) + sale.total);
  });

  const grossProfit = roundMoney(
    sales.reduce((sum, sale) => sum + saleProfit(sale), 0),
  );
  const adjustments = roundMoney(
    data.losses
      .filter((loss) => loss.date.startsWith(month))
      .reduce(
        (sum, loss) => sum + (loss.type === 'Loss' ? -loss.value : loss.value),
        0,
      ) +
      data.stockCounts
        .filter((count) => count.date.startsWith(month))
        .reduce((sum, count) => sum + count.value, 0),
  );
  const expenses = roundMoney(
    data.expenses
      .filter((expense) => expense.date.startsWith(month))
      .reduce((sum, expense) => sum + expense.amount, 0),
  );

  const months = new Set<string>();
  [data.sales, data.expenses, data.dayCloses].forEach((records) => {
    records.forEach((record) => months.add(record.date.slice(0, 7)));
  });
  months.add(month);

  return {
    month,
    sales: salesTotal,
    profit: roundMoney(grossProfit + adjustments - expenses),
    profitByDepartment: Array.from(departmentMap, ([name, value]) => ({
      name,
      value: roundMoney(value),
    })).sort((a, b) => b.value - a.value),
    salesByTender: Array.from(tenderMap, ([name, value]) => ({
      name,
      value,
    })).sort((a, b) => b.value - a.value),
    dayCloseDifferences: data.dayCloses
      .filter((close) => close.date.startsWith(month))
      .map((close) => ({ date: close.date, difference: close.difference }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    recentMonths: Array.from(months).sort().reverse().slice(0, 12),
  };
};
