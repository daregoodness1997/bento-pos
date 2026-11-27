import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { DashboardLayout } from 'layouts';
import {
  AppInput,
  EmptyState,
  Field,
  FormActions,
  FormDatePicker,
  FormSelect,
  PageHeader,
  Panel,
  RecordTable,
  StatGrid,
  StatTile,
} from 'components';
import type { TableColumn } from 'components';
import { useConfirm, useStore } from 'context';
import {
  deliverySchema,
  vendorPaymentSchema,
  vendorSchema,
} from 'schemas/forms';
import type {
  DeliveryValues,
  VendorPaymentValues,
  VendorValues,
} from 'schemas/forms';
import { dateKey } from 'store/seed';
import type { Delivery, PayMethod, Vendor, VendorPayment } from 'types/store';
import {
  allocationForVendor,
  roundMoney,
  vendorBalance,
  vendorItemSummary,
  vendorOverdue,
  vendorStatement,
} from 'utils/finance';
import type {
  DeliveryAllocation,
  StatementRow,
  VendorItemSummary,
} from 'utils/finance';
import { formatNaira } from 'utils/format';

type DueTone = '' | 'bad' | 'warn' | 'good';

const PAY_METHODS: PayMethod[] = ['Cash', 'Transfer', 'POS'];

const createVendorForm = (): VendorValues => ({
  name: '',
  phone: '',
  supplies: '',
  termsDays: '',
});

const createDeliveryForm = (vendorId: string): DeliveryValues => ({
  vendorId,
  date: dateKey(),
  item: '',
  inventoryItemId: '',
  quantity: '',
  cost: '',
  amountPaid: '0',
  payByDate: '',
  invoice: '',
});

const createPaymentForm = (vendorId: string): VendorPaymentValues => ({
  vendorId,
  date: dateKey(),
  amount: '',
  method: 'Cash',
  reference: '',
});

const dueState = (payByDate?: string): { label: string; tone: DueTone } => {
  if (!payByDate) {
    return { label: 'No due date', tone: '' };
  }

  const soon = new Date();
  soon.setDate(soon.getDate() + 7);

  if (payByDate < dateKey()) {
    return { label: 'Overdue', tone: 'bad' };
  }

  if (payByDate <= dateKey(soon)) {
    return { label: 'Due soon', tone: 'warn' };
  }

  return { label: 'Scheduled', tone: 'good' };
};

