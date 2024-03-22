import React, { memo, FC } from 'react';

import './styles.scss';
import NavLink from '../NavLink';

interface Props {}

const SideMenu: FC<Props> = () => {
  return (
    <div className="side-menu px-2 py-4 ">
      <h4>Bento POS</h4>

      <div className="mt-4">
        <NavLink name="Dashboard" path="/app" />
        <NavLink name="POS" path="/app/pos" />
      </div>
    </div>
  );
};

export default memo(SideMenu);
