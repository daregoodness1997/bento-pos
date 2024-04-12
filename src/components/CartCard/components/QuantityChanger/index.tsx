import React, { FC, memo } from 'react';
import { Button } from '@nextui-org/react';

interface Props {
  quantity: number;
  handleIncrease: () => void;
  handleDecrease: () => void;
}

const QuantityChanger: FC<Props> = ({
  quantity,
  handleIncrease,
  handleDecrease,
}) => {
  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleDecrease}>-</Button>
      {quantity}
      <Button onClick={handleIncrease}>+</Button>
    </div>
  );
};

export default memo(QuantityChanger);
