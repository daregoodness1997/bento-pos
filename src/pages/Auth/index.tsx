import { memo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppInput, EyeFilledIcon, EyeSlashFilledIcon } from 'components';
import { DEMO_EMAIL, DEMO_PASSWORD, useAuth } from 'context';
import { formatNaira } from 'utils/format';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!login(email, password)) {
      setError('Those details do not match this register.');
      return;
    }

    navigate('/app');
  };

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-brand">
          <span className="auth-brand__mark">B</span>
          <span className="auth-brand__name">BentoPOS</span>
        </div>

        <div className="auth-statement">
          <h1>Service starts at the counter.</h1>
          <p>
            Build tickets, take payment, and keep the line moving from one
            focused workspace.
          </p>
        </div>

        <div className="auth-ticket">
          <div className="ticket-eyebrow">
            <span>Ticket #1042</span>
            <span>Dine in</span>
          </div>
          <div className="auth-ticket__line">
            <span>Chicken Wings × 2</span>
            <span>{formatNaira(12000)}</span>
          </div>
          <div className="auth-ticket__line">
            <span>Fried Rice × 2</span>
            <span>{formatNaira(5000)}</span>
          </div>
          <div className="auth-ticket__line">
            <span>Zobo × 2</span>
            <span>{formatNaira(2400)}</span>
          </div>
          <div className="ticket-row">
            <span>Subtotal</span>
            <span>{formatNaira(19400)}</span>
          </div>
          <div className="ticket-row">
            <span>VAT (7.5%)</span>
            <span>{formatNaira(1455)}</span>
          </div>
          <div className="auth-ticket__total">
            <span>Total due</span>
            <span>{formatNaira(20855)}</span>
          </div>
        </div>
      </aside>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Start your shift</h2>
          <p className="auth-form__subtitle">Sign in to open register 02.</p>

          <div className="auth-field">
            <label htmlFor="email">
              <span>Email</span>
              <div className="auth-input-wrap">
                <AppInput
                  aria-label="Email"
                  autoComplete="email"
                  classNames={{
                    inputWrapper:
                      'h-[46px] min-h-[46px] border-[#2c3b3d] bg-[#11191b] data-[hover=true]:border-[#ffb020]',
                  }}
                  id="email"
                  isRequired
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError('');
                  }}
                  placeholder="you@bento.pos"
                  type="email"
                  value={email}
                />
              </div>
            </label>
          </div>

          <div className="auth-field">
            <label htmlFor="password">
              <span>Password</span>
              <div className="auth-input-wrap">
                <AppInput
                  aria-label="Password"
                  autoComplete="current-password"
                  classNames={{
                    input: 'pr-11',
                    inputWrapper:
                      'h-[46px] min-h-[46px] border-[#2c3b3d] bg-[#11191b] data-[hover=true]:border-[#ffb020]',
                  }}
                  id="password"
                  isRequired
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError('');
                  }}
                  placeholder="Enter your password"
                  type={isVisible ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={isVisible ? 'Hide password' : 'Show password'}
                  className="auth-toggle"
                  onClick={() => setIsVisible((current) => !current)}
                  type="button"
                >
                  {isVisible ? <EyeSlashFilledIcon /> : <EyeFilledIcon />}
                </button>
              </div>
            </label>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button className="auth-submit" type="submit">
            Open register
          </button>

          <div className="auth-meta">
            <span>BentoPOS v4.6</span>
            <span>
              Demo: {DEMO_EMAIL} / {DEMO_PASSWORD}
            </span>
            <span>
              Owner, manager, cashier and auditor demo accounts share this
              password.
            </span>
          </div>
        </form>
      </section>
    </div>
  );
};

export default memo(Auth);
