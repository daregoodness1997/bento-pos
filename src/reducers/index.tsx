import {
  ActionTypes,
  Initial,
  retrieveCartItemsFromSessionStorage,
  storeCartItemsToSessionStorage,
} from 'app';
import { MENU } from 'pages/Dashboard/constants';

const initialState: Initial = {
  cartItems: retrieveCartItemsFromSessionStorage(),
  quantities: MENU.reduce(
    (acc, { id, quantity }) => ({ ...acc, [id]: quantity }),
    {},
  ),
  totalPrice: 0,
};

initialState.totalPrice = initialState.cartItems.reduce((accumulator, item) => {
  return accumulator + Number(item.price) * item.quantity;
}, 0);

function reducer(state: any, action: any): any {
  switch (action.type) {
    case ActionTypes.SET_CART_ITEMS:
      return { ...state, cartItems: action.payload };
    case ActionTypes.SET_QUANTITIES:
      return { ...state, quantities: action.payload };

    case ActionTypes.INCREASE_CART_QUANTITY: {
      const { id } = action.payload;
      state.quantities[id] = (state.quantities[id] || 0) + 1;

      const existingItem = state.cartItems.find(
        (cartItem: any) => String(cartItem.id) === String(id),
      );
      if (existingItem) {
        state.cartItems = state.cartItems.map((cartItem: any) =>
          String(cartItem.id) === String(id)
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
        storeCartItemsToSessionStorage(state.cartItems);
      }

      return { ...state };
    }
    case ActionTypes.DECREASE_CART_QUANTITY: {
      const { id } = action.payload;
      state.quantities[id] = (state.quantities[id] || 0) - 1;

      const existingItem = state.cartItems.find(
        (cartItem: any) => String(cartItem.id) === String(id),
      );
      if (existingItem) {
        state.cartItems = state.cartItems.map((cartItem: any) =>
          String(cartItem.id) === String(id)
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem,
        );
        storeCartItemsToSessionStorage(state.cartItems);
      }

      return { ...state };
    }
    case ActionTypes.ADD_TO_CART: {
      const item = action.payload;
      const existingItem = state.cartItems.find(
        (cartItem: any) => String(cartItem.id) === String(item.id),
      );
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.cartItems.push({ ...item, quantity: 1 } as any);
      }

      storeCartItemsToSessionStorage(state.cartItems);

      return { ...state };
    }
    case ActionTypes.REMOVE_FROM_CART: {
      const itemId = String(action.payload);
      state.cartItems = state.cartItems.filter(
        (cartItem: any) => String(cartItem.id) !== itemId,
      );
      storeCartItemsToSessionStorage(state.cartItems);

      return { ...state };
    }

    case ActionTypes.RESET_CART: {
      state.cartItems = [];
      storeCartItemsToSessionStorage([]);

      return { ...state };
    }
    default:
      return state;
  }
}

export { reducer, initialState };
