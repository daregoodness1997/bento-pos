import { Item, Order } from 'app/types';

export const retrieveCartItemsFromSessionStorage = (): Item[] => {
  const serializedCartItems = localStorage.getItem('cartItems');

  return serializedCartItems ? JSON.parse(serializedCartItems) : [];
};

export const storeCartItemsToSessionStorage = (cartItems: Item[]): void => {
  const serializedCartItems = JSON.stringify(cartItems);
  localStorage.setItem('cartItems', serializedCartItems);
};

export const retrieveOrdersFromSessionStorage = (): Order[] => {
  const serializedOrders = localStorage.getItem('orders');

  return serializedOrders ? JSON.parse(serializedOrders) : [];
};
export const storeOrdersToSessionStorage = (orders: Order[]): void => {
  const serializedOrders = JSON.stringify(orders);
  localStorage.setItem('orders', serializedOrders);
};
