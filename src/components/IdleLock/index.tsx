import { memo, useEffect } from 'react';

import { useAuth } from 'context';

const IDLE_MS = 5 * 60 * 1000;
const EVENTS = ['pointerdown', 'keydown'] as const;

const IdleLock = () => {
  const { isAuthenticated, locked, lock } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || locked) {
      return () => {};
    }

    let timer = 0;

    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(lock, IDLE_MS);
    };

    EVENTS.forEach((event) => window.addEventListener(event, reset));
    reset();

    return () => {
      window.clearTimeout(timer);
      EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [isAuthenticated, locked, lock]);

  return null;
};

export default memo(IdleLock);
