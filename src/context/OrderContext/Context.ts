import { createContext } from 'react';

import { Cart } from 'app';

const INITIAL_CONTEXT_VALUE: Cart = {
  state: {
    cartItems: [],
    orders: [],
    quantities: {},
    totalPrice: 0,
    orderNo: '',
  },
  handlers: {
    handleIncreaseCount: () => null,
    handleDecreaseCount: () => null,
    handleRemoveFromCart: () => null,
    handleAddToCart: () => null,
    handleCreateOrder: () => null,
    resetCart: () => null,
  },
};

const Context = createContext<Cart>(INITIAL_CONTEXT_VALUE);

export default Context;
