import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  AppSettings,
  AppUser,
  AuditAction,
  BentoData,
  Customer,
  DayClose,
  DebtPayment,
  Delivery,
  Department,
  Expense,
  InventoryItem,
  LossRecord,
  MenuItem,
  OrderLine,
  Role,
  SaleRecord,
  StockCount,
  Tender,
  Vendor,
  VendorPayment,
} from 'types/store';
import { createSeedData, DATA_VERSION, dateKey } from 'store/seed';

const STORAGE_KEY = 'bento-pos-data-v1';

export type Permission =
  | 'manageRoles'
  | 'manageSettings'
  | 'manageVendors'
  | 'manageInventory'
  | 'manageExpenses'
  | 'manageCustomers'
  | 'usePos'
  | 'recordSale'
  | 'collectDebt'
  | 'dayClose'
  | 'editRecords'
  | 'deleteRecords'
  | 'viewHome'
  | 'viewStock'
  | 'viewVendors'
  | 'viewHistory'
  | 'viewReports'
  | 'viewAllSales';

const ALL_PERMISSIONS: Permission[] = [
  'manageRoles',
  'manageSettings',
  'manageVendors',
  'manageInventory',
  'manageExpenses',
  'manageCustomers',
  'usePos',
  'recordSale',
  'collectDebt',
  'dayClose',
  'editRecords',
  'deleteRecords',
  'viewHome',
  'viewStock',
  'viewVendors',
  'viewHistory',
  'viewReports',
  'viewAllSales',
];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Owner: ALL_PERMISSIONS,
  Manager: ALL_PERMISSIONS.filter((permission) => permission !== 'manageRoles'),
  Cashier: [
    'manageCustomers',
    'usePos',
    'recordSale',
    'collectDebt',
    'dayClose',
    'editRecords',
    'viewHistory',
    'viewReports',
  ],
  Auditor: [
    'viewHome',
    'viewStock',
    'viewVendors',
    'viewHistory',
    'viewReports',
  ],
};

export interface SaleInput {
  date?: string;
  time?: string;
  staffId?: string;
  department: Department;
  orderType: SaleRecord['orderType'];
  tender: Tender;
  customerId?: string;
  lines: OrderLine[];
  status?: SaleRecord['status'];
  amountPaid?: number;
}

export type SalePatch = Partial<Omit<SaleRecord, 'id' | 'createdAt'>>;

type WithStaff<T> = Omit<T, 'staffId'> & { staffId?: string };
type Timeless<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

interface AuditInput {
  action: AuditAction;
  entity: string;
  summary: string;
}

