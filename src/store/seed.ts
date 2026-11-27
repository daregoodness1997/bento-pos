import type {
  AppSettings,
  AppUser,
  BentoData,
  InventoryItem,
  MenuItem,
  SaleRecord,
} from 'types/store';

export const DATA_VERSION = 1;

export const dateKey = (date: Date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const dayOffset = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date);
};

const stamp = (days: number, time: string) => `${dayOffset(days)}T${time}:00`;

export const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'Bento Kitchen — Main',
  terminalId: 'Register 02',
  receiptFooter: 'Thank you for eating with us.',
  showLogo: true,
  cashEnabled: true,
  transferEnabled: true,
  posEnabled: true,
  creditEnabled: true,
  vatEnabled: true,
  vatRate: 0.075,
  openingCash: 85000,
  openingBank: 420000,
  openingCustomerDebts: 18500,
  openingVendorDebts: 96000,
};

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user-owner',
    name: 'Ada Reed',
    email: 'ada@bento.pos',
    password: 'bento1234',
    role: 'Owner',
    pin: '1234',
    initials: 'AR',
    createdAt: stamp(-90, '09:00'),
  },
  {
    id: 'user-manager',
    name: 'Tunde Bello',
    email: 'tunde@bento.pos',
    password: 'bento1234',
    role: 'Manager',
    pin: '2468',
    initials: 'TB',
    createdAt: stamp(-60, '09:00'),
  },
  {
    id: 'user-cashier',
    name: 'Ngozi Eze',
    email: 'ngozi@bento.pos',
    password: 'bento1234',
    role: 'Cashier',
    pin: '1357',
    initials: 'NE',
    createdAt: stamp(-30, '09:00'),
  },
  {
    id: 'user-auditor',
    name: 'Mira Okafor',
    email: 'mira@bento.pos',
    password: 'bento1234',
    role: 'Auditor',
    pin: '9753',
    initials: 'MO',
    createdAt: stamp(-20, '09:00'),
  },
];

export const DEFAULT_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-chicken',
    name: 'Chicken',
    category: 'Restaurant',
    unit: 'kg',
    openingStock: 24,
    cost: 4200,
    reorderLevel: 8,
    targetLevel: 30,
  },
  {
    id: 'inv-rice',
    name: 'Rice',
    category: 'Restaurant',
    unit: 'kg',
    openingStock: 32,
    cost: 900,
    reorderLevel: 10,
    targetLevel: 40,
  },
  {
    id: 'inv-beans',
    name: 'Beans',
    category: 'Restaurant',
    unit: 'kg',
    openingStock: 18,
    cost: 800,
    reorderLevel: 8,
    targetLevel: 25,
  },
  {
    id: 'inv-plantain',
    name: 'Plantain',
    category: 'Restaurant',
    unit: 'pieces',
    openingStock: 60,
    cost: 250,
    reorderLevel: 20,
    targetLevel: 80,
  },
  {
    id: 'inv-spice',
    name: 'Suya spice',
    category: 'Restaurant',
    unit: 'packs',
    openingStock: 15,
    cost: 1800,
    reorderLevel: 5,
    targetLevel: 20,
  },
  {
    id: 'inv-zobo',
    name: 'Zobo mix',
    category: 'Bar',
    unit: 'litres',
    openingStock: 28,
    cost: 650,
    reorderLevel: 8,
    targetLevel: 35,
  },
];

