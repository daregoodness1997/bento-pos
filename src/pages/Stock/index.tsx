import React, { useMemo, useState } from 'react';

import { DashboardLayout } from 'layouts';
import {
  EmptyState,
  Field,
  FormActions,
  PageHeader,
  Panel,
  RecordTable,
  SidePanel,
  StatGrid,
  StatTile,
  Tabs,
} from 'components';
import { useStore } from 'context';
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

  const canManageInventory = can('manageInventory');
  const canManageVendors = can('manageVendors');
  const readOnly = !canManageInventory && !canManageVendors;

  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('All');
  const [lowOnly, setLowOnly] = useState(false);
  const [form, setForm] = useState<StockForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [deliveryVendorId, setDeliveryVendorId] = useState('');
  const [deliveryItemId, setDeliveryItemId] = useState('');
  const [deliveryItemName, setDeliveryItemName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(dateKey());
  const [deliveryQuantity, setDeliveryQuantity] = useState('1');
  const [deliveryCost, setDeliveryCost] = useState('0');
  const [deliveryPaid, setDeliveryPaid] = useState('0');
  const [deliveryPayBy, setDeliveryPayBy] = useState('');
  const [deliveryInvoice, setDeliveryInvoice] = useState('');

  const [countItemId, setCountItemId] = useState('');
  const [countDate, setCountDate] = useState(dateKey());
  const [countPrevious, setCountPrevious] = useState(0);
  const [countCounted, setCountCounted] = useState('0');

  const [lossItemId, setLossItemId] = useState('');
  const [lossDate, setLossDate] = useState(dateKey());
  const [lossType, setLossType] = useState<'Loss' | 'Gain'>('Loss');
  const [lossQuantity, setLossQuantity] = useState('1');
  const [lossReason, setLossReason] = useState('');

  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<Department>('Restaurant');
  const [itemUnit, setItemUnit] = useState('');
  const [itemOpening, setItemOpening] = useState('0');
  const [itemCost, setItemCost] = useState('0');
  const [itemReorder, setItemReorder] = useState('0');
  const [itemTarget, setItemTarget] = useState('0');

  const levels = useMemo(() => stockLevels(data), [data]);
  const itemById = useMemo(
    () => new Map(data.inventory.map((item) => [item.id, item] as const)),
    [data.inventory],
  );

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
  const deliveryPaidAmount = Math.max(0, Number(deliveryPaid) || 0);
  const deliveryBalance = Math.max(
    0,
    roundMoney(deliveryTotal - deliveryPaidAmount),
  );

  const countDifference = roundMoney(
    (Number(countCounted) || 0) - countPrevious,
  );
  const countValue = roundMoney(
    countDifference * (itemById.get(countItemId)?.cost ?? 0),
  );

  const lossQuantityValue = Number(lossQuantity) || 0;
  const lossValue = roundMoney(
    lossQuantityValue * (itemById.get(lossItemId)?.cost ?? 0),
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

    setDeliveryVendorId(data.vendors[0]?.id ?? '');
    setDeliveryItemId(item?.id ?? '');
    setDeliveryItemName(item?.name ?? '');
    setDeliveryDate(dateKey());
    setDeliveryQuantity(String(suggested ?? 1));
    setDeliveryCost(String(item?.cost ?? 0));
    setDeliveryPaid('0');
    setDeliveryPayBy('');
    setDeliveryInvoice('');
    setEditingId(null);
    setForm('delivery');
  };

  const startCount = (itemId?: string) => {
    const item =
      (itemId ? itemById.get(itemId) : undefined) ?? data.inventory[0];
    const previous = item ? levels[item.id] ?? 0 : 0;

    setCountItemId(item?.id ?? '');
    setCountDate(dateKey());
    setCountPrevious(previous);
    setCountCounted(String(previous));
    setEditingId(null);
    setForm('count');
  };

  const startLoss = (itemId?: string) => {
    const item =
      (itemId ? itemById.get(itemId) : undefined) ?? data.inventory[0];

    setLossItemId(item?.id ?? '');
    setLossDate(dateKey());
    setLossType('Loss');
    setLossQuantity('1');
    setLossReason('');
    setEditingId(null);
    setForm('loss');
  };

  const startItem = (item?: InventoryItem) => {
    setItemName(item?.name ?? '');
    setItemCategory(item?.category ?? 'Restaurant');
    setItemUnit(item?.unit ?? '');
    setItemOpening(String(item?.openingStock ?? 0));
    setItemCost(String(item?.cost ?? 0));
    setItemReorder(String(item?.reorderLevel ?? 0));
    setItemTarget(String(item?.targetLevel ?? 0));
    setEditingId(item?.id ?? null);
    setForm('item');
  };

  const editDelivery = (record: Delivery) => {
    setDeliveryVendorId(record.vendorId);
    setDeliveryItemId(record.inventoryItemId ?? '');
    setDeliveryItemName(record.item);
    setDeliveryDate(record.date);
    setDeliveryQuantity(String(record.quantity));
    setDeliveryCost(String(record.cost));
    setDeliveryPaid(String(record.amountPaid));
    setDeliveryPayBy(record.payByDate ?? '');
    setDeliveryInvoice(record.invoice);
    setEditingId(record.id);
    setForm('delivery');
  };

  const editCount = (record: StockCount) => {
    setCountItemId(record.itemId);
    setCountDate(record.date);
    setCountPrevious(record.previous);
    setCountCounted(String(record.counted));
    setEditingId(record.id);
    setForm('count');
  };

  const editLoss = (record: LossRecord) => {
    setLossItemId(record.itemId);
    setLossDate(record.date);
    setLossType(record.type);
    setLossQuantity(String(record.quantity));
    setLossReason(record.reason);
    setEditingId(record.id);
    setForm('loss');
  };

  const handleDeliveryItemChange = (id: string) => {
    const item = itemById.get(id);
    setDeliveryItemId(id);
    setDeliveryItemName(item?.name ?? '');
    setDeliveryCost(String(item?.cost ?? 0));
  };

  const handleCountItemChange = (id: string) => {
    const item = itemById.get(id);
    const previous = item ? levels[item.id] ?? 0 : 0;
    setCountItemId(id);
    setCountPrevious(previous);
    setCountCounted(String(previous));
  };

  const removeDelivery = (id: string) => {
    if (!window.confirm('Delete this delivery?')) {
      return;
    }
    deleteDelivery(id);
    if (form === 'delivery' && editingId === id) {
      clearForm();
    }
  };

  const removeCount = (id: string) => {
    if (!window.confirm('Delete this stock count?')) {
      return;
    }
    deleteStockCount(id);
    if (form === 'count' && editingId === id) {
      clearForm();
    }
  };

  const removeLoss = (id: string) => {
    if (!window.confirm('Delete this loss record?')) {
      return;
    }
    deleteLoss(id);
    if (form === 'loss' && editingId === id) {
      clearForm();
    }
  };

  const removeItem = (id: string) => {
    if (!window.confirm('Delete this inventory item?')) {
      return;
    }
    deleteInventoryItem(id);
    if (form === 'item' && editingId === id) {
      clearForm();
    }
  };

  const submitDelivery = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageVendors || !deliveryVendorId || !deliveryItemId) {
      return;
    }

    const input = {
      vendorId: deliveryVendorId,
      date: deliveryDate || dateKey(),
      item: itemById.get(deliveryItemId)?.name ?? deliveryItemName,
      inventoryItemId: deliveryItemId,
      quantity: Math.max(0, Number(deliveryQuantity) || 0),
      cost: Math.max(0, Number(deliveryCost) || 0),
      amountPaid: Math.max(0, Number(deliveryPaid) || 0),
      payByDate: deliveryPayBy || undefined,
      invoice: deliveryInvoice.trim(),
    };

    if (editingId) {
      updateDelivery(editingId, input);
    } else {
      addDelivery(input);
    }
    clearForm();
  };

  const submitCount = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageInventory || !countItemId) {
      return;
    }

    const input = {
      date: countDate || dateKey(),
      itemId: countItemId,
      itemName: itemById.get(countItemId)?.name ?? '',
      previous: countPrevious,
      counted: Number(countCounted) || 0,
      difference: countDifference,
      value: countValue,
    };

    if (editingId) {
      updateStockCount(editingId, input);
    } else {
      addStockCount(input);
    }
    clearForm();
  };

  const submitLoss = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageInventory || !lossItemId) {
      return;
    }

    const input = {
      date: lossDate || dateKey(),
      itemId: lossItemId,
      itemName: itemById.get(lossItemId)?.name ?? '',
      quantity: Math.max(0, lossQuantityValue),
      type: lossType,
      reason: lossReason.trim(),
      value: lossValue,
    };

    if (editingId) {
      updateLoss(editingId, input);
    } else {
      addLoss(input);
    }
    clearForm();
  };

  const submitItem = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageInventory || !itemName.trim() || !itemUnit.trim()) {
      return;
    }

    const input = {
      name: itemName.trim(),
      category: itemCategory,
      unit: itemUnit.trim(),
      openingStock: Number(itemOpening) || 0,
      cost: Math.max(0, Number(itemCost) || 0),
      reorderLevel: Math.max(0, Number(itemReorder) || 0),
      targetLevel: Math.max(0, Number(itemTarget) || 0),
    };

    if (editingId) {
      updateInventoryItem(editingId, input);
    } else {
      addInventoryItem(input);
    }
    clearForm();
  };

  const itemSidePanel =
    form === 'item' && canManageInventory ? (
      <SidePanel
        label="Inventory item"
        onClose={clearForm}
        subtitle="Set the units and stock thresholds used across the app."
        title={editingId ? 'Edit inventory item' : 'Add inventory item'}
      >
        <form className="admin-form" onSubmit={submitItem}>
          <div className="field-grid">
            <Field label="Name">
              <input
                aria-label="Name"
                onChange={(event) => setItemName(event.target.value)}
                required
                type="text"
                value={itemName}
              />
            </Field>
            <Field label="Category">
              <select
                aria-label="Category"
                onChange={(event) =>
                  setItemCategory(event.target.value as Department)
                }
                value={itemCategory}
              >
                {DEPARTMENTS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Unit">
              <input
                aria-label="Unit"
                onChange={(event) => setItemUnit(event.target.value)}
                required
                type="text"
                value={itemUnit}
              />
            </Field>
            <Field label="Opening stock">
              <input
                aria-label="Opening stock"
                onChange={(event) => setItemOpening(event.target.value)}
                step="0.01"
                type="number"
                value={itemOpening}
              />
            </Field>
            <Field label="Cost">
              <input
                aria-label="Cost"
                min="0"
                onChange={(event) => setItemCost(event.target.value)}
                step="0.01"
                type="number"
                value={itemCost}
              />
            </Field>
            <Field label="Reorder level">
              <input
                aria-label="Reorder level"
                min="0"
                onChange={(event) => setItemReorder(event.target.value)}
                step="0.01"
                type="number"
                value={itemReorder}
              />
            </Field>
            <Field label="Target level">
              <input
                aria-label="Target level"
                min="0"
                onChange={(event) => setItemTarget(event.target.value)}
                step="0.01"
                type="number"
                value={itemTarget}
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
            <input
              aria-label="Search stock items"
              id="stock-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search items"
              type="search"
              value={query}
            />
          </label>
          <label className="checklist__item" htmlFor="low-stock-only">
            <input
              checked={lowOnly}
              id="low-stock-only"
              onChange={(event) => setLowOnly(event.target.checked)}
              type="checkbox"
            />
            Low stock only
          </label>
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
          <form className="admin-form" onSubmit={submitDelivery}>
            <div className="field-grid">
              <Field label="Vendor">
                <select
                  aria-label="Vendor"
                  onChange={(event) => setDeliveryVendorId(event.target.value)}
                  required
                  value={deliveryVendorId}
                >
                  <option value="">Select vendor</option>
                  {data.vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Inventory item">
                <select
                  aria-label="Inventory item"
                  onChange={(event) =>
                    handleDeliveryItemChange(event.target.value)
                  }
                  required
                  value={deliveryItemId}
                >
                  <option value="">Select item</option>
                  {data.inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <input
                  aria-label="Date"
                  onChange={(event) => setDeliveryDate(event.target.value)}
                  type="date"
                  value={deliveryDate}
                />
              </Field>
              <Field label="Quantity">
                <input
                  aria-label="Quantity"
                  min="0"
                  onChange={(event) => setDeliveryQuantity(event.target.value)}
                  step="0.01"
                  type="number"
                  value={deliveryQuantity}
                />
              </Field>
              <Field label="Unit cost">
                <input
                  aria-label="Unit cost"
                  min="0"
                  onChange={(event) => setDeliveryCost(event.target.value)}
                  step="0.01"
                  type="number"
                  value={deliveryCost}
                />
              </Field>
              <Field
                label="Amount paid now"
                hint="Enter 0 to put the full total on the vendor's account."
              >
                <input
                  aria-label="Amount paid now"
                  min="0"
                  onChange={(event) => setDeliveryPaid(event.target.value)}
                  step="0.01"
                  type="number"
                  value={deliveryPaid}
                />
              </Field>
              <Field label="Pay-by date" hint="Optional">
                <input
                  aria-label="Pay-by date"
                  onChange={(event) => setDeliveryPayBy(event.target.value)}
                  type="date"
                  value={deliveryPayBy}
                />
              </Field>
              <Field label="Invoice">
                <input
                  aria-label="Invoice"
                  onChange={(event) => setDeliveryInvoice(event.target.value)}
                  type="text"
                  value={deliveryInvoice}
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
          <form className="admin-form" onSubmit={submitCount}>
            <div className="field-grid">
              <Field label="Item">
                <select
                  aria-label="Item"
                  onChange={(event) =>
                    handleCountItemChange(event.target.value)
                  }
                  required
                  value={countItemId}
                >
                  <option value="">Select item</option>
                  {data.inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <input
                  aria-label="Date"
                  onChange={(event) => setCountDate(event.target.value)}
                  type="date"
                  value={countDate}
                />
              </Field>
              <Field
                label="Previous level"
                hint="Calculated from stock records"
              >
                <input
                  aria-label="Previous level"
                  readOnly
                  type="number"
                  value={countPrevious}
                />
              </Field>
              <Field label="Counted quantity">
                <input
                  aria-label="Counted quantity"
                  onChange={(event) => setCountCounted(event.target.value)}
                  step="0.01"
                  type="number"
                  value={countCounted}
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
          <form className="admin-form" onSubmit={submitLoss}>
            <div className="field-grid">
              <Field label="Item">
                <select
                  aria-label="Item"
                  onChange={(event) => setLossItemId(event.target.value)}
                  required
                  value={lossItemId}
                >
                  <option value="">Select item</option>
                  {data.inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type">
                <select
                  aria-label="Type"
                  onChange={(event) =>
                    setLossType(event.target.value as 'Loss' | 'Gain')
                  }
                  value={lossType}
                >
                  <option value="Loss">Loss</option>
                  <option value="Gain">Gain</option>
                </select>
              </Field>
              <Field label="Date">
                <input
                  aria-label="Date"
                  onChange={(event) => setLossDate(event.target.value)}
                  type="date"
                  value={lossDate}
                />
              </Field>
              <Field label="Quantity">
                <input
                  aria-label="Quantity"
                  min="0"
                  onChange={(event) => setLossQuantity(event.target.value)}
                  step="0.01"
                  type="number"
                  value={lossQuantity}
                />
              </Field>
              <Field label="Reason">
                <input
                  aria-label="Reason"
                  onChange={(event) => setLossReason(event.target.value)}
                  type="text"
                  value={lossReason}
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
