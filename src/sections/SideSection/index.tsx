import React, { FC, memo } from 'react';

import { Image } from '@nextui-org/react';
import { Icon } from '@iconify/react';

interface Props {
  children: React.ReactNode;
}

const SideSection: FC<Props> = ({ children }) => {
  const orderNo = 'Order#177384';
  const orderDate = '12th August 2021';
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
      <div className="p-8 ">
        <div>{children}</div>
      </div>
    </div>
  );
};

export default memo(SideSection);
