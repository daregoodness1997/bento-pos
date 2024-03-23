import React, { FC, memo } from 'react';

import { Link } from 'react-router-dom';

import './styles.scss';

interface Props {
  isActive?: boolean;
  name: string;
  path: string;
  icon?: React.ReactNode;
}

const NavLink: FC<Props> = ({ name, path, isActive = false, icon }) => {
  return (
    <Link to={path} className={`nav-link ${isActive ? 'active' : ''}`}>
      {icon} {name}
    </Link>
  );
};

export default memo(NavLink);

NavLink.defaultProps = {
  isActive: false,
  icon: null,
};