interface StoreValue {
  data: BentoData;
  currentUser: AppUser | null;
  locked: boolean;
  can: (permission: Permission) => boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  lock: () => void;
  unlock: (pin: string) => boolean;
  setPin: (currentPin: string, nextPin: string) => boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
  addVendor: (input: Timeless<Vendor>) => void;
  updateVendor: (
    id: string,
    patch: Partial<Pick<Vendor, 'phone' | 'supplies' | 'termsDays'>>,
  ) => void;
  deleteVendor: (id: string) => void;
  addCustomer: (input: Timeless<Customer>) => void;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addDelivery: (input: WithStaff<Timeless<Delivery>>) => void;
  updateDelivery: (id: string, patch: Partial<Delivery>) => void;
  deleteDelivery: (id: string) => void;
  addVendorPayment: (input: WithStaff<Timeless<VendorPayment>>) => void;
  updateVendorPayment: (id: string, patch: Partial<VendorPayment>) => void;
  deleteVendorPayment: (id: string) => void;
  addInventoryItem: (input: Timeless<InventoryItem>) => void;
  updateInventoryItem: (id: string, patch: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  addMenuItem: (input: Timeless<MenuItem>) => void;
  updateMenuItem: (id: string, patch: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  recordSale: (input: SaleInput) => SaleRecord | null;
  updateSale: (id: string, patch: SalePatch) => void;
  deleteSale: (id: string) => void;
  addDebtPayment: (input: WithStaff<Timeless<DebtPayment>>) => void;
  updateDebtPayment: (id: string, patch: Partial<DebtPayment>) => void;
  deleteDebtPayment: (id: string) => void;
  addExpense: (input: WithStaff<Timeless<Expense>>) => void;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addLoss: (input: WithStaff<Timeless<LossRecord>>) => void;
  updateLoss: (id: string, patch: Partial<LossRecord>) => void;
  deleteLoss: (id: string) => void;
  addStockCount: (input: WithStaff<Timeless<StockCount>>) => void;
  updateStockCount: (id: string, patch: Partial<StockCount>) => void;
  deleteStockCount: (id: string) => void;
  addDayClose: (input: WithStaff<Timeless<DayClose>>) => void;
  updateDayClose: (id: string, patch: Partial<DayClose>) => void;
  deleteDayClose: (id: string) => void;
  addUser: (input: Omit<AppUser, 'id' | 'createdAt' | 'initials'>) => void;
  updateUser: (id: string, patch: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  logAudit: (input: AuditInput) => void;
  resetData: () => void;
}

const StoreContext = createContext<StoreValue | undefined>(undefined);

const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const currentTime = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const initialsFor = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

const round = (value: number) => Math.round(value * 100) / 100;

const describeLines = (lines: OrderLine[]) =>
  lines.map((line) => `${line.name} × ${line.quantity}`).join(', ');

const totalsFor = (lines: OrderLine[], settings: AppSettings) => {
  const subtotal = round(
    lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
  );
  const vat = settings.vatEnabled ? round(subtotal * settings.vatRate) : 0;
  return { subtotal, vat, total: round(subtotal + vat) };
};

const withAudit = (current: BentoData, input: AuditInput): BentoData => {
  const actor = current.users.find((user) => user.id === current.sessionUserId);
  return {
    ...current,
    auditEvents: [
      {
        id: makeId('audit'),
        timestamp: new Date().toISOString(),
        actorId: actor?.id ?? 'system',
        actorName: actor?.name ?? 'System',
        ...input,
      },
      ...current.auditEvents,
    ].slice(0, 500),
  };
};

const loadData = (): BentoData => {
  if (typeof window === 'undefined') {
    return createSeedData();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createSeedData();
    }
    const parsed = JSON.parse(raw) as BentoData;
    if (parsed.version !== DATA_VERSION || !Array.isArray(parsed.sales)) {
      return createSeedData();
    }
    const seed = createSeedData();
    return {
      ...seed,
      ...parsed,
      settings: { ...seed.settings, ...parsed.settings },
    };
  } catch {
    return createSeedData();
  }
};

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<BentoData>(loadData);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const currentUser = useMemo(
    () => data.users.find((user) => user.id === data.sessionUserId) ?? null,
    [data.sessionUserId, data.users],
  );

  const can = useCallback(
    (permission: Permission) =>
      currentUser
        ? ROLE_PERMISSIONS[currentUser.role].includes(permission)
        : false,
    [currentUser],
  );

  const require = useCallback(
    (permission: Permission) => {
      if (!can(permission)) {
        throw new Error(`This action requires ${permission} access.`);
      }
    },
    [can],
  );

  const apply = useCallback(
    (updater: (current: BentoData) => BentoData, audit?: AuditInput) => {
      setData((current) => {
        const next = updater(current);
        return audit ? withAudit(next, audit) : next;
      });
    },
    [],
  );

  const actorId = useCallback(
    (provided?: string) => provided ?? currentUser?.id ?? 'system',
    [currentUser],
  );

  const login = useCallback(
    (email: string, password: string) => {
      const user = data.users.find(
        (entry) =>
          entry.email.toLowerCase() === email.trim().toLowerCase() &&
          entry.password === password,
      );
      if (!user) {
        return false;
      }
      apply((current) => ({
        ...current,
        sessionUserId: user.id,
        locked: false,
      }));
      return true;
    },
    [apply, data.users],
  );

  const logout = useCallback(() => {
    apply((current) => ({ ...current, sessionUserId: null, locked: false }));
  }, [apply]);

  const lock = useCallback(() => {
    apply((current) =>
      current.sessionUserId ? { ...current, locked: true } : current,
    );
  }, [apply]);

  const unlock = useCallback(
    (pin: string) => {
      if (!currentUser || currentUser.pin !== pin) {
        return false;
      }
      apply((current) => ({ ...current, locked: false }));
      return true;
    },
    [apply, currentUser],
  );

  const setPin = useCallback(
    (currentPin: string, nextPin: string) => {
      if (
        !currentUser ||
        currentUser.pin !== currentPin ||
        !/^\d{4}$/.test(nextPin)
      ) {
        return false;
      }
      apply(
        (current) => ({
          ...current,
          users: current.users.map((user) =>
            user.id === currentUser.id ? { ...user, pin: nextPin } : user,
          ),
        }),
        {
          action: 'setting',
          entity: 'Security',
          summary: 'Updated the unlock PIN.',
        },
      );
      return true;
    },
    [apply, currentUser],
  );

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      require('manageSettings');
      apply(
        (current) => ({
          ...current,
          settings: { ...current.settings, ...patch },
        }),
        {
          action: 'setting',
          entity: 'Settings',
          summary: 'Updated register settings.',
        },
      );
    },
    [apply, require],
  );

  const addVendor = useCallback(
    (input: Timeless<Vendor>) => {
      require('manageVendors');
      apply(
        (current) => ({
          ...current,
          vendors: [
            ...current.vendors,
            {
              ...input,
              id: makeId('vendor'),
              createdAt: new Date().toISOString(),
            },
          ],
        }),
        {
          action: 'create',
          entity: 'Vendor',
          summary: `Added vendor ${input.name}.`,
        },
      );
    },
    [apply, require],
  );

  const updateVendor = useCallback(
    (
      id: string,
      patch: Partial<Pick<Vendor, 'phone' | 'supplies' | 'termsDays'>>,
    ) => {
      require('manageVendors');
      apply(
        (current) => ({
          ...current,
          vendors: current.vendors.map((vendor) =>
            vendor.id === id ? { ...vendor, ...patch } : vendor,
          ),
        }),
        { action: 'edit', entity: 'Vendor', summary: `Updated vendor ${id}.` },
      );
    },
    [apply, require],
  );

  const deleteVendor = useCallback(
    (id: string) => {
      require('manageVendors');
      apply(
        (current) => ({
          ...current,
          vendors: current.vendors.filter((vendor) => vendor.id !== id),
        }),
        {
          action: 'delete',
          entity: 'Vendor',
          summary: `Deleted vendor ${id}.`,
        },
      );
    },
    [apply, require],
  );

  const addCustomer = useCallback(
    (input: Timeless<Customer>) => {
      require('manageCustomers');
      apply(
        (current) => ({
          ...current,
          customers: [
            ...current.customers,
            {
              ...input,
              id: makeId('cust'),
              createdAt: new Date().toISOString(),
            },
          ],
        }),
        {
          action: 'create',
          entity: 'Customer',
          summary: `Added customer ${input.name}.`,
        },
      );
    },
    [apply, require],
  );

  const updateCustomer = useCallback(
    (id: string, patch: Partial<Customer>) => {
      require('manageCustomers');
      apply(
        (current) => ({
          ...current,
          customers: current.customers.map((customer) =>
            customer.id === id ? { ...customer, ...patch } : customer,
          ),
        }),
        {
          action: 'edit',
          entity: 'Customer',
          summary: `Updated customer ${id}.`,
        },
      );
    },
    [apply, require],
  );

  const deleteCustomer = useCallback(
    (id: string) => {
      require('manageCustomers');
      apply(
        (current) => ({
          ...current,
          customers: current.customers.filter((customer) => customer.id !== id),
        }),
        {
          action: 'delete',
          entity: 'Customer',
          summary: `Deleted customer ${id}.`,
        },
      );
    },
    [apply, require],
  );

  const addDelivery = useCallback(
    (input: WithStaff<Timeless<Delivery>>) => {
      require('manageVendors');
      apply(
        (current) => ({
          ...current,
          deliveries: [
            ...current.deliveries,
            {
              ...input,
              staffId: actorId(input.staffId),
              id: makeId('del'),
              createdAt: new Date().toISOString(),
            },
          ],
        }),
        {
          action: 'create',
          entity: 'Delivery',
          summary: `Recorded ${input.quantity} ${input.item} on invoice ${input.invoice || '—'}.`,
        },
      );
    },
    [actorId, apply, require],
  );

  const patchRecord = useCallback(
    <T extends { id: string }>(
      key: keyof BentoData,
      id: string,
      patch: Partial<T>,
    ) => {
      apply((current) => {
        const records = current[key] as unknown as T[];
        return {
          ...current,
          [key]: records.map((record) =>
            record.id === id
              ? { ...record, ...patch, updatedAt: new Date().toISOString() }
              : record,
          ),
        };
      });
    },
    [apply],
  );

  const removeRecord = useCallback(
    (key: keyof BentoData, id: string) => {
      apply((current) => {
        const records = current[key] as unknown as { id: string }[];
        return {
          ...current,
          [key]: records.filter((record) => record.id !== id),
        };
      });
    },
    [apply],
  );

  const updateDelivery = useCallback(
    (id: string, patch: Partial<Delivery>) => {
      require('manageVendors');
      patchRecord<Delivery>('deliveries', id, patch);
      apply((current) => ({
        ...current,
        auditEvents: [
          {
            id: makeId('audit'),
            timestamp: new Date().toISOString(),
            actorId: current.sessionUserId ?? 'system',
            actorName:
              current.users.find((user) => user.id === current.sessionUserId)
                ?.name ?? 'System',
            action: 'edit' as AuditAction,
            entity: 'Delivery',
            summary: `Updated delivery ${id}.`,
          },
          ...current.auditEvents,
        ],
      }));
    },
    [apply, patchRecord, require],
  );

  const deleteDelivery = useCallback(
    (id: string) => {
      require('manageVendors');
      removeRecord('deliveries', id);
      apply((current) =>
        withAudit(current, {
          action: 'delete',
          entity: 'Delivery',
          summary: `Deleted delivery ${id}.`,
        }),
      );
    },
    [apply, removeRecord, require],
  );

  const addVendorPayment = useCallback(
    (input: WithStaff<Timeless<VendorPayment>>) => {
      require('manageVendors');
      apply(
        (current) => ({
          ...current,
          vendorPayments: [
            ...current.vendorPayments,
            {
              ...input,
              staffId: actorId(input.staffId),
              id: makeId('vpay'),
              createdAt: new Date().toISOString(),
            },
          ],
        }),
        {
          action: 'create',
          entity: 'Vendor payment',
          summary: `Paid ${input.amount} to vendor ${input.vendorId}.`,
        },
      );
    },
    [actorId, apply, require],
  );

  const updateVendorPayment = useCallback(
    (id: string, patch: Partial<VendorPayment>) => {
      require('manageVendors');
      patchRecord<VendorPayment>('vendorPayments', id, patch);
      apply((current) =>
        withAudit(current, {
          action: 'edit',
          entity: 'Vendor payment',
          summary: `Updated vendor payment ${id}.`,
        }),
      );
    },
    [apply, patchRecord, require],
  );

  const deleteVendorPayment = useCallback(
    (id: string) => {
      require('manageVendors');
      removeRecord('vendorPayments', id);
      apply((current) =>
        withAudit(current, {
          action: 'delete',
          entity: 'Vendor payment',
          summary: `Deleted vendor payment ${id}.`,
        }),
      );
    },
    [apply, removeRecord, require],
  );

  const addInventoryItem = useCallback(
    (input: Timeless<InventoryItem>) => {
      require('manageInventory');
      apply(
        (current) => ({
          ...current,
          inventory: [...current.inventory, { ...input, id: makeId('inv') }],
        }),
        {
          action: 'create',
          entity: 'Inventory item',
          summary: `Added inventory item ${input.name}.`,
        },
      );
    },
    [apply, require],
  );

  const updateInventoryItem = useCallback(
    (id: string, patch: Partial<InventoryItem>) => {
      require('manageInventory');
      patchRecord<InventoryItem>('inventory', id, patch);
      apply((current) =>
        withAudit(current, {
          action: 'edit',
          entity: 'Inventory item',
          summary: `Updated inventory item ${id}.`,
        }),
      );
    },
    [apply, patchRecord, require],
  );

  const deleteInventoryItem = useCallback(
    (id: string) => {
      require('manageInventory');
      removeRecord('inventory', id);
      apply((current) =>
        withAudit(current, {
          action: 'delete',
          entity: 'Inventory item',
          summary: `Deleted inventory item ${id}.`,
        }),
      );
    },
    [apply, removeRecord, require],
  );

  const addMenuItem = useCallback(
    (input: Timeless<MenuItem>) => {
      require('manageInventory');
      apply(
        (current) => ({
          ...current,
          menu: [...current.menu, { ...input, id: makeId('menu') }],
        }),
        {
          action: 'create',
          entity: 'Menu item',
          summary: `Added menu item ${input.name}.`,
        },
      );
    },
    [apply, require],
  );

  const updateMenuItem = useCallback(
    (id: string, patch: Partial<MenuItem>) => {
      require('manageInventory');
      patchRecord<MenuItem>('menu', id, patch);
      apply((current) =>
        withAudit(current, {
          action: 'edit',
          entity: 'Menu item',
          summary: `Updated menu item ${id}.`,
        }),
      );
    },
    [apply, patchRecord, require],
  );

  const deleteMenuItem = useCallback(
    (id: string) => {
      require('manageInventory');
      removeRecord('menu', id);
      apply((current) =>
        withAudit(current, {
          action: 'delete',
          entity: 'Menu item',
          summary: `Deleted menu item ${id}.`,
        }),
      );
    },
    [apply, removeRecord, require],
  );

  const recordSale = useCallback(
    (input: SaleInput) => {
      require('recordSale');
      const totals = totalsFor(input.lines, data.settings);
      const saleNumbers = data.sales
        .map((sale) => Number(sale.id.replace('#', '')))
        .filter((value) => Number.isFinite(value));
      const nextNumber = Math.max(1048, ...saleNumbers) + 1;
      const record: SaleRecord = {
        id: `#${nextNumber}`,
        date: input.date ?? dateKey(),
        time: input.time ?? currentTime(),
        createdAt: new Date().toISOString(),
        channel: 'Counter',
        department: input.department,
        orderType: input.orderType,
        tender: input.tender,
        status: input.status ?? (input.tender === 'Credit' ? 'Credit' : 'Paid'),
        customerId: input.customerId,
        staffId: actorId(input.staffId),
        items: describeLines(input.lines),
        lines: input.lines,
        ...totals,
        amountPaid:
          input.tender === 'Credit' ? 0 : input.amountPaid ?? totals.total,
      };

      apply((current) => ({ ...current, sales: [record, ...current.sales] }), {
        action: 'create',
        entity: 'Sale',
        summary: `Recorded sale with ${input.lines.length} line(s).`,
      });

      return record;
    },
    [actorId, apply, data.sales, data.settings, require],
  );

  const updateSale = useCallback(
    (id: string, patch: SalePatch) => {
      require('editRecords');
      apply(
        (current) => ({
          ...current,
          sales: current.sales.map((sale) => {
            if (sale.id !== id) {
              return sale;
            }
            const merged = {
              ...sale,
              ...patch,
              updatedAt: new Date().toISOString(),
            };
            const totals = totalsFor(merged.lines, current.settings);
            let nextStatus = merged.status;

            if (merged.tender === 'Credit') {
              nextStatus = 'Credit';
            } else if (nextStatus === 'Credit') {
              nextStatus = 'Paid';
            }

            return {
              ...merged,
              ...totals,
              items: describeLines(merged.lines),
              status: nextStatus,
              amountPaid:
                merged.tender === 'Credit'
                  ? 0
                  : merged.amountPaid || totals.total,
            };
          }),
        }),
        {
          action: 'edit',
          entity: 'Sale',
          summary: `Updated sale ${id}.`,
        },
      );
    },
    [apply, require],
  );

  const deleteSale = useCallback(
    (id: string) => {
      require('deleteRecords');
      removeRecord('sales', id);
      apply((current) =>
        withAudit(current, {
          action: 'delete',
          entity: 'Sale',
          summary: `Deleted sale ${id}.`,
        }),
      );
    },
    [apply, removeRecord, require],
  );

  const addDebtPayment = useCallback(
    (input: WithStaff<Timeless<DebtPayment>>) => {
      require('collectDebt');
      apply(
        (current) => ({
          ...current,
          debtPayments: [
            ...current.debtPayments,
            {
              ...input,
              staffId: actorId(input.staffId),
              id: makeId('dpay'),
              createdAt: new Date().toISOString(),
            },
          ],
        }),
        {
          action: 'create',
          entity: 'Debt payment',
          summary: `Collected ${input.amount} from customer ${input.customerId}.`,
        },
      );
    },
    [actorId, apply, require],
  );

  const addExpense = useCallback(
    (input: WithStaff<Timeless<Expense>>) => {
      require('manageExpenses');
      apply(
        (current) => ({
          ...current,
          expenses: [
            ...current.expenses,
            {
              ...input,
              staffId: actorId(input.staffId),
              id: makeId('exp'),
              createdAt: new Date().toISOString(),
            },
          ],
        }),
        {
          action: 'create',
          entity: 'Expense',
          summary: `Recorded ${input.amount} expense for ${input.category}.`,
        },
      );
    },
    [actorId, apply, require],
  );

  const addLoss = useCallback(
    (input: WithStaff<Timeless<LossRecord>>) => {
      require('manageInventory');
      apply(
        (current) => ({
          ...current,
          losses: [
            ...current.losses,
            {
              ...input,
              staffId: actorId(input.staffId),
              id: makeId('loss'),
              createdAt: new Date().toISOString(),
            },
          ],
        }),
        {
          action: 'create',
          entity: input.type === 'Loss' ? 'Loss' : 'Gain',
          summary: `Recorded ${input.quantity} ${input.itemName} as ${input.type.toLowerCase()}.`,
        },
      );
    },
    [actorId, apply, require],
  );

  const addStockCount = useCallback(
    (input: WithStaff<Timeless<StockCount>>) => {
      require('manageInventory');
      apply(
        (current) => ({
          ...current,
          stockCounts: [
            ...current.stockCounts,
            {
              ...input,
              staffId: actorId(input.staffId),
              id: makeId('count'),
              createdAt: new Date().toISOString(),
            },
          ],
        }),
        {
          action: 'create',
          entity: 'Stock count',
          summary: `Counted ${input.itemName}: ${input.difference} difference.`,
        },
      );
    },
    [actorId, apply, require],
  );

  const addDayClose = useCallback(
    (input: WithStaff<Timeless<DayClose>>) => {
      require('dayClose');
      apply(
        (current) => ({
          ...current,
          dayCloses: [
            ...current.dayCloses,
            {
              ...input,
              staffId: actorId(input.staffId),
              id: makeId('close'),
              createdAt: new Date().toISOString(),
            },
          ],
        }),
        {
          action: 'create',
          entity: 'Day close',
          summary: `Closed the day with ${input.difference} cash difference.`,
        },
      );
    },
    [actorId, apply, require],
  );

  const addUser = useCallback(
    (input: Omit<AppUser, 'id' | 'createdAt' | 'initials'>) => {
      require('manageRoles');
      apply(
        (current) => ({
          ...current,
          users: [
            ...current.users,
            {
              ...input,
              id: makeId('user'),
              initials: initialsFor(input.name),
              createdAt: new Date().toISOString(),
            },
          ],
        }),
        {
          action: 'role',
          entity: 'User',
          summary: `Added ${input.name} as ${input.role}.`,
        },
      );
    },
    [apply, require],
  );

  const updateUser = useCallback(
    (id: string, patch: Partial<AppUser>) => {
      require('manageRoles');
      apply(
        (current) => ({
          ...current,
          users: current.users.map((user) =>
            user.id === id
              ? {
                  ...user,
                  ...patch,
                  initials: patch.name
                    ? initialsFor(patch.name)
                    : user.initials,
                }
              : user,
          ),
        }),
        {
          action: 'role',
          entity: 'User',
          summary: `Updated user ${id}${patch.role ? ` to ${patch.role}` : ''}.`,
        },
      );
    },
    [apply, require],
  );

  const deleteUser = useCallback(
    (id: string) => {
      require('manageRoles');
      apply(
        (current) => ({
          ...current,
          users: current.users.filter((user) => user.id !== id),
          sessionUserId:
            current.sessionUserId === id ? null : current.sessionUserId,
        }),
        {
          action: 'role',
          entity: 'User',
          summary: `Removed user ${id}.`,
        },
      );
    },
    [apply, require],
  );

  const logAudit = useCallback(
    (input: AuditInput) => apply((current) => withAudit(current, input)),
    [apply],
  );

  const resetData = useCallback(() => {
    apply(() => createSeedData());
  }, [apply]);

  const value = useMemo<StoreValue>(
    () => ({
      data,
      currentUser,
      locked: data.locked,
      can,
      login,
      logout,
      lock,
      unlock,
      setPin,
      updateSettings,
      addVendor,
      updateVendor,
      deleteVendor,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addDelivery,
      updateDelivery,
      deleteDelivery,
      addVendorPayment,
      updateVendorPayment,
      deleteVendorPayment,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      addMenuItem,
      updateMenuItem,
      deleteMenuItem,
      recordSale,
      updateSale,
      deleteSale,
      addDebtPayment,
      updateDebtPayment: (id, patch) => {
        require('collectDebt');
        patchRecord<DebtPayment>('debtPayments', id, patch);
        apply((current) =>
          withAudit(current, {
            action: 'edit',
            entity: 'Debt payment',
            summary: `Updated debt payment ${id}.`,
          }),
        );
      },
      deleteDebtPayment: (id) => {
        require('collectDebt');
        removeRecord('debtPayments', id);
        apply((current) =>
          withAudit(current, {
            action: 'delete',
            entity: 'Debt payment',
            summary: `Deleted debt payment ${id}.`,
          }),
        );
      },
      addExpense,
      updateExpense: (id, patch) => {
        require('manageExpenses');
        patchRecord<Expense>('expenses', id, patch);
        apply((current) =>
          withAudit(current, {
            action: 'edit',
            entity: 'Expense',
            summary: `Updated expense ${id}.`,
          }),
        );
      },
      deleteExpense: (id) => {
        require('manageExpenses');
        removeRecord('expenses', id);
        apply((current) =>
          withAudit(current, {
            action: 'delete',
            entity: 'Expense',
            summary: `Deleted expense ${id}.`,
          }),
        );
      },
      addLoss,
      updateLoss: (id, patch) => {
        require('manageInventory');
        patchRecord<LossRecord>('losses', id, patch);
        apply((current) =>
          withAudit(current, {
            action: 'edit',
            entity: 'Loss',
            summary: `Updated loss ${id}.`,
          }),
        );
      },
      deleteLoss: (id) => {
        require('manageInventory');
        removeRecord('losses', id);
        apply((current) =>
          withAudit(current, {
            action: 'delete',
            entity: 'Loss',
            summary: `Deleted loss ${id}.`,
          }),
        );
      },
      addStockCount,
      updateStockCount: (id, patch) => {
        require('manageInventory');
        patchRecord<StockCount>('stockCounts', id, patch);
        apply((current) =>
          withAudit(current, {
            action: 'edit',
            entity: 'Stock count',
            summary: `Updated stock count ${id}.`,
          }),
        );
      },
      deleteStockCount: (id) => {
        require('manageInventory');
        removeRecord('stockCounts', id);
        apply((current) =>
          withAudit(current, {
            action: 'delete',
            entity: 'Stock count',
            summary: `Deleted stock count ${id}.`,
          }),
        );
      },
      addDayClose,
      updateDayClose: (id, patch) => {
        require('dayClose');
        patchRecord<DayClose>('dayCloses', id, patch);
        apply((current) =>
          withAudit(current, {
            action: 'edit',
            entity: 'Day close',
            summary: `Updated day close ${id}.`,
          }),
        );
      },
      deleteDayClose: (id) => {
        require('dayClose');
        removeRecord('dayCloses', id);
        apply((current) =>
          withAudit(current, {
            action: 'delete',
            entity: 'Day close',
            summary: `Deleted day close ${id}.`,
          }),
        );
      },
      addUser,
      updateUser,
      deleteUser,
      logAudit,
      resetData,
    }),
    [
      addCustomer,
      addDayClose,
      addDebtPayment,
      addDelivery,
      addExpense,
      addInventoryItem,
      addLoss,
      addMenuItem,
      addStockCount,
      addUser,
      addVendor,
      addVendorPayment,
      apply,
      can,
      currentUser,
      data,
      deleteCustomer,
      deleteDelivery,
      deleteInventoryItem,
      deleteMenuItem,
      deleteSale,
      deleteUser,
      deleteVendor,
      deleteVendorPayment,
      logAudit,
      login,
      lock,
      logout,
      patchRecord,
      recordSale,
      removeRecord,
      require,
      resetData,
      setPin,
      unlock,
      updateCustomer,
      updateDelivery,
      updateInventoryItem,
      updateMenuItem,
      updateSale,
      updateSettings,
      updateUser,
      updateVendor,
      updateVendorPayment,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
};

export default StoreProvider;