export const DEFAULT_MENU: MenuItem[] = [
  {
    id: 'menu-1',
    name: 'Chicken Wings',
    price: 6000,
    category: 'Restaurant',
    prepTime: 12,
    tone: 'signal',
    badge: 'Popular',
    recipe: [
      { itemId: 'inv-chicken', quantity: 0.25 },
      { itemId: 'inv-spice', quantity: 0.05 },
    ],
  },
  {
    id: 'menu-2',
    name: 'Fried Rice',
    price: 2500,
    category: 'Restaurant',
    prepTime: 8,
    tone: 'mint',
    recipe: [
      { itemId: 'inv-rice', quantity: 0.3 },
      { itemId: 'inv-chicken', quantity: 0.1 },
    ],
  },
  {
    id: 'menu-3',
    name: 'Beans',
    price: 2500,
    category: 'Restaurant',
    prepTime: 10,
    tone: 'clay',
    recipe: [
      { itemId: 'inv-beans', quantity: 0.25 },
      { itemId: 'inv-plantain', quantity: 1 },
    ],
  },
  {
    id: 'menu-4',
    name: 'Suya Wrap',
    price: 3200,
    category: 'Restaurant',
    prepTime: 9,
    tone: 'signal',
    recipe: [
      { itemId: 'inv-chicken', quantity: 0.18 },
      { itemId: 'inv-spice', quantity: 0.08 },
    ],
  },
  {
    id: 'menu-5',
    name: 'Pepper Soup',
    price: 4000,
    category: 'Restaurant',
    prepTime: 14,
    tone: 'clay',
    badge: 'Spicy',
    recipe: [
      { itemId: 'inv-chicken', quantity: 0.3 },
      { itemId: 'inv-spice', quantity: 0.06 },
    ],
  },
  {
    id: 'menu-6',
    name: 'Coconut Rice',
    price: 2800,
    category: 'Restaurant',
    prepTime: 10,
    tone: 'violet',
    recipe: [{ itemId: 'inv-rice', quantity: 0.32 }],
  },
  {
    id: 'menu-7',
    name: 'Plantain',
    price: 1800,
    category: 'Restaurant',
    prepTime: 6,
    tone: 'mint',
    recipe: [{ itemId: 'inv-plantain', quantity: 2 }],
  },
  {
    id: 'menu-8',
    name: 'Zobo',
    price: 1200,
    category: 'Bar',
    prepTime: 3,
    tone: 'violet',
    recipe: [{ itemId: 'inv-zobo', quantity: 0.4 }],
  },
  {
    id: 'menu-9',
    name: 'Snooker — 1 hour',
    price: 1500,
    category: 'Snooker',
    prepTime: 0,
    tone: 'mint',
    recipe: [],
  },
  {
    id: 'menu-10',
    name: 'Viewing seat',
    price: 2000,
    category: 'Viewing',
    prepTime: 0,
    tone: 'violet',
    recipe: [],
  },
];

const makeSale = (
  id: string,
  days: number,
  time: string,
  staffId: string,
  tender: SaleRecord['tender'],
  names: string[],
  customerId?: string,
): SaleRecord => {
  const lines = names.map((name) => {
    const item = DEFAULT_MENU.find((entry) => entry.name === name)!;
    const cost = item.recipe.reduce((sum, part) => {
      const inventory = DEFAULT_INVENTORY.find(
        (entry) => entry.id === part.itemId,
      );
      return sum + (inventory ? inventory.cost * part.quantity : 0);
    }, 0);

    return {
      name: item.name,
      quantity: 1,
      unitPrice: item.price,
      cost: Math.round(cost),
      itemId: item.id,
    };
  });
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );
  const vat = Math.round(subtotal * DEFAULT_SETTINGS.vatRate);

  return {
    id,
    date: dayOffset(days),
    time,
    createdAt: stamp(days, time),
    channel: 'Counter',
    department:
      DEFAULT_MENU.find((item) => item.name === names[0])?.category ??
      'Restaurant',
    orderType: 'Dine in',
    tender,
    status: tender === 'Credit' ? 'Credit' : 'Paid',
    customerId,
    staffId,
    items: lines.map((line) => `${line.name} × ${line.quantity}`).join(', '),
    lines,
    subtotal,
    vat,
    total: subtotal + vat,
    amountPaid: tender === 'Credit' ? 0 : subtotal + vat,
  };
};

const DEFAULT_SALES: SaleRecord[] = [
  makeSale('#1048', 0, '12:42', 'user-cashier', 'Cash', [
    'Chicken Wings',
    'Fried Rice',
  ]),
  makeSale('#1047', 0, '12:18', 'user-cashier', 'POS', ['Zobo', 'Suya Wrap']),
  makeSale('#1046', 0, '11:56', 'user-owner', 'Transfer', ['Pepper Soup']),
  makeSale(
    '#1045',
    0,
    '11:31',
    'user-cashier',
    'Credit',
    ['Beans', 'Zobo'],
    'cust-1',
  ),
  makeSale('#1044', 0, '10:48', 'user-cashier', 'Cash', [
    'Snooker — 1 hour',
    'Viewing seat',
  ]),
  makeSale('#1043', -1, '19:42', 'user-manager', 'Cash', [
    'Chicken Wings',
    'Fried Rice',
  ]),
  makeSale('#1042', -1, '18:56', 'user-cashier', 'POS', ['Plantain', 'Zobo']),
  makeSale('#1041', -1, '18:31', 'user-owner', 'Transfer', ['Coconut Rice']),
];

