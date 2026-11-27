import React, { useMemo, useState } from 'react';

import { DashboardLayout } from 'layouts';
import { useStore } from 'context';
import type { Permission } from 'context';
import {
  AppDatePicker,
  AppInput,
  AppSelect,
  AppTextarea,
  EmptyState,
  Field,
  FormActions,
  PageHeader,
  Panel,
  RecordTable,
  Tabs,
} from 'components';
import type { TableColumn } from 'components';
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

const currentClock = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const makeLineKey = () =>
  `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

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

interface SaleLineDraft extends OrderLine {
  key: string;
}

interface FormState {
  department: Department;
  orderType: OrderType;
  tender: Tender;
  customerId: string;
  date: string;
  time: string;
  lines: SaleLineDraft[];
  debtCustomerId: string;
  debtSaleId: string;
  debtAmount: string;
  debtMethod: PayMethod;
  debtReference: string;
  deliveryVendorId: string;
  deliveryInventoryItemId: string;
  itemName: string;
  quantity: string;
  unitCost: string;
  amountPaid: string;
  payByDate: string;
  invoice: string;
  vendorPaymentVendorId: string;
  vendorPaymentAmount: string;
  vendorPaymentMethod: PayMethod;
  vendorPaymentReference: string;
  expenseCategory: string;
  expenseDescription: string;
  expenseAmount: string;
  expenseMethod: PayMethod;
  lossItemId: string;
  lossType: 'Loss' | 'Gain';
  lossQuantity: string;
  lossReason: string;
  stockItemId: string;
  countedQuantity: string;
  countedCash: string;
  closeNote: string;
  customerName: string;
  customerPhone: string;
}

const makeInitialForm = (): FormState => ({
  department: 'Restaurant',
  orderType: 'Dine in',
  tender: 'Cash',
  customerId: '',
  date: dateKey(),
  time: currentClock(),
  lines: [],
  debtCustomerId: '',
  debtSaleId: '',
  debtAmount: '',
  debtMethod: 'Cash',
  debtReference: '',
  deliveryVendorId: '',
  deliveryInventoryItemId: '',
  itemName: '',
  quantity: '1',
  unitCost: '',
  amountPaid: '0',
  payByDate: '',
  invoice: '',
  vendorPaymentVendorId: '',
  vendorPaymentAmount: '',
  vendorPaymentMethod: 'Cash',
  vendorPaymentReference: '',
  expenseCategory: 'General',
  expenseDescription: '',
  expenseAmount: '',
  expenseMethod: 'Cash',
  lossItemId: '',
  lossType: 'Loss',
  lossQuantity: '1',
  lossReason: '',
  stockItemId: '',
  countedQuantity: '',
  countedCash: '',
  closeNote: '',
  customerName: '',
  customerPhone: '',
});

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

  const [activeTab, setActiveTab] = useState<TabId>('sale');
  const [form, setForm] = useState<FormState>(makeInitialForm);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [message, setMessage] = useState('');
  const [menuSelection, setMenuSelection] = useState('');
  const [menuQuantity, setMenuQuantity] = useState('1');

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

  const patchForm = (patch: Partial<FormState>) =>
    setForm((current) => ({ ...current, ...patch }));

  const isOwnStaff = (staffId: string) =>
    !isCashier || staffId === currentUser?.id;

  const selectedMenuItem = data.menu.find((item) => item.id === menuSelection);
  const selectedPortions = selectedMenuItem
    ? availablePortions(selectedMenuItem, levels)
    : Infinity;
  const saleSubtotal = roundMoney(
    form.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
  );
  const saleVat = data.settings.vatEnabled
    ? roundMoney(saleSubtotal * data.settings.vatRate)
    : 0;
  const saleTotal = roundMoney(saleSubtotal + saleVat);
  const deliveryTotal = roundMoney(
    toNumber(form.quantity) * toNumber(form.unitCost),
  );
  const deliveryPaid = roundMoney(toNumber(form.amountPaid));
  const deliveryDebt = roundMoney(Math.max(0, deliveryTotal - deliveryPaid));
  const selectedLossItem = data.inventory.find(
    (item) => item.id === form.lossItemId,
  );
  const lossValue = roundMoney(
    toNumber(form.lossQuantity) * (selectedLossItem?.cost ?? 0),
  );
  const selectedCountItem = data.inventory.find(
    (item) => item.id === form.stockItemId,
  );
  const currentLevel = levels[form.stockItemId] ?? 0;
  const previousLevel = useMemo(() => {
    if (editing?.tab === 'stockCount') {
      const existing = data.stockCounts.find(
        (count) => count.id === editing.id && count.itemId === form.stockItemId,
      );
      if (existing) {
        return roundMoney(currentLevel - existing.difference);
      }
    }
    return roundMoney(currentLevel);
  }, [currentLevel, data.stockCounts, editing, form.stockItemId]);
  const countedQuantity = toNumber(form.countedQuantity);
  const countDifference = roundMoney(countedQuantity - previousLevel);
  const countValue = roundMoney(
    countDifference * (selectedCountItem?.cost ?? 0),
  );
  const { expectedCash } = dailyReport(data, form.date, cashierId);
  const countedCash = toNumber(form.countedCash);
  const closeDifference = roundMoney(countedCash - expectedCash);
  const creditRowsForDebt = creditRows.filter(
    (row) =>
      isOwnStaff(row.sale.staffId) &&
      (!form.debtCustomerId || row.sale.customerId === form.debtCustomerId),
  );
  const selectedCreditRow = creditRows.find(
    (row) => row.sale.id === form.debtSaleId,
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

  const resetForm = () => {
    setForm(makeInitialForm());
    setEditing(null);
    setMenuSelection('');
    setMenuQuantity('1');
    setMessage('');
  };

  const handleTabChange = (id: string) => {
    const nextTab = id as TabId;
    setActiveTab(nextTab);
    setForm(makeInitialForm());
    setEditing(null);
    setMenuSelection('');
    setMenuQuantity('1');
    setMessage('');
  };

  const saveAndReset = (text: string) => {
    setMessage(text);
    setEditing(null);
    setForm(makeInitialForm());
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
    if (form.lines.length >= MAX_SALE_LINES) {
      setMessage(`A sale can include up to ${MAX_SALE_LINES} lines.`);
      return;
    }
    const alreadyAdded = form.lines
      .filter((line) => line.itemId === item.id)
      .reduce((sum, line) => sum + line.quantity, 0);
    const portions = availablePortions(item, levels);
    if (Number.isFinite(portions) && alreadyAdded + quantity > portions) {
      setMessage(`Only ${portions} portion(s) of ${item.name} are available.`);
      return;
    }
    setForm((current) => ({
      ...current,
      lines: [
        ...current.lines,
        {
          key: makeLineKey(),
          itemId: item.id,
          name: item.name,
          quantity,
          unitPrice: item.price,
          cost: unitCostFor(item, data.inventory),
        },
      ],
    }));
    setMenuSelection('');
    setMenuQuantity('1');
    setMessage('');
  };

  const updateSaleLine = (key: string, value: string) => {
    const line = form.lines.find((entry) => entry.key === key);
    if (!line) {
      return;
    }
    const requested = Math.max(1, Math.floor(toNumber(value)));
    const item = data.menu.find((entry) => entry.id === line.itemId);
    const portions = item ? availablePortions(item, levels) : Infinity;
    const otherQuantity = form.lines
      .filter((entry) => entry.key !== key && entry.itemId === line.itemId)
      .reduce((sum, entry) => sum + entry.quantity, 0);
    const maximum = Number.isFinite(portions)
      ? Math.max(1, portions - otherQuantity)
      : requested;
    const quantity = Math.min(requested, maximum);
    setMessage(
      quantity < requested
        ? `Only ${maximum} portion(s) of ${line.name} are available.`
        : '',
    );
    setForm((current) => ({
      ...current,
      lines: current.lines.map((entry) =>
        entry.key === key ? { ...entry, quantity } : entry,
      ),
    }));
  };

  const removeSaleLine = (key: string) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.key !== key),
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canUse) {
      return;
    }

    const date = form.date || dateKey();
    const staffId = currentUser?.id;

    switch (activeTab) {
      case 'sale': {
        if (form.lines.length === 0) {
          setMessage('Add at least one menu line.');
          return;
        }
        if (form.tender === 'Credit' && !form.customerId) {
          setMessage('Choose a customer for credit sales.');
          return;
        }
        const lines: OrderLine[] = form.lines.map((line) => ({
          itemId: line.itemId,
          name: line.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          cost: line.cost,
        }));
        const time = form.time || currentClock();
        if (editing?.tab === 'sale') {
          updateSale(editing.id, {
            date,
            time,
            department: form.department,
            orderType: form.orderType,
            tender: form.tender,
            customerId: form.tender === 'Credit' ? form.customerId : undefined,
            lines,
          });
        } else {
          recordSale({
            date,
            time,
            department: form.department,
            orderType: form.orderType,
            tender: form.tender,
            customerId: form.tender === 'Credit' ? form.customerId : undefined,
            lines,
            staffId,
          });
        }
        saveAndReset(editing ? 'Sale updated.' : 'Sale recorded.');
        return;
      }
      case 'debt': {
        const amount = roundMoney(toNumber(form.debtAmount));
        if (!form.debtCustomerId) {
          setMessage('Choose a customer.');
          return;
        }
        if (amount <= 0) {
          setMessage('Enter an amount greater than zero.');
          return;
        }
        const payment = {
          customerId: form.debtCustomerId,
          saleId: form.debtSaleId || undefined,
          date,
          amount,
          method: form.debtMethod,
          reference: form.debtReference,
        };
        if (editing?.tab === 'debt') {
          updateDebtPayment(editing.id, payment);
        } else {
          addDebtPayment({ ...payment, staffId });
        }
        saveAndReset(
          editing ? 'Debt payment updated.' : 'Debt payment recorded.',
        );
        return;
      }
      case 'delivery': {
        if (!form.deliveryVendorId) {
          setMessage('Choose a vendor.');
          return;
        }
        if (!form.itemName.trim()) {
          setMessage('Enter an item name.');
          return;
        }
        if (deliveryTotal <= 0) {
          setMessage('Enter a quantity and unit cost.');
          return;
        }
        const delivery = {
          vendorId: form.deliveryVendorId,
          date,
          item: form.itemName.trim(),
          inventoryItemId: form.deliveryInventoryItemId || undefined,
          quantity: toNumber(form.quantity),
          cost: toNumber(form.unitCost),
          amountPaid: deliveryPaid,
          payByDate: form.payByDate || undefined,
          invoice: form.invoice,
        };
        if (editing?.tab === 'delivery') {
          updateDelivery(editing.id, delivery);
        } else {
          addDelivery({ ...delivery, staffId });
        }
        saveAndReset(editing ? 'Delivery updated.' : 'Delivery recorded.');
        return;
      }
      case 'vendorPayment': {
        const amount = roundMoney(toNumber(form.vendorPaymentAmount));
        if (!form.vendorPaymentVendorId) {
          setMessage('Choose a vendor.');
          return;
        }
        if (amount <= 0) {
          setMessage('Enter an amount greater than zero.');
          return;
        }
        const payment = {
          vendorId: form.vendorPaymentVendorId,
          date,
          amount,
          method: form.vendorPaymentMethod,
          reference: form.vendorPaymentReference,
        };
        if (editing?.tab === 'vendorPayment') {
          updateVendorPayment(editing.id, payment);
        } else {
          addVendorPayment({ ...payment, staffId });
        }
        saveAndReset(
          editing ? 'Vendor payment updated.' : 'Vendor payment recorded.',
        );
        return;
      }
      case 'expense': {
        const amount = roundMoney(toNumber(form.expenseAmount));
        if (!form.expenseDescription.trim()) {
          setMessage('Enter a description.');
          return;
        }
        if (amount <= 0) {
          setMessage('Enter an amount greater than zero.');
          return;
        }
        const expense = {
          date,
          category: form.expenseCategory,
          description: form.expenseDescription.trim(),
          amount,
          method: form.expenseMethod,
        };
        if (editing?.tab === 'expense') {
          updateExpense(editing.id, expense);
        } else {
          addExpense({ ...expense, staffId });
        }
        saveAndReset(editing ? 'Expense updated.' : 'Expense recorded.');
        return;
      }
      case 'loss': {
        if (!form.lossItemId) {
          setMessage('Choose an inventory item.');
          return;
        }
        if (toNumber(form.lossQuantity) <= 0) {
          setMessage('Enter a quantity greater than zero.');
          return;
        }
        if (!form.lossReason.trim()) {
          setMessage('Enter a reason.');
          return;
        }
        const loss = {
          date,
          itemId: form.lossItemId,
          itemName: selectedLossItem?.name ?? form.itemName,
          quantity: toNumber(form.lossQuantity),
          type: form.lossType,
          reason: form.lossReason.trim(),
          value: lossValue,
        };
        if (editing?.tab === 'loss') {
          updateLoss(editing.id, loss);
        } else {
          addLoss({ ...loss, staffId });
        }
        saveAndReset(
          editing ? 'Stock movement updated.' : 'Stock movement recorded.',
        );
        return;
      }
      case 'stockCount': {
        if (!form.stockItemId) {
          setMessage('Choose an inventory item.');
          return;
        }
        if (countedQuantity < 0 || form.countedQuantity === '') {
          setMessage('Enter the counted quantity.');
          return;
        }
        const count = {
          date,
          itemId: form.stockItemId,
          itemName: selectedCountItem?.name ?? '',
          previous: previousLevel,
          counted: countedQuantity,
          difference: countDifference,
          value: countValue,
        };
        if (editing?.tab === 'stockCount') {
          updateStockCount(editing.id, count);
        } else {
          addStockCount({ ...count, staffId });
        }
        saveAndReset(
          editing ? 'Stock count updated.' : 'Stock count recorded.',
        );
        return;
      }
      case 'dayClose': {
        if (form.countedCash === '' || countedCash < 0) {
          setMessage('Enter the cash counted.');
          return;
        }
        const close = {
          date,
          expectedCash,
          countedCash,
          difference: closeDifference,
          note: form.closeNote,
        };
        if (editing?.tab === 'dayClose') {
          updateDayClose(editing.id, close);
        } else {
          addDayClose({ ...close, staffId });
        }
        saveAndReset(editing ? 'Day close updated.' : 'Day close recorded.');
        return;
      }
      case 'customer': {
        if (!form.customerName.trim()) {
          setMessage('Enter a customer name.');
          return;
        }
        if (editing?.tab === 'customer') {
          updateCustomer(editing.id, {
            name: form.customerName.trim(),
            phone: form.customerPhone,
          });
        } else {
          addCustomer({
            name: form.customerName.trim(),
            phone: form.customerPhone,
          });
        }
        saveAndReset(editing ? 'Customer updated.' : 'Customer added.');
        break;
      }
      default:
        break;
    }
  };

  const startEdit = (row: RecentRow) => {
    if (!canUse || !isOwnRecord(row)) {
      return;
    }

    const nextForm = makeInitialForm();
    switch (row.kind) {
      case 'sale':
        setForm({
          ...nextForm,
          department: row.record.department,
          orderType: row.record.orderType,
          tender: row.record.tender,
          customerId: row.record.customerId ?? '',
          date: row.record.date,
          time: row.record.time,
          lines: row.record.lines.map((line, index) => ({
            key: `${line.itemId ?? line.name}-${index}`,
            itemId: line.itemId,
            name: line.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            cost: line.cost,
          })),
        });
        break;
      case 'debt':
        setForm({
          ...nextForm,
          debtCustomerId: row.record.customerId,
          debtSaleId: row.record.saleId ?? '',
          debtAmount: String(row.record.amount),
          debtMethod: row.record.method,
          debtReference: row.record.reference,
          date: row.record.date,
        });
        break;
      case 'delivery':
        setForm({
          ...nextForm,
          deliveryVendorId: row.record.vendorId,
          deliveryInventoryItemId: row.record.inventoryItemId ?? '',
          itemName: row.record.item,
          quantity: String(row.record.quantity),
          unitCost: String(row.record.cost),
          amountPaid: String(row.record.amountPaid),
          payByDate: row.record.payByDate ?? '',
          invoice: row.record.invoice,
          date: row.record.date,
        });
        break;
      case 'vendorPayment':
        setForm({
          ...nextForm,
          vendorPaymentVendorId: row.record.vendorId,
          vendorPaymentAmount: String(row.record.amount),
          vendorPaymentMethod: row.record.method,
          vendorPaymentReference: row.record.reference,
          date: row.record.date,
        });
        break;
      case 'expense':
        setForm({
          ...nextForm,
          expenseCategory: row.record.category,
          expenseDescription: row.record.description,
          expenseAmount: String(row.record.amount),
          expenseMethod: row.record.method,
          date: row.record.date,
        });
        break;
      case 'loss':
        setForm({
          ...nextForm,
          lossItemId: row.record.itemId,
          lossType: row.record.type,
          lossQuantity: String(row.record.quantity),
          lossReason: row.record.reason,
          date: row.record.date,
        });
        break;
      case 'stockCount':
        setForm({
          ...nextForm,
          stockItemId: row.record.itemId,
          countedQuantity: String(row.record.counted),
          date: row.record.date,
        });
        break;
      case 'dayClose':
        setForm({
          ...nextForm,
          countedCash: String(row.record.countedCash),
          closeNote: row.record.note,
          date: row.record.date,
        });
        break;
      case 'customer':
        setForm({
          ...nextForm,
          customerName: row.record.name,
          customerPhone: row.record.phone,
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

  const handleDelete = (row: RecentRow) => {
    if (!canUse || !isOwnRecord(row)) {
      return;
    }
    if (row.kind === 'sale' && !can('deleteRecords')) {
      return;
    }
    if (!window.confirm('Delete this record? This cannot be undone.')) {
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
      setForm(makeInitialForm());
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
      ...(form.debtSaleId &&
      !creditRowsForDebt.some((row) => row.sale.id === form.debtSaleId)
        ? [{ key: form.debtSaleId, label: form.debtSaleId }]
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
            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <Field label="Department">
                  <AppSelect
                    onValueChange={(value) =>
                      patchForm({ department: value as Department })
                    }
                    options={DEPARTMENT_OPTIONS}
                    value={form.department}
                  />
                </Field>
                <Field label="Order type">
                  <AppSelect
                    onValueChange={(value) =>
                      patchForm({ orderType: value as OrderType })
                    }
                    options={ORDER_TYPE_OPTIONS}
                    value={form.orderType}
                  />
                </Field>
                <Field label="Tender">
                  <AppSelect
                    onValueChange={(value) =>
                      patchForm({ tender: value as Tender })
                    }
                    options={TENDER_OPTIONS}
                    value={form.tender}
                  />
                </Field>
                <Field
                  label="Customer"
                  hint={
                    form.tender === 'Credit'
                      ? 'Required for credit sales.'
                      : 'Optional for paid sales.'
                  }
                >
                  <AppSelect
                    onValueChange={(value) => patchForm({ customerId: value })}
                    options={walkInCustomerOptions}
                    placeholder="Walk-in customer"
                    value={form.customerId}
                  />
                </Field>
                <Field label="Date">
                  <AppDatePicker
                    onValueChange={(value) => patchForm({ date: value })}
                    value={form.date}
                  />
                </Field>
                <Field label="Time">
                  <AppInput
                    onChange={(event) =>
                      patchForm({ time: event.target.value })
                    }
                    type="time"
                    value={form.time}
                  />
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
              {form.lines.length > 0 && (
                <div className="form-card">
                  {form.lines.map((line) => (
                    <div className="metric-row" key={line.key}>
                      <div>
                        <strong>{line.name}</strong>
                        <div className="admin-note">
                          Cost {formatNaira(line.cost)} per portion
                        </div>
                      </div>
                      <div className="stock-item__actions">
                        <AppInput
                          aria-label={`Quantity for ${line.name}`}
                          classNames={{ base: 'w-20' }}
                          min="1"
                          onChange={(event) =>
                            updateSaleLine(line.key, event.target.value)
                          }
                          type="number"
                          value={String(line.quantity)}
                        />
                        <strong className="tabular">
                          {formatNaira(
                            roundMoney(line.unitPrice * line.quantity),
                          )}
                        </strong>
                        <button
                          className="text-button"
                          onClick={() => removeSaleLine(line.key)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
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
            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <Field label="Customer" hint="Required">
                  <AppSelect
                    onValueChange={(value) =>
                      patchForm({ debtCustomerId: value })
                    }
                    options={customerOptions}
                    placeholder="Select a customer"
                    value={form.debtCustomerId}
                  />
                </Field>
                <Field
                  label="Sale"
                  hint={
                    selectedCreditRow
                      ? `${formatNaira(selectedCreditRow.outstanding)} outstanding`
                      : 'Optional'
                  }
                >
                  <AppSelect
                    onValueChange={(value) => patchForm({ debtSaleId: value })}
                    options={creditSaleOptions}
                    placeholder="Apply to oldest credit sale"
                    value={form.debtSaleId}
                  />
                </Field>
                <Field label="Amount">
                  <AppInput
                    min="0"
                    onChange={(event) =>
                      patchForm({ debtAmount: event.target.value })
                    }
                    step="0.01"
                    type="number"
                    value={form.debtAmount}
                  />
                </Field>
                <Field label="Method">
                  <AppSelect
                    onValueChange={(value) =>
                      patchForm({ debtMethod: value as PayMethod })
                    }
                    options={PAY_METHOD_OPTIONS}
                    value={form.debtMethod}
                  />
                </Field>
                <Field label="Reference">
                  <AppInput
                    onChange={(event) =>
                      patchForm({ debtReference: event.target.value })
                    }
                    value={form.debtReference}
                  />
                </Field>
                <Field label="Date">
                  <AppDatePicker
                    onValueChange={(value) => patchForm({ date: value })}
                    value={form.date}
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
            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <Field label="Vendor">
                  <AppSelect
                    onValueChange={(value) =>
                      patchForm({ deliveryVendorId: value })
                    }
                    options={vendorOptions}
                    placeholder="Select a vendor"
                    value={form.deliveryVendorId}
                  />
                </Field>
                <Field label="Inventory item">
                  <AppSelect
                    onValueChange={(value) => {
                      const item = data.inventory.find(
                        (entry) => entry.id === value,
                      );
                      patchForm({
                        deliveryInventoryItemId: value,
                        itemName: item?.name ?? form.itemName,
                      });
                    }}
                    options={linkedInventoryOptions}
                    placeholder="No linked inventory item"
                    value={form.deliveryInventoryItemId}
                  />
                </Field>
                <Field label="Item name">
                  <AppInput
                    onChange={(event) =>
                      patchForm({ itemName: event.target.value })
                    }
                    value={form.itemName}
                  />
                </Field>
                <Field label="Quantity">
                  <AppInput
                    min="0"
                    onChange={(event) =>
                      patchForm({ quantity: event.target.value })
                    }
                    step="0.01"
                    type="number"
                    value={form.quantity}
                  />
                </Field>
                <Field label="Unit cost">
                  <AppInput
                    min="0"
                    onChange={(event) =>
                      patchForm({ unitCost: event.target.value })
                    }
                    step="0.01"
                    type="number"
                    value={form.unitCost}
                  />
                </Field>
                <Field label="Amount paid now">
                  <AppInput
                    min="0"
                    onChange={(event) =>
                      patchForm({ amountPaid: event.target.value })
                    }
                    step="0.01"
                    type="number"
                    value={form.amountPaid}
                  />
                </Field>
                <Field label="Pay-by date">
                  <AppDatePicker
                    onValueChange={(value) => patchForm({ payByDate: value })}
                    value={form.payByDate}
                  />
                </Field>
                <Field label="Invoice">
                  <AppInput
                    onChange={(event) =>
                      patchForm({ invoice: event.target.value })
                    }
                    value={form.invoice}
                  />
                </Field>
                <Field label="Delivery date">
                  <AppDatePicker
                    onValueChange={(value) => patchForm({ date: value })}
                    value={form.date}
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
            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <Field label="Vendor">
                  <AppSelect
                    onValueChange={(value) =>
                      patchForm({ vendorPaymentVendorId: value })
                    }
                    options={vendorOptions}
                    placeholder="Select a vendor"
                    value={form.vendorPaymentVendorId}
                  />
                </Field>
                <Field label="Amount">
                  <AppInput
                    min="0"
                    onChange={(event) =>
                      patchForm({ vendorPaymentAmount: event.target.value })
                    }
                    step="0.01"
                    type="number"
                    value={form.vendorPaymentAmount}
                  />
                </Field>
                <Field label="Method">
                  <AppSelect
                    onValueChange={(value) =>
                      patchForm({ vendorPaymentMethod: value as PayMethod })
                    }
                    options={PAY_METHOD_OPTIONS}
                    value={form.vendorPaymentMethod}
                  />
                </Field>
                <Field label="Reference">
                  <AppInput
                    onChange={(event) =>
                      patchForm({ vendorPaymentReference: event.target.value })
                    }
                    value={form.vendorPaymentReference}
                  />
                </Field>
                <Field label="Date">
                  <AppDatePicker
                    onValueChange={(value) => patchForm({ date: value })}
                    value={form.date}
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
            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <Field label="Category">
                  <AppSelect
                    onValueChange={(value) =>
                      patchForm({ expenseCategory: value })
                    }
                    options={EXPENSE_CATEGORY_OPTIONS}
                    value={form.expenseCategory}
                  />
                </Field>
                <Field label="Description">
                  <AppInput
                    onChange={(event) =>
                      patchForm({ expenseDescription: event.target.value })
                    }
                    value={form.expenseDescription}
                  />
                </Field>
                <Field label="Amount">
                  <AppInput
                    min="0"
                    onChange={(event) =>
                      patchForm({ expenseAmount: event.target.value })
                    }
                    step="0.01"
                    type="number"
                    value={form.expenseAmount}
                  />
                </Field>
                <Field label="Method">
                  <AppSelect
                    onValueChange={(value) =>
                      patchForm({ expenseMethod: value as PayMethod })
                    }
                    options={PAY_METHOD_OPTIONS}
                    value={form.expenseMethod}
                  />
                </Field>
                <Field label="Date">
                  <AppDatePicker
                    onValueChange={(value) => patchForm({ date: value })}
                    value={form.date}
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
            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <Field label="Item">
                  <AppSelect
                    onValueChange={(value) => patchForm({ lossItemId: value })}
                    options={inventoryOptions}
                    placeholder="Select an inventory item"
                    value={form.lossItemId}
                  />
                </Field>
                <Field label="Type">
                  <AppSelect
                    onValueChange={(value) =>
                      patchForm({ lossType: value as 'Loss' | 'Gain' })
                    }
                    options={LOSS_TYPE_OPTIONS}
                    value={form.lossType}
                  />
                </Field>
                <Field label="Quantity">
                  <AppInput
                    min="0"
                    onChange={(event) =>
                      patchForm({ lossQuantity: event.target.value })
                    }
                    step="0.01"
                    type="number"
                    value={form.lossQuantity}
                  />
                </Field>
                <Field label="Reason">
                  <AppInput
                    onChange={(event) =>
                      patchForm({ lossReason: event.target.value })
                    }
                    value={form.lossReason}
                  />
                </Field>
                <Field label="Date">
                  <AppDatePicker
                    onValueChange={(value) => patchForm({ date: value })}
                    value={form.date}
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
            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <Field label="Item">
                  <AppSelect
                    onValueChange={(value) => patchForm({ stockItemId: value })}
                    options={inventoryOptions}
                    placeholder="Select an inventory item"
                    value={form.stockItemId}
                  />
                </Field>
                <Field label="Counted quantity">
                  <AppInput
                    min="0"
                    onChange={(event) =>
                      patchForm({ countedQuantity: event.target.value })
                    }
                    step="0.01"
                    type="number"
                    value={form.countedQuantity}
                  />
                </Field>
                <Field label="Date">
                  <AppDatePicker
                    onValueChange={(value) => patchForm({ date: value })}
                    value={form.date}
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
            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <Field label="Date">
                  <AppDatePicker
                    onValueChange={(value) => patchForm({ date: value })}
                    value={form.date}
                  />
                </Field>
                <Field label="Cash counted">
                  <AppInput
                    min="0"
                    onChange={(event) =>
                      patchForm({ countedCash: event.target.value })
                    }
                    step="0.01"
                    type="number"
                    value={form.countedCash}
                  />
                </Field>
                <Field label="Note">
                  <AppTextarea
                    onChange={(event) =>
                      patchForm({ closeNote: event.target.value })
                    }
                    value={form.closeNote}
                  />
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
            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <Field label="Name">
                  <AppInput
                    onChange={(event) =>
                      patchForm({ customerName: event.target.value })
                    }
                    value={form.customerName}
                  />
                </Field>
                <Field label="Phone">
                  <AppInput
                    onChange={(event) =>
                      patchForm({ customerPhone: event.target.value })
                    }
                    type="tel"
                    value={form.customerPhone}
                  />
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
