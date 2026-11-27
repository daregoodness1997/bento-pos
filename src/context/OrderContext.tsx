import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type {
  CartLine,
  Department,
  MenuItem,
  OrderLine,
  OrderType,
  SaleRecord,
  Tender,
} from 'types/store';
import { dateKey } from 'store/seed';
import { availablePortions, roundMoney, stockLevels } from 'utils/finance';
import { useStore } from './StoreContext';

export type { CartLine, MenuItem, OrderLine, OrderType, Tender, SaleRecord };
export type OrderRecord = SaleRecord;

interface OrderContextValue {
  lines: CartLine[];
  orders: SaleRecord[];
  lastOrder: SaleRecord | null;
  ticketNumber: string;
  department: Department;
  orderType: OrderType;
  tender: Tender;
  customerId: string;
  placed: boolean;
  itemCount: number;
  subtotal: number;
  vat: number;
  total: number;
  levels: Record<string, number>;
  portionsFor: (item: MenuItem) => number;
  maxQuantityFor: (id: string) => number;
  canPlaceOrder: boolean;
  addItem: (item: MenuItem) => void;
  setQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  setDepartment: (department: Department) => void;
  setOrderType: (type: OrderType) => void;
  setTender: (tender: Tender) => void;
  setCustomer: (customerId: string) => void;
  placeOrder: () => SaleRecord | null;
  startNewOrder: () => void;
}

interface Props {
  children: React.ReactNode;
}

const OrderContext = createContext<OrderContextValue | undefined>(undefined);

const currentTime = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const OrderProvider = ({ children }: Props) => {
  const { data, recordSale, can } = useStore();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [lastOrder, setLastOrder] = useState<SaleRecord | null>(null);
  const [department, setDepartment] = useState<Department>('Restaurant');
  const [orderType, setOrderTypeState] = useState<OrderType>('Dine in');
  const [tender, setTenderState] = useState<Tender>('Cash');
  const [customerId, setCustomer] = useState('');
  const [placed, setPlaced] = useState(false);

  const levels = useMemo(() => stockLevels(data), [data]);

  const portionsFor = useCallback(
    (item: MenuItem) => availablePortions(item, levels),
    [levels],
  );

  const levelsWithoutLine = useCallback(
    (id?: string) => {
      const remaining = { ...levels };
      lines.forEach((line) => {
        if (line.id === id) {
          return;
        }
        line.recipe.forEach((part) => {
          if (remaining[part.itemId] !== undefined) {
            remaining[part.itemId] -= part.quantity * line.quantity;
          }
        });
      });
      return remaining;
    },
    [levels, lines],
  );

  const maxQuantityFor = useCallback(
    (id: string) => {
      const line = lines.find((entry) => entry.id === id);
      return line ? availablePortions(line, levelsWithoutLine(id)) : Infinity;
    },
    [lines, levelsWithoutLine],
  );

  const addItem = useCallback(
    (item: MenuItem) => {
      const existing = lines.find((line) => line.id === item.id);
      const existingQuantity = existing?.quantity ?? 0;
      const available = existing ? maxQuantityFor(item.id) : portionsFor(item);
      if (existingQuantity >= available) {
        return;
      }
      setLines((current) => {
        const currentLine = current.find((line) => line.id === item.id);
        if (currentLine) {
          return current.map((line) =>
            line.id === item.id
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          );
        }
        return [...current, { ...item, quantity: 1 }];
      });
      setPlaced(false);
      setLastOrder(null);
    },
    [lines, maxQuantityFor, portionsFor],
  );

  const setQuantity = useCallback(
    (id: string, quantity: number) => {
      const next = Number.isFinite(quantity)
        ? Math.min(Math.floor(quantity), maxQuantityFor(id))
        : 0;
      setLines((current) =>
        next <= 0
          ? current.filter((line) => line.id !== id)
          : current.map((line) =>
              line.id === id ? { ...line, quantity: next } : line,
            ),
      );
    },
    [maxQuantityFor],
  );

  const removeItem = useCallback((id: string) => {
    setLines((current) => current.filter((line) => line.id !== id));
  }, []);

  const setOrderType = useCallback(
    (type: OrderType) => setOrderTypeState(type),
    [],
  );
  const setTender = useCallback((next: Tender) => setTenderState(next), []);

  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  );
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [lines],
  );
  const vat = data.settings.vatEnabled
    ? Math.round(subtotal * data.settings.vatRate)
    : 0;
  const total = subtotal + vat;

  const canPlaceOrder = useMemo(
    () =>
      lines.length > 0 &&
      can('recordSale') &&
      lines.every(
        (line) => line.quantity > 0 && line.quantity <= maxQuantityFor(line.id),
      ),
    [can, lines, maxQuantityFor],
  );

  const placeOrder = useCallback(() => {
    if (!canPlaceOrder) {
      return null;
    }

    const orderLines: OrderLine[] = lines.map((line) => {
      const recipe = line.recipe.map((part) => ({ ...part }));
      const cost = recipe.reduce((sum, part) => {
        const inventoryItem = data.inventory.find(
          (item) => item.id === part.itemId,
        );
        return sum + (inventoryItem ? inventoryItem.cost * part.quantity : 0);
      }, 0);
      return {
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.price,
        cost: roundMoney(cost),
        itemId: line.id,
        recipe,
      };
    });

    const record = recordSale({
      date: dateKey(),
      time: currentTime(),
      department,
      orderType,
      tender,
      customerId: tender === 'Credit' ? customerId || undefined : undefined,
      lines: orderLines,
    });

    if (record) {
      setLastOrder(record);
      setPlaced(true);
      setLines([]);
    }

    return record;
  }, [
    canPlaceOrder,
    customerId,
    data.inventory,
    department,
    lines,
    orderType,
    recordSale,
    tender,
  ]);

  const startNewOrder = useCallback(() => {
    setLines([]);
    setPlaced(false);
    setLastOrder(null);
  }, []);

  const ticketNumber = useMemo(() => {
    const saleNumbers = data.sales
      .map((sale) => Number(sale.id.replace('#', '')))
      .filter((value) => Number.isFinite(value));
    return `#${Math.max(1048, ...saleNumbers) + 1}`;
  }, [data.sales]);

  const value = useMemo<OrderContextValue>(
    () => ({
      lines,
      orders: data.sales,
      lastOrder,
      ticketNumber,
      department,
      orderType,
      tender,
      customerId,
      placed,
      itemCount,
      subtotal,
      vat,
      total,
      levels,
      portionsFor,
      maxQuantityFor,
      canPlaceOrder,
      addItem,
      setQuantity,
      removeItem,
      setDepartment,
      setOrderType,
      setTender,
      setCustomer,
      placeOrder,
      startNewOrder,
    }),
    [
      addItem,
      canPlaceOrder,
      customerId,
      data.sales,
      department,
      itemCount,
      lastOrder,
      levels,
      lines,
      maxQuantityFor,
      orderType,
      placed,
      placeOrder,
      portionsFor,
      removeItem,
      setOrderType,
      setQuantity,
      setTender,
      startNewOrder,
      subtotal,
      tender,
      ticketNumber,
      total,
      vat,
    ],
  );

  return (
    <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within OrderProvider');
  }
  return context;
};

export default OrderProvider;
