import React, { FC, memo } from 'react';
import { Card, CardHeader, CardBody } from '@nextui-org/react';
import { Icon } from '@iconify/react';

interface Props {
  title: string;
  value: string;
  icon: string;
}

export const StatCard: FC<Props> = ({ icon, title, value }) => {
  return (
    <Card
      className="max-w-[400px] px-6 py-4 "
      shadow="lg"
      fullWidth
      isHoverable
      isPressable
    >
      <CardHeader className="flex gap-3">
        <div className="flex flex-col">
          <Icon icon={icon} className=" text-[32px]" />
          <p className="text-large text-default-500">{value}</p>
        </div>
      </CardHeader>
      <CardBody>
        <p>{title}</p>
      </CardBody>
    </Card>
  );
};

export default memo(StatCard);
