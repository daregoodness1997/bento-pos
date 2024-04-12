import React, {
  FC,
  memo,
  ReactElement,
  useCallback,
  useMemo,
  useReducer,
} from 'react';

import { reducer, initialState } from 'reducers';
import { ActionTypes, Item, Toast } from 'app';
import { ToastUtils } from 'utils';

import Context from './Context';

type Props = {
  children: ReactElement[] | ReactElement;
};

const Provider: FC<Props> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const resetCart = useCallback(() => {
    dispatch({ type: ActionTypes.RESET_CART });
  }, [dispatch]);

  const handleIncreaseCount = useCallback(
    (id: string) => {
      dispatch({
        type: ActionTypes.INCREASE_CART_QUANTITY,
        payload: { id },
      });
    },
    [dispatch],
  );
  const handleDecreaseCount = useCallback(
    (id: string) => {
      dispatch({
        type: ActionTypes.DECREASE_CART_QUANTITY,
        payload: { id },
      });
    },
    [dispatch],
  );
  const handleRemoveFromCart = useCallback(
    (id: string) => {
      dispatch({ type: ActionTypes.REMOVE_FROM_CART, payload: { id } });
    },
    [dispatch],
  );

  const handleAddToCart = useCallback(
    (item: Item) => {
      dispatch({ type: ActionTypes.ADD_TO_CART, payload: item });
      ToastUtils.displayToast(
        Toast.success,
        'Congratulations, you have successfully added the item to your cart',
      );
    },
    [dispatch],
  );

  state.totalPrice = state.cartItems.reduce(
    (accumulator: number, item: { price: number; quantity: number }) => {
      return accumulator + Number(item.price) * item.quantity;
    },
    0,
  );

  const orderState = useMemo(
    () => ({
      state,
      handlers: {
        resetCart,
        handleIncreaseCount,
        handleDecreaseCount,
        handleRemoveFromCart,
        handleAddToCart,
      },
    }),
    [
      handleAddToCart,
      handleDecreaseCount,
      handleIncreaseCount,
      handleRemoveFromCart,

      resetCart,
      state,
    ],
  );

  return <Context.Provider value={orderState}>{children}</Context.Provider>;
};

export default memo(Provider);
