import React, { FC, memo, useContext } from 'react';

import { Button, Image, Input, useDisclosure } from '@nextui-org/react';
import { Icon } from '@iconify/react';
import { CartCard, Modal, PrintButton } from 'components';
import { OrderContext } from 'context';
import { ToastUtils } from 'utils';
import { Toast } from 'app';

interface Props {
  children: React.ReactNode;
}

const SideSection: FC<Props> = ({ children }) => {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  const {
    state: { cartItems, orderNo, totalPrice },
    handlers: { handleRemoveFromCart, resetCart, handleCreateOrder },
  } = useContext(OrderContext.Context);

  const orderDate = '12th August 2021';
  const currency = '₦';

  const handlSubmit = async () => {
    try {
      resetCart?.();
      onClose();
      handleCreateOrder({
        cartItems,
        orderNo,
        createdAt: new Date(),
        createdBy: 'Admin',
        status: 'paid',
        amountRecieved: 2000,
        change: 0,
      });
      ToastUtils.displayToast(Toast.success, 'Order created successfully');
    } catch (err) {
      ToastUtils.displayToast(Toast.warning, 'Unable to createe the order');
    }
  };

  return (
    <div className="w-1/3 rounded-lg bg-stone-950">
      <header className="px-2 py-4 flex items-center justify-between">
        <div className="flex-col">
          <h3 className="p-0 m-0">{orderNo}</h3>
          <small className="p-0 m-0 text-gray-400 text-xs">{orderDate}</small>
        </div>
        <Icon icon="gravity-ui:arrow-down-to-square" width="24" height="24" />
      </header>

      {cartItems.length === 0 && (
        <Image
          src="assets/images/flyer.png"
          removeWrapper
          alt="Breathing app icon"
          className="w-full bg-black rounded-t-lg"
          radius="none"
        />
      )}

      <div className="p-8 px-4 ">
        {cartItems.length > 0 ? (
          <div className="flex justify-end my-2">
            <Button
              size="sm"
              variant="ghost"
              color="danger"
              onClick={resetCart}
              radius="full"
            >
              Reset Cart
            </Button>
          </div>
        ) : null}

        {cartItems.length > 0 ? (
          <div className="flex flex-col gap-2">
            {cartItems.map((item) => (
              <CartCard
                key={item.id}
                handleRemoveItem={() => handleRemoveFromCart(item.id)}
                name={item.name}
                price={item.price}
                quantity={item.quantity}
                imageUrl={item.imageUrl}
                currency={currency}
              />
            ))}

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
                {totalPrice}
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
        <Modal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          onSubmit={handlSubmit}
        >
          <Input label="Amount Recieved" />
          <Input label="Change if any" />

          <PrintButton />
        </Modal>
      </div>
    </div>
  );
};

export default memo(SideSection);
