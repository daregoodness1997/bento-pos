import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { DashboardLayout } from 'layouts';
import {
  AppDatePicker,
  AppInput,
  Field,
  FormActions,
  FormDatePicker,
  FormSelect,
  PageHeader,
  Panel,
  RecordTable,
  Tabs,
} from 'components';
import type { TabItem, TableColumn } from 'components';
import { useConfirm, useStore } from 'context';
import { historyEditSchema } from 'schemas/forms';
import type { HistoryEditValues } from 'schemas/forms';
import type {
  DayClose,
  DebtPayment,
  Delivery,
  Expense,
  LossRecord,
  OrderStatus,
  PayMethod,
  SaleRecord,
  StockCount,
  VendorPayment,
} from 'types/store';
import { roundMoney, saleProfit } from 'utils/finance';
import { formatNaira } from 'utils/format';

type HistoryTab =
  | 'sales'
  | 'debtPayments'
  | 'deliveries'
  | 'vendorPayments'
  | 'expenses'
  | 'losses'
  | 'stockCounts'
  | 'dayCloses';

type EditableType = 'sales' | 'debtPayments' | 'expenses';

type EditForm = {
  type: EditableType;
  id: string;
};

const EDIT_LABELS: Record<EditableType, string> = {
  sales: 'sale',
  debtPayments: 'debt payment',
  expenses: 'expense',
};

const TABS: TabItem[] = [
  { id: 'sales', label: 'Sales' },
  { id: 'debtPayments', label: 'Debt payments' },
  { id: 'deliveries', label: 'Deliveries' },
  { id: 'vendorPayments', label: 'Vendor payments' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'losses', label: 'Losses' },
  { id: 'stockCounts', label: 'Stock counts' },
  { id: 'dayCloses', label: 'Day close' },
];

const CASHIER_TABS: HistoryTab[] = ['sales', 'debtPayments', 'dayCloses'];

const PAY_METHODS: PayMethod[] = ['Cash', 'Transfer', 'POS'];
const ORDER_STATUSES: OrderStatus[] = [
  'Paid',
  'Credit',
  'Preparing',
  'Refunded',
];

const PAY_METHOD_OPTIONS = PAY_METHODS.map((method) => ({
  key: method,
  label: method,
}));

const ORDER_STATUS_OPTIONS = ORDER_STATUSES.map((status) => ({
  key: status,
  label: status,
}));

function newestFirst<T extends { createdAt: string }>(records: T[]): T[] {
  return records.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const labelFor = (records: { id: string; name: string }[], id: string) =>
  records.find((record) => record.id === id)?.name ?? 'Unknown';

const parseMoney = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
};

const recordText = (record: object) =>
  JSON.stringify(record)?.toLowerCase() ?? '';

const matchesRecord = (record: object, query: string, date: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  const recordDate =
    'date' in record ? String((record as { date: unknown }).date ?? '') : '';

  return (
    (!date || recordDate === date) &&
    (!normalizedQuery || recordText(record).includes(normalizedQuery))
  );
};

const isOwnRecord = (
  staffId: string,
  currentUserId: string | undefined,
  isCashier: boolean,
) => !isCashier || staffId === currentUserId;

const statusBadgeClass = (status: OrderStatus) => {
  if (status === 'Refunded') {
    return 'badge badge--bad';
  }
  if (status === 'Credit' || status === 'Preparing') {
    return 'badge badge--warn';
  }
  return 'badge badge--good';
};

const differenceBadgeClass = (value: number) => {
  if (value > 0) {
    return 'badge badge--good';
  }
  if (value < 0) {
    return 'badge badge--bad';
  }
  return 'badge';
};

