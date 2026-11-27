import { useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { DashboardLayout } from 'layouts';
import {
  AppCheckbox,
  AppInput,
  EmptyState,
  Field,
  FormActions,
  FormDatePicker,
  FormSelect,
  PageHeader,
  Panel,
  RecordTable,
  SidePanel,
  StatGrid,
  StatTile,
  Tabs,
} from 'components';
import { useConfirm, useStore } from 'context';
import {
  deliverySchema,
  inventoryItemSchema,
  lossSchema,
  stockCountSchema,
  type DeliveryValues,
  type InventoryItemValues,
  type LossValues,
  type StockCountValues,
} from 'schemas/forms';
import { dateKey } from 'store/seed';
import type {
  Delivery,
  Department,
  InventoryItem,
  LossRecord,
  StockCount,
} from 'types/store';
import { formatNaira } from 'utils/format';
import {
  allocationForVendor,
  availablePortions,
  roundMoney,
  stockLevels,
  stockValue,
  vendorBalance,
} from 'utils/finance';

const DEPARTMENTS: Department[] = ['Restaurant', 'Bar', 'Snooker', 'Viewing'];
const DEPARTMENT_TABS: { id: string; label: string }[] = [
  { id: 'All', label: 'All' },
  ...DEPARTMENTS.map((name) => ({ id: name, label: name })),
];
const DEPARTMENT_OPTIONS = DEPARTMENTS.map((name) => ({
  key: name,
  label: name,
}));
const LOSS_TYPE_OPTIONS = [
  { key: 'Loss', label: 'Loss' },
  { key: 'Gain', label: 'Gain' },
];

type StockForm = 'delivery' | 'count' | 'loss' | 'item';

const signedNumber = (value: number) =>
  value > 0 ? `+${value}` : String(value);

const Stock = () => {
  const {
    data,
    currentUser,
    can,
    addDelivery,
    updateDelivery,
    deleteDelivery,
    addStockCount,
    updateStockCount,
    deleteStockCount,
    addLoss,
    updateLoss,
    deleteLoss,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  } = useStore();
  const confirmAction = useConfirm();

  const canManageInventory = can('manageInventory');
  const canManageVendors = can('manageVendors');
  const readOnly = !canManageInventory && !canManageVendors;

  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('All');
  const [lowOnly, setLowOnly] = useState(false);
  const [form, setForm] = useState<StockForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const deliveryForm = useForm<DeliveryValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      vendorId: '',
      date: dateKey(),
      item: '',
      inventoryItemId: '',
      quantity: '1',
      cost: '0',
      amountPaid: '0',
      payByDate: '',
      invoice: '',
    },
  });
  const countForm = useForm<StockCountValues>({
    resolver: zodResolver(stockCountSchema),
    defaultValues: {
      itemId: '',
      date: dateKey(),
      counted: '0',
    },
  });
  const lossForm = useForm<LossValues>({
    resolver: zodResolver(lossSchema),
    defaultValues: {
      itemId: '',
      type: 'Loss',
      date: dateKey(),
      quantity: '1',
      reason: '',
    },
  });
  const itemForm = useForm<InventoryItemValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      name: '',
      category: 'Restaurant',
      unit: '',
      openingStock: '0',
      cost: '0',
      reorderLevel: '0',
      targetLevel: '0',
    },
  });

  const syncedDeliveryItemId = useRef<string | null>(null);
  const syncedCountItemId = useRef<string | null>(null);
  const countPreviousRef = useRef(0);

  const levels = useMemo(() => stockLevels(data), [data]);
  const itemById = useMemo(
    () => new Map(data.inventory.map((item) => [item.id, item] as const)),
    [data.inventory],
  );

  const watchedDeliveryItemId = deliveryForm.watch('inventoryItemId');
  const [deliveryQuantity, deliveryCost, deliveryPaid] = deliveryForm.watch([
    'quantity',
    'cost',
    'amountPaid',
  ]);
  const watchedCountItemId = countForm.watch('itemId');
  const countCounted = countForm.watch('counted');
  const watchedLossItemId = lossForm.watch('itemId');
  const lossQuantity = lossForm.watch('quantity');

  useEffect(() => {
    if (syncedDeliveryItemId.current === watchedDeliveryItemId) {
      return;
    }
    syncedDeliveryItemId.current = watchedDeliveryItemId;
    const item = itemById.get(watchedDeliveryItemId);
    deliveryForm.setValue('item', item?.name ?? '');
    deliveryForm.setValue('cost', String(item?.cost ?? 0));
  }, [deliveryForm, itemById, watchedDeliveryItemId]);

  useEffect(() => {
    if (syncedCountItemId.current === watchedCountItemId) {
      return;
    }
    syncedCountItemId.current = watchedCountItemId;
    const previous = watchedCountItemId ? levels[watchedCountItemId] ?? 0 : 0;
    countPreviousRef.current = previous;
    countForm.setValue('counted', String(previous));
  }, [countForm, levels, watchedCountItemId]);

  const vendorOptions = [
    { key: '', label: 'Select vendor' },
    ...data.vendors.map((vendor) => ({
      key: vendor.id,
      label: vendor.name,
    })),
  ];
  const inventoryOptions = [
    { key: '', label: 'Select item' },
    ...data.inventory.map((item) => ({
      key: item.id,
      label: item.name,
    })),
  ];

  const lowStockItems = useMemo(
    () =>
      data.inventory.filter(
        (item) => (levels[item.id] ?? 0) <= item.reorderLevel,
      ),
    [data.inventory, levels],
  );

  const orderRows = useMemo(
    () =>
      lowStockItems.map((item) => {
        const onHand = levels[item.id] ?? 0;
        return {
          item,
          onHand,
          suggestion: Math.max(0, roundMoney(item.targetLevel - onHand)),
        };
      }),
    [lowStockItems, levels],
  );

  const vendorOwed = useMemo(
    () =>
      roundMoney(
        data.vendors.reduce(
          (sum, vendor) =>
            sum +
            vendorBalance(
              allocationForVendor(
                vendor.id,
                data.deliveries,
                data.vendorPayments,
              ),
            ),
          0,
        ),
      ),
    [data.vendors, data.deliveries, data.vendorPayments],
  );

  const visibleInventory = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return data.inventory.filter((item) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.name.toLowerCase().includes(normalizedQuery);
      const matchesDepartment =
        department === 'All' || item.category === department;
      const matchesLowStock =
        !lowOnly || (levels[item.id] ?? 0) <= item.reorderLevel;

      return matchesQuery && matchesDepartment && matchesLowStock;
    });
  }, [data.inventory, query, department, lowOnly, levels]);

  const deliveries = useMemo(
    () =>
      [...data.deliveries].sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.createdAt.localeCompare(a.createdAt),
      ),
    [data.deliveries],
  );
  const stockCounts = useMemo(
    () =>
      [...data.stockCounts].sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.createdAt.localeCompare(a.createdAt),
      ),
    [data.stockCounts],
  );
  const losses = useMemo(
    () =>
      [...data.losses].sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.createdAt.localeCompare(a.createdAt),
      ),
    [data.losses],
  );

  const deliveryTotal = roundMoney(
    (Number(deliveryQuantity) || 0) * (Number(deliveryCost) || 0),
  );
  const deliveryPaidAmount = Math.min(
    deliveryTotal,
    Math.max(0, Number(deliveryPaid) || 0),
  );
  const deliveryBalance = roundMoney(deliveryTotal - deliveryPaidAmount);

  const livePrevious = watchedCountItemId ? levels[watchedCountItemId] ?? 0 : 0;
  const previousLevel = editingId ? countPreviousRef.current : livePrevious;
  const countDifference = roundMoney(
    (Number(countCounted) || 0) - previousLevel,
  );
  const countValue = roundMoney(
    countDifference * (itemById.get(watchedCountItemId)?.cost ?? 0),
  );

  const lossQuantityValue = Number(lossQuantity) || 0;
  const lossValue = roundMoney(
    lossQuantityValue * (itemById.get(watchedLossItemId)?.cost ?? 0),
  );

  const vendorName = (vendorId: string) =>
    data.vendors.find((vendor) => vendor.id === vendorId)?.name ??
    'Unknown vendor';

  const portionsForItem = (itemId: string) =>
    data.menu
      .filter((menuItem) =>
        menuItem.recipe.some((part) => part.itemId === itemId),
      )
      .map((menuItem) => ({
        name: menuItem.name,
        portions: availablePortions(menuItem, levels),
      }));

  const clearForm = () => {
    setForm(null);
    setEditingId(null);
  };

  const startDelivery = (itemId?: string, suggested?: number) => {
    const item =
      (itemId ? itemById.get(itemId) : undefined) ?? data.inventory[0];
    const selectedItemId = item?.id ?? '';

    syncedDeliveryItemId.current = selectedItemId;
    deliveryForm.reset({
      vendorId: data.vendors[0]?.id ?? '',
      date: dateKey(),
      item: item?.name ?? '',
      inventoryItemId: selectedItemId,
      quantity: String(suggested ?? 1),
      cost: String(item?.cost ?? 0),
      amountPaid: '0',
      payByDate: '',
      invoice: '',
    });
    setEditingId(null);
    setForm('delivery');
  };

  const startCount = (itemId?: string) => {
    const item =
      (itemId ? itemById.get(itemId) : undefined) ?? data.inventory[0];
    const previous = item ? levels[item.id] ?? 0 : 0;
    const selectedItemId = item?.id ?? '';

    syncedCountItemId.current = selectedItemId;
    countPreviousRef.current = previous;
    countForm.reset({
      itemId: selectedItemId,
      date: dateKey(),
      counted: String(previous),
    });
    setEditingId(null);
    setForm('count');
  };

  const startLoss = (itemId?: string) => {
    const item =
      (itemId ? itemById.get(itemId) : undefined) ?? data.inventory[0];

    lossForm.reset({
      itemId: item?.id ?? '',
      type: 'Loss',
      date: dateKey(),
      quantity: '1',
      reason: '',
    });
    setEditingId(null);
    setForm('loss');
  };

  const startItem = (item?: InventoryItem) => {
    itemForm.reset({
      name: item?.name ?? '',
      category: item?.category ?? 'Restaurant',
      unit: item?.unit ?? '',
      openingStock: String(item?.openingStock ?? 0),
      cost: String(item?.cost ?? 0),
      reorderLevel: String(item?.reorderLevel ?? 0),
      targetLevel: String(item?.targetLevel ?? 0),
    });
    setEditingId(item?.id ?? null);
    setForm('item');
  };

  const editDelivery = (record: Delivery) => {
    const selectedItemId = record.inventoryItemId ?? '';

    syncedDeliveryItemId.current = selectedItemId;
    deliveryForm.reset({
      vendorId: record.vendorId,
      date: record.date,
      item: itemById.get(selectedItemId)?.name ?? record.item,
      inventoryItemId: selectedItemId,
      quantity: String(record.quantity),
      cost: String(record.cost),
      amountPaid: String(record.amountPaid),
      payByDate: record.payByDate ?? '',
      invoice: record.invoice,
    });
    setEditingId(record.id);
    setForm('delivery');
  };

  const editCount = (record: StockCount) => {
    syncedCountItemId.current = record.itemId;
    countPreviousRef.current = record.previous;
    countForm.reset({
      itemId: record.itemId,
      date: record.date,
      counted: String(record.counted),
    });
    setEditingId(record.id);
    setForm('count');
  };

  const editLoss = (record: LossRecord) => {
    lossForm.reset({
      itemId: record.itemId,
      type: record.type,
      date: record.date,
      quantity: String(record.quantity),
      reason: record.reason,
    });
    setEditingId(record.id);
    setForm('loss');
  };

  const removeDelivery = async (id: string) => {
    if (!(await confirmAction('Delete this delivery?'))) {
      return;
    }
    deleteDelivery(id);
    if (form === 'delivery' && editingId === id) {
      clearForm();
    }
  };

  const removeCount = async (id: string) => {
    if (!(await confirmAction('Delete this stock count?'))) {
      return;
    }
    deleteStockCount(id);
    if (form === 'count' && editingId === id) {
      clearForm();
    }
  };

  const removeLoss = async (id: string) => {
    if (!(await confirmAction('Delete this loss record?'))) {
      return;
    }
    deleteLoss(id);
    if (form === 'loss' && editingId === id) {
      clearForm();
    }
  };

  const removeItem = async (id: string) => {
    if (!(await confirmAction('Delete this inventory item?'))) {
      return;
    }
    deleteInventoryItem(id);
    if (form === 'item' && editingId === id) {
      clearForm();
    }
  };

  const submitDelivery = (values: DeliveryValues) => {
    if (!canManageVendors) {
      return;
    }

    const quantity = Number(values.quantity);
    const cost = Number(values.cost);
    const paid = Number(values.amountPaid);

    const input = {
      vendorId: values.vendorId,
      date: values.date || dateKey(),
      item: itemById.get(values.inventoryItemId)?.name ?? values.item,
      inventoryItemId: values.inventoryItemId,
      quantity: roundMoney(quantity),
      cost: roundMoney(cost),
      amountPaid: roundMoney(paid),
      payByDate: values.payByDate || undefined,
      invoice: values.invoice.trim(),
    };

    if (editingId) {
      updateDelivery(editingId, input);
    } else {
      addDelivery(input);
    }
    clearForm();
  };

  const submitCount = (values: StockCountValues) => {
    if (!canManageInventory) {
      return;
    }

    const counted = Number(values.counted);
    const previous = editingId
      ? countPreviousRef.current
      : levels[values.itemId] ?? 0;
    const difference = roundMoney(counted - previous);

    const input = {
      date: values.date || dateKey(),
      itemId: values.itemId,
      itemName: itemById.get(values.itemId)?.name ?? '',
      previous,
      counted: roundMoney(counted),
      difference,
      value: roundMoney(difference * (itemById.get(values.itemId)?.cost ?? 0)),
    };

    if (editingId) {
      updateStockCount(editingId, input);
    } else {
      addStockCount(input);
    }
    clearForm();
  };

  const submitLoss = (values: LossValues) => {
    if (!canManageInventory) {
      return;
    }

    const quantityValue = Number(values.quantity);

    const input = {
      date: values.date || dateKey(),
      itemId: values.itemId,
      itemName: itemById.get(values.itemId)?.name ?? '',
      quantity: roundMoney(quantityValue),
      type: values.type,
      reason: values.reason.trim(),
      value: roundMoney(
        quantityValue * (itemById.get(values.itemId)?.cost ?? 0),
      ),
    };

    if (editingId) {
      updateLoss(editingId, input);
    } else {
      addLoss(input);
    }
    clearForm();
  };

  const submitItem = (values: InventoryItemValues) => {
    if (!canManageInventory) {
      return;
    }

    const opening = Number(values.openingStock);
    const cost = Number(values.cost);
    const reorder = Number(values.reorderLevel);
    const target = Number(values.targetLevel);

    const input = {
      name: values.name.trim(),
      category: values.category,
      unit: values.unit.trim(),
      openingStock: roundMoney(opening),
      cost: roundMoney(cost),
      reorderLevel: roundMoney(reorder),
      targetLevel: roundMoney(target),
    };

    if (editingId) {
      updateInventoryItem(editingId, input);
    } else {
      addInventoryItem(input);
    }
    clearForm();
  };

  const { errors: itemErrors } = itemForm.formState;
  const { errors: deliveryErrors } = deliveryForm.formState;
  const { errors: countErrors } = countForm.formState;
  const { errors: lossErrors } = lossForm.formState;

  const itemSidePanel =
    form === 'item' && canManageInventory ? (
      <SidePanel
        label="Inventory item"
        onClose={clearForm}
        subtitle="Set the units and stock thresholds used across the app."
        title={editingId ? 'Edit inventory item' : 'Add inventory item'}
      >
        <form
          className="admin-form"
          onSubmit={itemForm.handleSubmit(submitItem)}
        >
          <div className="field-grid">
            <Field error={itemErrors.name?.message} label="Name">
              <AppInput
                aria-label="Name"
                isRequired
                type="text"
                {...itemForm.register('name')}
              />
            </Field>
            <Field error={itemErrors.category?.message} label="Category">
              <FormSelect
                control={itemForm.control}
                label="Category"
                name="category"
                options={DEPARTMENT_OPTIONS}
              />
            </Field>
            <Field error={itemErrors.unit?.message} label="Unit">
              <AppInput
                aria-label="Unit"
                isRequired
                type="text"
                {...itemForm.register('unit')}
              />
            </Field>
            <Field
              error={itemErrors.openingStock?.message}
              label="Opening stock"
            >
              <AppInput
                aria-label="Opening stock"
                min="0"
                step="0.01"
                type="number"
                {...itemForm.register('openingStock')}
              />
            </Field>
            <Field error={itemErrors.cost?.message} label="Cost">
              <AppInput
                aria-label="Cost"
                min="0"
                step="0.01"
                type="number"
                {...itemForm.register('cost')}
              />
            </Field>
            <Field
              error={itemErrors.reorderLevel?.message}
              label="Reorder level"
            >
              <AppInput
                aria-label="Reorder level"
                min="0"
                step="0.01"
                type="number"
                {...itemForm.register('reorderLevel')}
              />
            </Field>
            <Field error={itemErrors.targetLevel?.message} label="Target level">
              <AppInput
                aria-label="Target level"
                min="0"
                step="0.01"
                type="number"
                {...itemForm.register('targetLevel')}
              />
            </Field>
          </div>
          <FormActions
            onSecondary={clearForm}
            secondaryLabel="Cancel"
            submitLabel={editingId ? 'Update item' : 'Save item'}
          />
        </form>
      </SidePanel>
    ) : undefined;

  return (
    <DashboardLayout sidePanel={itemSidePanel}>
      <PageHeader
        title="Stock"
        subtitle={
          readOnly
            ? `Read-only view${currentUser ? ` for ${currentUser.role}` : ''}.`
            : 'Purchases, counts, losses and reorder needs in one place.'
        }
        actions={
          canManageInventory ? (
            <button
              className="primary-button"
              onClick={() => startItem()}
              type="button"
            >
              Add item
            </button>
          ) : undefined
        }
      />

      <StatGrid>
        <StatTile
          label="Stock value"
          value={formatNaira(stockValue(levels, data))}
          hint="At current unit cost"
        />
        <StatTile
          label="Inventory items"
          value={String(data.inventory.length)}
          hint="Tracked items"
        />
        <StatTile
          label="Low stock items"
          value={String(lowStockItems.length)}
          hint="On hand at or below reorder level"
          tone={lowStockItems.length > 0 ? 'negative' : 'positive'}
        />
        <StatTile
          label="Owed to vendors"
          value={formatNaira(vendorOwed)}
          hint="Outstanding deliveries"
          tone={vendorOwed > 0 ? 'negative' : 'default'}
        />
      </StatGrid>

      <Panel
        title="Inventory"
        subtitle="Search, filter and act on every tracked item."
      >
        <div className="admin-toolbar">
          <label className="menu-search" htmlFor="stock-search">
            <AppInput
              aria-label="Search stock items"
              id="stock-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search items"
              type="search"
              value={query}
            />
          </label>
          <AppCheckbox
            aria-label="Low stock only"
            id="low-stock-only"
            isSelected={lowOnly}
            onValueChange={setLowOnly}
          >
            Low stock only
          </AppCheckbox>
        </div>

        <Tabs
          label="Department"
          onChange={setDepartment}
          tabs={DEPARTMENT_TABS}
          value={department}
        />

        <div className="vendor-list">
          {visibleInventory.map((item) => {
            const onHand = levels[item.id] ?? 0;
            const isLow = onHand <= item.reorderLevel;
            const portions = portionsForItem(item.id);
            let progress = 0;

            if (item.targetLevel > 0) {
              progress = Math.min(
                100,
                Math.max(0, (onHand / item.targetLevel) * 100),
              );
            } else if (onHand > 0) {
              progress = 100;
            }

            return (
              <div className="stock-item" key={item.id}>
                <div className="stock-item__body">
                  <div className="stock-item__name">
                    {item.name}{' '}
                    <span
                      className={`badge ${isLow ? 'badge--bad' : 'badge--good'}`}
                    >
                      {isLow ? 'Low stock' : 'In stock'}
                    </span>
                  </div>
                  <div className="stock-item__meta">
                    {item.category} · {item.unit} · On hand {onHand} · Reorder{' '}
                    {item.reorderLevel} / target {item.targetLevel} · Unit cost{' '}
                    {formatNaira(item.cost)} · Value{' '}
                    {formatNaira(roundMoney(onHand * item.cost))}
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <div className="stock-item__meta">
                    {portions.length === 0
                      ? 'Not used in a recipe'
                      : portions.map((entry) => (
                          <span
                            className={`portion-count ${
                              entry.portions <= 0 ? 'is-low' : ''
                            }`}
                            key={entry.name}
                          >
                            {entry.name}:{' '}
                            {entry.portions === Infinity
                              ? 'Unlimited'
                              : `${entry.portions} portions`}
                          </span>
                        ))}
                  </div>
                </div>
                <div className="stock-item__actions">
                  {canManageVendors && (
                    <button
                      className="text-button"
                      onClick={() => startDelivery(item.id)}
                      type="button"
                    >
                      Buy
                    </button>
                  )}
                  {canManageInventory && (
                    <button
                      className="text-button"
                      onClick={() => startCount(item.id)}
                      type="button"
                    >
                      Count
                    </button>
                  )}
                  {canManageInventory && (
                    <button
                      className="text-button"
                      onClick={() => startLoss(item.id)}
                      type="button"
                    >
                      Loss
                    </button>
                  )}
                  {canManageInventory && (
                    <button
                      className="text-button"
                      onClick={() => startItem(item)}
                      type="button"
                    >
                      Edit
                    </button>
                  )}
                  {canManageInventory && (
                    <button
                      className="text-button"
                      onClick={() => removeItem(item.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {visibleInventory.length === 0 && (
            <EmptyState
              title="No items found"
              message="Try another name, department or filter."
            />
          )}
        </div>
      </Panel>

      <Panel
        title="Order list"
        subtitle="Top-up suggestions for items at or below reorder level."
        actions={
          canManageVendors && data.inventory.length > 0 ? (
            <button
              className="text-button"
              onClick={() => startDelivery()}
              type="button"
            >
              New delivery
            </button>
          ) : undefined
        }
      >
        <RecordTable
          columns={[
            {
              key: 'item',
              label: 'Item',
              render: (row: (typeof orderRows)[number]) => row.item.name,
            },
            {
              key: 'onHand',
              label: 'On hand',
              align: 'right',
              render: (row: (typeof orderRows)[number]) => String(row.onHand),
            },
            {
              key: 'reorder',
              label: 'Reorder',
              align: 'right',
              render: (row: (typeof orderRows)[number]) =>
                String(row.item.reorderLevel),
            },
            {
              key: 'target',
              label: 'Target',
              align: 'right',
              render: (row: (typeof orderRows)[number]) =>
                String(row.item.targetLevel),
            },
            {
              key: 'suggestion',
              label: 'Suggested',
              align: 'right',
              render: (row: (typeof orderRows)[number]) => (
                <strong className="tabular">{row.suggestion}</strong>
              ),
            },
            ...(canManageVendors
              ? [
                  {
                    key: 'buy',
                    label: '',
                    render: (row: (typeof orderRows)[number]) => (
                      <button
                        className="text-button"
                        onClick={() =>
                          startDelivery(row.item.id, row.suggestion)
                        }
                        type="button"
                      >
                        Buy
                      </button>
                    ),
                  },
                ]
              : []),
          ]}
          rows={orderRows}
          getKey={(row: (typeof orderRows)[number]) => row.item.id}
          emptyTitle="Nothing to order"
          emptyMessage="All items are above reorder level."
        />
      </Panel>

      {form === 'delivery' && canManageVendors && (
        <Panel
          title={editingId ? 'Edit delivery' : 'Record delivery'}
          subtitle="Unpaid amounts are added to the vendor balance."
        >
          <form
            className="admin-form"
            onSubmit={deliveryForm.handleSubmit(submitDelivery)}
          >
            <div className="field-grid">
              <Field error={deliveryErrors.vendorId?.message} label="Vendor">
                <FormSelect
                  control={deliveryForm.control}
                  isRequired
                  label="Vendor"
                  name="vendorId"
                  options={vendorOptions}
                  placeholder="Select vendor"
                />
              </Field>
              <Field
                error={deliveryErrors.item?.message}
                label="Inventory item"
              >
                <FormSelect
                  control={deliveryForm.control}
                  isRequired
                  label="Inventory item"
                  name="inventoryItemId"
                  options={inventoryOptions}
                  placeholder="Select item"
                />
              </Field>
              <Field error={deliveryErrors.date?.message} label="Date">
                <FormDatePicker
                  control={deliveryForm.control}
                  label="Date"
                  name="date"
                />
              </Field>
              <Field error={deliveryErrors.quantity?.message} label="Quantity">
                <AppInput
                  aria-label="Quantity"
                  isRequired
                  min="0.01"
                  step="0.01"
                  type="number"
                  {...deliveryForm.register('quantity')}
                />
              </Field>
              <Field error={deliveryErrors.cost?.message} label="Unit cost">
                <AppInput
                  aria-label="Unit cost"
                  isRequired
                  min="0"
                  step="0.01"
                  type="number"
                  {...deliveryForm.register('cost')}
                />
              </Field>
              <Field
                error={deliveryErrors.amountPaid?.message}
                hint="Enter 0 to put the full total on the vendor's account."
                label="Amount paid now"
              >
                <AppInput
                  aria-label="Amount paid now"
                  isRequired
                  min="0"
                  step="0.01"
                  type="number"
                  {...deliveryForm.register('amountPaid')}
                />
              </Field>
              <Field
                error={deliveryErrors.payByDate?.message}
                hint="Optional"
                label="Pay-by date"
              >
                <FormDatePicker
                  control={deliveryForm.control}
                  label="Pay-by date"
                  name="payByDate"
                />
              </Field>
              <Field error={deliveryErrors.invoice?.message} label="Invoice">
                <AppInput
                  aria-label="Invoice"
                  type="text"
                  {...deliveryForm.register('invoice')}
                />
              </Field>
            </div>
            <div className="metric-row">
              <span>Delivery total</span>
              <strong className="tabular">{formatNaira(deliveryTotal)}</strong>
            </div>
            <div className="metric-row">
              <span>Added to vendor balance</span>
              <strong className="tabular">
                {formatNaira(deliveryBalance)}
              </strong>
            </div>
            <FormActions
              onSecondary={clearForm}
              secondaryLabel="Cancel"
              submitLabel={editingId ? 'Update delivery' : 'Add delivery'}
            />
          </form>
        </Panel>
      )}

      {form === 'count' && canManageInventory && (
        <Panel
          title={editingId ? 'Edit stock count' : 'Record stock count'}
          subtitle="Differences adjust the on-hand level immediately."
        >
          <form
            className="admin-form"
            onSubmit={countForm.handleSubmit(submitCount)}
          >
            <div className="field-grid">
              <Field error={countErrors.itemId?.message} label="Item">
                <FormSelect
                  control={countForm.control}
                  isRequired
                  label="Item"
                  name="itemId"
                  options={inventoryOptions}
                  placeholder="Select item"
                />
              </Field>
              <Field error={countErrors.date?.message} label="Date">
                <FormDatePicker
                  control={countForm.control}
                  label="Date"
                  name="date"
                />
              </Field>
              <Field
                label="Previous level"
                hint="Calculated from stock records"
              >
                <AppInput
                  aria-label="Previous level"
                  isReadOnly
                  type="number"
                  value={String(previousLevel)}
                />
              </Field>
              <Field
                error={countErrors.counted?.message}
                label="Counted quantity"
              >
                <AppInput
                  aria-label="Counted quantity"
                  isRequired
                  min="0"
                  step="0.01"
                  type="number"
                  {...countForm.register('counted')}
                />
              </Field>
            </div>
            <div className="metric-row">
              <span>Difference</span>
              <strong className="tabular">
                {signedNumber(countDifference)}
              </strong>
            </div>
            <div className="metric-row">
              <span>Value</span>
              <strong className="tabular">{formatNaira(countValue)}</strong>
            </div>
            <FormActions
              onSecondary={clearForm}
              secondaryLabel="Cancel"
              submitLabel={editingId ? 'Update count' : 'Save count'}
            />
          </form>
        </Panel>
      )}

      {form === 'loss' && canManageInventory && (
        <Panel
          title={editingId ? 'Edit loss record' : 'Record loss or gain'}
          subtitle="Adjust stock for spoilage, breakage or corrections."
        >
          <form
            className="admin-form"
            onSubmit={lossForm.handleSubmit(submitLoss)}
          >
            <div className="field-grid">
              <Field error={lossErrors.itemId?.message} label="Item">
                <FormSelect
                  control={lossForm.control}
                  isRequired
                  label="Item"
                  name="itemId"
                  options={inventoryOptions}
                  placeholder="Select item"
                />
              </Field>
              <Field label="Type">
                <FormSelect
                  control={lossForm.control}
                  label="Type"
                  name="type"
                  options={LOSS_TYPE_OPTIONS}
                />
              </Field>
              <Field error={lossErrors.date?.message} label="Date">
                <FormDatePicker
                  control={lossForm.control}
                  label="Date"
                  name="date"
                />
              </Field>
              <Field error={lossErrors.quantity?.message} label="Quantity">
                <AppInput
                  aria-label="Quantity"
                  isRequired
                  min="0.01"
                  step="0.01"
                  type="number"
                  {...lossForm.register('quantity')}
                />
              </Field>
              <Field error={lossErrors.reason?.message} label="Reason">
                <AppInput
                  aria-label="Reason"
                  isRequired
                  type="text"
                  {...lossForm.register('reason')}
                />
              </Field>
            </div>
            <div className="metric-row">
              <span>Value</span>
              <strong className="tabular">{formatNaira(lossValue)}</strong>
            </div>
            <FormActions
              onSecondary={clearForm}
              secondaryLabel="Cancel"
              submitLabel={editingId ? 'Update record' : 'Save record'}
            />
          </form>
        </Panel>
      )}

      <Panel
        title="Deliveries"
        subtitle="Every purchase recorded against a vendor."
      >
        <RecordTable
          columns={[
            {
              key: 'date',
              label: 'Date',
              render: (row: Delivery) => row.date,
            },
            {
              key: 'vendor',
              label: 'Vendor',
              render: (row: Delivery) => vendorName(row.vendorId),
            },
            {
              key: 'item',
              label: 'Item',
              render: (row: Delivery) => row.item,
            },
            {
              key: 'quantity',
              label: 'Quantity',
              align: 'right',
              render: (row: Delivery) => String(row.quantity),
            },
            {
              key: 'cost',
              label: 'Unit cost',
              align: 'right',
              render: (row: Delivery) => formatNaira(row.cost),
            },
            {
              key: 'paid',
              label: 'Paid',
              align: 'right',
              render: (row: Delivery) => formatNaira(row.amountPaid),
            },
            {
              key: 'payByDate',
              label: 'Pay-by',
              render: (row: Delivery) => row.payByDate ?? '—',
            },
            {
              key: 'invoice',
              label: 'Invoice',
              render: (row: Delivery) => row.invoice || '—',
            },
            ...(canManageVendors
              ? [
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (row: Delivery) => (
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
                          onClick={() => removeDelivery(row.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
          rows={deliveries}
          getKey={(row) => row.id}
          emptyTitle="No deliveries"
          emptyMessage="Record a delivery once stock arrives from a vendor."
        />
      </Panel>

      <Panel
        title="Stock counts"
        subtitle="Physical counts and their adjustments."
      >
        <RecordTable
          columns={[
            {
              key: 'date',
              label: 'Date',
              render: (row: StockCount) => row.date,
            },
            {
              key: 'item',
              label: 'Item',
              render: (row: StockCount) => row.itemName,
            },
            {
              key: 'previous',
              label: 'Previous',
              align: 'right',
              render: (row: StockCount) => String(row.previous),
            },
            {
              key: 'counted',
              label: 'Counted',
              align: 'right',
              render: (row: StockCount) => String(row.counted),
            },
            {
              key: 'difference',
              label: 'Difference',
              align: 'right',
              render: (row: StockCount) => signedNumber(row.difference),
            },
            {
              key: 'value',
              label: 'Value',
              align: 'right',
              render: (row: StockCount) => formatNaira(row.value),
            },
            ...(canManageInventory
              ? [
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (row: StockCount) => (
                      <div className="stock-item__actions">
                        <button
                          className="text-button"
                          onClick={() => editCount(row)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="text-button"
                          onClick={() => removeCount(row.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
          rows={stockCounts}
          getKey={(row: StockCount) => row.id}
          emptyTitle="No stock counts"
          emptyMessage="Record a count after a physical stock check."
        />
      </Panel>

      <Panel
        title="Losses and gains"
        subtitle="Stock movements outside sales and purchases."
      >
        <RecordTable
          columns={[
            {
              key: 'date',
              label: 'Date',
              render: (row: LossRecord) => row.date,
            },
            {
              key: 'item',
              label: 'Item',
              render: (row: LossRecord) => row.itemName,
            },
            {
              key: 'type',
              label: 'Type',
              render: (row: LossRecord) => (
                <span
                  className={`badge ${row.type === 'Gain' ? 'badge--good' : 'badge--bad'}`}
                >
                  {row.type}
                </span>
              ),
            },
            {
              key: 'quantity',
              label: 'Quantity',
              align: 'right',
              render: (row: LossRecord) => String(row.quantity),
            },
            {
              key: 'reason',
              label: 'Reason',
              render: (row: LossRecord) => row.reason || '—',
            },
            {
              key: 'value',
              label: 'Value',
              align: 'right',
              render: (row: LossRecord) => formatNaira(row.value),
            },
            ...(canManageInventory
              ? [
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (row: LossRecord) => (
                      <div className="stock-item__actions">
                        <button
                          className="text-button"
                          onClick={() => editLoss(row)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="text-button"
                          onClick={() => removeLoss(row.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
          rows={losses}
          getKey={(row: LossRecord) => row.id}
          emptyTitle="No losses or gains"
          emptyMessage="Record spoilage, breakage or stock corrections here."
        />
      </Panel>
    </DashboardLayout>
  );
};

export default Stock;
