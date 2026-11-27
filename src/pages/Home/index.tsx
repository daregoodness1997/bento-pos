import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

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
} from 'components';
import type { TableColumn } from 'components';
import { useStore } from 'context';
import { dateKey } from 'store/seed';
import type { PayMethod, SaleRecord } from 'types/store';
import {
  allocationForVendor,
  creditBalances,
  dailyReport,
  monthlyReport,
  roundMoney,
  saleProfit,
  vendorBalance,
} from 'utils/finance';
import { formatNaira } from 'utils/format';

const PAY_METHODS: PayMethod[] = ['Cash', 'Transfer', 'POS'];

interface CustomerDebtRow {
  id: string;
  name: string;
  phone: string;
  outstanding: number;
}

const greetingFor = (hour: number) => {
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
};

const sumAmounts = (values: number[]) =>
  roundMoney(values.reduce((sum, value) => sum + value, 0));

const statusBadgeClass = (status: SaleRecord['status']) => {
  if (status === 'Refunded') {
    return 'badge badge--bad';
  }
  if (status === 'Credit' || status === 'Preparing') {
    return 'badge badge--warn';
  }
  return 'badge badge--good';
};

const Home = () => {
  const { data, currentUser, can, addDebtPayment, addCustomer } = useStore();
  const navigate = useNavigate();
  const today = dateKey();

  const [collectOpen, setCollectOpen] = useState(false);
  const [customerId, setCustomerId] = useState(data.customers[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PayMethod>('Cash');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(today);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const canCollect = can('collectDebt');
  const canManageCustomers = can('manageCustomers');
  const canViewAllSales = can('viewAllSales');

  const report = useMemo(() => dailyReport(data, today), [data, today]);
  const monthReport = useMemo(
    () => monthlyReport(data, today.slice(0, 7)),
    [data, today],
  );

  const balances = useMemo(() => {
    const cashSales = sumAmounts(
      data.sales
        .filter((sale) => sale.tender === 'Cash')
        .map((sale) => sale.total),
    );
    const cashCollections = sumAmounts(
      data.debtPayments
        .filter((payment) => payment.method === 'Cash')
        .map((payment) => payment.amount),
    );
    const cashExpenses = sumAmounts(
      data.expenses
        .filter((expense) => expense.method === 'Cash')
        .map((expense) => expense.amount),
    );
    const cashVendorPayments = sumAmounts(
      data.vendorPayments
        .filter((payment) => payment.method === 'Cash')
        .map((payment) => payment.amount),
    );
    const bankSales = sumAmounts(
      data.sales
        .filter((sale) => sale.tender === 'Transfer' || sale.tender === 'POS')
        .map((sale) => sale.total),
    );
    const bankExpenses = sumAmounts(
      data.expenses
        .filter((expense) => expense.method !== 'Cash')
        .map((expense) => expense.amount),
    );
    const bankVendorPayments = sumAmounts(
      data.vendorPayments
        .filter((payment) => payment.method !== 'Cash')
        .map((payment) => payment.amount),
    );
    const customerCredit = sumAmounts(
      creditBalances(data.sales, data.debtPayments).map(
        (row) => row.outstanding,
      ),
    );
    const vendorCredit = sumAmounts(
      data.vendors.map((vendor) =>
        vendorBalance(
          allocationForVendor(vendor.id, data.deliveries, data.vendorPayments),
        ),
      ),
    );

    return {
      cash: roundMoney(
        data.settings.openingCash +
          cashSales +
          cashCollections -
          cashExpenses -
          cashVendorPayments,
      ),
      bank: roundMoney(
        data.settings.openingBank +
          bankSales -
          bankExpenses -
          bankVendorPayments,
      ),
      customers: roundMoney(
        data.settings.openingCustomerDebts + customerCredit,
      ),
      vendors: roundMoney(data.settings.openingVendorDebts + vendorCredit),
    };
  }, [
    data.debtPayments,
    data.deliveries,
    data.expenses,
    data.sales,
    data.settings,
    data.vendorPayments,
    data.vendors,
  ]);

  const customerDebtRows = useMemo(() => {
    const totals = new Map<string, number>();
    creditBalances(data.sales, data.debtPayments).forEach((row) => {
      const id = row.sale.customerId ?? 'walk-in';
      totals.set(id, roundMoney((totals.get(id) ?? 0) + row.outstanding));
    });

    return Array.from(totals, ([id, outstanding]) => {
      const customer = data.customers.find((entry) => entry.id === id);
      return {
        id,
        name: customer?.name ?? 'Walk-in customer',
        phone: customer?.phone ?? '—',
        outstanding,
      };
    })
      .filter((row) => row.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [data.customers, data.debtPayments, data.sales]);

  const recentSales = useMemo(() => {
    const sales = canViewAllSales
      ? data.sales
      : data.sales.filter((sale) => sale.staffId === currentUser?.id);

    return sales
      .slice()
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) ||
          b.date.localeCompare(a.date),
      )
      .slice(0, 8);
  }, [canViewAllSales, currentUser?.id, data.sales]);

  const debtColumns: TableColumn<CustomerDebtRow>[] = [
    { key: 'name', label: 'Customer' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'outstanding',
      label: 'Outstanding',
      align: 'right',
      render: (row) => (
        <span className="tabular">{formatNaira(row.outstanding)}</span>
      ),
    },
  ];

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
      key: 'total',
      label: 'Total',
      align: 'right',
      render: (row) => (
        <span className="tabular">{formatNaira(row.total)}</span>
      ),
    },
    {
      key: 'profit',
      label: 'Profit',
      align: 'right',
      render: (row) => (
        <span className="tabular">{formatNaira(saleProfit(row))}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={statusBadgeClass(row.status)}>{row.status}</span>
      ),
    },
  ];

  const handleCollect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCollect || !customerId) {
      return;
    }

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    addDebtPayment({
      customerId,
      amount: roundMoney(value),
      method,
      reference: reference.trim(),
      date,
    });
    setAmount('');
    setReference('');
    setDate(dateKey());
    setCollectOpen(false);
  };

  const handleAddCustomer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageCustomers) {
      return;
    }

    const name = customerName.trim();
    if (!name) {
      return;
    }

    addCustomer({ name, phone: customerPhone.trim() });
    setCustomerName('');
    setCustomerPhone('');
    setCustomerFormOpen(false);
  };

  return (
    <DashboardLayout>
      <PageHeader
        actions={
          canCollect ? (
            <button
              className="primary-button"
              onClick={() => setCollectOpen((open) => !open)}
              type="button"
            >
              {collectOpen ? 'Close form' : 'Collect'}
            </button>
          ) : undefined
        }
        subtitle={`${greetingFor(new Date().getHours())}, ${
          currentUser?.name ?? 'there'
        }. Here is how the register is doing today.`}
        title="Home"
      />

      <StatGrid>
        <StatTile
          hint={`${report.orderCount} orders today`}
          label="Sales today"
          value={formatNaira(report.totalSales)}
        />
        <StatTile
          hint={today.slice(0, 7)}
          label="Profit this month"
          tone={monthReport.profit >= 0 ? 'positive' : 'negative'}
          value={formatNaira(monthReport.profit)}
        />
        <StatTile
          hint="All-time till balance"
          label="Cash balance"
          value={formatNaira(balances.cash)}
        />
        <StatTile
          hint="All-time bank balance"
          label="Bank balance"
          value={formatNaira(balances.bank)}
        />
        <StatTile
          hint="Opening debts + credit balances"
          label="Customers owe you"
          value={formatNaira(balances.customers)}
        />
        <StatTile
          hint="Opening debts + delivery balances"
          label="You owe vendors"
          tone={balances.vendors > 0 ? 'negative' : 'default'}
          value={formatNaira(balances.vendors)}
        />
      </StatGrid>

      <div className="admin-grid admin-grid--wide">
        <div className="admin-form">
          <Panel
            actions={
              canManageCustomers ? (
                <button
                  className="text-button"
                  onClick={() => setCustomerFormOpen((open) => !open)}
                  type="button"
                >
                  {customerFormOpen ? 'Cancel' : 'Add customer'}
                </button>
              ) : undefined
            }
            subtitle="Unpaid credit sales, grouped by customer."
            title="Customers who owe you"
          >
            {customerFormOpen && canManageCustomers && (
              <form
                className="form-card admin-form"
                onSubmit={handleAddCustomer}
              >
                <div className="field-grid">
                  <Field label="Name">
                    <input
                      aria-label="Customer name"
                      onChange={(event) => setCustomerName(event.target.value)}
                      required
                      type="text"
                      value={customerName}
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      aria-label="Customer phone"
                      onChange={(event) => setCustomerPhone(event.target.value)}
                      type="tel"
                      value={customerPhone}
                    />
                  </Field>
                </div>
                <FormActions
                  onSecondary={() => setCustomerFormOpen(false)}
                  secondaryLabel="Cancel"
                  submitLabel="Add customer"
                />
              </form>
            )}

            {collectOpen && canCollect && (
              <form className="form-card admin-form" onSubmit={handleCollect}>
                <div className="field-grid">
                  <Field label="Customer">
                    <select
                      aria-label="Customer"
                      onChange={(event) => setCustomerId(event.target.value)}
                      required
                      value={customerId}
                    >
                      {data.customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Amount">
                    <input
                      aria-label="Payment amount"
                      min="0.01"
                      onChange={(event) => setAmount(event.target.value)}
                      required
                      step="0.01"
                      type="number"
                      value={amount}
                    />
                  </Field>
                  <Field label="Method">
                    <select
                      aria-label="Payment method"
                      onChange={(event) =>
                        setMethod(event.target.value as PayMethod)
                      }
                      value={method}
                    >
                      {PAY_METHODS.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Reference">
                    <input
                      aria-label="Payment reference"
                      onChange={(event) => setReference(event.target.value)}
                      type="text"
                      value={reference}
                    />
                  </Field>
                  <Field label="Date">
                    <input
                      aria-label="Payment date"
                      onChange={(event) => setDate(event.target.value)}
                      required
                      type="date"
                      value={date}
                    />
                  </Field>
                </div>
                <FormActions
                  onSecondary={() => setCollectOpen(false)}
                  secondaryLabel="Cancel"
                  submitLabel="Record payment"
                />
              </form>
            )}

            <RecordTable
              columns={debtColumns}
              emptyMessage="New credit balances will appear here once a sale is charged to a customer."
              emptyTitle="No outstanding debts"
              getKey={(row) => row.id}
              rows={customerDebtRows}
            />
          </Panel>

          {canViewAllSales && customerDebtRows.length === 0 && (
            <Panel title="All caught up">
              <EmptyState
                message="Every credit sale has been settled. Use Collect to record another payment."
                title="No customers currently owe money"
              />
            </Panel>
          )}
        </div>

        <Panel
          subtitle={
            canViewAllSales
              ? 'The latest tickets across the register.'
              : 'The latest tickets you recorded.'
          }
          title="Recent sales"
        >
          <RecordTable
            columns={salesColumns}
            emptyMessage="Sales will appear here as soon as a ticket is closed."
            emptyTitle="No recent sales"
            getKey={(row) => row.id}
            rows={recentSales}
          />
        </Panel>
      </div>
    </DashboardLayout>
  );
};

export default Home;
