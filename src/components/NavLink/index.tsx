import React, { FC, memo } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  isActive?: boolean;
  name: string;
  path: string;
  icon?: React.ReactNode;
}

const NavLink: FC<Props> = ({ name, path, isActive = false, icon }) => {
  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      className={`rail-link ${isActive ? 'is-active' : ''}`}
      to={path}
    >
      <span className="rail-link__icon">{icon}</span>
      <span className="rail-link__label">{name}</span>
    </Link>
  );
};

export default memo(NavLink);

NavLink.defaultProps = {
  isActive: false,
  icon: null,
};
