import React, { FC, memo } from 'react';
import { Card, CardBody, CardFooter, Image, Button } from '@nextui-org/react';

interface Props {
  imageUrl: string;
  name: string;
  currency: string;
  price: number;
}

const MenuCard: FC<Props> = ({ imageUrl, name, price, currency }) => {
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

        <Button radius="full" size="sm" variant="flat">
          Add Item
        </Button>
      </CardFooter>
    </Card>
  );
};

export default memo(MenuCard);
