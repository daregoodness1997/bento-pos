import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';

import { DashboardLayout } from 'layouts';
import { useConfirm, useStore } from 'context';
import type { Permission } from 'context';
import {
  AppInput,
  AppSelect,
  AppTextarea,
  EmptyState,
  Field,
  FormActions,
  FormDatePicker,
  FormSelect,
  PageHeader,
  Panel,
  RecordTable,
  Tabs,
} from 'components';
import type { TableColumn } from 'components';
import {
  customerSchema,
  dayCloseSchema,
  debtPaymentSchema,
  deliverySchema,
  expenseSchema,
  lossSchema,
  saleSchema,
  stockCountSchema,
  vendorPaymentSchema,
} from 'schemas/forms';
import type {
  CustomerValues,
  DayCloseValues,
  DebtPaymentValues,
  DeliveryValues,
  ExpenseValues,
  LossValues,
  SaleLineValues,
  SaleValues,
  StockCountValues,
  VendorPaymentValues,
} from 'schemas/forms';
import { formatNaira } from 'utils/format';
import { dateKey } from 'store/seed';
import {
  availablePortions,
  creditBalances,
  dailyReport,
  roundMoney,
  stockLevels,
} from 'utils/finance';
import type {
  Customer,
  DebtPayment,
  DayClose,
  Delivery,
  Department,
  Expense,
  InventoryItem,
  LossRecord,
  MenuItem,
  OrderLine,
  OrderType,
  PayMethod,
  SaleRecord,
  StockCount,
  Tender,
  VendorPayment,
} from 'types/store';

type TabId =
  | 'sale'
  | 'debt'
  | 'delivery'
  | 'vendorPayment'
  | 'expense'
  | 'loss'
  | 'stockCount'
  | 'dayClose'
  | 'customer';

const TABS: { id: TabId; label: string }[] = [
  { id: 'sale', label: 'Sale' },
  { id: 'debt', label: 'Debt payment' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'vendorPayment', label: 'Vendor payment' },
  { id: 'expense', label: 'Expense' },
  { id: 'loss', label: 'Loss / Gain' },
  { id: 'stockCount', label: 'Stock count' },
  { id: 'dayClose', label: 'Day close' },
  { id: 'customer', label: 'Customer' },
];

const TAB_PERMISSIONS: Record<TabId, Permission> = {
  sale: 'recordSale',
  debt: 'collectDebt',
  delivery: 'manageVendors',
  vendorPayment: 'manageVendors',
  expense: 'manageExpenses',
  loss: 'manageInventory',
  stockCount: 'manageInventory',
  dayClose: 'dayClose',
  customer: 'manageCustomers',
};

const TAB_META: Record<
  TabId,
  {
    formTitle: string;
    recentTitle: string;
    subtitle: string;
    forbidden: string;
  }
> = {
  sale: {
    formTitle: 'New sale',
    recentTitle: 'Recently added sales',
    subtitle: 'Build a ticket and capture the recipe cost of every line.',
    forbidden: 'record sales',
  },
  debt: {
    formTitle: 'New debt payment',
    recentTitle: 'Recently added debt payments',
    subtitle: 'Apply a collection to a customer or credit sale.',
    forbidden: 'collect debt payments',
  },
  delivery: {
    formTitle: 'New delivery',
    recentTitle: 'Recently added deliveries',
    subtitle: 'Record stock received and any amount due to the vendor.',
    forbidden: 'record deliveries',
  },
  vendorPayment: {
    formTitle: 'New vendor payment',
    recentTitle: 'Recently added vendor payments',
    subtitle: 'Log cash paid to a supplier.',
    forbidden: 'record vendor payments',
  },
  expense: {
    formTitle: 'New expense',
    recentTitle: 'Recently added expenses',
    subtitle: 'Capture money spent outside of stock purchases.',
    forbidden: 'record expenses',
  },
  loss: {
    formTitle: 'New loss or gain',
    recentTitle: 'Recently added losses and gains',
    subtitle: 'Adjust inventory and value the movement at cost.',
    forbidden: 'record stock movements',
  },
  stockCount: {
    formTitle: 'New stock count',
    recentTitle: 'Recently added stock counts',
    subtitle: 'Compare a physical count with the current stock level.',
    forbidden: 'record stock counts',
  },
  dayClose: {
    formTitle: 'New day close',
    recentTitle: 'Recently added day closes',
    subtitle: 'Count the till and compare it with expected cash.',
    forbidden: 'close the day',
  },
  customer: {
    formTitle: 'New customer',
    recentTitle: 'Recently added customers',
    subtitle: 'Add a customer before recording a credit sale.',
    forbidden: 'manage customers',
  },
};

const DEPARTMENTS: Department[] = ['Restaurant', 'Bar', 'Snooker', 'Viewing'];
const ORDER_TYPES: OrderType[] = ['Dine in', 'Takeaway', 'Delivery'];
const TENDERS: Tender[] = ['Cash', 'Transfer', 'POS', 'Credit'];
const PAY_METHODS: PayMethod[] = ['Cash', 'Transfer', 'POS'];
const EXPENSE_CATEGORIES = [
  'General',
  'Utilities',
  'Transport',
  'Maintenance',
  'Staff',
  'Other',
];
const DEPARTMENT_OPTIONS = DEPARTMENTS.map((department) => ({
  key: department,
  label: department,
}));
const ORDER_TYPE_OPTIONS = ORDER_TYPES.map((orderType) => ({
  key: orderType,
  label: orderType,
}));
const TENDER_OPTIONS = TENDERS.map((tender) => ({
  key: tender,
  label: tender,
}));
const PAY_METHOD_OPTIONS = PAY_METHODS.map((method) => ({
  key: method,
  label: method,
}));
const EXPENSE_CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((category) => ({
  key: category,
  label: category,
}));
const LOSS_TYPE_OPTIONS = [
  { key: 'Loss', label: 'Loss' },
  { key: 'Gain', label: 'Gain' },
];
const MAX_SALE_LINES = 6;

