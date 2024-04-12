import { createContext } from 'react';

import { Cart } from 'app';

const INITIAL_CONTEXT_VALUE: Cart = {
  state: {
    cartItems: [],
    quantities: {},
    totalPrice: 0,
  },
  handlers: {
    handleIncreaseCount: () => null,
    handleDecreaseCount: () => null,
    handleRemoveFromCart: () => null,
    handleAddToCart: () => null,
    resetCart: () => null,
  },
};

const Context = createContext<Cart>(INITIAL_CONTEXT_VALUE);

export default Context;
