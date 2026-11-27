import { memo, useEffect, useState } from 'react';

import { usePrint } from 'context';
import type { ThermalTransport } from 'context';
import { AppInput } from '../ui';

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
  const [host, setHost] = useState(networkPrinter?.host ?? '');
  const [port, setPort] = useState(String(networkPrinter?.port ?? 9100));

  useEffect(() => {
    setHost(networkPrinter?.host ?? '');
    setPort(String(networkPrinter?.port ?? 9100));
  }, [networkPrinter]);

  const handleSave = () => {
    const parsedPort = Number(port);

    if (!host.trim() || !Number.isInteger(parsedPort) || parsedPort <= 0) {
      return;
    }

    setNetworkPrinter({ host: host.trim(), port: parsedPort });
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
        <>
          <div className="field-grid">
            <label className="field-label" htmlFor="printer-host">
              <span>Printer IP</span>
              <AppInput
                aria-label="Printer IP"
                id="printer-host"
                onChange={(event) => setHost(event.target.value)}
                placeholder="192.168.1.50"
                value={host}
              />
            </label>
            <label className="field-label" htmlFor="printer-port">
              <span>Port</span>
              <AppInput
                aria-label="Port"
                id="printer-port"
                inputMode="numeric"
                onChange={(event) => setPort(event.target.value)}
                value={port}
              />
            </label>
          </div>
          <div className="pin-settings__actions">
            <button
              className="primary-button"
              onClick={handleSave}
              type="button"
            >
              Save network printer
            </button>
          </div>
        </>
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
