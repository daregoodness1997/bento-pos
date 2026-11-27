import React, { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';

import { DashboardLayout } from 'layouts';
import {
  AppInput,
  AppSelect,
  EmptyState,
  Field,
  FormActions,
  FormSelect,
  PageHeader,
  Panel,
  RecordTable,
  StatTile,
} from 'components';
import type { TableColumn } from 'components';
import { useConfirm, useStore } from 'context';
import {
  inventoryItemSchema,
  menuItemSchema,
  openingBalancesSchema,
  userSchema,
} from 'schemas/forms';
import type {
  InventoryItemValues,
  MenuItemValues,
  OpeningBalancesValues,
  UserValues,
} from 'schemas/forms';
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

interface Props {
  embedded?: boolean;
}

const DEPARTMENTS: Department[] = ['Restaurant', 'Bar', 'Snooker', 'Viewing'];
const DEPARTMENT_OPTIONS = DEPARTMENTS.map((department) => ({
  key: department,
  label: department,
}));
const ROLES: Role[] = ['Owner', 'Manager', 'Cashier', 'Auditor'];
const ROLE_OPTIONS = ROLES.map((role) => ({ key: role, label: role }));
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

const balanceFormFromSettings = (
  settings: AppSettings,
): OpeningBalancesValues => ({
  storeName: settings.storeName,
  openingCash: String(settings.openingCash),
  openingBank: String(settings.openingBank),
  openingCustomerDebts: String(settings.openingCustomerDebts),
  openingVendorDebts: String(settings.openingVendorDebts),
});

const emptyInventoryDraft = (): InventoryItemValues => ({
  name: '',
  category: 'Restaurant',
  unit: '',
  openingStock: '',
  cost: '',
  reorderLevel: '',
  targetLevel: '',
});

const emptyMenuDraft = (): MenuItemValues => ({
  name: '',
  category: 'Restaurant',
  price: '',
  prepTime: '',
  badge: '',
  recipe: [{ itemId: '', quantity: '' }],
});

const emptyUserDraft = (): UserValues => ({
  name: '',
  email: '',
  password: DEFAULT_PASSWORD,
  role: 'Cashier',
  pin: '',
});

const Setup = ({ embedded = false }: Props) => {
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
  const confirmAction = useConfirm();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(
    null,
  );
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [menuTone, setMenuTone] = useState<MenuTone>('signal');
  const [userMessage, setUserMessage] = useState('');

  const balanceForm = useForm<OpeningBalancesValues>({
    resolver: zodResolver(openingBalancesSchema),
    defaultValues: balanceFormFromSettings(data.settings),
  });
  const inventoryForm = useForm<InventoryItemValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: emptyInventoryDraft(),
  });
  const menuForm = useForm<MenuItemValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: emptyMenuDraft(),
  });
  const userForm = useForm<UserValues>({
    resolver: zodResolver(userSchema),
    defaultValues: emptyUserDraft(),
  });
  const {
    fields: recipeFields,
    append,
    remove,
  } = useFieldArray({
    control: menuForm.control,
    name: 'recipe',
  });

  const canManageSettings = can('manageSettings');
  const canManageInventory = can('manageInventory');
  const canManageRoles = can('manageRoles');

  useEffect(() => {
    balanceForm.reset(balanceFormFromSettings(data.settings));
  }, [balanceForm, data.settings]);

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

  const handleBalanceSubmit = (values: OpeningBalancesValues) => {
    if (!canManageSettings) {
      return;
    }
    updateSettings({
      storeName: values.storeName.trim(),
      openingCash: toAmount(values.openingCash),
      openingBank: toAmount(values.openingBank),
      openingCustomerDebts: toAmount(values.openingCustomerDebts),
      openingVendorDebts: toAmount(values.openingVendorDebts),
    });
  };

  const resetInventoryDraft = () => {
    setEditingInventoryId(null);
    inventoryForm.reset(emptyInventoryDraft());
  };

  const startInventoryEdit = (item: InventoryItem) => {
    if (!canManageInventory) {
      return;
    }
    setEditingInventoryId(item.id);
    inventoryForm.reset({
      name: item.name,
      category: item.category,
      unit: item.unit,
      openingStock: String(item.openingStock),
      cost: String(item.cost),
      reorderLevel: String(item.reorderLevel),
      targetLevel: String(item.targetLevel),
    });
  };

  const handleInventorySubmit = (values: InventoryItemValues) => {
    if (!canManageInventory) {
      return;
    }
    const input = {
      name: values.name.trim(),
      category: values.category,
      unit: values.unit.trim() || 'units',
      openingStock: toAmount(values.openingStock),
      cost: toAmount(values.cost),
      reorderLevel: toAmount(values.reorderLevel),
      targetLevel: toAmount(values.targetLevel),
    };
    if (editingInventoryId) {
      updateInventoryItem(editingInventoryId, input);
    } else {
      addInventoryItem(input);
    }
    resetInventoryDraft();
  };

  const resetMenuDraft = () => {
    setEditingMenuId(null);
    setMenuTone('signal');
    menuForm.reset(emptyMenuDraft());
  };

  const startMenuEdit = (item: MenuItem) => {
    if (!canManageInventory) {
      return;
    }
    setEditingMenuId(item.id);
    setMenuTone(item.tone);
    menuForm.reset({
      name: item.name,
      category: item.category,
      price: String(item.price),
      prepTime: String(item.prepTime),
      badge: item.badge ?? '',
      recipe: item.recipe.slice(0, 3).map((line) => ({
        itemId: line.itemId,
        quantity: String(line.quantity),
      })),
    });
  };

  const addRecipeLine = () => {
    if (recipeFields.length < 3) {
      append({ itemId: '', quantity: '' });
    }
  };

  const removeRecipeLine = (index: number) => {
    remove(index);
  };

  const handleMenuSubmit = (values: MenuItemValues) => {
    if (!canManageInventory) {
      return;
    }
    const recipe: RecipeLine[] = values.recipe
      .filter((line) => line.itemId.trim() && Number(line.quantity) > 0)
      .slice(0, 3)
      .map((line) => ({
        itemId: line.itemId,
        quantity: toAmount(line.quantity),
      }));
    const input = {
      name: values.name.trim(),
      category: values.category,
      price: toAmount(values.price),
      prepTime: toAmount(values.prepTime),
      badge: values.badge.trim() || undefined,
      tone: menuTone,
      recipe,
    };
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

  const handleRoleChange = async (id: string, role: Role) => {
    if (!canManageRoles) {
      return;
    }
    const name = data.users.find((user) => user.id === id)?.name ?? 'teammate';
    if (
      !(await confirmAction(`Change ${name}'s role to ${role}?`, {
        title: 'Change role?',
        confirmLabel: 'Change role',
        tone: 'primary',
      }))
    ) {
      return;
    }
    updateUser(id, { role });
  };

  const handleDeleteUser = async (id: string) => {
    if (!canManageRoles || currentUser?.id === id) {
      return;
    }
    const name = data.users.find((user) => user.id === id)?.name ?? 'teammate';
    if (
      !(await confirmAction(`Remove ${name} from this register?`, {
        title: 'Remove teammate?',
        confirmLabel: 'Remove',
      }))
    ) {
      return;
    }
    deleteUser(id);
  };

  const handleDeleteInventory = async (id: string, name: string) => {
    if (
      !(await confirmAction(`Delete inventory item ${name}?`, {
        title: 'Delete inventory item?',
        confirmLabel: 'Delete',
      }))
    ) {
      return;
    }
    deleteInventoryItem(id);
  };

  const handleDeleteMenu = async (id: string, name: string) => {
    if (
      !(await confirmAction(`Delete menu item ${name}?`, {
        title: 'Delete menu item?',
        confirmLabel: 'Delete',
      }))
    ) {
      return;
    }
    deleteMenuItem(id);
  };

  const handleUserSubmit = (values: UserValues) => {
    if (!canManageRoles) {
      return;
    }
    const name = values.name.trim();
    const email = values.email.trim();
    addUser({
      name,
      email,
      password: DEFAULT_PASSWORD,
      role: values.role,
      pin: values.pin,
    });
    userForm.reset(emptyUserDraft());
    setUserMessage(`${name} added as ${values.role}.`);
  };

  const handleReset = async () => {
    if (!canManageSettings) {
      return;
    }
    if (
      await confirmAction(
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
            onClick={() => handleDeleteInventory(item.id, item.name)}
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
            onClick={() => handleDeleteMenu(item.id, item.name)}
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
        <AppSelect
          aria-label={`Role for ${user.name}`}
          isDisabled={!canManageRoles}
          options={ROLE_OPTIONS}
          value={user.role}
          onValueChange={(value) => handleRoleChange(user.id, value as Role)}
        />
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

  const content = (
    <>
      {!embedded && (
        <PageHeader
          title="Setup"
          subtitle={`Get the register ready for service. ${completedSteps} of ${checklist.length} checks complete · ${dateKey()}.`}
        />
      )}

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
                <form
                  className="admin-form"
                  onSubmit={balanceForm.handleSubmit(handleBalanceSubmit)}
                >
                  <div className="field-grid">
                    <Field
                      label="Store name"
                      error={balanceForm.formState.errors.storeName?.message}
                    >
                      <AppInput
                        aria-label="Store name"
                        type="text"
                        {...balanceForm.register('storeName')}
                      />
                    </Field>
                    <Field
                      label="Opening cash"
                      hint="Notes and coins on hand"
                      error={balanceForm.formState.errors.openingCash?.message}
                    >
                      <AppInput
                        aria-label="Opening cash"
                        min="0"
                        step="0.01"
                        type="number"
                        {...balanceForm.register('openingCash')}
                      />
                    </Field>
                    <Field
                      label="Opening bank"
                      hint="Starting account balance"
                      error={balanceForm.formState.errors.openingBank?.message}
                    >
                      <AppInput
                        aria-label="Opening bank"
                        min="0"
                        step="0.01"
                        type="number"
                        {...balanceForm.register('openingBank')}
                      />
                    </Field>
                    <Field
                      label="Opening customer debts"
                      error={
                        balanceForm.formState.errors.openingCustomerDebts
                          ?.message
                      }
                    >
                      <AppInput
                        aria-label="Opening customer debts"
                        min="0"
                        step="0.01"
                        type="number"
                        {...balanceForm.register('openingCustomerDebts')}
                      />
                    </Field>
                    <Field
                      label="Opening vendor debts"
                      error={
                        balanceForm.formState.errors.openingVendorDebts?.message
                      }
                    >
                      <AppInput
                        aria-label="Opening vendor debts"
                        min="0"
                        step="0.01"
                        type="number"
                        {...balanceForm.register('openingVendorDebts')}
                      />
                    </Field>
                  </div>
                  <FormActions
                    submitLabel="Save balances"
                    secondaryLabel="Use sample values"
                    onSecondary={() =>
                      balanceForm.reset(
                        balanceFormFromSettings(DEFAULT_SETTINGS),
                      )
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
                  onSubmit={inventoryForm.handleSubmit(handleInventorySubmit)}
                >
                  <h3 className="panel-title">
                    {editingInventoryId ? 'Edit item' : 'Add inventory item'}
                  </h3>
                  <div className="field-grid">
                    <Field
                      label="Name"
                      error={inventoryForm.formState.errors.name?.message}
                    >
                      <AppInput
                        aria-label="Inventory item name"
                        type="text"
                        {...inventoryForm.register('name')}
                      />
                    </Field>
                    <Field
                      label="Department"
                      error={inventoryForm.formState.errors.category?.message}
                    >
                      <FormSelect
                        control={inventoryForm.control}
                        label="Department"
                        name="category"
                        options={DEPARTMENT_OPTIONS}
                      />
                    </Field>
                    <Field
                      label="Unit"
                      hint="e.g. kg, pieces, litres"
                      error={inventoryForm.formState.errors.unit?.message}
                    >
                      <AppInput
                        aria-label="Unit"
                        type="text"
                        {...inventoryForm.register('unit')}
                      />
                    </Field>
                    <Field
                      label="Opening stock"
                      error={
                        inventoryForm.formState.errors.openingStock?.message
                      }
                    >
                      <AppInput
                        aria-label="Opening stock"
                        min="0"
                        step="any"
                        type="number"
                        {...inventoryForm.register('openingStock')}
                      />
                    </Field>
                    <Field
                      label="Cost"
                      error={inventoryForm.formState.errors.cost?.message}
                    >
                      <AppInput
                        aria-label="Cost"
                        min="0"
                        step="0.01"
                        type="number"
                        {...inventoryForm.register('cost')}
                      />
                    </Field>
                    <Field
                      label="Reorder level"
                      error={
                        inventoryForm.formState.errors.reorderLevel?.message
                      }
                    >
                      <AppInput
                        aria-label="Reorder level"
                        min="0"
                        step="any"
                        type="number"
                        {...inventoryForm.register('reorderLevel')}
                      />
                    </Field>
                    <Field
                      label="Target level"
                      error={
                        inventoryForm.formState.errors.targetLevel?.message
                      }
                    >
                      <AppInput
                        aria-label="Target level"
                        min="0"
                        step="any"
                        type="number"
                        {...inventoryForm.register('targetLevel')}
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
                  onSubmit={menuForm.handleSubmit(handleMenuSubmit)}
                >
                  <h3 className="panel-title">
                    {editingMenuId ? 'Edit menu item' : 'Add menu item'}
                  </h3>
                  <div className="field-grid">
                    <Field
                      label="Name"
                      error={menuForm.formState.errors.name?.message}
                    >
                      <AppInput
                        aria-label="Menu item name"
                        type="text"
                        {...menuForm.register('name')}
                      />
                    </Field>
                    <Field
                      label="Department"
                      error={menuForm.formState.errors.category?.message}
                    >
                      <FormSelect
                        control={menuForm.control}
                        label="Department"
                        name="category"
                        options={DEPARTMENT_OPTIONS}
                      />
                    </Field>
                    <Field
                      label="Price"
                      error={menuForm.formState.errors.price?.message}
                    >
                      <AppInput
                        aria-label="Price"
                        min="0"
                        step="0.01"
                        type="number"
                        {...menuForm.register('price')}
                      />
                    </Field>
                    <Field
                      label="Prep time"
                      hint="Minutes"
                      error={menuForm.formState.errors.prepTime?.message}
                    >
                      <AppInput
                        aria-label="Prep time"
                        min="0"
                        step="1"
                        type="number"
                        {...menuForm.register('prepTime')}
                      />
                    </Field>
                    <Field
                      label="Badge"
                      hint="Optional menu label"
                      error={menuForm.formState.errors.badge?.message}
                    >
                      <AppInput
                        aria-label="Badge"
                        type="text"
                        {...menuForm.register('badge')}
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
                          !canManageInventory || recipeFields.length >= 3
                        }
                        onClick={addRecipeLine}
                        type="button"
                      >
                        Add line
                      </button>
                    </div>
                    {recipeFields.length === 0 && (
                      <p className="admin-note">No recipe lines added.</p>
                    )}
                    {recipeFields.map((field, index) => (
                      <div className="field-grid" key={field.id}>
                        <Field
                          label={`Ingredient ${index + 1}`}
                          error={
                            menuForm.formState.errors.recipe?.[index]?.itemId
                              ?.message
                          }
                        >
                          <FormSelect
                            control={menuForm.control}
                            label={`Ingredient ${index + 1}`}
                            name={`recipe.${index}.itemId`}
                            options={[
                              { key: '', label: 'Choose item' },
                              ...data.inventory.map((item) => ({
                                key: item.id,
                                label: item.name,
                              })),
                            ]}
                            placeholder="Choose item"
                          />
                        </Field>
                        <Field
                          label="Quantity"
                          error={
                            menuForm.formState.errors.recipe?.[index]?.quantity
                              ?.message
                          }
                        >
                          <AppInput
                            aria-label="Quantity"
                            min="0"
                            step="any"
                            type="number"
                            {...menuForm.register(`recipe.${index}.quantity`)}
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
                  <form
                    className="admin-form"
                    onSubmit={userForm.handleSubmit(handleUserSubmit)}
                  >
                    <div className="field-grid">
                      <Field
                        label="Name"
                        error={userForm.formState.errors.name?.message}
                      >
                        <AppInput
                          aria-label="User name"
                          type="text"
                          {...userForm.register('name')}
                        />
                      </Field>
                      <Field
                        label="Email"
                        error={userForm.formState.errors.email?.message}
                      >
                        <AppInput
                          aria-label="User email"
                          type="email"
                          {...userForm.register('email')}
                        />
                      </Field>
                      <Field
                        label="Password"
                        hint={`Default password: ${DEFAULT_PASSWORD}`}
                      >
                        <AppInput
                          aria-label="Password"
                          isDisabled
                          type="text"
                          value={DEFAULT_PASSWORD}
                        />
                      </Field>
                      <Field
                        label="Role"
                        hint={ROLE_ACCESS[userForm.watch('role')].hint}
                        error={userForm.formState.errors.role?.message}
                      >
                        <FormSelect
                          control={userForm.control}
                          label="Role"
                          name="role"
                          options={ROLE_OPTIONS}
                        />
                      </Field>
                      <Field
                        label="PIN"
                        hint="Four digits used to unlock"
                        error={userForm.formState.errors.pin?.message}
                      >
                        <AppInput
                          aria-label="PIN"
                          inputMode="numeric"
                          maxLength={4}
                          type="password"
                          {...userForm.register('pin')}
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
                        userForm.reset(emptyUserDraft());
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
    </>
  );

  return embedded ? content : <DashboardLayout>{content}</DashboardLayout>;
};

Setup.defaultProps = {
  embedded: false,
};

export default Setup;
