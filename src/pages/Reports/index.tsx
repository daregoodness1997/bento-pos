import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { DashboardLayout } from 'layouts';
import {
  EmptyState,
  Field,
  FormActions,
  PageHeader,
  Panel,
  RecordTable,
  StatGrid,
  StatTile,
  Tabs,
} from 'components';
import type { TabItem, TableColumn } from 'components';
import { useStore } from 'context';
import { dateKey } from 'store/seed';
import type { DayClose } from 'types/store';
import { downloadCsv } from 'utils/exportCsv';
import { dailyReport, monthlyReport } from 'utils/finance';
import { formatNaira } from 'utils/format';

interface ValueRow {
  name: string;
  value: number;
}

interface ItemRow {
  name: string;
  quantity: number;
  value: number;
}

interface StaffRow {
  name: string;
  value: number;
  orders: number;
}

interface CreditRow {
  customer: string;
  amount: number;
  saleId: string;
}

interface DifferenceRow {
  date: string;
  difference: number;
}

const TABS: TabItem[] = [
  { id: 'day', label: 'End of day' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'export', label: 'Export' },
];

const roundAmount = (value: number) => Math.round(value * 100) / 100;

const parseAmount = (value: string) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? roundAmount(amount) : 0;
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const moneyOrDash = (value: number | null) =>
  value === null ? '—' : formatNaira(value);

const toneForDifference = (
  value: number | null,
): 'default' | 'positive' | 'negative' => {
  if (value === null || value === 0) {
    return 'default';
  }
  return value > 0 ? 'positive' : 'negative';
};

const badgeClassForDifference = (value: number) => {
  if (value > 0) {
    return 'badge badge--good';
  }

  if (value < 0) {
    return 'badge badge--bad';
  }

  return 'badge';
};

const valueColumns: TableColumn<ValueRow>[] = [
  { key: 'name', label: 'Name' },
  {
    key: 'value',
    label: 'Value',
    align: 'right',
    render: (row) => formatNaira(row.value),
  },
];

const itemColumns: TableColumn<ItemRow>[] = [
  { key: 'name', label: 'Item' },
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
];

const staffColumns: TableColumn<StaffRow>[] = [
  { key: 'name', label: 'Staff member' },
  {
    key: 'orders',
    label: 'Orders',
    align: 'right',
    render: (row) => String(row.orders),
  },
  {
    key: 'value',
    label: 'Sales',
    align: 'right',
    render: (row) => formatNaira(row.value),
  },
];

const creditColumns: TableColumn<CreditRow>[] = [
  { key: 'customer', label: 'Customer' },
  { key: 'saleId', label: 'Sale' },
  {
    key: 'amount',
    label: 'Outstanding',
    align: 'right',
    render: (row) => formatNaira(row.amount),
  },
];

const differenceColumns: TableColumn<DifferenceRow>[] = [
  { key: 'date', label: 'Date' },
  {
    key: 'difference',
    label: 'Difference',
    align: 'right',
    render: (row) => (
      <span className={badgeClassForDifference(row.difference)}>
        {formatNaira(row.difference)}
      </span>
    ),
  },
];

