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
import { availablePortions, stockLevels } from 'utils/finance';
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

  const addItem = useCallback(
    (item: MenuItem) => {
      if (portionsFor(item) <= 0) {
        return;
      }
      setLines((current) => {
        const existing = current.find((line) => line.id === item.id);
        if (existing) {
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
    [portionsFor],
  );

  const setQuantity = useCallback((id: string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.id !== id)
        : current.map((line) =>
            line.id === id ? { ...line, quantity } : line,
          ),
    );
  }, []);

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

  const placeOrder = useCallback(() => {
    if (lines.length === 0 || !can('recordSale')) {
      return null;
    }

    const orderLines: OrderLine[] = lines.map((line) => {
      const cost = line.recipe.reduce((sum, part) => {
        const inventoryItem = data.inventory.find(
          (item) => item.id === part.itemId,
        );
        return sum + (inventoryItem ? inventoryItem.cost * part.quantity : 0);
      }, 0);
      return {
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.price,
        cost: Math.round(cost),
        itemId: line.id,
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
    can,
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
      customerId,
      data.sales,
      department,
      itemCount,
      lastOrder,
      levels,
      lines,
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
