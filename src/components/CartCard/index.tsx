import React, { FC, memo } from 'react';
import { Avatar, Card, Chip } from '@nextui-org/react';
import { Icon } from '@iconify/react';

interface Props {
  name: string;
  imageUrl: string;
  quantity: number;
  handleRemoveItem: () => void;
}

const CartCard: FC<Props> = ({
  imageUrl,
  name,
  quantity = 1,
  handleRemoveItem,
}) => {
  return (
    <Card className="p-4 " isPressable isHoverable>
      <div className="flex justify-between items-center w-full gap-2">
        <div className="flex items-center  gap-2">
          <div className="flex items-center  gap-4">
            <Chip variant="bordered" size="sm">
              x {quantity}
            </Chip>
            <Avatar isBordered color="default" src={imageUrl} />
          </div>

          <div className="text-sm text-ellipsis text-white text-left">
            {name}
          </div>
        </div>

        <Icon
          icon="gravity-ui:trash-bin"
          width="20"
          height="20"
          style={{ color: '#d01b1b' }}
          onClick={handleRemoveItem}
        />
      </div>
    </Card>
  );
};

export default memo(CartCard);
