import React, { FC, memo } from 'react';

import { Link } from 'react-router-dom';

import './styles.scss';

interface Props {
  name: string;
  path: string;
}

const NavLink: FC<Props> = ({ name, path }) => {
  return (
    <Link to={path} className="nav-link">
      {name}
    </Link>
  );
};

export default memo(NavLink);
