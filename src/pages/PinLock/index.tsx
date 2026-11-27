import { memo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { BackspaceIcon, LockIcon } from 'components';
import { DEFAULT_PIN, useAuth } from 'context';

const KEYS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'clear',
  '0',
  'delete',
];

const PinLock = () => {
  const { unlock, logout, pin } = useAuth();
  const navigate = useNavigate();
  const [entry, setEntry] = useState('');
  const [error, setError] = useState('');

  const handleDigit = useCallback((digit: string) => {
    setError('');
    setEntry((current) =>
      current.length >= 4 ? current : `${current}${digit}`,
    );
  }, []);

  const handleDelete = useCallback(() => {
    setError('');
    setEntry((current) => current.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setError('');
    setEntry('');
  }, []);

  useEffect(() => {
    if (entry.length !== 4) {
      return () => {};
    }

    const timer = window.setTimeout(() => {
      if (!unlock(entry)) {
        setError('Incorrect PIN. Try again.');
        setEntry('');
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [entry, unlock]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) {
        handleDigit(event.key);
      }

      if (event.key === 'Backspace') {
        handleDelete();
      }

      if (event.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleDelete, handleClear]);

  const handleAccountSwitch = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="pin-shell">
      <section className="pin-panel">
        <div className="pin-brand">
          <span className="auth-brand__mark">B</span>
          <span>BentoPOS</span>
        </div>

        <div className="pin-lock-mark">
          <LockIcon />
        </div>

        <h1>Register locked</h1>
        <p className="pin-subtitle">
          Enter the 4-digit PIN to resume this register.
        </p>

        <div
          aria-label={`${entry.length} of 4 digits entered`}
          className="pin-dots"
        >
          {[0, 1, 2, 3].map((index) => (
            <span
              className={index < entry.length ? 'is-filled' : ''}
              key={index}
            />
          ))}
        </div>

        {error && (
          <p className="pin-error" role="alert">
            {error}
          </p>
        )}

        <div className="pin-keypad">
          {KEYS.map((key) => {
            if (key === 'clear') {
              return (
                <button
                  className="pin-key pin-key--text"
                  key={key}
                  onClick={handleClear}
                  type="button"
                >
                  Clear
                </button>
              );
            }

            if (key === 'delete') {
              return (
                <button
                  aria-label="Delete last digit"
                  className="pin-key pin-key--icon"
                  key={key}
                  onClick={handleDelete}
                  type="button"
                >
                  <BackspaceIcon />
                </button>
              );
            }

            return (
              <button
                aria-label={`Enter ${key}`}
                className="pin-key"
                key={key}
                onClick={() => handleDigit(key)}
                type="button"
              >
                {key}
              </button>
            );
          })}
        </div>

        <button
          className="pin-account"
          onClick={handleAccountSwitch}
          type="button"
        >
          Use another account
        </button>

        {pin === DEFAULT_PIN && (
          <span className="pin-hint">Demo PIN: {DEFAULT_PIN}</span>
        )}
      </section>
    </div>
  );
};

export default memo(PinLock);
