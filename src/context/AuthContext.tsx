import type { ReactElement } from 'react';
import type { Role } from 'types/store';
import { useStore } from './StoreContext';

export interface AuthUser {
  email: string;
  initials: string;
  name: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  locked: boolean;
  pin: string;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  lock: () => void;
  unlock: (pin: string) => boolean;
  setPin: (currentPin: string, nextPin: string) => boolean;
}

export const DEMO_EMAIL = 'ada@bento.pos';
export const DEMO_PASSWORD = 'bento1234';
export const DEFAULT_PIN = '1234';

export const AuthProvider = ({ children }: { children: ReactElement }) =>
  children;

export const useAuth = (): AuthContextValue => {
  const { currentUser, data, login, logout, lock, unlock, setPin } = useStore();

  return {
    user: currentUser
      ? {
          email: currentUser.email,
          initials: currentUser.initials,
          name: currentUser.name,
          role: currentUser.role,
        }
      : null,
    isAuthenticated: currentUser !== null,
    locked: data.locked,
    pin: currentUser?.pin ?? DEFAULT_PIN,
    login,
    logout,
    lock,
    unlock,
    setPin,
  };
};

export default AuthProvider;
