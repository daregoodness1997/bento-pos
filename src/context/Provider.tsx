import React, {
  FC,
  memo,
  ReactElement,
  useCallback,
  useMemo,
  useReducer,
} from 'react';

import Context from './Context';

type Props = {
  children: ReactElement[] | ReactElement;
};

const Provider: FC<Props> = ({ children }) => {
  return <div>Provider</div>;
};

export default Provider;