const Vendors = () => {
  const {
    data,
    can,
    addVendor,
    updateVendor,
    deleteVendor,
    addDelivery,
    updateDelivery,
    deleteDelivery,
    addVendorPayment,
    updateVendorPayment,
    deleteVendorPayment,
  } = useStore();
  const confirmAction = useConfirm();

  const canView = can('viewVendors');
  const canManage = can('manageVendors');

  const vendorForm = useForm<VendorValues>({
    defaultValues: createVendorForm(),
    resolver: zodResolver(vendorSchema),
  });
  const deliveryForm = useForm<DeliveryValues>({
    defaultValues: createDeliveryForm(''),
    resolver: zodResolver(deliverySchema),
  });
  const paymentForm = useForm<VendorPaymentValues>({
    defaultValues: createPaymentForm(''),
    resolver: zodResolver(vendorPaymentSchema),
  });

  const { errors: vendorErrors } = vendorForm.formState;
  const { errors: deliveryErrors } = deliveryForm.formState;
  const { errors: paymentErrors } = paymentForm.formState;

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [vendorFormOpen, setVendorFormOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [deliveryFormOpen, setDeliveryFormOpen] = useState(false);
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(
    null,
  );
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const vendorRows = useMemo(
    () =>
      data.vendors
        .map((vendor) => {
          const rows = allocationForVendor(
            vendor.id,
            data.deliveries,
            data.vendorPayments,
          );
          return {
            vendor,
            rows,
            balance: vendorBalance(rows),
            overdue: vendorOverdue(rows),
          };
        })
        .sort(
          (a, b) =>
            b.balance - a.balance || a.vendor.name.localeCompare(b.vendor.name),
        ),
    [data.deliveries, data.vendorPayments, data.vendors],
  );

  const vendorOptions = vendorRows.map((row) => ({
    key: row.vendor.id,
    label: row.vendor.name,
  }));
  const inventoryOptions = data.inventory.map((item) => ({
    key: item.id,
    label: item.name,
  }));
  const payMethodOptions = PAY_METHODS.map((method) => ({
    key: method,
    label: method,
  }));

  const totals = useMemo(
    () => ({
      owed: roundMoney(vendorRows.reduce((sum, row) => sum + row.balance, 0)),
      overdue: roundMoney(
        vendorRows.reduce((sum, row) => sum + row.overdue, 0),
      ),
    }),
    [vendorRows],
  );

  const activeVendorId =
    selectedVendorId &&
    vendorRows.some((row) => row.vendor.id === selectedVendorId)
      ? selectedVendorId
      : vendorRows[0]?.vendor.id ?? null;
  const activeVendor =
    vendorRows.find((row) => row.vendor.id === activeVendorId) ?? null;

  const activeDeliveries = useMemo(
    () =>
      activeVendorId
        ? data.deliveries.filter(
            (delivery) => delivery.vendorId === activeVendorId,
          )
        : [],
    [activeVendorId, data.deliveries],
  );

  const activePayments = useMemo(
    () =>
      activeVendorId
        ? data.vendorPayments.filter(
            (payment) => payment.vendorId === activeVendorId,
          )
        : [],
    [activeVendorId, data.vendorPayments],
  );

  const deliveryHistory = useMemo(
    () =>
      activeDeliveries
        .slice()
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.createdAt.localeCompare(a.createdAt),
        ),
    [activeDeliveries],
  );

  const paymentHistory = useMemo(
    () =>
      activePayments
        .slice()
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.createdAt.localeCompare(a.createdAt),
        ),
    [activePayments],
  );

  const itemSummary = useMemo(
    () => vendorItemSummary(activeDeliveries),
    [activeDeliveries],
  );

  const statementRows = useMemo(
    () =>
      activeVendorId
        ? vendorStatement(activeVendorId, activeDeliveries, activePayments)
        : [],
    [activeDeliveries, activePayments, activeVendorId],
  );

  const unpaidRows = activeVendor?.rows.filter((row) => row.balance > 0) ?? [];

  const resetVendorForm = () => {
    vendorForm.reset(createVendorForm());
    setEditingVendorId(null);
    setVendorFormOpen(false);
  };

  const openVendorForm = () => {
    vendorForm.reset(createVendorForm());
    setEditingVendorId(null);
    setVendorFormOpen(true);
  };

  const openVendorEdit = (vendor: Vendor) => {
    vendorForm.reset({
      name: vendor.name,
      phone: vendor.phone,
      supplies: vendor.supplies,
      termsDays: vendor.termsDays === undefined ? '' : String(vendor.termsDays),
    });
    setEditingVendorId(vendor.id);
    setVendorFormOpen(true);
  };

  const resetDeliveryForm = () => {
    deliveryForm.reset(createDeliveryForm(activeVendorId ?? ''));
    setEditingDeliveryId(null);
    setDeliveryFormOpen(false);
  };

  const openDeliveryForm = () => {
    if (!activeVendorId) {
      return;
    }
    deliveryForm.reset(createDeliveryForm(activeVendorId));
    setEditingDeliveryId(null);
    setDeliveryFormOpen(true);
  };

  const editDelivery = (delivery: Delivery) => {
    deliveryForm.reset({
      vendorId: delivery.vendorId,
      date: delivery.date,
      item: delivery.item,
      inventoryItemId: delivery.inventoryItemId ?? '',
      quantity: String(delivery.quantity),
      cost: String(delivery.cost),
      amountPaid: String(delivery.amountPaid),
      payByDate: delivery.payByDate ?? '',
      invoice: delivery.invoice,
    });
    setEditingDeliveryId(delivery.id);
    setDeliveryFormOpen(true);
  };

  const resetPaymentForm = () => {
    paymentForm.reset(createPaymentForm(activeVendorId ?? ''));
    setEditingPaymentId(null);
    setPaymentFormOpen(false);
  };

  const openPaymentForm = () => {
    if (!activeVendorId) {
      return;
    }
    paymentForm.reset(createPaymentForm(activeVendorId));
    setEditingPaymentId(null);
    setPaymentFormOpen(true);
  };

  const editPayment = (payment: VendorPayment) => {
    paymentForm.reset({
      vendorId: payment.vendorId,
      date: payment.date,
      amount: String(payment.amount),
      method: payment.method,
      reference: payment.reference,
    });
    setEditingPaymentId(payment.id);
    setPaymentFormOpen(true);
  };

  const handleSelectVendor = (id: string) => {
    if (id === activeVendorId) {
      return;
    }
    setSelectedVendorId(id);
    setVendorFormOpen(false);
    setEditingVendorId(null);
    setDeliveryFormOpen(false);
    setEditingDeliveryId(null);
    setPaymentFormOpen(false);
    setEditingPaymentId(null);
  };

  const handleVendorSubmit = (values: VendorValues) => {
    if (!canManage) {
      return;
    }

    const name = values.name.trim();
    const phone = values.phone.trim();
    const supplies = values.supplies.trim();
    const termsValue = values.termsDays.trim();
    const termsDays = termsValue === '' ? undefined : Number(termsValue);

    if (editingVendorId) {
      updateVendor(editingVendorId, { phone, supplies, termsDays });
    } else {
      addVendor({ name, phone, supplies, termsDays });
    }

    resetVendorForm();
  };

  const handleDeliverySubmit = (values: DeliveryValues) => {
    if (!canManage) {
      return;
    }

    const { vendorId, date, inventoryItemId, payByDate } = values;
    const item = values.item.trim();
    const quantity = Number(values.quantity);
    const cost = Number(values.cost);
    const paidValue = values.amountPaid.trim() === '' ? '0' : values.amountPaid;
    const amountPaid = Number(paidValue);

    const total = roundMoney(quantity * cost);
    const payload = {
      vendorId,
      date,
      item,
      inventoryItemId: inventoryItemId || undefined,
      quantity,
      cost: roundMoney(cost),
      amountPaid: roundMoney(Math.min(amountPaid, total)),
      payByDate: payByDate || undefined,
      invoice: values.invoice.trim(),
    };

    if (editingDeliveryId) {
      updateDelivery(editingDeliveryId, payload);
    } else {
      addDelivery(payload);
    }

    resetDeliveryForm();
  };

  const handlePaymentSubmit = (values: VendorPaymentValues) => {
    if (!canManage) {
      return;
    }

    const { vendorId, date, method } = values;
    const rawAmount = Number(values.amount);

    const payload = {
      vendorId,
      date,
      amount: roundMoney(rawAmount),
      method,
      reference: values.reference.trim(),
    };

    if (editingPaymentId) {
      updateVendorPayment(editingPaymentId, payload);
    } else {
      addVendorPayment(payload);
    }

    resetPaymentForm();
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    if (!canManage) {
      return;
    }
    if (!(await confirmAction(`Delete vendor ${vendor.name}?`))) {
      return;
    }

    deleteVendor(vendor.id);
    if (editingVendorId === vendor.id) {
      resetVendorForm();
    }
    if (selectedVendorId === vendor.id) {
      setSelectedVendorId(null);
    }
  };

  const handleDeleteDelivery = async (delivery: Delivery) => {
    const label = delivery.invoice || delivery.item;
    if (!canManage) {
      return;
    }
    if (!(await confirmAction(`Delete delivery ${label}?`))) {
      return;
    }

    deleteDelivery(delivery.id);
    if (editingDeliveryId === delivery.id) {
      resetDeliveryForm();
    }
  };

  const handleDeletePayment = async (payment: VendorPayment) => {
    const label = payment.reference || payment.method;
    if (!canManage) {
      return;
    }
    if (!(await confirmAction(`Delete payment ${label}?`))) {
      return;
    }

    deleteVendorPayment(payment.id);
    if (editingPaymentId === payment.id) {
      resetPaymentForm();
    }
  };

  const unpaidColumns: TableColumn<DeliveryAllocation>[] = [
    {
      key: 'invoice',
      label: 'Invoice',
      render: (row) => row.delivery.invoice || '—',
    },
    {
      key: 'item',
      label: 'Item',
      render: (row) => `${row.delivery.item} × ${row.delivery.quantity}`,
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (row) =>
        formatNaira(roundMoney(row.delivery.quantity * row.delivery.cost)),
    },
    {
      key: 'allocated',
      label: 'Paid',
      align: 'right',
      render: (row) => formatNaira(roundMoney(row.allocated)),
    },
    {
      key: 'balance',
      label: 'Balance',
      align: 'right',
      render: (row) => formatNaira(row.balance),
    },
    {
      key: 'due',
      label: 'Pay by',
      render: (row) => {
        const due = dueState(row.delivery.payByDate);
        const badgeClass = due.tone ? `badge badge--${due.tone}` : 'badge';
        return (
          <div>
            <span>{row.delivery.payByDate ?? '—'}</span>
            <div>
              <span className={badgeClass}>{due.label}</span>
            </div>
          </div>
        );
      },
    },
  ];

  const itemColumns: TableColumn<VendorItemSummary>[] = [
    { key: 'item', label: 'Item' },
    { key: 'quantity', label: 'Quantity', align: 'right' },
    {
      key: 'spend',
      label: 'Spend',
      align: 'right',
      render: (row) => formatNaira(roundMoney(row.spend)),
    },
    {
      key: 'lastPrice',
      label: 'Last price',
      align: 'right',
      render: (row) => formatNaira(row.lastPrice),
    },
    { key: 'lastDate', label: 'Last delivery' },
  ];

  const deliveryColumns: TableColumn<Delivery>[] = [
    { key: 'date', label: 'Date', render: (row) => row.date },
    {
      key: 'invoice',
      label: 'Invoice',
      render: (row) => row.invoice || '—',
    },
    {
      key: 'item',
      label: 'Item',
      render: (row) => `${row.item} × ${row.quantity}`,
    },
    {
      key: 'cost',
      label: 'Unit cost',
      align: 'right',
      render: (row) => formatNaira(row.cost),
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (row) => formatNaira(roundMoney(row.quantity * row.cost)),
    },
    {
      key: 'paid',
      label: 'Paid',
      align: 'right',
      render: (row) => formatNaira(roundMoney(row.amountPaid)),
    },
    {
      key: 'payBy',
      label: 'Pay by',
      render: (row) => row.payByDate ?? '—',
    },
  ];

  if (canManage) {
    deliveryColumns.push({
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="stock-item__actions">
          <button
            className="text-button"
            onClick={() => editDelivery(row)}
            type="button"
          >
            Edit
          </button>
          <button
            className="text-button"
            onClick={() => handleDeleteDelivery(row)}
            type="button"
          >
            Delete
          </button>
        </div>
      ),
    });
  }

  const paymentColumns: TableColumn<VendorPayment>[] = [
    { key: 'date', label: 'Date', render: (row) => row.date },
    { key: 'method', label: 'Method' },
    {
      key: 'reference',
      label: 'Reference',
      render: (row) => row.reference || '—',
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (row) => formatNaira(row.amount),
    },
  ];

  if (canManage) {
    paymentColumns.push({
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="stock-item__actions">
          <button
            className="text-button"
            onClick={() => editPayment(row)}
            type="button"
          >
            Edit
          </button>
          <button
            className="text-button"
            onClick={() => handleDeletePayment(row)}
            type="button"
          >
            Delete
          </button>
        </div>
      ),
    });
  }

  const statementColumns: TableColumn<StatementRow>[] = [
    { key: 'date', label: 'Date', render: (row) => row.date },
    { key: 'description', label: 'Description' },
    {
      key: 'debit',
      label: 'Debit',
      align: 'right',
      render: (row) => formatNaira(row.debit),
    },
    {
      key: 'credit',
      label: 'Credit',
      align: 'right',
      render: (row) => formatNaira(row.credit),
    },
    {
      key: 'balance',
      label: 'Balance',
      align: 'right',
      render: (row) => formatNaira(row.balance),
    },
  ];

  const vendorFormPanel =
    canManage && vendorFormOpen ? (
      <Panel
        title={editingVendorId ? 'Edit vendor' : 'Add vendor'}
        subtitle={
          editingVendorId
            ? 'Update contact details and payment terms.'
            : 'Vendor names are permanent once saved.'
        }
      >
        <form
          className="admin-form"
          onSubmit={vendorForm.handleSubmit(handleVendorSubmit)}
        >
          <div className="field-grid">
            <Field
              error={vendorErrors.name?.message}
              label="Vendor name"
              hint={
                editingVendorId
                  ? 'Names cannot be changed after creation.'
                  : undefined
              }
            >
              <AppInput
                aria-label="Vendor name"
                isDisabled={Boolean(editingVendorId)}
                isRequired={!editingVendorId}
                type="text"
                {...vendorForm.register('name')}
              />
            </Field>
            <Field error={vendorErrors.phone?.message} label="Phone">
              <AppInput
                aria-label="Vendor phone"
                isRequired
                type="tel"
                {...vendorForm.register('phone')}
              />
            </Field>
            <Field error={vendorErrors.supplies?.message} label="Supplies">
              <AppInput
                aria-label="Vendor supplies"
                type="text"
                {...vendorForm.register('supplies')}
              />
            </Field>
            <Field error={vendorErrors.termsDays?.message} label="Terms (days)">
              <AppInput
                aria-label="Payment terms in days"
                min="0"
                step="1"
                type="number"
                {...vendorForm.register('termsDays')}
              />
            </Field>
          </div>
          <FormActions
            submitLabel={editingVendorId ? 'Save vendor' : 'Add vendor'}
            secondaryLabel="Cancel"
            onSecondary={resetVendorForm}
          />
        </form>
      </Panel>
    ) : null;

  if (!canView) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Vendors"
          subtitle="Supplier accounts, deliveries, and payment terms."
        />
        <Panel title="Access restricted">
          <EmptyState
            title="Vendors unavailable"
            message="Your role does not include access to vendor records."
          />
        </Panel>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Vendors"
        subtitle="Supplier accounts, deliveries, and payment terms."
        actions={
          canManage ? (
            <button
              className="primary-button"
              onClick={openVendorForm}
              type="button"
            >
              Add vendor
            </button>
          ) : undefined
        }
      />

      <StatGrid>
        <StatTile
          hint="Across all vendors"
          label="Total owed"
          value={formatNaira(totals.owed)}
        />
        <StatTile
          hint="Past pay-by date"
          label="Overdue"
          tone={totals.overdue > 0 ? 'negative' : 'default'}
          value={formatNaira(totals.overdue)}
        />
        <StatTile
          hint="Supplier records"
          label="Vendors"
          value={String(vendorRows.length)}
        />
      </StatGrid>

      <div className="split-layout">
        <div className="admin-form">
          <Panel title="All vendors" subtitle="Sorted by outstanding balance.">
            {vendorRows.length === 0 ? (
              <>
                <EmptyState
                  title="No vendors yet"
                  message={
                    canManage
                      ? 'Add a vendor to start tracking deliveries and payments.'
                      : 'No vendor records are available.'
                  }
                />
                {canManage && (
                  <div className="form-actions">
                    <button
                      className="primary-button"
                      onClick={openVendorForm}
                      type="button"
                    >
                      Add vendor
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="vendor-list">
                {vendorRows.map((row) => (
                  <button
                    className={`vendor-row${
                      row.vendor.id === activeVendorId ? ' is-active' : ''
                    }`}
                    key={row.vendor.id}
                    onClick={() => handleSelectVendor(row.vendor.id)}
                    type="button"
                  >
                    <span>
                      <strong>{row.vendor.name}</strong>
                      <span>{row.vendor.supplies || 'General supplies'}</span>
                    </span>
                    <span className="vendor-row__balance">
                      <strong className="tabular">
                        {formatNaira(row.balance)}
                      </strong>
                      <span>
                        {row.overdue > 0
                          ? `${formatNaira(row.overdue)} overdue`
                          : 'No overdue balance'}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Panel>
          {vendorFormPanel}
        </div>

        {activeVendor ? (
          <Panel
            title={activeVendor.vendor.name}
            subtitle="Account activity and running balance."
            actions={
              canManage ? (
                <>
                  <button
                    className="text-button"
                    onClick={() => openVendorEdit(activeVendor.vendor)}
                    type="button"
                  >
                    Edit vendor
                  </button>
                  <button
                    className="text-button"
                    onClick={() => handleDeleteVendor(activeVendor.vendor)}
                    type="button"
                  >
                    Delete vendor
                  </button>
                </>
              ) : undefined
            }
          >
            <div className="form-card">
              <div className="metric-row">
                <span>Balance owed</span>
                <strong className="tabular">
                  {formatNaira(activeVendor.balance)}
                </strong>
              </div>
              <div className="metric-row">
                <span>Overdue amount</span>
                <strong className="tabular">
                  {formatNaira(activeVendor.overdue)}
                </strong>
              </div>
              <div className="metric-row">
                <span>Phone</span>
                <strong>{activeVendor.vendor.phone || '—'}</strong>
              </div>
              <div className="metric-row">
                <span>Supplies</span>
                <strong>{activeVendor.vendor.supplies || '—'}</strong>
              </div>
              <div className="metric-row">
                <span>Payment terms</span>
                <strong>
                  {activeVendor.vendor.termsDays === undefined
                    ? 'Not set'
                    : `${activeVendor.vendor.termsDays} days`}
                </strong>
              </div>
            </div>

            {canManage && (
              <div className="panel-actions">
                <button
                  className="secondary-button"
                  onClick={openDeliveryForm}
                  type="button"
                >
                  Record delivery
                </button>
                <button
                  className="secondary-button"
                  onClick={openPaymentForm}
                  type="button"
                >
                  Pay vendor
                </button>
              </div>
            )}

            {canManage && deliveryFormOpen && (
              <div className="form-card">
                <h3 className="panel-title">
                  {editingDeliveryId ? 'Edit delivery' : 'Record delivery'}
                </h3>
                <p className="panel-subtitle">
                  The unpaid balance clears against the oldest delivery first.
                </p>
                <form
                  className="admin-form"
                  onSubmit={deliveryForm.handleSubmit(handleDeliverySubmit)}
                >
                  <div className="field-grid">
                    <Field
                      error={deliveryErrors.vendorId?.message}
                      label="Vendor"
                    >
                      <FormSelect
                        control={deliveryForm.control}
                        isRequired
                        label="Delivery vendor"
                        name="vendorId"
                        options={vendorOptions}
                      />
                    </Field>
                    <Field
                      error={deliveryErrors.date?.message}
                      label="Delivery date"
                    >
                      <FormDatePicker
                        control={deliveryForm.control}
                        isRequired
                        label="Delivery date"
                        name="date"
                      />
                    </Field>
                    <Field error={deliveryErrors.item?.message} label="Item">
                      <AppInput
                        aria-label="Delivery item"
                        isRequired
                        type="text"
                        {...deliveryForm.register('item')}
                      />
                    </Field>
                    <Field label="Linked inventory item">
                      <FormSelect
                        control={deliveryForm.control}
                        label="Linked inventory item"
                        name="inventoryItemId"
                        options={[
                          { key: '', label: 'Not linked' },
                          ...inventoryOptions,
                        ]}
                        placeholder="Not linked"
                      />
                    </Field>
                    <Field
                      error={deliveryErrors.quantity?.message}
                      label="Quantity"
                    >
                      <AppInput
                        aria-label="Delivery quantity"
                        isRequired
                        min="0.01"
                        step="any"
                        type="number"
                        {...deliveryForm.register('quantity')}
                      />
                    </Field>
                    <Field
                      error={deliveryErrors.cost?.message}
                      label="Cost per unit"
                    >
                      <AppInput
                        aria-label="Delivery cost per unit"
                        isRequired
                        min="0.01"
                        step="0.01"
                        type="number"
                        {...deliveryForm.register('cost')}
                      />
                    </Field>
                    <Field
                      error={deliveryErrors.amountPaid?.message}
                      label="Amount paid now"
                      hint="Leave as 0 if unpaid."
                    >
                      <AppInput
                        aria-label="Amount paid on delivery"
                        min="0"
                        step="0.01"
                        type="number"
                        {...deliveryForm.register('amountPaid')}
                      />
                    </Field>
                    <Field
                      error={deliveryErrors.payByDate?.message}
                      label="Pay-by date"
                    >
                      <FormDatePicker
                        control={deliveryForm.control}
                        label="Delivery pay-by date"
                        name="payByDate"
                      />
                    </Field>
                    <Field label="Invoice">
                      <AppInput
                        aria-label="Delivery invoice"
                        type="text"
                        {...deliveryForm.register('invoice')}
                      />
                    </Field>
                  </div>
                  <FormActions
                    submitLabel={
                      editingDeliveryId ? 'Save delivery' : 'Record delivery'
                    }
                    secondaryLabel="Cancel"
                    onSecondary={resetDeliveryForm}
                  />
                </form>
              </div>
            )}

            {canManage && paymentFormOpen && (
              <div className="form-card">
                <h3 className="panel-title">
                  {editingPaymentId ? 'Edit vendor payment' : 'Pay vendor'}
                </h3>
                <p className="panel-subtitle">
                  Payments clear the oldest unpaid deliveries first.
                </p>
                <form
                  className="admin-form"
                  onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)}
                >
                  <div className="field-grid">
                    <Field
                      error={paymentErrors.vendorId?.message}
                      label="Vendor"
                    >
                      <FormSelect
                        control={paymentForm.control}
                        isRequired
                        label="Payment vendor"
                        name="vendorId"
                        options={vendorOptions}
                      />
                    </Field>
                    <Field
                      error={paymentErrors.date?.message}
                      label="Payment date"
                    >
                      <FormDatePicker
                        control={paymentForm.control}
                        isRequired
                        label="Payment date"
                        name="date"
                      />
                    </Field>
                    <Field error={paymentErrors.amount?.message} label="Amount">
                      <AppInput
                        aria-label="Payment amount"
                        isRequired
                        min="0.01"
                        step="0.01"
                        type="number"
                        {...paymentForm.register('amount')}
                      />
                    </Field>
                    <Field error={paymentErrors.method?.message} label="Method">
                      <FormSelect
                        control={paymentForm.control}
                        label="Payment method"
                        name="method"
                        options={payMethodOptions}
                      />
                    </Field>
                    <Field label="Reference">
                      <AppInput
                        aria-label="Payment reference"
                        type="text"
                        {...paymentForm.register('reference')}
                      />
                    </Field>
                  </div>
                  <FormActions
                    submitLabel={
                      editingPaymentId ? 'Save payment' : 'Record payment'
                    }
                    secondaryLabel="Cancel"
                    onSecondary={resetPaymentForm}
                  />
                </form>
              </div>
            )}

            <div className="form-card">
              <h3 className="panel-title">Unpaid deliveries</h3>
              <p className="panel-subtitle">
                Outstanding invoices with their due status.
              </p>
              <RecordTable
                columns={unpaidColumns}
                emptyMessage="Every delivery for this vendor is fully paid."
                emptyTitle="Nothing outstanding"
                getKey={(row) => row.delivery.id}
                rows={unpaidRows}
              />
            </div>

            <div className="form-card">
              <h3 className="panel-title">Items supplied</h3>
              <p className="panel-subtitle">
                Total quantity, spend, and most recent unit price.
              </p>
              <RecordTable
                columns={itemColumns}
                emptyMessage="Record a delivery to see supply totals."
                emptyTitle="No items yet"
                getKey={(row) => row.item}
                rows={itemSummary}
              />
            </div>

            <div className="form-card">
              <h3 className="panel-title">Delivery history</h3>
              <p className="panel-subtitle">
                All deliveries recorded for this vendor.
              </p>
              <RecordTable
                columns={deliveryColumns}
                emptyMessage="No deliveries have been recorded yet."
                emptyTitle="No deliveries"
                getKey={(row) => row.id}
                rows={deliveryHistory}
              />
            </div>

            <div className="form-card">
              <h3 className="panel-title">Payment history</h3>
              <p className="panel-subtitle">
                All payments made directly to this vendor.
              </p>
              <RecordTable
                columns={paymentColumns}
                emptyMessage="No direct payments have been recorded yet."
                emptyTitle="No payments"
                getKey={(row) => row.id}
                rows={paymentHistory}
              />
            </div>

            <div className="form-card">
              <h3 className="panel-title">Statement</h3>
              <p className="panel-subtitle">
                Every debit and credit with a running balance.
              </p>
              <RecordTable
                columns={statementColumns}
                emptyMessage="Deliveries and payments will appear here."
                emptyTitle="Empty statement"
                getKey={(row) => row.id}
                rows={statementRows}
              />
            </div>
          </Panel>
        ) : (
          <Panel
            title="Vendor details"
            subtitle="Select a vendor to review its account."
          >
            <EmptyState
              title="No vendor selected"
              message="Choose a vendor from the list to see balances and statements."
            />
          </Panel>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Vendors;
