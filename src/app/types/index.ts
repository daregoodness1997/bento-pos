import { ActionTypes, OrderStatus } from 'app/enums';

export type Quantities = {
  [key: string]: number;
};

export type Item = {
  id: string;
  name: string;
  imageUrl: string;
  price: number | string;
  quantity: number;
};

export type Order = {
  cartItems: Item[];
  orderNo: string;
  createdAt: Date;
  createdBy: string;
  status: keyof typeof OrderStatus;
  amountRecieved: number;
  change: number;
  totalPrice?: number;
};

export type Cart = {
  state: {
    cartItems: Item[];
    orders: Order[];
    quantities: Quantities;
    totalPrice: number;
    orderNo: string;
  };
  handlers: {
    resetCart?: () => void;
    handleIncreaseCount: (id: string) => void;
    handleDecreaseCount: (id: string) => void;
    handleRemoveFromCart: (id: string) => void;
    handleAddToCart: (item: Item) => void;
    handleCreateOrder: (order: Order) => void;
  };
};

export type Initial = {
  cartItems: Item[];
  orders: Order[];
  quantities: Quantities;
  totalPrice: number;
  orderNo: string;
};

export interface SetCartItemsAction {
  type: ActionTypes.SET_CART_ITEMS;
  payload: Item[];
}

export interface SetQuantitiesAction {
  type: ActionTypes.SET_QUANTITIES;
  payload: Quantities;
}

export interface IncreaseCartQuantity {
  type: ActionTypes.INCREASE_CART_QUANTITY;
  payload: { id: string };
}
export interface DecreaseCartQuantity {
  type: ActionTypes.DECREASE_CART_QUANTITY;
  payload: { id: string };
}

export interface AddToCartAction {
  type: ActionTypes.ADD_TO_CART;
  payload: Item;
}
export interface RemoveFromCartAction {
  type: ActionTypes.REMOVE_FROM_CART;
  payload: { id: string };
}
export interface ResetCartAction {
  type: ActionTypes.RESET_CART;
}
export interface CreateOrderAction {
  type: ActionTypes.CREATE_ORDER;
}

export type Action =
  | SetCartItemsAction
  | SetQuantitiesAction
  | IncreaseCartQuantity
  | DecreaseCartQuantity
  | AddToCartAction
  | RemoveFromCartAction
  | ResetCartAction
  | CreateOrderAction;
