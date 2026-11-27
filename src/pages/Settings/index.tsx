import { memo, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Switch } from '@nextui-org/react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';

import { DashboardLayout } from 'layouts';
import { AppInput, Field, PageHeader, ThermalPrinterPanel } from 'components';
import { DEFAULT_PIN, useAuth, useConfirm, useStore } from 'context';
import { pinSchema } from 'schemas/forms';
import type { PinValues } from 'schemas/forms';
import { DEFAULT_SETTINGS } from 'store/seed';
import type { AppSettings } from 'types/store';
import Setup from '../Setup';

const SECTIONS = [
  'Register',
  'Receipt',
  'Printer',
  'Payments',
  'Security',
  'Setup',
] as const;
type Section = (typeof SECTIONS)[number];

const readSection = (value: string | null): Section =>
  SECTIONS.find((item) => item === value) ?? 'Register';

const Settings = () => {
  const { data, updateSettings } = useStore();
  const { setPin: updatePin, lock, pin } = useAuth();
  const confirmAction = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState<Section>(() =>
    readSection(searchParams.get('section')),
  );
  const [draft, setDraft] = useState<AppSettings>(data.settings);
  const [saved, setSaved] = useState(false);
  const [pinMessage, setPinMessage] = useState('');
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<PinValues>({
    defaultValues: { currentPin: '', nextPin: '', confirmPin: '' },
    resolver: zodResolver(pinSchema),
  });

  useEffect(() => {
    setDraft(data.settings);
  }, [data.settings]);

  useEffect(() => {
    setSection(readSection(searchParams.get('section')));
  }, [searchParams]);

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
    reset();
    setPinMessage('');
  };

  const handlePinSave = async (values: PinValues) => {
    setPinMessage('');
    if (
      !(await confirmAction('Replace the register unlock PIN?', {
        title: 'Update PIN?',
        confirmLabel: 'Update PIN',
        tone: 'primary',
      }))
    ) {
      return;
    }
    if (!updatePin(values.currentPin, values.nextPin)) {
      setPinMessage('Check the current PIN and use four digits.');
      return;
    }
    reset();
    setPinMessage('PIN updated. Use it the next time the register locks.');
  };

  const selectSection = (next: Section) => {
    setSection(next);
    setSearchParams({ section: next });
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Settings"
        subtitle="Keep this register ready for the next shift."
      />

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {SECTIONS.map((name) => (
            <button
              className={section === name ? 'is-active' : ''}
              key={name}
              onClick={() => selectSection(name)}
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
                  <AppInput
                    aria-label="Store name"
                    id="store-name"
                    onChange={(event) => patch('storeName', event.target.value)}
                    value={draft.storeName}
                  />
                </label>
                <label className="field-label" htmlFor="terminal-id">
                  <span>Terminal label</span>
                  <AppInput
                    aria-label="Terminal label"
                    id="terminal-id"
                    onChange={(event) =>
                      patch('terminalId', event.target.value)
                    }
                    value={draft.terminalId}
                  />
                </label>
              </div>
              <p className="admin-note">
                Opening cash and bank balances are managed in Settings → Setup →
                Opening balances.
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
                  <AppInput
                    aria-label="Footer message"
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
              <form noValidate onSubmit={handleSubmit(handlePinSave)}>
                <div className="field-grid">
                  <Field label="Current PIN" error={errors.currentPin?.message}>
                    <AppInput
                      aria-label="Current PIN"
                      id="current-pin"
                      inputMode="numeric"
                      isInvalid={Boolean(errors.currentPin)}
                      maxLength={4}
                      type="password"
                      {...register('currentPin', {
                        onChange: () => setPinMessage(''),
                      })}
                    />
                  </Field>
                  <Field label="New PIN" error={errors.nextPin?.message}>
                    <AppInput
                      aria-label="New PIN"
                      id="new-pin"
                      inputMode="numeric"
                      isInvalid={Boolean(errors.nextPin)}
                      maxLength={4}
                      type="password"
                      {...register('nextPin', {
                        onChange: () => setPinMessage(''),
                      })}
                    />
                  </Field>
                  <Field
                    label="Confirm new PIN"
                    error={errors.confirmPin?.message}
                  >
                    <AppInput
                      aria-label="Confirm new PIN"
                      id="confirm-pin"
                      inputMode="numeric"
                      isInvalid={Boolean(errors.confirmPin)}
                      maxLength={4}
                      type="password"
                      {...register('confirmPin', {
                        onChange: () => setPinMessage(''),
                      })}
                    />
                  </Field>
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
                  <button className="primary-button" type="submit">
                    Update PIN
                  </button>
                </div>
              </form>
            </section>
          )}

          {section === 'Setup' && <Setup embedded />}

          {section !== 'Setup' && (
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default memo(Settings);
