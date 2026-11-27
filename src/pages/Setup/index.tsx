import React, { useEffect, useMemo, useState } from 'react';

import { DashboardLayout } from 'layouts';
import {
  EmptyState,
  Field,
  FormActions,
  PageHeader,
  Panel,
  RecordTable,
  StatTile,
} from 'components';
import type { TableColumn } from 'components';
import { useStore } from 'context';
import {
  DEFAULT_INVENTORY,
  DEFAULT_MENU,
  DEFAULT_SETTINGS,
  dateKey,
} from 'store/seed';
import type {
  AppSettings,
  AppUser,
  Department,
  InventoryItem,
  MenuItem,
  MenuTone,
  RecipeLine,
  Role,
  SaleRecord,
  Vendor,
} from 'types/store';
import { formatNaira } from 'utils/format';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'balances', label: 'Opening balances' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'menu', label: 'Menu & prices' },
  { id: 'people', label: 'People & roles' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'sales', label: 'Sales' },
  { id: 'danger', label: 'Danger zone' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const DEPARTMENTS: Department[] = ['Restaurant', 'Bar', 'Snooker', 'Viewing'];
const ROLES: Role[] = ['Owner', 'Manager', 'Cashier', 'Auditor'];
const DEFAULT_PASSWORD = 'bento1234';

type AccessLevel = 'Viewer' | 'Contributor' | 'Editor';

const ROLE_ACCESS: Record<Role, { access: AccessLevel; hint: string }> = {
  Owner: {
    access: 'Editor',
    hint: 'Full control, including people and roles',
  },
  Manager: {
    access: 'Editor',
    hint: 'Manage daily operations, stock, and records',
  },
  Cashier: {
    access: 'Contributor',
    hint: 'Take payments and record sales',
  },
  Auditor: {
    access: 'Viewer',
    hint: 'Read-only access to records and reports',
  },
};

type BalanceForm = {
  storeName: string;
  openingCash: string;
  openingBank: string;
  openingCustomerDebts: string;
  openingVendorDebts: string;
};

type InventoryDraft = {
  name: string;
  category: Department;
  unit: string;
  openingStock: string;
  cost: string;
  reorderLevel: string;
  targetLevel: string;
};

type RecipeDraftLine = {
  itemId: string;
  quantity: string;
};

type MenuDraft = {
  name: string;
  department: Department;
  price: string;
  prepTime: string;
  badge: string;
  tone: MenuTone;
  recipe: RecipeDraftLine[];
};

type UserDraft = {
  name: string;
  email: string;
  role: Role;
  pin: string;
};

type ChecklistItem = {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  tab: TabId;
};

const toAmount = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const balanceFormFromSettings = (settings: AppSettings): BalanceForm => ({
  storeName: settings.storeName,
  openingCash: String(settings.openingCash),
  openingBank: String(settings.openingBank),
  openingCustomerDebts: String(settings.openingCustomerDebts),
  openingVendorDebts: String(settings.openingVendorDebts),
});

const emptyInventoryDraft = (): InventoryDraft => ({
  name: '',
  category: 'Restaurant',
  unit: '',
  openingStock: '',
  cost: '',
  reorderLevel: '',
  targetLevel: '',
});

const emptyMenuDraft = (): MenuDraft => ({
  name: '',
  department: 'Restaurant',
  price: '',
  prepTime: '',
  badge: '',
  tone: 'signal',
  recipe: [{ itemId: '', quantity: '' }],
});

const emptyUserDraft = (): UserDraft => ({
  name: '',
  email: '',
  role: 'Cashier',
  pin: '',
});

const Setup = () => {
  const {
    data,
    currentUser,
    can,
    updateSettings,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    addUser,
    updateUser,
    deleteUser,
    resetData,
    logAudit,
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [balanceForm, setBalanceForm] = useState<BalanceForm>(() =>
    balanceFormFromSettings(data.settings),
  );
  const [inventoryDraft, setInventoryDraft] =
    useState<InventoryDraft>(emptyInventoryDraft);
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(
    null,
  );
  const [menuDraft, setMenuDraft] = useState<MenuDraft>(emptyMenuDraft);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [userDraft, setUserDraft] = useState<UserDraft>(emptyUserDraft);
  const [userMessage, setUserMessage] = useState('');

  const canManageSettings = can('manageSettings');
  const canManageInventory = can('manageInventory');
  const canManageRoles = can('manageRoles');

  useEffect(() => {
    setBalanceForm(balanceFormFromSettings(data.settings));
  }, [data.settings]);

  const checklist = useMemo<ChecklistItem[]>(() => {
    const storeName = data.settings.storeName.trim();
    const balancesEntered =
      data.settings.openingCash !== DEFAULT_SETTINGS.openingCash ||
      data.settings.openingBank !== DEFAULT_SETTINGS.openingBank ||
      data.settings.openingCustomerDebts !==
        DEFAULT_SETTINGS.openingCustomerDebts ||
      data.settings.openingVendorDebts !== DEFAULT_SETTINGS.openingVendorDebts;

    return [
      {
        id: 'users',
        label: 'Users configured',
        detail: `${data.users.length} account(s) on this register`,
        done: data.users.length > 0,
        tab: 'people',
      },
      {
        id: 'store-name',
        label: 'Store name set',
        detail: storeName || 'No store name yet',
        done: storeName.length > 0 && storeName !== DEFAULT_SETTINGS.storeName,
        tab: 'balances',
      },
      {
        id: 'balances',
        label: 'Opening balances entered',
        detail: `Cash ${formatNaira(data.settings.openingCash)} · Bank ${formatNaira(data.settings.openingBank)}`,
        done: balancesEntered,
        tab: 'balances',
      },
      {
        id: 'inventory',
        label: 'Inventory item added',
        detail: `${data.inventory.length} item(s) in stock`,
        done: data.inventory.length > 0,
        tab: 'inventory',
      },
      {
        id: 'menu',
        label: 'Menu item added',
        detail: `${data.menu.length} item(s) on the menu`,
        done: data.menu.length > 0,
        tab: 'menu',
      },
      {
        id: 'vendors',
        label: 'Vendor added',
        detail: `${data.vendors.length} vendor(s) available`,
        done: data.vendors.length > 0,
        tab: 'vendors',
      },
      {
        id: 'sales',
        label: 'Sale recorded',
        detail: `${data.sales.length} sale(s) in history`,
        done: data.sales.length > 0,
        tab: 'sales',
      },
    ];
  }, [data]);

  const completedSteps = checklist.filter((item) => item.done).length;
  const progress = Math.round((completedSteps / checklist.length) * 100);

  const missingSampleCount = useMemo(() => {
    const inventoryIds = new Set(data.inventory.map((item) => item.id));
    const menuIds = new Set(data.menu.map((item) => item.id));
    return (
      DEFAULT_INVENTORY.filter((item) => !inventoryIds.has(item.id)).length +
      DEFAULT_MENU.filter((item) => !menuIds.has(item.id)).length
    );
  }, [data.inventory, data.menu]);

  const inventoryNames = useMemo(
    () => new Map(data.inventory.map((item) => [item.id, item.name])),
    [data.inventory],
  );

  const setBalanceField = (field: keyof BalanceForm, value: string) => {
    setBalanceForm((current) => ({ ...current, [field]: value }));
  };

  const setInventoryField = (
    field: Exclude<keyof InventoryDraft, 'category'>,
    value: string,
  ) => {
    setInventoryDraft((current) => ({ ...current, [field]: value }));
  };

  const setMenuField = (
    field: Exclude<keyof MenuDraft, 'department' | 'tone' | 'recipe'>,
    value: string,
  ) => {
    setMenuDraft((current) => ({ ...current, [field]: value }));
  };

  const setUserField = (
    field: Exclude<keyof UserDraft, 'role'>,
    value: string,
  ) => {
    setUserDraft((current) => ({ ...current, [field]: value }));
  };

  const handleBalanceSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageSettings) {
      return;
    }
    updateSettings({
      storeName: balanceForm.storeName.trim(),
      openingCash: toAmount(balanceForm.openingCash),
      openingBank: toAmount(balanceForm.openingBank),
      openingCustomerDebts: toAmount(balanceForm.openingCustomerDebts),
      openingVendorDebts: toAmount(balanceForm.openingVendorDebts),
    });
  };

  const resetInventoryDraft = () => {
    setEditingInventoryId(null);
    setInventoryDraft(emptyInventoryDraft());
  };

  const startInventoryEdit = (item: InventoryItem) => {
    if (!canManageInventory) {
      return;
    }
    setEditingInventoryId(item.id);
    setInventoryDraft({
      name: item.name,
      category: item.category,
      unit: item.unit,
      openingStock: String(item.openingStock),
      cost: String(item.cost),
      reorderLevel: String(item.reorderLevel),
      targetLevel: String(item.targetLevel),
    });
  };

  const handleInventorySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageInventory) {
      return;
    }
    const input = {
      name: inventoryDraft.name.trim(),
      category: inventoryDraft.category,
      unit: inventoryDraft.unit.trim() || 'units',
      openingStock: toAmount(inventoryDraft.openingStock),
      cost: toAmount(inventoryDraft.cost),
      reorderLevel: toAmount(inventoryDraft.reorderLevel),
      targetLevel: toAmount(inventoryDraft.targetLevel),
    };
    if (!input.name) {
      return;
    }
    if (editingInventoryId) {
      updateInventoryItem(editingInventoryId, input);
    } else {
      addInventoryItem(input);
    }
    resetInventoryDraft();
  };

  const resetMenuDraft = () => {
    setEditingMenuId(null);
    setMenuDraft(emptyMenuDraft());
  };

  const startMenuEdit = (item: MenuItem) => {
    if (!canManageInventory) {
      return;
    }
    setEditingMenuId(item.id);
    setMenuDraft({
      name: item.name,
      department: item.category,
      price: String(item.price),
      prepTime: String(item.prepTime),
      badge: item.badge ?? '',
      tone: item.tone,
      recipe: item.recipe.slice(0, 3).map((line) => ({
        itemId: line.itemId,
        quantity: String(line.quantity),
      })),
    });
  };

  const setRecipeLine = (index: number, patch: Partial<RecipeDraftLine>) => {
    setMenuDraft((current) => ({
      ...current,
      recipe: current.recipe.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    }));
  };

  const addRecipeLine = () => {
    setMenuDraft((current) =>
      current.recipe.length >= 3
        ? current
        : {
            ...current,
            recipe: [...current.recipe, { itemId: '', quantity: '' }],
          },
    );
  };

  const removeRecipeLine = (index: number) => {
    setMenuDraft((current) => ({
      ...current,
      recipe: current.recipe.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  const handleMenuSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageInventory) {
      return;
    }
    const recipe: RecipeLine[] = menuDraft.recipe
      .filter((line) => line.itemId && toAmount(line.quantity) > 0)
      .slice(0, 3)
      .map((line) => ({
        itemId: line.itemId,
        quantity: toAmount(line.quantity),
      }));
    const input = {
      name: menuDraft.name.trim(),
      category: menuDraft.department,
      price: toAmount(menuDraft.price),
      prepTime: toAmount(menuDraft.prepTime),
      badge: menuDraft.badge.trim() || undefined,
      tone: menuDraft.tone,
      recipe,
    };
    if (!input.name) {
      return;
    }
    if (editingMenuId) {
      updateMenuItem(editingMenuId, input);
    } else {
      addMenuItem(input);
    }
    resetMenuDraft();
  };

  const handleLoadSampleMenu = () => {
    if (!canManageInventory || missingSampleCount === 0) {
      return;
    }
    const inventoryIds = new Set(data.inventory.map((item) => item.id));
    const menuIds = new Set(data.menu.map((item) => item.id));
    const missingInventory = DEFAULT_INVENTORY.filter(
      (item) => !inventoryIds.has(item.id),
    );
    const missingMenu = DEFAULT_MENU.filter((item) => !menuIds.has(item.id));

    missingInventory.forEach((item) => {
      addInventoryItem({
        name: item.name,
        category: item.category,
        unit: item.unit,
        openingStock: item.openingStock,
        cost: item.cost,
        reorderLevel: item.reorderLevel,
        targetLevel: item.targetLevel,
      });
    });
    missingMenu.forEach((item) => {
      addMenuItem({
        name: item.name,
        category: item.category,
        price: item.price,
        prepTime: item.prepTime,
        badge: item.badge,
        tone: item.tone,
        recipe: item.recipe.map((line) => ({ ...line })),
      });
    });
    logAudit({
      action: 'create',
      entity: 'Sample menu',
      summary: `Loaded ${missingMenu.length} menu item(s) and ${missingInventory.length} inventory item(s) on ${dateKey()}.`,
    });
  };

  const handleRoleChange = (id: string, role: Role) => {
    if (!canManageRoles) {
      return;
    }
    updateUser(id, { role });
  };

  const handleDeleteUser = (id: string) => {
    if (!canManageRoles || currentUser?.id === id) {
      return;
    }
    deleteUser(id);
  };

  const handleUserSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageRoles) {
      return;
    }
    const name = userDraft.name.trim();
    const email = userDraft.email.trim();
    if (!name || !email || !/^\d{4}$/.test(userDraft.pin)) {
      setUserMessage('Enter a name, email, and a four-digit PIN.');
      return;
    }
    addUser({
      name,
      email,
      password: DEFAULT_PASSWORD,
      role: userDraft.role,
      pin: userDraft.pin,
    });
    setUserDraft(emptyUserDraft());
    setUserMessage(`${name} added as ${userDraft.role}.`);
  };

  const handleReset = () => {
    if (!canManageSettings) {
      return;
    }
    if (
      window.confirm(
        'Reset all data to the sample register? Your changes will be lost.',
      )
    ) {
      resetData();
    }
  };

  const inventoryColumns: TableColumn<InventoryItem>[] = [
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Department' },
    { key: 'unit', label: 'Unit' },
    { key: 'openingStock', label: 'Opening stock', align: 'right' },
    {
      key: 'cost',
      label: 'Cost',
      align: 'right',
      render: (item) => formatNaira(item.cost),
    },
    { key: 'reorderLevel', label: 'Reorder', align: 'right' },
    { key: 'targetLevel', label: 'Target', align: 'right' },
    {
      key: 'actions',
      label: '',
      render: (item) => (
        <div className="stock-item__actions">
          <button
            className="icon-button"
            disabled={!canManageInventory}
            onClick={() => startInventoryEdit(item)}
            type="button"
          >
            Edit
          </button>
          <button
            className="icon-button"
            disabled={!canManageInventory}
            onClick={() => deleteInventoryItem(item.id)}
            type="button"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const menuColumns: TableColumn<MenuItem>[] = [
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Department' },
    {
      key: 'price',
      label: 'Price',
      align: 'right',
      render: (item) => formatNaira(item.price),
    },
    { key: 'prepTime', label: 'Prep (min)', align: 'right' },
    { key: 'badge', label: 'Badge', render: (item) => item.badge ?? '—' },
    {
      key: 'recipe',
      label: 'Recipe',
      render: (item) =>
        item.recipe.length === 0
          ? 'No recipe'
          : item.recipe
              .map(
                (line) =>
                  `${inventoryNames.get(line.itemId) ?? 'Item'} × ${line.quantity}`,
              )
              .join(', '),
    },
    {
      key: 'actions',
      label: '',
      render: (item) => (
        <div className="stock-item__actions">
          <button
            className="icon-button"
            disabled={!canManageInventory}
            onClick={() => startMenuEdit(item)}
            type="button"
          >
            Edit
          </button>
          <button
            className="icon-button"
            disabled={!canManageInventory}
            onClick={() => deleteMenuItem(item.id)}
            type="button"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const userColumns: TableColumn<AppUser>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (user) => (
        <span>
          {user.name}
          {user.id === currentUser?.id ? ' (you)' : ''}
        </span>
      ),
    },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (user) => (
        <select
          aria-label={`Role for ${user.name}`}
          className="field-input"
          disabled={!canManageRoles}
          onChange={(event) =>
            handleRoleChange(user.id, event.target.value as Role)
          }
          value={user.role}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'access',
      label: 'Access',
      render: (user) => {
        const { access } = ROLE_ACCESS[user.role];
        let badgeClass = 'badge';

        if (access === 'Editor') {
          badgeClass = 'badge badge--good';
        } else if (access === 'Contributor') {
          badgeClass = 'badge badge--warn';
        }
        return (
          <div>
            <span className={badgeClass}>{access}</span>
            <small style={{ display: 'block', marginTop: 4 }}>
              {ROLE_ACCESS[user.role].hint}
            </small>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (user) => (
        <button
          className="icon-button"
          disabled={!canManageRoles || user.id === currentUser?.id}
          onClick={() => handleDeleteUser(user.id)}
          type="button"
        >
          Remove
        </button>
      ),
    },
  ];

  const vendorColumns: TableColumn<Vendor>[] = [
    { key: 'name', label: 'Vendor' },
    { key: 'phone', label: 'Phone' },
    { key: 'supplies', label: 'Supplies' },
    { key: 'termsDays', label: 'Terms (days)', align: 'right' },
  ];

  const salesColumns: TableColumn<SaleRecord>[] = [
    { key: 'id', label: 'Sale' },
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
    { key: 'items', label: 'Items' },
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      render: (sale) => formatNaira(sale.total),
    },
    { key: 'tender', label: 'Tender' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Setup"
        subtitle={`Get the register ready for service. ${completedSteps} of ${checklist.length} checks complete · ${dateKey()}.`}
      />

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Setup sections">
          {TABS.map((tab) => (
            <button
              className={activeTab === tab.id ? 'is-active' : ''}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="settings-sections">
          {activeTab === 'overview' && (
            <>
              <Panel
                title="Setup checklist"
                subtitle="Work through these checks before the next shift."
              >
                <div className="stat-grid">
                  <StatTile
                    label="Progress"
                    value={`${completedSteps} / ${checklist.length}`}
                    hint={`${progress}% ready`}
                    tone={
                      completedSteps === checklist.length
                        ? 'positive'
                        : 'default'
                    }
                  />
                  <StatTile
                    label="Opening cash"
                    value={formatNaira(data.settings.openingCash)}
                    hint="Float in the drawer"
                  />
                  <StatTile
                    label="Opening bank"
                    value={formatNaira(data.settings.openingBank)}
                    hint="Starting transfer balance"
                  />
                </div>
                <div
                  aria-label="Setup progress"
                  aria-valuemax={checklist.length}
                  aria-valuemin={0}
                  aria-valuenow={completedSteps}
                  className="progress-track"
                  role="progressbar"
                >
                  <span style={{ width: `${progress}%` }} />
                </div>
                <div className="checklist">
                  {checklist.map((item) => (
                    <div
                      className={`checklist__item ${item.done ? 'is-complete' : ''}`}
                      key={item.id}
                    >
                      <span className="checklist__mark">
                        {item.done ? '✓' : '·'}
                      </span>
                      <span style={{ flex: 1 }}>
                        <strong>{item.label}</strong>
                        <small style={{ display: 'block' }}>
                          {item.detail}
                        </small>
                      </span>
                      <button
                        className="link-button"
                        onClick={() => setActiveTab(item.tab)}
                        type="button"
                      >
                        {item.done ? 'Review' : 'Set up'}
                      </button>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel
                title="Sharing access"
                subtitle="Give each teammate the least access they need."
              >
                <p className="admin-note">
                  Viewer for auditors, Contributor for cashiers, Editor for
                  managers — then assign the role here.
                </p>
                <button
                  className="link-button"
                  onClick={() => setActiveTab('people')}
                  type="button"
                >
                  Assign roles
                </button>
              </Panel>
            </>
          )}

          {activeTab === 'balances' && (
            <Panel
              title="Opening balances"
              subtitle="Set the starting figures for this register."
              actions={
                <span className="badge">
                  {canManageSettings ? 'Editable' : 'View only'}
                </span>
              }
            >
              {!canManageSettings && (
                <EmptyState
                  title="View only"
                  message="You can view the opening figures, but only someone with manageSettings access can change them."
                />
              )}
              <div className="stat-grid">
                <StatTile
                  label="Cash"
                  value={formatNaira(data.settings.openingCash)}
                />
                <StatTile
                  label="Bank"
                  value={formatNaira(data.settings.openingBank)}
                />
                <StatTile
                  label="Customer debts"
                  value={formatNaira(data.settings.openingCustomerDebts)}
                />
                <StatTile
                  label="Vendor debts"
                  value={formatNaira(data.settings.openingVendorDebts)}
                />
              </div>
              {canManageSettings && (
                <form className="admin-form" onSubmit={handleBalanceSubmit}>
                  <div className="field-grid">
                    <Field label="Store name">
                      <input
                        className="field-input"
                        onChange={(event) =>
                          setBalanceField('storeName', event.target.value)
                        }
                        type="text"
                        value={balanceForm.storeName}
                      />
                    </Field>
                    <Field label="Opening cash" hint="Notes and coins on hand">
                      <input
                        className="field-input"
                        min="0"
                        onChange={(event) =>
                          setBalanceField('openingCash', event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={balanceForm.openingCash}
                      />
                    </Field>
                    <Field label="Opening bank" hint="Starting account balance">
                      <input
                        className="field-input"
                        min="0"
                        onChange={(event) =>
                          setBalanceField('openingBank', event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={balanceForm.openingBank}
                      />
                    </Field>
                    <Field label="Opening customer debts">
                      <input
                        className="field-input"
                        min="0"
                        onChange={(event) =>
                          setBalanceField(
                            'openingCustomerDebts',
                            event.target.value,
                          )
                        }
                        step="0.01"
                        type="number"
                        value={balanceForm.openingCustomerDebts}
                      />
                    </Field>
                    <Field label="Opening vendor debts">
                      <input
                        className="field-input"
                        min="0"
                        onChange={(event) =>
                          setBalanceField(
                            'openingVendorDebts',
                            event.target.value,
                          )
                        }
                        step="0.01"
                        type="number"
                        value={balanceForm.openingVendorDebts}
                      />
                    </Field>
                  </div>
                  <FormActions
                    submitLabel="Save balances"
                    secondaryLabel="Use sample values"
                    onSecondary={() =>
                      setBalanceForm(balanceFormFromSettings(DEFAULT_SETTINGS))
                    }
                  />
                </form>
              )}
            </Panel>
          )}

          {activeTab === 'inventory' && (
            <Panel
              title="Inventory"
              subtitle="Track what is in stock and when to reorder."
              actions={
                <span className="badge">
                  {canManageInventory ? 'Editable' : 'View only'}
                </span>
              }
            >
              {!canManageInventory && (
                <EmptyState
                  title="View only"
                  message="You can view inventory, but you need manageInventory access to add, edit, or remove items."
                />
              )}
              <RecordTable
                columns={inventoryColumns}
                rows={data.inventory}
                getKey={(item) => item.id}
                emptyTitle="No inventory yet"
                emptyMessage="Add your first stock item below."
              />
              {canManageInventory && (
                <form
                  className="admin-form form-card"
                  onSubmit={handleInventorySubmit}
                >
                  <h3 className="panel-title">
                    {editingInventoryId ? 'Edit item' : 'Add inventory item'}
                  </h3>
                  <div className="field-grid">
                    <Field label="Name">
                      <input
                        className="field-input"
                        onChange={(event) =>
                          setInventoryField('name', event.target.value)
                        }
                        type="text"
                        value={inventoryDraft.name}
                      />
                    </Field>
                    <Field label="Department">
                      <select
                        className="field-input"
                        onChange={(event) =>
                          setInventoryDraft((current) => ({
                            ...current,
                            category: event.target.value as Department,
                          }))
                        }
                        value={inventoryDraft.category}
                      >
                        {DEPARTMENTS.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Unit" hint="e.g. kg, pieces, litres">
                      <input
                        className="field-input"
                        onChange={(event) =>
                          setInventoryField('unit', event.target.value)
                        }
                        type="text"
                        value={inventoryDraft.unit}
                      />
                    </Field>
                    <Field label="Opening stock">
                      <input
                        className="field-input"
                        min="0"
                        onChange={(event) =>
                          setInventoryField('openingStock', event.target.value)
                        }
                        step="any"
                        type="number"
                        value={inventoryDraft.openingStock}
                      />
                    </Field>
                    <Field label="Cost">
                      <input
                        className="field-input"
                        min="0"
                        onChange={(event) =>
                          setInventoryField('cost', event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={inventoryDraft.cost}
                      />
                    </Field>
                    <Field label="Reorder level">
                      <input
                        className="field-input"
                        min="0"
                        onChange={(event) =>
                          setInventoryField('reorderLevel', event.target.value)
                        }
                        step="any"
                        type="number"
                        value={inventoryDraft.reorderLevel}
                      />
                    </Field>
                    <Field label="Target level">
                      <input
                        className="field-input"
                        min="0"
                        onChange={(event) =>
                          setInventoryField('targetLevel', event.target.value)
                        }
                        step="any"
                        type="number"
                        value={inventoryDraft.targetLevel}
                      />
                    </Field>
                  </div>
                  <FormActions
                    submitLabel={
                      editingInventoryId ? 'Save changes' : 'Add item'
                    }
                    secondaryLabel="Cancel"
                    onSecondary={resetInventoryDraft}
                  />
                </form>
              )}
            </Panel>
          )}

          {activeTab === 'menu' && (
            <Panel
              title="Menu & prices"
              subtitle="Set prices and link each dish to up to three stock items."
              actions={
                <button
                  className="secondary-button"
                  disabled={!canManageInventory || missingSampleCount === 0}
                  onClick={handleLoadSampleMenu}
                  type="button"
                >
                  Load sample menu
                </button>
              }
            >
              {!canManageInventory && (
                <EmptyState
                  title="View only"
                  message="You can view prices and recipes, but you need manageInventory access to change them."
                />
              )}
              <RecordTable
                columns={menuColumns}
                rows={data.menu}
                getKey={(item) => item.id}
                emptyTitle="No menu items yet"
                emptyMessage="Add a dish below or load the sample menu."
              />
              {canManageInventory && (
                <form
                  className="admin-form form-card"
                  onSubmit={handleMenuSubmit}
                >
                  <h3 className="panel-title">
                    {editingMenuId ? 'Edit menu item' : 'Add menu item'}
                  </h3>
                  <div className="field-grid">
                    <Field label="Name">
                      <input
                        className="field-input"
                        onChange={(event) =>
                          setMenuField('name', event.target.value)
                        }
                        type="text"
                        value={menuDraft.name}
                      />
                    </Field>
                    <Field label="Department">
                      <select
                        className="field-input"
                        onChange={(event) =>
                          setMenuDraft((current) => ({
                            ...current,
                            department: event.target.value as Department,
                          }))
                        }
                        value={menuDraft.department}
                      >
                        {DEPARTMENTS.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Price">
                      <input
                        className="field-input"
                        min="0"
                        onChange={(event) =>
                          setMenuField('price', event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={menuDraft.price}
                      />
                    </Field>
                    <Field label="Prep time" hint="Minutes">
                      <input
                        className="field-input"
                        min="0"
                        onChange={(event) =>
                          setMenuField('prepTime', event.target.value)
                        }
                        step="1"
                        type="number"
                        value={menuDraft.prepTime}
                      />
                    </Field>
                    <Field label="Badge" hint="Optional menu label">
                      <input
                        className="field-input"
                        onChange={(event) =>
                          setMenuField('badge', event.target.value)
                        }
                        type="text"
                        value={menuDraft.badge}
                      />
                    </Field>
                  </div>
                  <div className="form-card">
                    <div className="admin-toolbar">
                      <div>
                        <h3 className="panel-title">Recipe</h3>
                        <p className="admin-note">
                          Choose stock items and the quantity used per serving.
                        </p>
                      </div>
                      <button
                        className="secondary-button"
                        disabled={
                          !canManageInventory || menuDraft.recipe.length >= 3
                        }
                        onClick={addRecipeLine}
                        type="button"
                      >
                        Add line
                      </button>
                    </div>
                    {menuDraft.recipe.length === 0 && (
                      <p className="admin-note">No recipe lines added.</p>
                    )}
                    {menuDraft.recipe.map((line, index) => (
                      <div className="field-grid" key={line.itemId || 'empty'}>
                        <Field label={`Ingredient ${index + 1}`}>
                          <select
                            className="field-input"
                            onChange={(event) =>
                              setRecipeLine(index, {
                                itemId: event.target.value,
                              })
                            }
                            value={line.itemId}
                          >
                            <option value="">Choose item</option>
                            {data.inventory.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Quantity">
                          <input
                            className="field-input"
                            min="0"
                            onChange={(event) =>
                              setRecipeLine(index, {
                                quantity: event.target.value,
                              })
                            }
                            step="any"
                            type="number"
                            value={line.quantity}
                          />
                        </Field>
                        <Field label="Actions">
                          <button
                            className="icon-button"
                            onClick={() => removeRecipeLine(index)}
                            type="button"
                          >
                            Remove
                          </button>
                        </Field>
                      </div>
                    ))}
                  </div>
                  <FormActions
                    submitLabel={editingMenuId ? 'Save changes' : 'Add item'}
                    secondaryLabel="Cancel"
                    onSecondary={resetMenuDraft}
                  />
                </form>
              )}
            </Panel>
          )}

          {activeTab === 'people' && (
            <>
              <Panel
                title="People & roles"
                subtitle={`Signed in as ${currentUser?.name ?? 'no one'} (${currentUser?.role ?? 'none'}).`}
                actions={
                  <span className="badge">
                    {canManageRoles ? 'Owner access' : 'View only'}
                  </span>
                }
              >
                {!canManageRoles && (
                  <EmptyState
                    title="View only"
                    message="Managers can view roles here, but only an Owner can add people, change roles, or remove accounts."
                  />
                )}
                <RecordTable
                  columns={userColumns}
                  rows={data.users}
                  getKey={(user) => user.id}
                  emptyTitle="No users yet"
                  emptyMessage="Add an Owner so this register can be managed."
                />
              </Panel>

              {canManageRoles && (
                <Panel
                  title="Add a teammate"
                  subtitle={`New accounts use the password ${DEFAULT_PASSWORD}.`}
                >
                  <form className="admin-form" onSubmit={handleUserSubmit}>
                    <div className="field-grid">
                      <Field label="Name">
                        <input
                          className="field-input"
                          onChange={(event) =>
                            setUserField('name', event.target.value)
                          }
                          type="text"
                          value={userDraft.name}
                        />
                      </Field>
                      <Field label="Email">
                        <input
                          className="field-input"
                          onChange={(event) =>
                            setUserField('email', event.target.value)
                          }
                          type="email"
                          value={userDraft.email}
                        />
                      </Field>
                      <Field
                        label="Password"
                        hint={`Default password: ${DEFAULT_PASSWORD}`}
                      >
                        <input
                          className="field-input"
                          disabled
                          type="text"
                          value={DEFAULT_PASSWORD}
                        />
                      </Field>
                      <Field
                        label="Role"
                        hint={ROLE_ACCESS[userDraft.role].hint}
                      >
                        <select
                          className="field-input"
                          onChange={(event) =>
                            setUserDraft((current) => ({
                              ...current,
                              role: event.target.value as Role,
                            }))
                          }
                          value={userDraft.role}
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="PIN" hint="Four digits used to unlock">
                        <input
                          className="field-input"
                          inputMode="numeric"
                          maxLength={4}
                          onChange={(event) =>
                            setUserField('pin', event.target.value)
                          }
                          type="password"
                          value={userDraft.pin}
                        />
                      </Field>
                    </div>
                    {userMessage && (
                      <p className="pin-message">{userMessage}</p>
                    )}
                    <FormActions
                      submitLabel="Add user"
                      secondaryLabel="Clear"
                      onSecondary={() => {
                        setUserDraft(emptyUserDraft());
                        setUserMessage('');
                      }}
                    />
                  </form>
                </Panel>
              )}
            </>
          )}

          {activeTab === 'vendors' && (
            <Panel
              title="Vendors"
              subtitle="Suppliers already available on this register."
            >
              <RecordTable
                columns={vendorColumns}
                rows={data.vendors}
                getKey={(vendor) => vendor.id}
                emptyTitle="No vendors yet"
                emptyMessage="Add a vendor from the Vendors page."
              />
            </Panel>
          )}

          {activeTab === 'sales' && (
            <Panel
              title="Sales"
              subtitle="Recorded transactions available in history."
            >
              <RecordTable
                columns={salesColumns}
                rows={data.sales}
                getKey={(sale) => sale.id}
                emptyTitle="No sales yet"
                emptyMessage="Take a payment on the point of sale page."
              />
            </Panel>
          )}

          {activeTab === 'danger' && (
            <Panel
              title="Danger zone"
              subtitle="This affects every record stored on this device."
            >
              {!canManageSettings && (
                <EmptyState
                  title="View only"
                  message="You need manageSettings access to reset the register."
                />
              )}
              <div className="metric-row">
                <span>
                  Restore the original sample register and remove local changes.
                </span>
                <button
                  className="secondary-button"
                  disabled={!canManageSettings}
                  onClick={handleReset}
                  type="button"
                >
                  Reset sample data
                </button>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Setup;
