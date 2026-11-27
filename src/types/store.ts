export type Role = 'Owner' | 'Manager' | 'Cashier' | 'Auditor';

export type Tender = 'Cash' | 'Transfer' | 'POS' | 'Credit';

export type PayMethod = Exclude<Tender, 'Credit'>;

export type Department = 'Restaurant' | 'Bar' | 'Snooker' | 'Viewing';

export type OrderType = 'Dine in' | 'Takeaway' | 'Delivery';

export type OrderStatus = 'Paid' | 'Credit' | 'Preparing' | 'Refunded';

export type MenuTone = 'signal' | 'mint' | 'clay' | 'violet';

export type AuditAction = 'create' | 'edit' | 'delete' | 'setting' | 'role';

export interface RecipeLine {
  itemId: string;
  quantity: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Department;
  prepTime: number;
  tone: MenuTone;
  badge?: string;
  recipe: RecipeLine[];
}

export interface CartLine extends MenuItem {
  quantity: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: Department;
  unit: string;
  openingStock: number;
  cost: number;
  reorderLevel: number;
  targetLevel: number;
}

export interface OrderLine {
  name: string;
  quantity: number;
  unitPrice: number;
  cost: number;
  itemId?: string;
}

export interface SaleRecord {
  id: string;
  date: string;
  time: string;
  createdAt: string;
  updatedAt?: string;
  channel: string;
  department: Department;
  orderType: OrderType;
  tender: Tender;
  status: OrderStatus;
  customerId?: string;
  staffId: string;
  items: string;
  lines: OrderLine[];
  subtotal: number;
  vat: number;
  total: number;
  amountPaid: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  phone: string;
  supplies: string;
  termsDays?: number;
  createdAt: string;
}

export interface Delivery {
  id: string;
  vendorId: string;
  date: string;
  item: string;
  inventoryItemId?: string;
  quantity: number;
  cost: number;
  amountPaid: number;
  payByDate?: string;
  invoice: string;
  staffId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VendorPayment {
  id: string;
  vendorId: string;
  date: string;
  amount: number;
  method: PayMethod;
  reference: string;
  staffId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DebtPayment {
  id: string;
  customerId: string;
  saleId?: string;
  date: string;
  amount: number;
  method: PayMethod;
  reference: string;
  staffId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  method: PayMethod;
  staffId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LossRecord {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  quantity: number;
  type: 'Loss' | 'Gain';
  reason: string;
  value: number;
  staffId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StockCount {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  previous: number;
  counted: number;
  difference: number;
  value: number;
  staffId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DayClose {
  id: string;
  date: string;
  expectedCash: number;
  countedCash: number;
  difference: number;
  note: string;
  staffId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  pin: string;
  initials: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  entity: string;
  summary: string;
}

export interface AppSettings {
  storeName: string;
  terminalId: string;
  receiptFooter: string;
  showLogo: boolean;
  cashEnabled: boolean;
  transferEnabled: boolean;
  posEnabled: boolean;
  creditEnabled: boolean;
  vatEnabled: boolean;
  vatRate: number;
  openingCash: number;
  openingBank: number;
  openingCustomerDebts: number;
  openingVendorDebts: number;
}

export interface BentoData {
  version: number;
  settings: AppSettings;
  users: AppUser[];
  sessionUserId: string | null;
  locked: boolean;
  customers: Customer[];
  vendors: Vendor[];
  deliveries: Delivery[];
  vendorPayments: VendorPayment[];
  inventory: InventoryItem[];
  menu: MenuItem[];
  sales: SaleRecord[];
  debtPayments: DebtPayment[];
  expenses: Expense[];
  losses: LossRecord[];
  stockCounts: StockCount[];
  dayCloses: DayClose[];
  auditEvents: AuditEvent[];
}
