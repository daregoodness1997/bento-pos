import { Item } from 'app/types';

export const retrieveCartItemsFromSessionStorage = (): Item[] => {
  const serializedCartItems = localStorage.getItem('cartItems');

  return serializedCartItems ? JSON.parse(serializedCartItems) : [];
};

export const storeCartItemsToSessionStorage = (cartItems: Item[]): void => {
  const serializedCartItems = JSON.stringify(cartItems);
  localStorage.setItem('cartItems', serializedCartItems);
};
