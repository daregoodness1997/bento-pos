import { z } from 'zod';

export const departmentValues = [
  'Restaurant',
  'Bar',
  'Snooker',
  'Viewing',
] as const;
export const orderTypeValues = ['Dine in', 'Takeaway', 'Delivery'] as const;
export const tenderValues = ['Cash', 'Transfer', 'POS', 'Credit'] as const;
export const payMethodValues = ['Cash', 'Transfer', 'POS'] as const;
export const orderStatusValues = [
  'Paid',
  'Credit',
  'Preparing',
  'Refunded',
] as const;
export const roleValues = ['Owner', 'Manager', 'Cashier', 'Auditor'] as const;
export const lossTypeValues = ['Loss', 'Gain'] as const;

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required`);

const numericString = (label: string) =>
  requiredText(label).refine(
    (value) => Number.isFinite(Number(value)),
    `${label} must be a number`,
  );

const nonNegativeNumber = (label: string) =>
  numericString(label).refine(
    (value) => Number(value) >= 0,
    `${label} cannot be negative`,
  );

const positiveNumber = (label: string) =>
  numericString(label).refine(
    (value) => Number(value) > 0,
    `${label} must be greater than zero`,
  );

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date');

const optionalDateString = z
  .string()
  .refine(
    (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value),
    'Choose a valid date',
  );

const pinString = z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits');

const optionalTerms = z
  .string()
  .refine(
    (value) =>
      value.trim() === '' ||
      (Number.isInteger(Number(value)) && Number(value) >= 0),
    'Terms must be a whole number of days',
  );

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: requiredText('Password'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const customerSchema = z.object({
  name: requiredText('Name'),
  phone: z.string().trim(),
});
export type CustomerValues = z.infer<typeof customerSchema>;

export const vendorSchema = z
  .object({
    name: requiredText('Vendor name'),
    phone: requiredText('Phone'),
    supplies: z.string().trim(),
    termsDays: optionalTerms,
  })
  .superRefine((values, ctx) => {
    if (!values.name.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: 'Vendor name is required',
      });
    }
  });
export type VendorValues = z.infer<typeof vendorSchema>;

export const debtPaymentSchema = z.object({
  customerId: requiredText('Customer'),
  saleId: z.string(),
  amount: positiveNumber('Amount'),
  method: z.enum(payMethodValues),
  reference: z.string().trim(),
  date: dateString,
});
export type DebtPaymentValues = z.infer<typeof debtPaymentSchema>;

export const deliverySchema = z
  .object({
    vendorId: requiredText('Vendor'),
    date: dateString,
    item: requiredText('Item'),
    inventoryItemId: z.string(),
    quantity: positiveNumber('Quantity'),
    cost: positiveNumber('Unit cost'),
    amountPaid: nonNegativeNumber('Amount paid'),
    payByDate: optionalDateString,
    invoice: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    const total = Number(values.quantity) * Number(values.cost);
    if (Number(values.amountPaid) > total + 0.001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amountPaid'],
        message: 'Amount paid cannot exceed the delivery total',
      });
    }
  });
export type DeliveryValues = z.infer<typeof deliverySchema>;

export const vendorPaymentSchema = z.object({
  vendorId: requiredText('Vendor'),
  date: dateString,
  amount: positiveNumber('Amount'),
  method: z.enum(payMethodValues),
  reference: z.string().trim(),
});
export type VendorPaymentValues = z.infer<typeof vendorPaymentSchema>;

export const expenseSchema = z.object({
  category: requiredText('Category'),
  description: requiredText('Description'),
  amount: positiveNumber('Amount'),
  method: z.enum(payMethodValues),
  date: dateString,
});
export type ExpenseValues = z.infer<typeof expenseSchema>;

export const lossSchema = z.object({
  itemId: requiredText('Item'),
  type: z.enum(lossTypeValues),
  date: dateString,
  quantity: positiveNumber('Quantity'),
  reason: requiredText('Reason'),
});
export type LossValues = z.infer<typeof lossSchema>;

export const stockCountSchema = z.object({
  itemId: requiredText('Item'),
  date: dateString,
  counted: nonNegativeNumber('Counted quantity'),
});
export type StockCountValues = z.infer<typeof stockCountSchema>;

export const dayCloseSchema = z.object({
  date: dateString,
  countedCash: nonNegativeNumber('Cash counted'),
  note: z.string().trim(),
});
export type DayCloseValues = z.infer<typeof dayCloseSchema>;

export const inventoryItemSchema = z
  .object({
    name: requiredText('Name'),
    category: z.enum(departmentValues),
    unit: requiredText('Unit'),
    openingStock: nonNegativeNumber('Opening stock'),
    cost: nonNegativeNumber('Cost'),
    reorderLevel: nonNegativeNumber('Reorder level'),
    targetLevel: nonNegativeNumber('Target level'),
  })
  .superRefine((values, ctx) => {
    if (Number(values.targetLevel) < Number(values.reorderLevel)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetLevel'],
        message: 'Target level cannot be below reorder level',
      });
    }
  });
export type InventoryItemValues = z.infer<typeof inventoryItemSchema>;

export const menuItemSchema = z.object({
  name: requiredText('Name'),
  category: z.enum(departmentValues),
  price: nonNegativeNumber('Price'),
  prepTime: nonNegativeNumber('Prep time'),
  badge: z.string().trim(),
  recipe: z
    .array(
      z.object({
        itemId: z.string(),
        quantity: z.string(),
      }),
    )
    .superRefine((rows, ctx) => {
      const active = rows.filter(
        (row) => row.itemId.trim() && Number(row.quantity) > 0,
      );
      if (active.length > 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Use at most 3 ingredients',
        });
      }
      active.forEach((row, index) => {
        if (
          !Number.isFinite(Number(row.quantity)) ||
          Number(row.quantity) <= 0
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, 'quantity'],
            message: 'Quantity must be greater than zero',
          });
        }
      });
    }),
});
export type MenuItemValues = z.infer<typeof menuItemSchema>;

export const userSchema = z.object({
  name: requiredText('Name'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z.string(),
  role: z.enum(roleValues),
  pin: pinString,
});
export type UserValues = z.infer<typeof userSchema>;

export const saleLineSchema = z.object({
  menuItemId: requiredText('Menu item'),
  quantity: positiveNumber('Quantity'),
});
export type SaleLineValues = z.infer<typeof saleLineSchema>;

export const saleSchema = z
  .object({
    department: z.enum(departmentValues),
    orderType: z.enum(orderTypeValues),
    tender: z.enum(tenderValues),
    customerId: z.string(),
    date: dateString,
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a valid time'),
    lines: z.array(saleLineSchema).min(1, 'Add at least one menu item'),
  })
  .superRefine((values, ctx) => {
    if (values.tender === 'Credit' && !values.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerId'],
        message: 'Select a customer for credit sales',
      });
    }
  });
export type SaleValues = z.infer<typeof saleSchema>;

export const openingBalancesSchema = z.object({
  storeName: requiredText('Store name'),
  openingCash: nonNegativeNumber('Opening cash'),
  openingBank: nonNegativeNumber('Opening bank'),
  openingCustomerDebts: nonNegativeNumber('Customer debts'),
  openingVendorDebts: nonNegativeNumber('Vendor debts'),
});
export type OpeningBalancesValues = z.infer<typeof openingBalancesSchema>;

export const historyEditSchema = z
  .object({
    kind: z.enum(['sale', 'debtPayment', 'expense']),
    date: dateString,
    amountPaid: nonNegativeNumber('Amount paid').optional(),
    status: z.enum(orderStatusValues).optional(),
    amount: positiveNumber('Amount').optional(),
    method: z.enum(payMethodValues).optional(),
    reference: z.string().trim().optional(),
    category: requiredText('Category').optional(),
    description: requiredText('Description').optional(),
  })
  .superRefine((values, ctx) => {
    if (values.kind === 'sale' && values.amountPaid === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amountPaid'],
        message: 'Amount paid is required',
      });
    }
    if (values.kind === 'debtPayment' && values.amount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: 'Amount is required',
      });
    }
    if (values.kind === 'expense') {
      if (!values.category?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['category'],
          message: 'Category is required',
        });
      }
      if (!values.description?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['description'],
          message: 'Description is required',
        });
      }
      if (values.amount === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['amount'],
          message: 'Amount is required',
        });
      }
    }
  });
export type HistoryEditValues = z.infer<typeof historyEditSchema>;

export const pinSchema = z
  .object({
    currentPin: pinString,
    nextPin: pinString,
    confirmPin: pinString,
  })
  .refine((values) => values.nextPin === values.confirmPin, {
    path: ['confirmPin'],
    message: 'New PINs do not match',
  });
export type PinValues = z.infer<typeof pinSchema>;

export const networkPrinterSchema = z.object({
  host: requiredText('Printer IP'),
  port: numericString('Port').refine(
    (value) => Number.isInteger(Number(value)) && Number(value) > 0,
    'Port must be a positive whole number',
  ),
});
export type NetworkPrinterValues = z.infer<typeof networkPrinterSchema>;
