export enum State {
  active = 'active',
  inactive = 'inactive',
}

export enum ActionTypes {
  SET_CART_ITEMS = 'SET_CART_ITEMS',
  SET_QUANTITIES = 'SET_QUANTITIES',
  INCREASE_CART_QUANTITY = 'INCREASE_CART_QUANTITY',
  DECREASE_CART_QUANTITY = 'DECREASE_CART_QUANTITY',
  ADD_TO_CART = 'ADD_TO_CART',
  REMOVE_FROM_CART = 'REMOVE_FROM_CART',
  RESET_CART = 'RESET_CART',
  CREATE_ORDER = 'CREATE_ORDER',
}

export enum Toast {
  success = 'success',
  warning = 'warning',
}
export enum OrderStatus {
  paid = 'paid',
  pending = 'pending',
  delivered = 'delivered',
}
