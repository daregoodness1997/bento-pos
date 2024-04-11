import React, { FC, memo } from 'react';

import { Button, Image, useDisclosure } from '@nextui-org/react';
import { Icon } from '@iconify/react';
import { CartCard, Modal } from 'components';

interface Props {
  children: React.ReactNode;
}

const SideSection: FC<Props> = ({ children }) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const orderNo = 'Order#177384';
  const orderDate = '12th August 2021';
  const orderTotalPrice = '4000';
  const currency = '₦';
  const cartItems = [];

  return (
    <div className="w-1/3 rounded-lg bg-stone-950">
      <header className="px-2 py-4 flex items-center justify-between">
        <div className="flex-col">
          <h3 className="p-0 m-0">{orderNo}</h3>
          <small className="p-0 m-0 text-gray-400 text-xs">{orderDate}</small>
        </div>
        <Icon icon="gravity-ui:arrow-down-to-square" width="24" height="24" />
      </header>

      <Image
        src="assets/images/flyer.png"
        removeWrapper
        alt="Breathing app icon"
        className="w-full bg-black rounded-t-lg"
        radius="none"
      />
      <div className="p-8 px-4 ">
        {cartItems.length > 0 ? (
          <div className="flex flex-col gap-2">
            <CartCard />
            <CartCard />
            <CartCard />
            <CartCard />
            <CartCard />

            <div className="flex items-center gap-2 my-4">
              <Button variant="bordered" radius="full" size="lg">
                Cancel
              </Button>
              <Button
                variant="solid"
                color="primary"
                radius="full"
                fullWidth
                size="lg"
                onClick={onOpen}
              >
                Charge Customer {currency}
                {orderTotalPrice}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center p-8">
            <Image src="assets/svg/empty-state.svg" />
            <p>🛒 No Item in order cart</p>
          </div>
        )}

        <div>{children}</div>
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
          Do you want to remove the item from the cart
        </Modal>
      </div>
    </div>
  );
};

export default memo(SideSection);