const History = () => {
  const {
    data,
    currentUser,
    deleteDebtPayment,
    deleteExpense,
    deleteSale,
    updateDebtPayment,
    updateExpense,
    updateSale,
  } = useStore();
  const confirmAction = useConfirm();
  const navigate = useNavigate();

  const staffId = currentUser?.id;
  const isCashier = currentUser?.role === 'Cashier';
  const isAuditor = currentUser?.role === 'Auditor';
  const canManage =
    currentUser?.role === 'Owner' || currentUser?.role === 'Manager';

  const [selectedTab, setSelectedTab] = useState<HistoryTab>('sales');
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<HistoryEditValues>({
    resolver: zodResolver(historyEditSchema),
  });

  const activeTab: HistoryTab =
    isCashier && !CASHIER_TABS.includes(selectedTab) ? 'sales' : selectedTab;
  const visibleTabs = isCashier
    ? TABS.filter((tab) => CASHIER_TABS.includes(tab.id as HistoryTab))
    : TABS;

  const rows = useMemo(
    () => ({
      sales: newestFirst(data.sales).filter(
        (row) =>
          isOwnRecord(row.staffId, staffId, isCashier) &&
          matchesRecord(row, query, date),
      ),
      debtPayments: newestFirst(data.debtPayments).filter(
        (row) =>
          isOwnRecord(row.staffId, staffId, isCashier) &&
          matchesRecord(row, query, date),
      ),
      deliveries: newestFirst(data.deliveries).filter((row) =>
        matchesRecord(row, query, date),
      ),
      vendorPayments: newestFirst(data.vendorPayments).filter((row) =>
        matchesRecord(row, query, date),
      ),
      expenses: newestFirst(data.expenses).filter((row) =>
        matchesRecord(row, query, date),
      ),
      losses: newestFirst(data.losses).filter((row) =>
        matchesRecord(row, query, date),
      ),
      stockCounts: newestFirst(data.stockCounts).filter((row) =>
        matchesRecord(row, query, date),
      ),
      dayCloses: newestFirst(data.dayCloses).filter(
        (row) =>
          isOwnRecord(row.staffId, staffId, isCashier) &&
          matchesRecord(row, query, date),
      ),
    }),
    [data, date, isCashier, query, staffId],
  );

  const openEdit = (type: EditableType, id: string) => {
    if (!canManage) {
      return;
    }

    if (type === 'sales') {
      const record = data.sales.find((entry) => entry.id === id);
      if (record) {
        reset({
          kind: 'sale',
          date: record.date,
          amountPaid: String(record.amountPaid),
          status: record.status,
          amount: undefined,
          method: undefined,
          reference: undefined,
          category: undefined,
          description: undefined,
        });
        setEditForm({ type, id });
      }
      return;
    }

    if (type === 'debtPayments') {
      const record = data.debtPayments.find((entry) => entry.id === id);
      if (record) {
        reset({
          kind: 'debtPayment',
          date: record.date,
          amountPaid: undefined,
          status: undefined,
          amount: String(record.amount),
          method: record.method,
          reference: record.reference,
          category: undefined,
          description: undefined,
        });
        setEditForm({ type, id });
      }
      return;
    }

    const record = data.expenses.find((entry) => entry.id === id);
    if (record) {
      reset({
        kind: 'expense',
        date: record.date,
        amountPaid: undefined,
        status: undefined,
        amount: String(record.amount),
        method: record.method,
        reference: undefined,
        category: record.category,
        description: record.description,
      });
      setEditForm({ type, id });
    }
  };

  const handleDelete = async (type: EditableType, id: string) => {
    if (!canManage) {
      return;
    }

    const label = EDIT_LABELS[type];

    if (
      !(await confirmAction(`Delete this ${label}? This cannot be undone.`))
    ) {
      return;
    }

    if (type === 'sales') {
      deleteSale(id);
    } else if (type === 'debtPayments') {
      deleteDebtPayment(id);
    } else {
      deleteExpense(id);
    }

    setEditForm((current) =>
      current?.type === type && current.id === id ? null : current,
    );
  };

  const renderActions = (type: EditableType, id: string) =>
    canManage ? (
      <div className="panel-actions">
        <button
          className="text-button"
          onClick={() => openEdit(type, id)}
          type="button"
        >
          Edit
        </button>
        <button
          className="text-button"
          onClick={() => handleDelete(type, id)}
          type="button"
        >
          Delete
        </button>
      </div>
    ) : (
      <span aria-label="Read only">—</span>
    );

  const salesColumns: TableColumn<SaleRecord>[] = [
    {
      key: 'id',
      label: 'Ticket',
      render: (row) => (
        <button
          className="link-button"
          onClick={() => navigate(`/app/sales/${encodeURIComponent(row.id)}`)}
          type="button"
        >
          {row.id}
        </button>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => `${row.date} · ${row.time}`,
    },
    { key: 'items', label: 'Items' },
    {
      key: 'department',
      label: 'Department',
    },
    { key: 'tender', label: 'Tender' },
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      render: (row) => formatNaira(row.total),
    },
    {
      key: 'profit',
      label: 'Profit',
      align: 'right',
      render: (row) => formatNaira(saleProfit(row)),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={statusBadgeClass(row.status)}>{row.status}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => renderActions('sales', row.id),
    },
  ];

  const debtPaymentColumns: TableColumn<DebtPayment>[] = [
    {
      key: 'customerId',
      label: 'Customer',
      render: (row) => labelFor(data.customers, row.customerId),
    },
    {
      key: 'saleId',
      label: 'Sale',
      render: (row) => row.saleId ?? '—',
    },
    { key: 'date', label: 'Date' },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (row) => formatNaira(row.amount),
    },
    { key: 'method', label: 'Method' },
    {
      key: 'reference',
      label: 'Reference',
      render: (row) => row.reference || '—',
    },
    {
      key: 'staffId',
      label: 'Recorded by',
      render: (row) => labelFor(data.users, row.staffId),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => renderActions('debtPayments', row.id),
    },
  ];

  const deliveryColumns: TableColumn<Delivery>[] = [
    { key: 'date', label: 'Date' },
    {
      key: 'vendorId',
      label: 'Vendor',
      render: (row) => labelFor(data.vendors, row.vendorId),
    },
    { key: 'item', label: 'Item' },
    {
      key: 'quantity',
      label: 'Quantity',
      align: 'right',
      render: (row) => String(row.quantity),
    },
    {
      key: 'cost',
      label: 'Unit cost',
      align: 'right',
      render: (row) => formatNaira(row.cost),
    },
    {
      key: 'amountPaid',
      label: 'Paid',
      align: 'right',
      render: (row) => formatNaira(row.amountPaid),
    },
    {
      key: 'invoice',
      label: 'Invoice',
      render: (row) => row.invoice || '—',
    },
  ];

  const vendorPaymentColumns: TableColumn<VendorPayment>[] = [
    { key: 'date', label: 'Date' },
    {
      key: 'vendorId',
      label: 'Vendor',
      render: (row) => labelFor(data.vendors, row.vendorId),
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (row) => formatNaira(row.amount),
    },
    { key: 'method', label: 'Method' },
    {
      key: 'reference',
      label: 'Reference',
      render: (row) => row.reference || '—',
    },
    {
      key: 'staffId',
      label: 'Recorded by',
      render: (row) => labelFor(data.users, row.staffId),
    },
  ];

  const expenseColumns: TableColumn<Expense>[] = [
    { key: 'date', label: 'Date' },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (row) => formatNaira(row.amount),
    },
    { key: 'method', label: 'Method' },
    {
      key: 'staffId',
      label: 'Recorded by',
      render: (row) => labelFor(data.users, row.staffId),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => renderActions('expenses', row.id),
    },
  ];

  const lossColumns: TableColumn<LossRecord>[] = [
    { key: 'date', label: 'Date' },
    { key: 'itemName', label: 'Item' },
    { key: 'type', label: 'Type' },
    {
      key: 'quantity',
      label: 'Quantity',
      align: 'right',
      render: (row) => String(row.quantity),
    },
    {
      key: 'value',
      label: 'Value',
      align: 'right',
      render: (row) => formatNaira(row.value),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (row) => row.reason || '—',
    },
  ];

  const stockCountColumns: TableColumn<StockCount>[] = [
    { key: 'date', label: 'Date' },
    { key: 'itemName', label: 'Item' },
    {
      key: 'previous',
      label: 'Previous',
      align: 'right',
      render: (row) => String(row.previous),
    },
    {
      key: 'counted',
      label: 'Counted',
      align: 'right',
      render: (row) => String(row.counted),
    },
    {
      key: 'difference',
      label: 'Difference',
      align: 'right',
      render: (row) => String(row.difference),
    },
    {
      key: 'value',
      label: 'Value',
      align: 'right',
      render: (row) => formatNaira(row.value),
    },
  ];

  const dayCloseColumns: TableColumn<DayClose>[] = [
    { key: 'date', label: 'Date' },
    {
      key: 'expectedCash',
      label: 'Expected',
      align: 'right',
      render: (row) => formatNaira(row.expectedCash),
    },
    {
      key: 'countedCash',
      label: 'Counted',
      align: 'right',
      render: (row) => formatNaira(row.countedCash),
    },
    {
      key: 'difference',
      label: 'Difference',
      align: 'right',
      render: (row) => (
        <span className={differenceBadgeClass(row.difference)}>
          {formatNaira(row.difference)}
        </span>
      ),
    },
    {
      key: 'note',
      label: 'Note',
      render: (row) => row.note || '—',
    },
    {
      key: 'staffId',
      label: 'Closed by',
      render: (row) => labelFor(data.users, row.staffId),
    },
  ];

  const handleEditSubmit = async (values: HistoryEditValues) => {
    if (!editForm || !canManage) {
      return;
    }

    if (values.kind === 'sale' && values.status === 'Refunded') {
      if (
        !(await confirmAction(`Mark sale ${editForm.id} as refunded?`, {
          title: 'Refund sale?',
          confirmLabel: 'Mark refunded',
        }))
      ) {
        return;
      }
    }

    if (values.kind === 'sale') {
      updateSale(editForm.id, {
        date: values.date,
        amountPaid: parseMoney(values.amountPaid ?? ''),
        status: values.status ?? 'Paid',
      });
    } else if (values.kind === 'debtPayment') {
      updateDebtPayment(editForm.id, {
        date: values.date,
        amount: parseMoney(values.amount ?? ''),
        method: values.method ?? 'Cash',
        reference: values.reference?.trim() ?? '',
      });
    } else {
      updateExpense(editForm.id, {
        date: values.date,
        category: values.category?.trim() ?? '',
        description: values.description?.trim() ?? '',
        amount: parseMoney(values.amount ?? ''),
        method: values.method ?? 'Cash',
      });
    }

    setEditForm(null);
    reset();
  };

  const renderTable = () => {
    switch (activeTab) {
      case 'sales':
        return (
          <RecordTable
            columns={salesColumns}
            emptyMessage="Try another search, or record a sale first."
            emptyTitle="No sales found"
            getKey={(row) => row.id}
            rows={rows.sales}
          />
        );
      case 'debtPayments':
        return (
          <RecordTable
            columns={debtPaymentColumns}
            emptyMessage="Try another search, or collect a debt first."
            emptyTitle="No debt payments found"
            getKey={(row) => row.id}
            rows={rows.debtPayments}
          />
        );
      case 'deliveries':
        return (
          <RecordTable
            columns={deliveryColumns}
            emptyMessage="Try another search, or record a delivery first."
            emptyTitle="No deliveries found"
            getKey={(row) => row.id}
            rows={rows.deliveries}
          />
        );
      case 'vendorPayments':
        return (
          <RecordTable
            columns={vendorPaymentColumns}
            emptyMessage="Try another search, or pay a vendor first."
            emptyTitle="No vendor payments found"
            getKey={(row) => row.id}
            rows={rows.vendorPayments}
          />
        );
      case 'expenses':
        return (
          <RecordTable
            columns={expenseColumns}
            emptyMessage="Try another search, or record an expense first."
            emptyTitle="No expenses found"
            getKey={(row) => row.id}
            rows={rows.expenses}
          />
        );
      case 'losses':
        return (
          <RecordTable
            columns={lossColumns}
            emptyMessage="Try another search, or record a stock movement first."
            emptyTitle="No losses or gains found"
            getKey={(row) => row.id}
            rows={rows.losses}
          />
        );
      case 'stockCounts':
        return (
          <RecordTable
            columns={stockCountColumns}
            emptyMessage="Try another search, or record a stock count first."
            emptyTitle="No stock counts found"
            getKey={(row) => row.id}
            rows={rows.stockCounts}
          />
        );
      case 'dayCloses':
        return (
          <RecordTable
            columns={dayCloseColumns}
            emptyMessage="Try another search, or close a day first."
            emptyTitle="No day closes found"
            getKey={(row) => row.id}
            rows={rows.dayCloses}
          />
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        subtitle="Search past records and correct the entries that matter."
        title="History"
      />

      {isCashier && (
        <p className="admin-note">
          You can see only the sales, debt payments and day closes recorded
          under your account.
        </p>
      )}

      {isAuditor && (
        <p className="admin-note">
          You have read-only access to every record type in the register.
        </p>
      )}

      <Tabs
        label="Record type"
        onChange={(id) => setSelectedTab(id as HistoryTab)}
        tabs={visibleTabs}
        value={activeTab}
      />

      <div className="admin-form">
        <Panel
          subtitle="Filter by text, staff, reference, or exact date."
          title="Filters"
        >
          <div className="field-grid">
            <Field label="Search">
              <AppInput
                aria-label="Search history"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ticket, item, customer, or note"
                type="search"
                value={query}
              />
            </Field>
            <Field label="Date">
              <AppDatePicker
                aria-label="Filter by date"
                value={date}
                onValueChange={setDate}
              />
            </Field>
          </div>
        </Panel>

        {canManage && editForm && (
          <Panel
            subtitle="Correct the selected record, then save your changes."
            title="Edit record"
          >
            <form
              className="admin-form"
              onSubmit={handleSubmit(handleEditSubmit)}
            >
              <div className="field-grid">
                <Field label="Date" error={errors.date?.message}>
                  <FormDatePicker
                    control={control}
                    isRequired
                    label="Record date"
                    name="date"
                  />
                </Field>

                {editForm.type === 'sales' && (
                  <>
                    <Field
                      label="Amount paid"
                      error={errors.amountPaid?.message}
                    >
                      <AppInput
                        aria-label="Sale amount paid"
                        min="0"
                        step="0.01"
                        type="number"
                        {...register('amountPaid')}
                      />
                    </Field>
                    <Field label="Status" error={errors.status?.message}>
                      <FormSelect
                        control={control}
                        label="Sale status"
                        name="status"
                        options={ORDER_STATUS_OPTIONS}
                      />
                    </Field>
                  </>
                )}

                {editForm.type === 'debtPayments' && (
                  <>
                    <Field label="Amount" error={errors.amount?.message}>
                      <AppInput
                        aria-label="Debt payment amount"
                        min="0.01"
                        step="0.01"
                        type="number"
                        {...register('amount')}
                      />
                    </Field>
                    <Field label="Method" error={errors.method?.message}>
                      <FormSelect
                        control={control}
                        label="Debt payment method"
                        name="method"
                        options={PAY_METHOD_OPTIONS}
                      />
                    </Field>
                    <Field label="Reference" error={errors.reference?.message}>
                      <AppInput
                        aria-label="Debt payment reference"
                        type="text"
                        {...register('reference')}
                      />
                    </Field>
                  </>
                )}

                {editForm.type === 'expenses' && (
                  <>
                    <Field label="Category" error={errors.category?.message}>
                      <AppInput
                        aria-label="Expense category"
                        type="text"
                        {...register('category')}
                      />
                    </Field>
                    <Field
                      label="Description"
                      error={errors.description?.message}
                    >
                      <AppInput
                        aria-label="Expense description"
                        type="text"
                        {...register('description')}
                      />
                    </Field>
                    <Field label="Amount" error={errors.amount?.message}>
                      <AppInput
                        aria-label="Expense amount"
                        min="0.01"
                        step="0.01"
                        type="number"
                        {...register('amount')}
                      />
                    </Field>
                    <Field label="Method" error={errors.method?.message}>
                      <FormSelect
                        control={control}
                        label="Expense method"
                        name="method"
                        options={PAY_METHOD_OPTIONS}
                      />
                    </Field>
                  </>
                )}
              </div>

              <FormActions
                onSecondary={() => {
                  setEditForm(null);
                  reset();
                }}
                secondaryLabel="Cancel"
                submitLabel="Save changes"
              />
            </form>
          </Panel>
        )}

        <Panel
          subtitle="Records matching the current filters, newest first."
          title={`${visibleTabs.find((tab) => tab.id === activeTab)?.label ?? 'Record'} history`}
        >
          {renderTable()}
        </Panel>
      </div>
    </DashboardLayout>
  );
};

export default History;