const currentClock = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}`;
};

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const latest = <T extends { createdAt: string }>(records: T[]) =>
  records
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

const unitCostFor = (item: MenuItem, inventory: InventoryItem[]) =>
  roundMoney(
    item.recipe.reduce((sum, part) => {
      const cost =
        inventory.find((entry) => entry.id === part.itemId)?.cost ?? 0;
      return sum + cost * part.quantity;
    }, 0),
  );

const describeSaleLine = (
  line: SaleLineValues,
  menu: MenuItem[],
  inventory: InventoryItem[],
): OrderLine => {
  const item = menu.find((entry) => entry.id === line.menuItemId);
  return {
    itemId: line.menuItemId,
    name: item?.name ?? line.menuItemId,
    quantity: Math.max(1, Math.floor(toNumber(line.quantity))),
    unitPrice: item?.price ?? 0,
    cost: item ? unitCostFor(item, inventory) : 0,
  };
};

const makeSaleDefaults = (): SaleValues => ({
  department: 'Restaurant',
  orderType: 'Dine in',
  tender: 'Cash',
  customerId: '',
  date: dateKey(),
  time: currentClock(),
  lines: [],
});

const makeDebtDefaults = (): DebtPaymentValues => ({
  customerId: '',
  saleId: '',
  amount: '',
  method: 'Cash',
  reference: '',
  date: dateKey(),
});

const makeDeliveryDefaults = (): DeliveryValues => ({
  vendorId: '',
  date: dateKey(),
  item: '',
  inventoryItemId: '',
  quantity: '1',
  cost: '',
  amountPaid: '0',
  payByDate: '',
  invoice: '',
});

const makeVendorPaymentDefaults = (): VendorPaymentValues => ({
  vendorId: '',
  date: dateKey(),
  amount: '',
  method: 'Cash',
  reference: '',
});

const makeExpenseDefaults = (): ExpenseValues => ({
  category: 'General',
  description: '',
  amount: '',
  method: 'Cash',
  date: dateKey(),
});

const makeLossDefaults = (): LossValues => ({
  itemId: '',
  type: 'Loss',
  date: dateKey(),
  quantity: '1',
  reason: '',
});

const makeStockCountDefaults = (): StockCountValues => ({
  itemId: '',
  date: dateKey(),
  counted: '',
});

const makeDayCloseDefaults = (): DayCloseValues => ({
  date: dateKey(),
  countedCash: '',
  note: '',
});

const makeCustomerDefaults = (): CustomerValues => ({ name: '', phone: '' });

interface EditingState {
  tab: TabId;
  id: string;
}

interface RecentRowBase {
  id: string;
  date: string;
  description: string;
  amount: number;
  meta: string;
}

type RecentRow = RecentRowBase &
  (
    | { kind: 'sale'; record: SaleRecord }
    | { kind: 'debt'; record: DebtPayment }
    | { kind: 'delivery'; record: Delivery }
    | { kind: 'vendorPayment'; record: VendorPayment }
    | { kind: 'expense'; record: Expense }
    | { kind: 'loss'; record: LossRecord }
    | { kind: 'stockCount'; record: StockCount }
    | { kind: 'dayClose'; record: DayClose }
    | { kind: 'customer'; record: Customer }
  );

const Forms = () => {
  const {
    data,
    currentUser,
    can,
    recordSale,
    updateSale,
    deleteSale,
    addDebtPayment,
    updateDebtPayment,
    deleteDebtPayment,
    addDelivery,
    updateDelivery,
    deleteDelivery,
    addVendorPayment,
    updateVendorPayment,
    deleteVendorPayment,
    addExpense,
    updateExpense,
    deleteExpense,
    addLoss,
    updateLoss,
    deleteLoss,
    addStockCount,
    updateStockCount,
    deleteStockCount,
    addDayClose,
    updateDayClose,
    deleteDayClose,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  } = useStore();
  const confirmAction = useConfirm();

  const saleForm = useForm<SaleValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: makeSaleDefaults(),
  });
  const debtForm = useForm<DebtPaymentValues>({
    resolver: zodResolver(debtPaymentSchema),
    defaultValues: makeDebtDefaults(),
  });
  const deliveryForm = useForm<DeliveryValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: makeDeliveryDefaults(),
  });
  const vendorPaymentForm = useForm<VendorPaymentValues>({
    resolver: zodResolver(vendorPaymentSchema),
    defaultValues: makeVendorPaymentDefaults(),
  });
  const expenseForm = useForm<ExpenseValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: makeExpenseDefaults(),
  });
  const lossForm = useForm<LossValues>({
    resolver: zodResolver(lossSchema),
    defaultValues: makeLossDefaults(),
  });
  const stockCountForm = useForm<StockCountValues>({
    resolver: zodResolver(stockCountSchema),
    defaultValues: makeStockCountDefaults(),
  });
  const dayCloseForm = useForm<DayCloseValues>({
    resolver: zodResolver(dayCloseSchema),
    defaultValues: makeDayCloseDefaults(),
  });
  const customerForm = useForm<CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: makeCustomerDefaults(),
  });

  const {
    fields: saleLineFields,
    append: appendSaleLine,
    update: updateSaleLineField,
    remove: removeSaleLineField,
  } = useFieldArray({ control: saleForm.control, name: 'lines' });

  const [activeTab, setActiveTab] = useState<TabId>('sale');
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [message, setMessage] = useState('');
  const [menuSelection, setMenuSelection] = useState('');
  const [menuQuantity, setMenuQuantity] = useState('1');

  const saleErrors = saleForm.formState.errors;
  const debtErrors = debtForm.formState.errors;
  const deliveryErrors = deliveryForm.formState.errors;
  const vendorPaymentErrors = vendorPaymentForm.formState.errors;
  const expenseErrors = expenseForm.formState.errors;
  const lossErrors = lossForm.formState.errors;
  const stockCountErrors = stockCountForm.formState.errors;
  const dayCloseErrors = dayCloseForm.formState.errors;
  const customerErrors = customerForm.formState.errors;

  const saleValues = saleForm.watch();
  const debtValues = debtForm.watch();
  const deliveryValues = deliveryForm.watch();
  const lossValues = lossForm.watch();
  const stockCountValues = stockCountForm.watch();
  const dayCloseValues = dayCloseForm.watch();

  const readOnly = currentUser?.role === 'Auditor';
  const isCashier = Boolean(currentUser && currentUser.role === 'Cashier');
  const cashierId =
    currentUser && currentUser.role === 'Cashier' ? currentUser.id : undefined;
  const canUse =
    Boolean(currentUser) && !readOnly && can(TAB_PERMISSIONS[activeTab]);
  const levels = useMemo(() => stockLevels(data), [data]);
  const creditRows = useMemo(
    () => creditBalances(data.sales, data.debtPayments),
    [data.sales, data.debtPayments],
  );

  const isOwnStaff = (staffId: string) =>
    !isCashier || staffId === currentUser?.id;

  const selectedMenuItem = data.menu.find((item) => item.id === menuSelection);
  const selectedPortions = selectedMenuItem
    ? availablePortions(selectedMenuItem, levels)
    : Infinity;
  const saleLineDetails = saleValues.lines.map((line) =>
    describeSaleLine(line, data.menu, data.inventory),
  );
  const saleSubtotal = roundMoney(
    saleLineDetails.reduce(
      (sum, line) => sum + line.unitPrice * line.quantity,
      0,
    ),
  );
  const saleVat = data.settings.vatEnabled
    ? roundMoney(saleSubtotal * data.settings.vatRate)
    : 0;
  const saleTotal = roundMoney(saleSubtotal + saleVat);
  const deliveryTotal = roundMoney(
    toNumber(deliveryValues.quantity) * toNumber(deliveryValues.cost),
  );
  const deliveryPaid = roundMoney(toNumber(deliveryValues.amountPaid));
  const deliveryDebt = roundMoney(Math.max(0, deliveryTotal - deliveryPaid));
  const selectedLossItem = data.inventory.find(
    (item) => item.id === lossValues.itemId,
  );
  const lossValue = roundMoney(
    toNumber(lossValues.quantity) * (selectedLossItem?.cost ?? 0),
  );
  const selectedCountItem = data.inventory.find(
    (item) => item.id === stockCountValues.itemId,
  );
  const currentLevel = levels[stockCountValues.itemId] ?? 0;
  const previousLevel = useMemo(() => {
    if (editing?.tab === 'stockCount') {
      const existing = data.stockCounts.find(
        (count) =>
          count.id === editing.id && count.itemId === stockCountValues.itemId,
      );
      if (existing) {
        return roundMoney(currentLevel - existing.difference);
      }
    }
    return roundMoney(currentLevel);
  }, [currentLevel, data.stockCounts, editing, stockCountValues.itemId]);
  const countedQuantity = toNumber(stockCountValues.counted);
  const countDifference = roundMoney(countedQuantity - previousLevel);
  const countValue = roundMoney(
    countDifference * (selectedCountItem?.cost ?? 0),
  );
  const { expectedCash } = dailyReport(data, dayCloseValues.date, cashierId);
  const countedCash = toNumber(dayCloseValues.countedCash);
  const closeDifference = roundMoney(countedCash - expectedCash);
  const creditRowsForDebt = creditRows.filter(
    (row) =>
      isOwnStaff(row.sale.staffId) &&
      (!debtValues.customerId || row.sale.customerId === debtValues.customerId),
  );
  const selectedCreditRow = creditRows.find(
    (row) => row.sale.id === debtValues.saleId,
  );
  const salePortionHint = (() => {
    if (!selectedMenuItem) {
      return undefined;
    }
    if (Number.isFinite(selectedPortions)) {
      return `${selectedPortions} portion(s) available`;
    }
    return 'Unlimited portions available';
  })();

  const messageNode = message ? <p className="admin-note">{message}</p> : null;

  const recentRows: RecentRow[] = (() => {
    const customerName = (id?: string) =>
      data.customers.find((customer) => customer.id === id)?.name ??
      'Walk-in customer';
    const vendorName = (id: string) =>
      data.vendors.find((vendor) => vendor.id === id)?.name ?? 'Unknown vendor';

    switch (activeTab) {
      case 'sale':
        return latest(
          data.sales.filter((sale) => isOwnStaff(sale.staffId)),
        ).map((sale) => ({
          kind: 'sale',
          record: sale,
          id: sale.id,
          date: sale.date,
          description: sale.items,
          amount: sale.total,
          meta: `${sale.tender} · ${sale.status}`,
        }));
      case 'debt':
        return latest(
          data.debtPayments.filter((payment) => isOwnStaff(payment.staffId)),
        ).map((payment) => ({
          kind: 'debt',
          record: payment,
          id: payment.id,
          date: payment.date,
          description: customerName(payment.customerId),
          amount: payment.amount,
          meta: `${payment.method}${payment.reference ? ` · ${payment.reference}` : ''}`,
        }));
      case 'delivery':
        return latest(data.deliveries).map((delivery) => ({
          kind: 'delivery',
          record: delivery,
          id: delivery.id,
          date: delivery.date,
          description: `${delivery.item} × ${delivery.quantity}`,
          amount: roundMoney(delivery.quantity * delivery.cost),
          meta: `${vendorName(delivery.vendorId)}${delivery.invoice ? ` · ${delivery.invoice}` : ''}`,
        }));
      case 'vendorPayment':
        return latest(data.vendorPayments).map((payment) => ({
          kind: 'vendorPayment',
          record: payment,
          id: payment.id,
          date: payment.date,
          description: vendorName(payment.vendorId),
          amount: payment.amount,
          meta: `${payment.method}${payment.reference ? ` · ${payment.reference}` : ''}`,
        }));
      case 'expense':
        return latest(data.expenses).map((expense) => ({
          kind: 'expense',
          record: expense,
          id: expense.id,
          date: expense.date,
          description: expense.description,
          amount: expense.amount,
          meta: `${expense.category} · ${expense.method}`,
        }));
      case 'loss':
        return latest(data.losses).map((loss) => ({
          kind: 'loss',
          record: loss,
          id: loss.id,
          date: loss.date,
          description: `${loss.type} · ${loss.itemName}`,
          amount: loss.value,
          meta: loss.reason,
        }));
      case 'stockCount':
        return latest(data.stockCounts).map((count) => ({
          kind: 'stockCount',
          record: count,
          id: count.id,
          date: count.date,
          description: count.itemName,
          amount: count.value,
          meta: `Counted ${count.counted} · Difference ${count.difference}`,
        }));
      case 'dayClose':
        return latest(
          data.dayCloses.filter((close) => isOwnStaff(close.staffId)),
        ).map((close) => ({
          kind: 'dayClose',
          record: close,
          id: close.id,
          date: close.date,
          description: `Counted ${formatNaira(close.countedCash)}`,
          amount: close.countedCash,
          meta: close.note || `Difference ${formatNaira(close.difference)}`,
        }));
      case 'customer':
        return latest(data.customers).map((customer) => ({
          kind: 'customer',
          record: customer,
          id: customer.id,
          date: customer.createdAt.slice(0, 10),
          description: customer.name,
          amount: 0,
          meta: customer.phone,
        }));
      default:
        return [];
    }
  })();

  const isOwnRecord = (row: RecentRow) =>
    row.kind !== 'sale' && row.kind !== 'debt' && row.kind !== 'dayClose'
      ? true
      : isOwnStaff(row.record.staffId);

  const resetFormFor = (tab: TabId) => {
    switch (tab) {
      case 'sale':
        saleForm.reset(makeSaleDefaults());
        break;
      case 'debt':
        debtForm.reset(makeDebtDefaults());
        break;
      case 'delivery':
        deliveryForm.reset(makeDeliveryDefaults());
        break;
      case 'vendorPayment':
        vendorPaymentForm.reset(makeVendorPaymentDefaults());
        break;
      case 'expense':
        expenseForm.reset(makeExpenseDefaults());
        break;
      case 'loss':
        lossForm.reset(makeLossDefaults());
        break;
      case 'stockCount':
        stockCountForm.reset(makeStockCountDefaults());
        break;
      case 'dayClose':
        dayCloseForm.reset(makeDayCloseDefaults());
        break;
      case 'customer':
        customerForm.reset(makeCustomerDefaults());
        break;
      default:
        break;
    }
  };

  const resetForm = () => {
    resetFormFor(activeTab);
    setEditing(null);
    setMenuSelection('');
    setMenuQuantity('1');
    setMessage('');
  };

  const handleTabChange = (id: string) => {
    const nextTab = id as TabId;
    setActiveTab(nextTab);
    resetFormFor(nextTab);
    setEditing(null);
    setMenuSelection('');
    setMenuQuantity('1');
    setMessage('');
  };

  const saveAndReset = (text: string) => {
    setMessage(text);
    setEditing(null);
    resetFormFor(activeTab);
    setMenuSelection('');
    setMenuQuantity('1');
  };

  const addSaleLine = () => {
    const item = data.menu.find((entry) => entry.id === menuSelection);
    if (!item) {
      setMessage('Choose a menu item first.');
      return;
    }
    const quantity = Math.floor(toNumber(menuQuantity));
    if (quantity < 1) {
      setMessage('Enter a quantity of at least one.');
      return;
    }
    const lines = saleForm.getValues('lines');
    if (lines.length >= MAX_SALE_LINES) {
      setMessage(`A sale can include up to ${MAX_SALE_LINES} lines.`);
      return;
    }
    const alreadyAdded = lines
      .filter((line) => line.menuItemId === item.id)
      .reduce((sum, line) => sum + toNumber(line.quantity), 0);
    const portions = availablePortions(item, levels);
    if (Number.isFinite(portions) && alreadyAdded + quantity > portions) {
      setMessage(`Only ${portions} portion(s) of ${item.name} are available.`);
      return;
    }
    appendSaleLine({ menuItemId: item.id, quantity: String(quantity) });
    setMenuSelection('');
    setMenuQuantity('1');
    setMessage('');
  };

  const updateSaleLine = (index: number, value: string) => {
    const line = saleForm.getValues(`lines.${index}`);
    if (!line) {
      return;
    }
    const requested = Math.max(1, Math.floor(toNumber(value)));
    const item = data.menu.find((entry) => entry.id === line.menuItemId);
    const portions = item ? availablePortions(item, levels) : Infinity;
    const otherQuantity = saleForm
      .getValues('lines')
      .filter(
        (entry, entryIndex) =>
          entryIndex !== index && entry.menuItemId === line.menuItemId,
      )
      .reduce((sum, entry) => sum + toNumber(entry.quantity), 0);
    const maximum = Number.isFinite(portions)
      ? Math.max(1, portions - otherQuantity)
      : requested;
    const quantity = Math.min(requested, maximum);
    setMessage(
      quantity < requested
        ? `Only ${maximum} portion(s) of ${item?.name ?? line.menuItemId} are available.`
        : '',
    );
    updateSaleLineField(index, { ...line, quantity: String(quantity) });
  };

  const removeSaleLine = (index: number) => {
    removeSaleLineField(index);
  };

  const onValidSale = (values: SaleValues) => {
    if (!canUse) {
      return;
    }

    const date = values.date || dateKey();
    const staffId = currentUser?.id;
    const lines = values.lines.map((line) =>
      describeSaleLine(line, data.menu, data.inventory),
    );
    const time = values.time || currentClock();
    if (editing?.tab === 'sale') {
      updateSale(editing.id, {
        date,
        time,
        department: values.department,
        orderType: values.orderType,
        tender: values.tender,
        customerId: values.tender === 'Credit' ? values.customerId : undefined,
        lines,
      });
    } else {
      recordSale({
        date,
        time,
        department: values.department,
        orderType: values.orderType,
        tender: values.tender,
        customerId: values.tender === 'Credit' ? values.customerId : undefined,
        lines,
        staffId,
      });
    }
    saveAndReset(editing ? 'Sale updated.' : 'Sale recorded.');
  };

  const onValidDebt = (values: DebtPaymentValues) => {
    if (!canUse) {
      return;
    }

    const date = values.date || dateKey();
    const staffId = currentUser?.id;
    const amount = roundMoney(toNumber(values.amount));
    const payment = {
      customerId: values.customerId,
      saleId: values.saleId || undefined,
      date,
      amount,
      method: values.method,
      reference: values.reference,
    };
    if (editing?.tab === 'debt') {
      updateDebtPayment(editing.id, payment);
    } else {
      addDebtPayment({ ...payment, staffId });
    }
    saveAndReset(editing ? 'Debt payment updated.' : 'Debt payment recorded.');
  };

  const onValidDelivery = (values: DeliveryValues) => {
    if (!canUse) {
      return;
    }

    const date = values.date || dateKey();
    const staffId = currentUser?.id;
    const delivery = {
      vendorId: values.vendorId,
      date,
      item: values.item.trim(),
      inventoryItemId: values.inventoryItemId || undefined,
      quantity: toNumber(values.quantity),
      cost: toNumber(values.cost),
      amountPaid: roundMoney(toNumber(values.amountPaid)),
      payByDate: values.payByDate || undefined,
      invoice: values.invoice,
    };
    if (editing?.tab === 'delivery') {
      updateDelivery(editing.id, delivery);
    } else {
      addDelivery({ ...delivery, staffId });
    }
    saveAndReset(editing ? 'Delivery updated.' : 'Delivery recorded.');
  };

  const onValidVendorPayment = (values: VendorPaymentValues) => {
    if (!canUse) {
      return;
    }

    const date = values.date || dateKey();
    const staffId = currentUser?.id;
    const amount = roundMoney(toNumber(values.amount));
    const payment = {
      vendorId: values.vendorId,
      date,
      amount,
      method: values.method,
      reference: values.reference,
    };
    if (editing?.tab === 'vendorPayment') {
      updateVendorPayment(editing.id, payment);
    } else {
      addVendorPayment({ ...payment, staffId });
    }
    saveAndReset(
      editing ? 'Vendor payment updated.' : 'Vendor payment recorded.',
    );
  };

  const onValidExpense = (values: ExpenseValues) => {
    if (!canUse) {
      return;
    }

    const date = values.date || dateKey();
    const staffId = currentUser?.id;
    const amount = roundMoney(toNumber(values.amount));
    const expense = {
      date,
      category: values.category,
      description: values.description.trim(),
      amount,
      method: values.method,
    };
    if (editing?.tab === 'expense') {
      updateExpense(editing.id, expense);
    } else {
      addExpense({ ...expense, staffId });
    }
    saveAndReset(editing ? 'Expense updated.' : 'Expense recorded.');
  };

  const onValidLoss = (values: LossValues) => {
    if (!canUse) {
      return;
    }

    const date = values.date || dateKey();
    const staffId = currentUser?.id;
    const item = data.inventory.find((entry) => entry.id === values.itemId);
    const loss = {
      date,
      itemId: values.itemId,
      itemName: item?.name ?? values.itemId,
      quantity: toNumber(values.quantity),
      type: values.type,
      reason: values.reason.trim(),
      value: roundMoney(toNumber(values.quantity) * (item?.cost ?? 0)),
    };
    if (editing?.tab === 'loss') {
      updateLoss(editing.id, loss);
    } else {
      addLoss({ ...loss, staffId });
    }
    saveAndReset(
      editing ? 'Stock movement updated.' : 'Stock movement recorded.',
    );
  };

  const onValidStockCount = (values: StockCountValues) => {
    if (!canUse) {
      return;
    }

    const date = values.date || dateKey();
    const staffId = currentUser?.id;
    const item = data.inventory.find((entry) => entry.id === values.itemId);
    const count = {
      date,
      itemId: values.itemId,
      itemName: item?.name ?? '',
      previous: previousLevel,
      counted: toNumber(values.counted),
      difference: countDifference,
      value: countValue,
    };
    if (editing?.tab === 'stockCount') {
      updateStockCount(editing.id, count);
    } else {
      addStockCount({ ...count, staffId });
    }
    saveAndReset(editing ? 'Stock count updated.' : 'Stock count recorded.');
  };

  const onValidDayClose = (values: DayCloseValues) => {
    if (!canUse) {
      return;
    }

    const date = values.date || dateKey();
    const staffId = currentUser?.id;
    const close = {
      date,
      expectedCash,
      countedCash: toNumber(values.countedCash),
      difference: roundMoney(toNumber(values.countedCash) - expectedCash),
      note: values.note,
    };
    if (editing?.tab === 'dayClose') {
      updateDayClose(editing.id, close);
    } else {
      addDayClose({ ...close, staffId });
    }
    saveAndReset(editing ? 'Day close updated.' : 'Day close recorded.');
  };

  const onValidCustomer = (values: CustomerValues) => {
    if (!canUse) {
      return;
    }

    if (editing?.tab === 'customer') {
      updateCustomer(editing.id, {
        name: values.name.trim(),
        phone: values.phone,
      });
    } else {
      addCustomer({
        name: values.name.trim(),
        phone: values.phone,
      });
    }
    saveAndReset(editing ? 'Customer updated.' : 'Customer added.');
  };

  const startEdit = (row: RecentRow) => {
    if (!canUse || !isOwnRecord(row)) {
      return;
    }

    switch (row.kind) {
      case 'sale':
        saleForm.reset({
          ...makeSaleDefaults(),
          department: row.record.department,
          orderType: row.record.orderType,
          tender: row.record.tender,
          customerId: row.record.customerId ?? '',
          date: row.record.date,
          time: row.record.time,
          lines: row.record.lines.map((line) => ({
            menuItemId: line.itemId ?? line.name,
            quantity: String(line.quantity),
          })),
        });
        break;
      case 'debt':
        debtForm.reset({
          ...makeDebtDefaults(),
          customerId: row.record.customerId,
          saleId: row.record.saleId ?? '',
          amount: String(row.record.amount),
          method: row.record.method,
          reference: row.record.reference,
          date: row.record.date,
        });
        break;
      case 'delivery':
        deliveryForm.reset({
          ...makeDeliveryDefaults(),
          vendorId: row.record.vendorId,
          inventoryItemId: row.record.inventoryItemId ?? '',
          item: row.record.item,
          quantity: String(row.record.quantity),
          cost: String(row.record.cost),
          amountPaid: String(row.record.amountPaid),
          payByDate: row.record.payByDate ?? '',
          invoice: row.record.invoice,
          date: row.record.date,
        });
        break;
      case 'vendorPayment':
        vendorPaymentForm.reset({
          ...makeVendorPaymentDefaults(),
          vendorId: row.record.vendorId,
          amount: String(row.record.amount),
          method: row.record.method,
          reference: row.record.reference,
          date: row.record.date,
        });
        break;
      case 'expense':
        expenseForm.reset({
          ...makeExpenseDefaults(),
          category: row.record.category,
          description: row.record.description,
          amount: String(row.record.amount),
          method: row.record.method,
          date: row.record.date,
        });
        break;
      case 'loss':
        lossForm.reset({
          ...makeLossDefaults(),
          itemId: row.record.itemId,
          type: row.record.type,
          quantity: String(row.record.quantity),
          reason: row.record.reason,
          date: row.record.date,
        });
        break;
      case 'stockCount':
        stockCountForm.reset({
          ...makeStockCountDefaults(),
          itemId: row.record.itemId,
          counted: String(row.record.counted),
          date: row.record.date,
        });
        break;
      case 'dayClose':
        dayCloseForm.reset({
          ...makeDayCloseDefaults(),
          countedCash: String(row.record.countedCash),
          note: row.record.note,
          date: row.record.date,
        });
        break;
      case 'customer':
        customerForm.reset({
          ...makeCustomerDefaults(),
          name: row.record.name,
          phone: row.record.phone,
        });
        break;
      default:
        break;
    }
    setActiveTab(row.kind);
    setEditing({ tab: row.kind, id: row.record.id });
    setMenuSelection('');
    setMenuQuantity('1');
    setMessage('');
  };

  const handleDelete = async (row: RecentRow) => {
    if (!canUse || !isOwnRecord(row)) {
      return;
    }
    if (row.kind === 'sale' && !can('deleteRecords')) {
      return;
    }
    if (!(await confirmAction('Delete this record? This cannot be undone.'))) {
      return;
    }

    switch (row.kind) {
      case 'sale':
        deleteSale(row.record.id);
        break;
      case 'debt':
        deleteDebtPayment(row.record.id);
        break;
      case 'delivery':
        deleteDelivery(row.record.id);
        break;
      case 'vendorPayment':
        deleteVendorPayment(row.record.id);
        break;
      case 'expense':
        deleteExpense(row.record.id);
        break;
      case 'loss':
        deleteLoss(row.record.id);
        break;
      case 'stockCount':
        deleteStockCount(row.record.id);
        break;
      case 'dayClose':
        deleteDayClose(row.record.id);
        break;
      case 'customer':
        deleteCustomer(row.record.id);
        break;
      default:
        break;
    }

    if (editing?.id === row.record.id) {
      setEditing(null);
      resetFormFor(editing.tab);
    }
    setMessage('Record deleted.');
  };

  const columns: TableColumn<RecentRow>[] = [
    {
      key: 'date',
      label: 'Date',
      render: (row) => <span className="tabular">{row.date}</span>,
    },
    {
      key: 'description',
      label: 'Details',
      render: (row) => row.description,
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (row) =>
        row.kind === 'customer' ? '—' : formatNaira(row.amount),
    },
    {
      key: 'meta',
      label: 'Notes',
      render: (row) => row.meta,
    },
  ];

  if (canUse) {
    columns.push({
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="stock-item__actions">
          <button
            className="text-button"
            onClick={() => startEdit(row)}
            type="button"
          >
            Edit
          </button>
          {(row.kind !== 'sale' || can('deleteRecords')) && (
            <button
              className="text-button"
              onClick={() => handleDelete(row)}
              type="button"
            >
              Delete
            </button>
          )}
        </div>
      ),
    });
  }

  const renderForm = () => {
    if (readOnly) {
      return (
        <Panel title="Read-only access">
          <EmptyState
            title="Read-only access"
            message="Auditor accounts can review records, but cannot add, edit, or delete them."
          />
        </Panel>
      );
    }

    if (!canUse) {
      return (
        <Panel title={TAB_META[activeTab].formTitle}>
          <EmptyState
            title="Not available"
            message={`Your role cannot ${TAB_META[activeTab].forbidden}.`}
          />
        </Panel>
      );
    }

    const actions = (
      <FormActions
        submitLabel={editing ? 'Update' : 'Add'}
        onSecondary={resetForm}
      />
    );

    const walkInCustomerOptions = [
      { key: '', label: 'Walk-in customer' },
      ...data.customers.map((customer) => ({
        key: customer.id,
        label: customer.name,
      })),
    ];
    const customerOptions = [
      { key: '', label: 'Select a customer' },
      ...data.customers.map((customer) => ({
        key: customer.id,
        label: customer.name,
      })),
    ];
    const menuItemOptions = [
      { key: '', label: 'Select a menu item' },
      ...data.menu.map((item) => ({
        key: item.id,
        label: `${item.name} · ${formatNaira(item.price)}`,
      })),
    ];
    const creditSaleOptions = [
      { key: '', label: 'Apply to oldest credit sale' },
      ...(debtValues.saleId &&
      !creditRowsForDebt.some((row) => row.sale.id === debtValues.saleId)
        ? [{ key: debtValues.saleId, label: debtValues.saleId }]
        : []),
      ...creditRowsForDebt.map((row) => ({
        key: row.sale.id,
        label: `${row.sale.id} · ${
          data.customers.find((customer) => customer.id === row.sale.customerId)
            ?.name ?? 'Walk-in customer'
        } · ${formatNaira(row.outstanding)}`,
      })),
    ];
    const vendorOptions = [
      { key: '', label: 'Select a vendor' },
      ...data.vendors.map((vendor) => ({ key: vendor.id, label: vendor.name })),
    ];
    const linkedInventoryOptions = [
      { key: '', label: 'No linked inventory item' },
      ...data.inventory.map((item) => ({ key: item.id, label: item.name })),
    ];
    const inventoryOptions = [
      { key: '', label: 'Select an inventory item' },
      ...data.inventory.map((item) => ({ key: item.id, label: item.name })),
    ];

    switch (activeTab) {
      case 'sale':
        return (
          <Panel
            title={TAB_META.sale.formTitle}
            subtitle={TAB_META.sale.subtitle}
          >
            <form
              className="admin-form"
              onSubmit={saleForm.handleSubmit(onValidSale)}
            >
              <div className="field-grid">
                <Field
                  label="Department"
                  error={saleErrors.department?.message}
                >
                  <FormSelect
                    control={saleForm.control}
                    label="Department"
                    name="department"
                    options={DEPARTMENT_OPTIONS}
                  />
                </Field>
                <Field label="Order type" error={saleErrors.orderType?.message}>
                  <FormSelect
                    control={saleForm.control}
                    label="Order type"
                    name="orderType"
                    options={ORDER_TYPE_OPTIONS}
                  />
                </Field>
                <Field label="Tender" error={saleErrors.tender?.message}>
                  <FormSelect
                    control={saleForm.control}
                    label="Tender"
                    name="tender"
                    options={TENDER_OPTIONS}
                  />
                </Field>
                <Field
                  label="Customer"
                  hint={
                    saleValues.tender === 'Credit'
                      ? 'Required for credit sales.'
                      : 'Optional for paid sales.'
                  }
                  error={saleErrors.customerId?.message}
                >
                  <FormSelect
                    control={saleForm.control}
                    label="Customer"
                    name="customerId"
                    options={walkInCustomerOptions}
                    placeholder="Walk-in customer"
                  />
                </Field>
                <Field label="Date" error={saleErrors.date?.message}>
                  <FormDatePicker
                    control={saleForm.control}
                    label="Date"
                    name="date"
                  />
                </Field>
                <Field label="Time" error={saleErrors.time?.message}>
                  <AppInput {...saleForm.register('time')} type="time" />
                </Field>
              </div>
              <div className="form-card">
                <div className="field-grid">
                  <Field label="Menu item">
                    <AppSelect
                      onValueChange={setMenuSelection}
                      options={menuItemOptions}
                      placeholder="Select a menu item"
                      value={menuSelection}
                    />
                  </Field>
                  <Field label="Quantity" hint={salePortionHint}>
                    <AppInput
                      min="1"
                      onChange={(event) => setMenuQuantity(event.target.value)}
                      type="number"
                      value={menuQuantity}
                    />
                  </Field>
                </div>
                <div className="form-actions">
                  <button
                    className="secondary-button"
                    onClick={addSaleLine}
                    type="button"
                  >
                    Add line
                  </button>
                </div>
              </div>
              {saleErrors.lines?.message && (
                <p className="field-error">{saleErrors.lines.message}</p>
              )}
              {saleLineFields.length > 0 && (
                <div className="form-card">
                  {saleLineFields.map((line, index) => {
                    const detail = saleLineDetails[index];
                    const quantityRegistration = saleForm.register(
                      `lines.${index}.quantity`,
                    );
                    const quantityError =
                      saleErrors.lines?.[index]?.quantity?.message;
                    return (
                      <div className="metric-row" key={line.id}>
                        <div>
                          <strong>{detail.name}</strong>
                          <div className="admin-note">
                            Cost {formatNaira(detail.cost)} per portion
                          </div>
                          {quantityError && (
                            <small className="field-error">
                              {quantityError}
                            </small>
                          )}
                        </div>
                        <div className="stock-item__actions">
                          <AppInput
                            {...quantityRegistration}
                            aria-label={`Quantity for ${detail.name}`}
                            classNames={{ base: 'w-20' }}
                            min="1"
                            onChange={(event) =>
                              updateSaleLine(index, event.target.value)
                            }
                            type="number"
                            value={line.quantity}
                          />
                          <strong className="tabular">
                            {formatNaira(
                              roundMoney(detail.unitPrice * detail.quantity),
                            )}
                          </strong>
                          <button
                            className="text-button"
                            onClick={() => removeSaleLine(index)}
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="form-card">
                <div className="metric-row">
                  <span>Subtotal</span>
                  <strong>{formatNaira(saleSubtotal)}</strong>
                </div>
                <div className="metric-row">
                  <span>VAT</span>
                  <strong>{formatNaira(saleVat)}</strong>
                </div>
                <div className="metric-row">
                  <span>Total</span>
                  <strong>{formatNaira(saleTotal)}</strong>
                </div>
              </div>
              {messageNode}
              {actions}
            </form>
          </Panel>
        );
      case 'debt':
        return (
          <Panel
            title={TAB_META.debt.formTitle}
            subtitle={TAB_META.debt.subtitle}
          >
            <form
              className="admin-form"
              onSubmit={debtForm.handleSubmit(onValidDebt)}
            >
              <div className="field-grid">
                <Field
                  label="Customer"
                  hint="Required"
                  error={debtErrors.customerId?.message}
                >
                  <FormSelect
                    control={debtForm.control}
                    label="Customer"
                    name="customerId"
                    options={customerOptions}
                    placeholder="Select a customer"
                  />
                </Field>
                <Field
                  label="Sale"
                  hint={
                    selectedCreditRow
                      ? `${formatNaira(selectedCreditRow.outstanding)} outstanding`
                      : 'Optional'
                  }
                  error={debtErrors.saleId?.message}
                >
                  <FormSelect
                    control={debtForm.control}
                    label="Sale"
                    name="saleId"
                    options={creditSaleOptions}
                    placeholder="Apply to oldest credit sale"
                  />
                </Field>
                <Field label="Amount" error={debtErrors.amount?.message}>
                  <AppInput
                    {...debtForm.register('amount')}
                    min="0"
                    step="0.01"
                    type="number"
                  />
                </Field>
                <Field label="Method" error={debtErrors.method?.message}>
                  <FormSelect
                    control={debtForm.control}
                    label="Method"
                    name="method"
                    options={PAY_METHOD_OPTIONS}
                  />
                </Field>
                <Field label="Reference" error={debtErrors.reference?.message}>
                  <AppInput {...debtForm.register('reference')} />
                </Field>
                <Field label="Date" error={debtErrors.date?.message}>
                  <FormDatePicker
                    control={debtForm.control}
                    label="Date"
                    name="date"
                  />
                </Field>
              </div>
              {messageNode}
              {actions}
            </form>
          </Panel>
        );
      case 'delivery':
        return (
          <Panel
            title={TAB_META.delivery.formTitle}
            subtitle={TAB_META.delivery.subtitle}
          >
            <form
              className="admin-form"
              onSubmit={deliveryForm.handleSubmit(onValidDelivery)}
            >
              <div className="field-grid">
                <Field label="Vendor" error={deliveryErrors.vendorId?.message}>
                  <FormSelect
                    control={deliveryForm.control}
                    label="Vendor"
                    name="vendorId"
                    options={vendorOptions}
                    placeholder="Select a vendor"
                  />
                </Field>
                <Field
                  label="Inventory item"
                  error={deliveryErrors.inventoryItemId?.message}
                >
                  <FormSelect
                    control={deliveryForm.control}
                    label="Inventory item"
                    name="inventoryItemId"
                    options={linkedInventoryOptions}
                    placeholder="No linked inventory item"
                  />
                </Field>
                <Field label="Item name" error={deliveryErrors.item?.message}>
                  <AppInput {...deliveryForm.register('item')} />
                </Field>
                <Field
                  label="Quantity"
                  error={deliveryErrors.quantity?.message}
                >
                  <AppInput
                    {...deliveryForm.register('quantity')}
                    min="0"
                    step="0.01"
                    type="number"
                  />
                </Field>
                <Field label="Unit cost" error={deliveryErrors.cost?.message}>
                  <AppInput
                    {...deliveryForm.register('cost')}
                    min="0"
                    step="0.01"
                    type="number"
                  />
                </Field>
                <Field
                  label="Amount paid now"
                  error={deliveryErrors.amountPaid?.message}
                >
                  <AppInput
                    {...deliveryForm.register('amountPaid')}
                    min="0"
                    step="0.01"
                    type="number"
                  />
                </Field>
                <Field
                  label="Pay-by date"
                  error={deliveryErrors.payByDate?.message}
                >
                  <FormDatePicker
                    control={deliveryForm.control}
                    label="Pay-by date"
                    name="payByDate"
                  />
                </Field>
                <Field label="Invoice" error={deliveryErrors.invoice?.message}>
                  <AppInput {...deliveryForm.register('invoice')} />
                </Field>
                <Field
                  label="Delivery date"
                  error={deliveryErrors.date?.message}
                >
                  <FormDatePicker
                    control={deliveryForm.control}
                    label="Delivery date"
                    name="date"
                  />
                </Field>
              </div>
              <div className="form-card">
                <div className="metric-row">
                  <span>Total</span>
                  <strong>{formatNaira(deliveryTotal)}</strong>
                </div>
                <div className="metric-row">
                  <span>Paid now</span>
                  <strong>{formatNaira(deliveryPaid)}</strong>
                </div>
                {deliveryDebt > 0 && (
                  <div className="metric-row">
                    <span>Due to vendor</span>
                    <strong className="badge badge--warn">
                      {formatNaira(deliveryDebt)}
                    </strong>
                  </div>
                )}
              </div>
              {messageNode}
              {actions}
            </form>
          </Panel>
        );
      case 'vendorPayment':
        return (
          <Panel
            title={TAB_META.vendorPayment.formTitle}
            subtitle={TAB_META.vendorPayment.subtitle}
          >
            <form
              className="admin-form"
              onSubmit={vendorPaymentForm.handleSubmit(onValidVendorPayment)}
            >
              <div className="field-grid">
                <Field
                  label="Vendor"
                  error={vendorPaymentErrors.vendorId?.message}
                >
                  <FormSelect
                    control={vendorPaymentForm.control}
                    label="Vendor"
                    name="vendorId"
                    options={vendorOptions}
                    placeholder="Select a vendor"
                  />
                </Field>
                <Field
                  label="Amount"
                  error={vendorPaymentErrors.amount?.message}
                >
                  <AppInput
                    {...vendorPaymentForm.register('amount')}
                    min="0"
                    step="0.01"
                    type="number"
                  />
                </Field>
                <Field
                  label="Method"
                  error={vendorPaymentErrors.method?.message}
                >
                  <FormSelect
                    control={vendorPaymentForm.control}
                    label="Method"
                    name="method"
                    options={PAY_METHOD_OPTIONS}
                  />
                </Field>
                <Field
                  label="Reference"
                  error={vendorPaymentErrors.reference?.message}
                >
                  <AppInput {...vendorPaymentForm.register('reference')} />
                </Field>
                <Field label="Date" error={vendorPaymentErrors.date?.message}>
                  <FormDatePicker
                    control={vendorPaymentForm.control}
                    label="Date"
                    name="date"
                  />
                </Field>
              </div>
              {messageNode}
              {actions}
            </form>
          </Panel>
        );
      case 'expense':
        return (
          <Panel
            title={TAB_META.expense.formTitle}
            subtitle={TAB_META.expense.subtitle}
          >
            <form
              className="admin-form"
              onSubmit={expenseForm.handleSubmit(onValidExpense)}
            >
              <div className="field-grid">
                <Field label="Category" error={expenseErrors.category?.message}>
                  <FormSelect
                    control={expenseForm.control}
                    label="Category"
                    name="category"
                    options={EXPENSE_CATEGORY_OPTIONS}
                  />
                </Field>
                <Field
                  label="Description"
                  error={expenseErrors.description?.message}
                >
                  <AppInput {...expenseForm.register('description')} />
                </Field>
                <Field label="Amount" error={expenseErrors.amount?.message}>
                  <AppInput
                    {...expenseForm.register('amount')}
                    min="0"
                    step="0.01"
                    type="number"
                  />
                </Field>
                <Field label="Method" error={expenseErrors.method?.message}>
                  <FormSelect
                    control={expenseForm.control}
                    label="Method"
                    name="method"
                    options={PAY_METHOD_OPTIONS}
                  />
                </Field>
                <Field label="Date" error={expenseErrors.date?.message}>
                  <FormDatePicker
                    control={expenseForm.control}
                    label="Date"
                    name="date"
                  />
                </Field>
              </div>
              {messageNode}
              {actions}
            </form>
          </Panel>
        );
      case 'loss':
        return (
          <Panel
            title={TAB_META.loss.formTitle}
            subtitle={TAB_META.loss.subtitle}
          >
            <form
              className="admin-form"
              onSubmit={lossForm.handleSubmit(onValidLoss)}
            >
              <div className="field-grid">
                <Field label="Item" error={lossErrors.itemId?.message}>
                  <FormSelect
                    control={lossForm.control}
                    label="Item"
                    name="itemId"
                    options={inventoryOptions}
                    placeholder="Select an inventory item"
                  />
                </Field>
                <Field label="Type" error={lossErrors.type?.message}>
                  <FormSelect
                    control={lossForm.control}
                    label="Type"
                    name="type"
                    options={LOSS_TYPE_OPTIONS}
                  />
                </Field>
                <Field label="Quantity" error={lossErrors.quantity?.message}>
                  <AppInput
                    {...lossForm.register('quantity')}
                    min="0"
                    step="0.01"
                    type="number"
                  />
                </Field>
                <Field label="Reason" error={lossErrors.reason?.message}>
                  <AppInput {...lossForm.register('reason')} />
                </Field>
                <Field label="Date" error={lossErrors.date?.message}>
                  <FormDatePicker
                    control={lossForm.control}
                    label="Date"
                    name="date"
                  />
                </Field>
              </div>
              <div className="form-card">
                <div className="metric-row">
                  <span>Automatic value</span>
                  <strong>
                    {formatNaira(lossValue)} @{' '}
                    {formatNaira(selectedLossItem?.cost ?? 0)} per unit
                  </strong>
                </div>
              </div>
              {messageNode}
              {actions}
            </form>
          </Panel>
        );
      case 'stockCount':
        return (
          <Panel
            title={TAB_META.stockCount.formTitle}
            subtitle={TAB_META.stockCount.subtitle}
          >
            <form
              className="admin-form"
              onSubmit={stockCountForm.handleSubmit(onValidStockCount)}
            >
              <div className="field-grid">
                <Field label="Item" error={stockCountErrors.itemId?.message}>
                  <FormSelect
                    control={stockCountForm.control}
                    label="Item"
                    name="itemId"
                    options={inventoryOptions}
                    placeholder="Select an inventory item"
                  />
                </Field>
                <Field
                  label="Counted quantity"
                  error={stockCountErrors.counted?.message}
                >
                  <AppInput
                    {...stockCountForm.register('counted')}
                    min="0"
                    step="0.01"
                    type="number"
                  />
                </Field>
                <Field label="Date" error={stockCountErrors.date?.message}>
                  <FormDatePicker
                    control={stockCountForm.control}
                    label="Date"
                    name="date"
                  />
                </Field>
              </div>
              <div className="form-card">
                <div className="metric-row">
                  <span>Previous level</span>
                  <strong>{previousLevel}</strong>
                </div>
                <div className="metric-row">
                  <span>Difference</span>
                  <strong>{countDifference}</strong>
                </div>
                <div className="metric-row">
                  <span>Value</span>
                  <strong>{formatNaira(countValue)}</strong>
                </div>
              </div>
              {messageNode}
              {actions}
            </form>
          </Panel>
        );
      case 'dayClose':
        return (
          <Panel
            title={TAB_META.dayClose.formTitle}
            subtitle={TAB_META.dayClose.subtitle}
          >
            <form
              className="admin-form"
              onSubmit={dayCloseForm.handleSubmit(onValidDayClose)}
            >
              <div className="field-grid">
                <Field label="Date" error={dayCloseErrors.date?.message}>
                  <FormDatePicker
                    control={dayCloseForm.control}
                    label="Date"
                    name="date"
                  />
                </Field>
                <Field
                  label="Cash counted"
                  error={dayCloseErrors.countedCash?.message}
                >
                  <AppInput
                    {...dayCloseForm.register('countedCash')}
                    min="0"
                    step="0.01"
                    type="number"
                  />
                </Field>
                <Field label="Note" error={dayCloseErrors.note?.message}>
                  <AppTextarea {...dayCloseForm.register('note')} />
                </Field>
              </div>
              <div className="form-card">
                <div className="metric-row">
                  <span>Expected cash</span>
                  <strong>{formatNaira(expectedCash)}</strong>
                </div>
                <div className="metric-row">
                  <span>Cash counted</span>
                  <strong>{formatNaira(countedCash)}</strong>
                </div>
                <div className="metric-row">
                  <span>Difference</span>
                  <strong
                    className={
                      closeDifference < 0
                        ? 'badge badge--bad'
                        : 'badge badge--good'
                    }
                  >
                    {formatNaira(closeDifference)}
                  </strong>
                </div>
              </div>
              {messageNode}
              {actions}
            </form>
          </Panel>
        );
      case 'customer':
        return (
          <Panel
            title={TAB_META.customer.formTitle}
            subtitle={TAB_META.customer.subtitle}
          >
            <form
              className="admin-form"
              onSubmit={customerForm.handleSubmit(onValidCustomer)}
            >
              <div className="field-grid">
                <Field label="Name" error={customerErrors.name?.message}>
                  <AppInput {...customerForm.register('name')} />
                </Field>
                <Field label="Phone" error={customerErrors.phone?.message}>
                  <AppInput {...customerForm.register('phone')} type="tel" />
                </Field>
              </div>
              {messageNode}
              {actions}
            </form>
          </Panel>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Add records"
        subtitle="Record sales, payments, stock movements, and customer details."
      />
      <Tabs
        tabs={TABS}
        value={activeTab}
        onChange={handleTabChange}
        label="Record types"
      />
      <div className="admin-grid">
        {renderForm()}
        {(readOnly || canUse) && (
          <Panel
            title={TAB_META[activeTab].recentTitle}
            subtitle="Most recent entries in this category."
          >
            <RecordTable
              columns={columns}
              rows={recentRows}
              getKey={(row) => row.id}
              emptyTitle="Nothing here yet"
              emptyMessage="Records added here will appear in this list."
            />
          </Panel>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Forms;
