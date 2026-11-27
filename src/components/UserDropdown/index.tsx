import { memo } from 'react';
import type { Key } from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from '@nextui-org/react';
import { useNavigate } from 'react-router-dom';

import { useAuth, useStore } from 'context';

const UserDropdown = () => {
  const navigate = useNavigate();
  const { user, lock, logout } = useAuth();
  const { can } = useStore();

  const handleAction = (key: Key) => {
    if (key === 'day-close') {
      navigate('/app/reports');
    } else if (key === 'settings') {
      navigate('/app/settings');
    } else if (key === 'setup') {
      navigate('/app/setup');
    } else if (key === 'orders') {
      navigate('/app/sales');
    } else if (key === 'pos') {
      navigate('/app/pos');
    } else if (key === 'lock') {
      lock();
    } else if (key === 'logout') {
      logout();
      navigate('/');
    }
  };

  const items = [
    { key: 'pos', label: 'Point of sale', show: can('usePos') },
    { key: 'orders', label: 'View orders', show: true },
    { key: 'day-close', label: 'Day close', show: can('dayClose') },
    {
      key: 'settings',
      label: 'Register settings',
      show: can('manageSettings'),
    },
    { key: 'setup', label: 'Setup', show: can('manageSettings') },
    { key: 'lock', label: 'Lock register', show: true },
    { key: 'logout', label: 'Sign out', show: true },
  ].filter((item) => item.show);

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <button className="user-trigger" type="button">
          <span className="user-avatar">{user?.initials ?? 'AR'}</span>
          <span>
            <span className="user-name">{user?.name ?? 'Cashier'}</span>
            <span className="user-role">{user?.role ?? 'Register user'}</span>
          </span>
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Account actions"
        items={items}
        onAction={handleAction}
      >
        {(item) => (
          <DropdownItem
            color={item.key === 'logout' ? 'danger' : 'default'}
            key={item.key}
          >
            {item.label}
          </DropdownItem>
        )}
      </DropdownMenu>
    </Dropdown>
  );
};

export default memo(UserDropdown);