const Reports = () => {
  const {
    data,
    currentUser,
    can,
    addDayClose,
    updateDayClose,
    deleteDayClose,
  } = useStore();
  const cashierId =
    currentUser?.role === 'Cashier' ? currentUser.id : undefined;
  const isCashier = cashierId !== undefined;
  const canClose = can('dayClose');
  const today = dateKey();

  const [activeTab, setActiveTab] = useState('day');
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [countedCash, setCountedCash] = useState('');
  const [note, setNote] = useState('');
  const [editingCloseId, setEditingCloseId] = useState<string | null>(null);
  const [editCountedCash, setEditCountedCash] = useState('');
  const [editNote, setEditNote] = useState('');
  const [copied, setCopied] = useState(false);

  const report = useMemo(
    () => dailyReport(data, date, cashierId),
    [data, date, cashierId],
  );
  const monthReport = useMemo(() => monthlyReport(data, month), [data, month]);
  const closeRows = useMemo(
    () =>
      data.dayCloses
        .filter(
          (close) =>
            close.date === date && (!cashierId || close.staffId === cashierId),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.dayCloses, date, cashierId],
  );

  const summary = useMemo(() => {
    const counted = moneyOrDash(report.countedCash);
    const difference = moneyOrDash(report.difference);

    if (isCashier) {
      return [
        `Cashier report — ${report.date}`,
        `My sales: ${formatNaira(report.totalSales)}`,
        `My orders: ${report.orderCount}`,
        `My average order: ${formatNaira(report.averageOrder)}`,
        `Cash expected: ${formatNaira(report.expectedCash)}`,
        `Cash counted: ${counted}`,
        `Difference: ${difference}`,
      ].join('\n');
    }

    return [
      `End of day — ${report.date}`,
      `Total sales: ${formatNaira(report.totalSales)}`,
      `Orders: ${report.orderCount}`,
      `Average order: ${formatNaira(report.averageOrder)}`,
      `Estimated gross margin: ${formatPercent(report.grossMargin)}`,
      ...report.byTender.map(
        (row) => `${row.name} sales: ${formatNaira(row.value)}`,
      ),
      `Credit sales not yet paid: ${formatNaira(report.creditOutstanding)}`,
      `Debts collected: ${formatNaira(report.debtsCollected)}`,
      `Expenses: ${formatNaira(report.expenses)}`,
      `Payments to vendors: ${formatNaira(report.vendorPayments)}`,
      `Expected cash in till: ${formatNaira(report.expectedCash)}`,
      `Cash counted: ${counted}`,
      `Difference: ${difference}`,
    ].join('\n');
  }, [report, isCashier]);

  useEffect(() => {
    setCopied(false);
  }, [summary]);

  const countedValue =
    countedCash.trim() === '' ? null : parseAmount(countedCash);
  const liveDifference =
    countedValue === null
      ? null
      : roundAmount(countedValue - report.expectedCash);
  const editingClose =
    closeRows.find((close) => close.id === editingCloseId) ?? null;
  const editCountedValue =
    editCountedCash.trim() === '' ? null : parseAmount(editCountedCash);
  const editDifference =
    editingClose && editCountedValue !== null
      ? roundAmount(editCountedValue - editingClose.expectedCash)
      : null;

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
        <span className={badgeClassForDifference(row.difference)}>
          {formatNaira(row.difference)}
        </span>
      ),
    },
    {
      key: 'note',
      label: 'Note',
      render: (row) => row.note || '—',
    },
  ];

  if (canClose) {
    dayCloseColumns.push({
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="panel-actions">
          <button
            className="text-button"
            onClick={() => {
              setEditingCloseId(row.id);
              setEditCountedCash(String(row.countedCash));
              setEditNote(row.note);
            }}
            type="button"
          >
            Edit
          </button>
          <button
            className="text-button"
            onClick={() => {
              if (
                !window.confirm(
                  'Delete this day close record? This cannot be undone.',
                )
              ) {
                return;
              }
              deleteDayClose(row.id);
              if (editingCloseId === row.id) {
                setEditingCloseId(null);
              }
            }}
            type="button"
          >
            Delete
          </button>
        </div>
      ),
    });
  }

  const handleDateChange = (value: string) => {
    setDate(value);
    setEditingCloseId(null);
  };

  const handleCopy = () => {
    navigator.clipboard
      .writeText(summary)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  const handleAddClose = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canClose || countedValue === null) {
      return;
    }

    addDayClose({
      date,
      expectedCash: report.expectedCash,
      countedCash: countedValue,
      difference: roundAmount(countedValue - report.expectedCash),
      note: note.trim(),
      staffId: cashierId,
    });
    setCountedCash('');
    setNote('');
  };

  const handleSaveEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingClose || editCountedValue === null) {
      return;
    }

    updateDayClose(editingClose.id, {
      countedCash: editCountedValue,
      difference: roundAmount(editCountedValue - editingClose.expectedCash),
      note: editNote.trim(),
    });
    setEditingCloseId(null);
  };

  return (
    <DashboardLayout>
      <PageHeader
        subtitle="Daily performance, cash reconciliation, monthly trends, and data exports."
        title="Reports"
      />

      <Tabs
        label="Report sections"
        onChange={setActiveTab}
        tabs={TABS}
        value={activeTab}
      />

      {activeTab === 'day' && (
        <div className="admin-form">
          <Panel
            subtitle="Pick the trading day you want to review."
            title="Report date"
          >
            <div className="field-grid">
              <Field label="Date">
                <input
                  onChange={(event) => handleDateChange(event.target.value)}
                  type="date"
                  value={date}
                />
              </Field>
            </div>
          </Panel>

          {report.orderCount === 0 && (
            <Panel title="No sales recorded">
              <EmptyState
                message="Choose another date to see the full breakdown."
                title="No sales for this date"
              />
            </Panel>
          )}

          {isCashier ? (
            <>
              <Panel
                subtitle="Your register activity only."
                title="Cashier view"
              >
                <p className="admin-note">
                  This view is limited to sales and collections recorded under
                  your account. Store-wide expenses, vendor payments, all-staff
                  figures, and credit-customer breakdowns are hidden.
                </p>
              </Panel>

              <StatGrid>
                <StatTile
                  label="My sales"
                  value={formatNaira(report.totalSales)}
                />
                <StatTile label="My orders" value={String(report.orderCount)} />
                <StatTile
                  label="My average order"
                  value={formatNaira(report.averageOrder)}
                />
                <StatTile
                  label="Cash difference"
                  tone={toneForDifference(report.difference)}
                  value={moneyOrDash(report.difference)}
                />
              </StatGrid>

              <div className="admin-grid">
                <Panel
                  subtitle="Sales you recorded by tender."
                  title="My payment methods"
                >
                  <RecordTable
                    columns={valueColumns}
                    emptyMessage="Record a sale to see your tender mix."
                    emptyTitle="No payments yet"
                    getKey={(row) => row.name}
                    rows={report.byTender}
                  />
                </Panel>

                <Panel
                  subtitle="Till expectations for your own sales."
                  title="My cash reconciliation"
                >
                  <div className="metric-row">
                    <span>Cash expected</span>
                    <strong className="tabular">
                      {formatNaira(report.expectedCash)}
                    </strong>
                  </div>
                  <div className="metric-row">
                    <span>Cash counted</span>
                    <strong className="tabular">
                      {moneyOrDash(report.countedCash)}
                    </strong>
                  </div>
                  <div className="metric-row">
                    <span>Difference</span>
                    <strong className="tabular">
                      {moneyOrDash(report.difference)}
                    </strong>
                  </div>
                </Panel>
              </div>
            </>
          ) : (
            <>
              <StatGrid>
                <StatTile
                  label="Total sales"
                  value={formatNaira(report.totalSales)}
                />
                <StatTile label="Orders" value={String(report.orderCount)} />
                <StatTile
                  label="Average order"
                  value={formatNaira(report.averageOrder)}
                />
                <StatTile
                  hint="Based on item cost"
                  label="Estimated gross margin"
                  value={formatPercent(report.grossMargin)}
                />
              </StatGrid>

              <div className="admin-grid">
                <Panel title="Sales by department">
                  <RecordTable
                    columns={valueColumns}
                    emptyMessage="Department sales will appear once a sale is recorded."
                    emptyTitle="No department sales"
                    getKey={(row) => row.name}
                    rows={report.byDepartment}
                  />
                </Panel>

                <Panel
                  subtitle="Best sellers by quantity."
                  title="Top 10 items"
                >
                  <RecordTable
                    columns={itemColumns}
                    emptyMessage="Item sales will appear once a sale is recorded."
                    emptyTitle="No items sold"
                    getKey={(row) => row.name}
                    rows={report.topItems}
                  />
                </Panel>

                <Panel title="Payment method">
                  <RecordTable
                    columns={valueColumns}
                    emptyMessage="Tender totals will appear once a sale is recorded."
                    emptyTitle="No payment methods"
                    getKey={(row) => row.name}
                    rows={report.byTender}
                  />
                </Panel>

                <Panel title="Staff member">
                  <RecordTable
                    columns={staffColumns}
                    emptyMessage="Staff totals will appear once a sale is recorded."
                    emptyTitle="No staff sales"
                    getKey={(row) => row.name}
                    rows={report.byStaff}
                  />
                </Panel>

                <Panel title="Customers who bought on credit">
                  <RecordTable
                    columns={creditColumns}
                    emptyMessage="Unpaid credit sales will appear here."
                    emptyTitle="No credit customers"
                    getKey={(row) => row.saleId}
                    rows={report.creditCustomers}
                  />
                </Panel>
              </div>

              <Panel
                subtitle="Every cash and non-cash movement for this date."
                title="Cash and money movement"
              >
                <div className="metric-row">
                  <span>Cash sales</span>
                  <strong className="tabular">
                    {formatNaira(report.cashSales)}
                  </strong>
                </div>
                <div className="metric-row">
                  <span>Transfer sales</span>
                  <strong className="tabular">
                    {formatNaira(report.transferSales)}
                  </strong>
                </div>
                <div className="metric-row">
                  <span>POS sales</span>
                  <strong className="tabular">
                    {formatNaira(report.posSales)}
                  </strong>
                </div>
                <div className="metric-row">
                  <span>Credit sales not yet paid</span>
                  <strong className="tabular">
                    {formatNaira(report.creditOutstanding)}
                  </strong>
                </div>
                <div className="metric-row">
                  <span>Debts collected</span>
                  <strong className="tabular">
                    {formatNaira(report.debtsCollected)}
                  </strong>
                </div>
                <div className="metric-row">
                  <span>Expenses</span>
                  <strong className="tabular">
                    {formatNaira(report.expenses)}
                  </strong>
                </div>
                <div className="metric-row">
                  <span>Payments to vendors</span>
                  <strong className="tabular">
                    {formatNaira(report.vendorPayments)}
                  </strong>
                </div>
                <div className="metric-row">
                  <span>Expected cash in till</span>
                  <strong className="tabular">
                    {formatNaira(report.expectedCash)}
                  </strong>
                </div>
                <div className="metric-row">
                  <span>Cash counted</span>
                  <strong className="tabular">
                    {moneyOrDash(report.countedCash)}
                  </strong>
                </div>
                <div className="metric-row">
                  <span>Difference</span>
                  {report.difference === null ? (
                    <strong className="tabular">—</strong>
                  ) : (
                    <span
                      className={badgeClassForDifference(report.difference)}
                    >
                      {formatNaira(report.difference)}
                    </span>
                  )}
                </div>
              </Panel>
            </>
          )}

          <Panel
            subtitle="Record the counted cash and reconcile the till."
            title="Day close"
          >
            {canClose ? (
              <form className="admin-form" onSubmit={handleAddClose}>
                <div className="field-grid">
                  <Field hint="Must match the report date." label="Date">
                    <input
                      onChange={(event) => handleDateChange(event.target.value)}
                      type="date"
                      value={date}
                    />
                  </Field>
                  <Field label="Cash counted">
                    <input
                      min="0"
                      onChange={(event) => setCountedCash(event.target.value)}
                      step="0.01"
                      type="number"
                      value={countedCash}
                    />
                  </Field>
                  <Field label="Note">
                    <textarea
                      onChange={(event) => setNote(event.target.value)}
                      value={note}
                    />
                  </Field>
                </div>

                <div className="form-card">
                  <div className="metric-row">
                    <span>Expected cash</span>
                    <strong className="tabular">
                      {formatNaira(report.expectedCash)}
                    </strong>
                  </div>
                  <div className="metric-row">
                    <span>Live difference</span>
                    <strong className="tabular">
                      {moneyOrDash(liveDifference)}
                    </strong>
                  </div>
                </div>

                <FormActions
                  onSecondary={() => {
                    setCountedCash('');
                    setNote('');
                  }}
                  secondaryLabel="Clear"
                  submitLabel="Save day close"
                />
              </form>
            ) : (
              <p className="admin-note">
                You have view-only access to day close records.
              </p>
            )}

            <RecordTable
              columns={dayCloseColumns}
              emptyMessage="Day close records for this date will appear here."
              emptyTitle="No day close yet"
              getKey={(row) => row.id}
              rows={closeRows}
            />

            {canClose && editingClose && (
              <form className="admin-form form-card" onSubmit={handleSaveEdit}>
                <div className="field-grid">
                  <Field label="Cash counted">
                    <input
                      min="0"
                      onChange={(event) =>
                        setEditCountedCash(event.target.value)
                      }
                      step="0.01"
                      type="number"
                      value={editCountedCash}
                    />
                  </Field>
                  <Field label="Note">
                    <textarea
                      onChange={(event) => setEditNote(event.target.value)}
                      value={editNote}
                    />
                  </Field>
                </div>

                <div className="metric-row">
                  <span>Expected cash</span>
                  <strong className="tabular">
                    {formatNaira(editingClose.expectedCash)}
                  </strong>
                </div>
                <div className="metric-row">
                  <span>Live difference</span>
                  <strong className="tabular">
                    {moneyOrDash(editDifference)}
                  </strong>
                </div>

                <FormActions
                  onSecondary={() => setEditingCloseId(null)}
                  secondaryLabel="Cancel"
                  submitLabel="Save changes"
                />
              </form>
            )}
          </Panel>

          <Panel
            actions={
              <button
                className="secondary-button"
                onClick={handleCopy}
                type="button"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            }
            subtitle="Ready to paste into a handover note."
            title="Text summary"
          >
            <div className="report-summary">{summary}</div>
          </Panel>
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="admin-form">
          <Panel
            subtitle="Pick a calendar month in YYYY-MM format."
            title="Month"
          >
            <div className="field-grid">
              <Field label="Month">
                <input
                  onChange={(event) => setMonth(event.target.value)}
                  type="month"
                  value={month}
                />
              </Field>
            </div>
          </Panel>

          <StatGrid>
            <StatTile
              hint={monthReport.month}
              label="Sales"
              value={formatNaira(monthReport.sales)}
            />
            <StatTile
              hint="After expenses and stock adjustments"
              label="Profit"
              tone={monthReport.profit >= 0 ? 'positive' : 'negative'}
              value={formatNaira(monthReport.profit)}
            />
          </StatGrid>

          <div className="admin-grid">
            <Panel title="Profit by department">
              <RecordTable
                columns={valueColumns}
                emptyMessage="Department profit will appear once a sale is recorded."
                emptyTitle="No department profit"
                getKey={(row) => row.name}
                rows={monthReport.profitByDepartment}
              />
            </Panel>

            <Panel title="Sales by payment method">
              <RecordTable
                columns={valueColumns}
                emptyMessage="Tender totals will appear once a sale is recorded."
                emptyTitle="No payment methods"
                getKey={(row) => row.name}
                rows={monthReport.salesByTender}
              />
            </Panel>

            <Panel title="Day-close differences">
              <RecordTable
                columns={differenceColumns}
                emptyMessage="Recorded day closes will appear here."
                emptyTitle="No day closes"
                getKey={(row, index) => `${row.date}-${index}`}
                rows={monthReport.dayCloseDifferences}
              />
            </Panel>

            <Panel
              subtitle="Jump to another reporting period."
              title="Recent months"
            >
              <div className="vendor-list">
                {monthReport.recentMonths.map((entry) => (
                  <button
                    className={`vendor-row ${entry === month ? 'is-active' : ''}`}
                    key={entry}
                    onClick={() => setMonth(entry)}
                    type="button"
                  >
                    <span className="tabular">{entry}</span>
                    <span className="vendor-row__balance">
                      {entry === month ? 'Selected' : 'View'}
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="admin-form">
          <Panel
            subtitle="Take a complete copy of the register records."
            title="Download a CSV backup"
          >
            <p className="admin-note">
              The export includes sales, customers, vendors, deliveries, vendor
              payments, debt payments, inventory, menu, expenses, stock records,
              day closes, and the activity log. Keep the file private because it
              contains staff and customer details.
            </p>
            <div className="form-actions">
              <button
                className="primary-button"
                onClick={() => downloadCsv(data)}
                type="button"
              >
                Download CSV
              </button>
            </div>
          </Panel>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Reports;
