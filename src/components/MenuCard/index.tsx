import React, { FC, memo } from 'react';
import { Image } from '@nextui-org/react';

interface Props {
  imageUrl: string;
  name: string;
  price: number;
  quantity: number;
}

const MenuCard: FC<Props> = ({ imageUrl, name, price, quantity }) => {
  return (
    <div>
      <Image src={imageUrl} alt={name} />
      <div>
        <h2>{name}</h2>
        <p>{price}</p>
        <p>{quantity}</p>
      </div>
    </div>
  );
};

export default memo(MenuCard);
