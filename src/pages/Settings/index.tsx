import React, { memo, useEffect, useState } from 'react';
import { Switch } from '@nextui-org/react';

import { DashboardLayout } from 'layouts';
import { ThermalPrinterPanel } from 'components';
import { DEFAULT_PIN, useAuth, usePrint, useStore } from 'context';
import { DEFAULT_SETTINGS } from 'store/seed';
import type { AppSettings } from 'types/store';

const SECTIONS = [
  'Register',
  'Receipt',
  'Printer',
  'Payments',
  'Security',
] as const;
type Section = (typeof SECTIONS)[number];

const Settings = () => {
  const { data, updateSettings } = useStore();
  const { setPin: updatePin, lock, pin } = useAuth();
  const { autoPrint, setAutoPrint } = usePrint();
  const [section, setSection] = useState<Section>('Register');
  const [draft, setDraft] = useState<AppSettings>(data.settings);
  const [saved, setSaved] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');

  useEffect(() => {
    setDraft(data.settings);
  }, [data.settings]);

  useEffect(() => {
    if (!saved) {
      return () => {};
    }
    const timer = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const patch = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSave = () => {
    updateSettings(draft);
    setSaved(true);
  };

  const handleDiscard = () => {
    setDraft({ ...DEFAULT_SETTINGS });
    setAutoPrint(true);
    setCurrentPin('');
    setNextPin('');
    setConfirmPin('');
    setPinMessage('');
  };

  const handlePinSave = () => {
    if (nextPin !== confirmPin) {
      setPinMessage('The new PIN entries do not match.');
      return;
    }
    if (!updatePin(currentPin, nextPin)) {
      setPinMessage('Check the current PIN and use four digits.');
      return;
    }
    setCurrentPin('');
    setNextPin('');
    setConfirmPin('');
    setPinMessage('PIN updated. Use it the next time the register locks.');
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Keep this register ready for the next shift.
          </p>
        </div>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {SECTIONS.map((name) => (
            <button
              className={section === name ? 'is-active' : ''}
              key={name}
              onClick={() => setSection(name)}
              type="button"
            >
              {name}
            </button>
          ))}
        </nav>

        <div className="settings-sections">
          {section === 'Register' && (
            <section className="settings-card">
              <h2 className="panel-title">Register details</h2>
              <p className="panel-subtitle">
                Shown on the counter and at sign-in.
              </p>
              <div className="field-grid">
                <label className="field-label" htmlFor="store-name">
                  <span>Store name</span>
                  <input
                    className="field-input"
                    id="store-name"
                    onChange={(event) => patch('storeName', event.target.value)}
                    value={draft.storeName}
                  />
                </label>
                <label className="field-label" htmlFor="terminal-id">
                  <span>Terminal label</span>
                  <input
                    className="field-input"
                    id="terminal-id"
                    onChange={(event) =>
                      patch('terminalId', event.target.value)
                    }
                    value={draft.terminalId}
                  />
                </label>
              </div>
              <p className="admin-note">
                Opening cash and bank balances are managed in Setup → Opening
                balances.
              </p>
            </section>
          )}

          {section === 'Receipt' && (
            <section className="settings-card">
              <h2 className="panel-title">Receipt</h2>
              <p className="panel-subtitle">
                What customers see after payment.
              </p>
              <div className="field-grid">
                <label className="field-label" htmlFor="receipt-footer">
                  <span>Footer message</span>
                  <input
                    className="field-input"
                    id="receipt-footer"
                    onChange={(event) =>
                      patch('receiptFooter', event.target.value)
                    }
                    value={draft.receiptFooter}
                  />
                </label>
              </div>
              <div className="setting-row">
                <div>
                  <div className="setting-row__title">Print automatically</div>
                  <div className="setting-row__description">
                    Send each receipt to the printer after payment.
                  </div>
                </div>
                <Switch
                  color="primary"
                  isSelected={autoPrint}
                  onChange={(event) => setAutoPrint(event.target.checked)}
                  size="sm"
                />
              </div>
              <div className="setting-row">
                <div>
                  <div className="setting-row__title">Include logo</div>
                  <div className="setting-row__description">
                    Add the Bento mark at the top of each receipt.
                  </div>
                </div>
                <Switch
                  color="primary"
                  isSelected={draft.showLogo}
                  onChange={(event) => patch('showLogo', event.target.checked)}
                  size="sm"
                />
              </div>
            </section>
          )}

          {section === 'Printer' && (
            <section className="settings-card">
              <h2 className="panel-title">Printer</h2>
              <p className="panel-subtitle">
                Connect the thermal printer used for counter receipts.
              </p>
              <ThermalPrinterPanel />
            </section>
          )}

          {section === 'Payments' && (
            <section className="settings-card">
              <h2 className="panel-title">Payments</h2>
              <p className="panel-subtitle">
                Choose how this register can take payment.
              </p>
              {(
                [
                  [
                    'cashEnabled',
                    'Cash',
                    'Accept notes and coins at the counter.',
                  ],
                  ['transferEnabled', 'Transfer', 'Accept bank transfers.'],
                  ['posEnabled', 'POS', 'Accept card and POS payments.'],
                  ['creditEnabled', 'Credit', 'Let customers pay later.'],
                ] as const
              ).map(([key, title, description]) => (
                <div className="setting-row" key={key}>
                  <div>
                    <div className="setting-row__title">{title}</div>
                    <div className="setting-row__description">
                      {description}
                    </div>
                  </div>
                  <Switch
                    color="primary"
                    isSelected={draft[key]}
                    onChange={(event) => patch(key, event.target.checked)}
                    size="sm"
                  />
                </div>
              ))}
              <div className="setting-row">
                <div>
                  <div className="setting-row__title">Add VAT</div>
                  <div className="setting-row__description">
                    Apply {Math.round(draft.vatRate * 1000) / 10}% VAT to every
                    ticket.
                  </div>
                </div>
                <Switch
                  color="primary"
                  isSelected={draft.vatEnabled}
                  onChange={(event) =>
                    patch('vatEnabled', event.target.checked)
                  }
                  size="sm"
                />
              </div>
            </section>
          )}

          {section === 'Security' && (
            <section className="settings-card">
              <h2 className="panel-title">Security</h2>
              <p className="panel-subtitle">
                Protect this register when the counter is unattended.
              </p>
              <div className="field-grid">
                <label className="field-label" htmlFor="current-pin">
                  <span>Current PIN</span>
                  <input
                    className="field-input"
                    id="current-pin"
                    inputMode="numeric"
                    maxLength={4}
                    onChange={(event) => {
                      setCurrentPin(event.target.value);
                      setPinMessage('');
                    }}
                    type="password"
                    value={currentPin}
                  />
                </label>
                <label className="field-label" htmlFor="new-pin">
                  <span>New PIN</span>
                  <input
                    className="field-input"
                    id="new-pin"
                    inputMode="numeric"
                    maxLength={4}
                    onChange={(event) => {
                      setNextPin(event.target.value);
                      setPinMessage('');
                    }}
                    type="password"
                    value={nextPin}
                  />
                </label>
                <label className="field-label" htmlFor="confirm-pin">
                  <span>Confirm new PIN</span>
                  <input
                    className="field-input"
                    id="confirm-pin"
                    inputMode="numeric"
                    maxLength={4}
                    onChange={(event) => {
                      setConfirmPin(event.target.value);
                      setPinMessage('');
                    }}
                    type="password"
                    value={confirmPin}
                  />
                </label>
              </div>
              {pinMessage && <p className="pin-message">{pinMessage}</p>}
              {pin === DEFAULT_PIN && (
                <p className="pin-hint pin-hint--inline">
                  Demo PIN: {DEFAULT_PIN}
                </p>
              )}
              <div className="pin-settings__actions">
                <button
                  className="secondary-button"
                  onClick={lock}
                  type="button"
                >
                  Lock now
                </button>
                <button
                  className="primary-button"
                  onClick={handlePinSave}
                  type="button"
                >
                  Update PIN
                </button>
              </div>
            </section>
          )}

          <div className="settings-actions">
            <button
              className="secondary-button"
              onClick={handleDiscard}
              type="button"
            >
              Reset
            </button>
            <button
              className="primary-button"
              onClick={handleSave}
              type="button"
            >
              {saved ? 'Saved' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default memo(Settings);
