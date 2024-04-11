import React, { FC, memo } from 'react';
import { Avatar, Card, Chip, useDisclosure } from '@nextui-org/react';
import { Icon } from '@iconify/react';
import Modal from 'components/Modal';

interface Props {}

const CartCard: FC<Props> = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <Card className="p-4 " isPressable isHoverable>
      <div className="flex justify-between items-center w-full gap-2">
        <div className="flex items-center  gap-2">
          <div className="flex items-center  gap-4">
            <Chip variant="bordered" size="sm">
              x 1
            </Chip>
            <Avatar
              isBordered
              color="default"
              src="https://source.unsplash.com/900x900/?chicken'"
            />
          </div>

          <div className="text-sm text-ellipsis text-white text-left">
            Fried Rice and Turkey to bad gaan...
          </div>
        </div>

        <Icon
          icon="gravity-ui:trash-bin"
          width="20"
          height="20"
          style={{ color: '#d01b1b' }}
          onClick={onOpen}
        />
      </div>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        Do you want to remove the item from the cart
      </Modal>
    </Card>
  );
};

export default memo(CartCard);