export const createSeedData = (): BentoData => ({
  version: DATA_VERSION,
  settings: { ...DEFAULT_SETTINGS },
  users: DEFAULT_USERS.map((user) => ({ ...user })),
  sessionUserId: null,
  locked: false,
  customers: [
    {
      id: 'cust-1',
      name: 'Chidi Okoro',
      phone: '0803 111 2244',
      createdAt: stamp(-30, '10:00'),
    },
    {
      id: 'cust-2',
      name: 'Halima Yusuf',
      phone: '0805 442 8890',
      createdAt: stamp(-12, '14:00'),
    },
  ],
  vendors: [
    {
      id: 'vendor-1',
      name: 'Northern Foods Ltd',
      phone: '0802 774 1122',
      supplies: 'Rice, beans, plantain',
      termsDays: 14,
      createdAt: stamp(-40, '09:00'),
    },
    {
      id: 'vendor-2',
      name: 'Valley Poultry',
      phone: '0703 220 9911',
      supplies: 'Chicken and frozen goods',
      termsDays: 7,
      createdAt: stamp(-25, '11:00'),
    },
  ],
  deliveries: [
    {
      id: 'del-1',
      vendorId: 'vendor-1',
      date: dayOffset(-12),
      item: 'Rice',
      inventoryItemId: 'inv-rice',
      quantity: 20,
      cost: 900,
      amountPaid: 9000,
      payByDate: dayOffset(-5),
      invoice: 'INV-3310',
      staffId: 'user-owner',
      createdAt: stamp(-12, '10:00'),
    },
    {
      id: 'del-2',
      vendorId: 'vendor-2',
      date: dayOffset(-6),
      item: 'Chicken',
      inventoryItemId: 'inv-chicken',
      quantity: 15,
      cost: 4200,
      amountPaid: 31500,
      payByDate: dayOffset(1),
      invoice: 'INV-4182',
      staffId: 'user-manager',
      createdAt: stamp(-6, '13:00'),
    },
    {
      id: 'del-3',
      vendorId: 'vendor-1',
      date: dayOffset(-2),
      item: 'Beans',
      inventoryItemId: 'inv-beans',
      quantity: 10,
      cost: 800,
      amountPaid: 0,
      payByDate: dayOffset(12),
      invoice: 'INV-4407',
      staffId: 'user-owner',
      createdAt: stamp(-2, '15:00'),
    },
  ],
  vendorPayments: [
    {
      id: 'vpay-1',
      vendorId: 'vendor-1',
      date: dayOffset(-8),
      amount: 5000,
      method: 'Transfer',
      reference: 'TRF-77410',
      staffId: 'user-owner',
      createdAt: stamp(-8, '12:00'),
    },
    {
      id: 'vpay-2',
      vendorId: 'vendor-2',
      date: dayOffset(-4),
      amount: 20000,
      method: 'POS',
      reference: 'POS-22190',
      staffId: 'user-manager',
      createdAt: stamp(-4, '16:00'),
    },
  ],
  inventory: DEFAULT_INVENTORY.map((item) => ({ ...item })),
  menu: DEFAULT_MENU.map((item) => ({
    ...item,
    recipe: item.recipe.map((part) => ({ ...part })),
  })),
  sales: DEFAULT_SALES,
  debtPayments: [
    {
      id: 'dpay-1',
      customerId: 'cust-2',
      saleId: undefined,
      date: dayOffset(-3),
      amount: 4500,
      method: 'Cash',
      reference: 'Cash',
      staffId: 'user-cashier',
      createdAt: stamp(-3, '17:00'),
    },
  ],
  expenses: [
    {
      id: 'exp-1',
      date: dayOffset(0),
      category: 'Utilities',
      description: 'Electricity token',
      amount: 12000,
      method: 'Cash',
      staffId: 'user-owner',
      createdAt: stamp(0, '08:30'),
    },
  ],
  losses: [
    {
      id: 'loss-1',
      date: dayOffset(-1),
      itemId: 'inv-plantain',
      itemName: 'Plantain',
      quantity: 3,
      type: 'Loss',
      reason: 'Spoiled',
      value: 750,
      staffId: 'user-manager',
      createdAt: stamp(-1, '20:00'),
    },
  ],
  stockCounts: [],
  dayCloses: [],
  auditEvents: [
    {
      id: 'audit-1',
      timestamp: stamp(-1, '21:10'),
      actorId: 'user-manager',
      actorName: 'Tunde Bello',
      action: 'setting',
      entity: 'Register',
      summary: 'Verified closing cash for the previous shift.',
    },
  ],
});
