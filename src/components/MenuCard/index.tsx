import React, { FC, memo, useContext } from 'react';
import { Card, CardBody, CardFooter, Image, Button } from '@nextui-org/react';

import { OrderContext } from 'context';
import { Item } from 'app';

interface Props {
  currency: string;
  menu: Item;
}

const MenuCard: FC<Props> = ({ menu, currency }) => {
  const {
    handlers: { handleAddToCart },
  } = useContext(OrderContext.Context);

  const handleAddToCartClicked = () => {
    handleAddToCart(menu);
  };

  const { imageUrl, name, price } = menu;

  return (
    <Card className="p-1" isFooterBlurred isPressable isHoverable>
      <CardBody className="overflow-visible py-2">
        <Image alt={name} className="object-cover rounded-xl " src={imageUrl} />
      </CardBody>
      <CardFooter className="pb-2 pt-2 px-4 flex items-center justify-between">
        <div className="flex-col items-start justify-start text-left">
          <p className="text-tiny uppercase font-bold">{name}</p>
          {/* <small className="text-default-500">{type}</small> */}
          <h4 className="font-bold text-large">
            {currency}
            {price}
          </h4>
        </div>

        <Button
          radius="full"
          size="sm"
          variant="flat"
          onClick={handleAddToCartClicked}
        >
          Add Item
        </Button>
      </CardFooter>
    </Card>
  );
};

export default memo(MenuCard);
