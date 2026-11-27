import { memo, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { usePrint } from 'context';
import type { ThermalTransport } from 'context';
import { networkPrinterSchema } from 'schemas/forms';
import type { NetworkPrinterValues } from 'schemas/forms';
import { AppInput, Field } from '../ui';

const TRANSPORT_OPTIONS: Array<{
  label: string;
  value: ThermalTransport;
}> = [
  { label: 'WebUSB', value: 'usb' },
  { label: 'Web Serial', value: 'serial' },
  { label: 'Network', value: 'network' },
];

const CONNECT_LABELS: Record<ThermalTransport, string> = {
  network: 'Connect network printer',
  serial: 'Connect Web Serial',
  usb: 'Connect WebUSB',
};

const ThermalPrinterPanel = memo(() => {
  const {
    canUseThermal,
    thermalReady,
    connectThermal,
    status,
    networkPrinter,
    setNetworkPrinter,
    thermalTransport,
    setThermalTransport,
    usbReady,
    usbDeviceLabel,
  } = usePrint();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<NetworkPrinterValues>({
    defaultValues: {
      host: networkPrinter?.host ?? '',
      port: String(networkPrinter?.port ?? 9100),
    },
    resolver: zodResolver(networkPrinterSchema),
  });

  useEffect(() => {
    reset({
      host: networkPrinter?.host ?? '',
      port: String(networkPrinter?.port ?? 9100),
    });
  }, [networkPrinter, reset]);

  const handleSave = (values: NetworkPrinterValues) => {
    setNetworkPrinter({ host: values.host.trim(), port: Number(values.port) });
  };

  return (
    <div className="thermal-panel">
      <div className="thermal-panel__head">
        <div>
          <div className="setting-row__title">Printer setup</div>
          <div className="setting-row__description">
            Send ESC/POS receipts directly to the printer — no print dialog.
          </div>
        </div>
        <span className="thermal-status" data-ready={thermalReady}>
          {thermalReady ? 'Ready' : 'Not connected'}
        </span>
      </div>

      <div
        className="thermal-transport"
        role="group"
        aria-label="Printer transport"
      >
        {TRANSPORT_OPTIONS.map((option) => (
          <button
            aria-pressed={thermalTransport === option.value}
            className="thermal-transport__option"
            data-active={thermalTransport === option.value}
            key={option.value}
            onClick={() => setThermalTransport(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      {thermalTransport === 'usb' && (
        <div className="printer-device" data-ready={usbReady}>
          <span className="printer-device__dot" />
          <div>
            <div className="setting-row__title">
              {usbDeviceLabel ?? 'No USB printer selected'}
            </div>
            <div className="setting-row__description">
              {usbDeviceLabel
                ? 'Ready for ESC/POS receipts.'
                : 'Choose your receipt printer in the browser picker.'}
            </div>
          </div>
        </div>
      )}

      {thermalTransport === 'network' ? (
        <form noValidate onSubmit={handleSubmit(handleSave)}>
          <div className="field-grid">
            <Field label="Printer IP" error={errors.host?.message}>
              <AppInput
                aria-label="Printer IP"
                id="printer-host"
                isInvalid={Boolean(errors.host)}
                placeholder="192.168.1.50"
                {...register('host')}
              />
            </Field>
            <Field label="Port" error={errors.port?.message}>
              <AppInput
                aria-label="Port"
                id="printer-port"
                inputMode="numeric"
                isInvalid={Boolean(errors.port)}
                {...register('port')}
              />
            </Field>
          </div>
          <div className="pin-settings__actions">
            <button className="primary-button" type="submit">
              Save network printer
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="pin-settings__actions">
            <button
              className="secondary-button"
              disabled={!canUseThermal}
              onClick={() => connectThermal()}
              type="button"
            >
              {CONNECT_LABELS[thermalTransport]}
            </button>
            {thermalTransport === 'usb' && usbDeviceLabel && (
              <button
                className="secondary-button"
                onClick={() => connectThermal({ chooseDevice: true })}
                type="button"
              >
                Change printer
              </button>
            )}
          </div>
          {thermalTransport === 'usb' && (
            <p className="admin-note">
              Cancelling the device picker leaves the current printer unchanged.
            </p>
          )}
        </>
      )}

      {status && (
        <span className="print-actions__status" role="status">
          {status}
        </span>
      )}
    </div>
  );
});

export default ThermalPrinterPanel;
