import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

import ReceiptPrint from '../components/ReceiptPrint';
import type { OrderRecord } from './OrderContext';
import { buildEscPosReceipt } from '../utils/escpos';
import {
  connectThermalPrinter,
  hasThermalPrinter,
  isThermalSupported,
  sendThermalBytes,
} from '../utils/thermalPrint';
import {
  connectUsbThermalPrinter,
  getUsbThermalDeviceLabel,
  hasUsbThermalPrinter,
  isUsbDeviceSelectionCancelled,
  isUsbThermalSupported,
  sendUsbThermalBytes,
} from '../utils/thermalUsb';

export type ThermalTransport = 'usb' | 'serial' | 'network';

export interface NetworkPrinterTarget {
  host: string;
  port: number;
}

interface PrintContextValue {
  networkPrinter: NetworkPrinterTarget | null;
  setNetworkPrinter: (target: NetworkPrinterTarget | null) => void;
  thermalTransport: ThermalTransport;
  setThermalTransport: (value: ThermalTransport) => void;
  thermalReady: boolean;
  usbReady: boolean;
  usbDeviceLabel: string | null;
  canUseThermal: boolean;
  status: string;
  printReceipt: (order: OrderRecord) => Promise<void>;
  printThermal: (order: OrderRecord) => Promise<void>;
  connectThermal: (options?: { chooseDevice?: boolean }) => Promise<void>;
}

interface Props {
  children: React.ReactNode;
}

const NETWORK_PRINTER_KEY = 'bento-network-printer';
const THERMAL_TRANSPORT_KEY = 'bento-thermal-transport';

const PrintContext = createContext<PrintContextValue | undefined>(undefined);

const readNetworkPrinter = (): NetworkPrinterTarget | null => {
  try {
    const raw = window.localStorage.getItem(NETWORK_PRINTER_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as NetworkPrinterTarget;

    if (
      typeof parsed.host === 'string' &&
      typeof parsed.port === 'number' &&
      parsed.port > 0
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
};

const readThermalTransport = (): ThermalTransport => {
  try {
    const value = window.localStorage.getItem(THERMAL_TRANSPORT_KEY);

    if (value === 'usb' || value === 'serial' || value === 'network') {
      return value;
    }
  } catch {
    return 'usb';
  }

  return 'usb';
};

const canUseTransport = (transport: ThermalTransport) => {
  if (transport === 'usb') {
    return isUsbThermalSupported();
  }

  if (transport === 'serial') {
    return isThermalSupported();
  }

  return Boolean(typeof window !== 'undefined' && window.electron?.printEscPos);
};

const isTransportReady = (
  transport: ThermalTransport,
  usbReady: boolean,
  serialReady: boolean,
  hasNetworkPrinter: boolean,
) => {
  if (transport === 'usb') {
    return usbReady;
  }

  if (transport === 'serial') {
    return serialReady;
  }

  return hasNetworkPrinter;
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const PrintProvider = ({ children }: Props) => {
  const [receipt, setReceipt] = useState<OrderRecord | null>(null);
  const [status, setStatus] = useState('');
  const [networkPrinterState, setNetworkPrinterState] =
    useState(readNetworkPrinter);
  const [thermalTransportState, setThermalTransportState] =
    useState(readThermalTransport);
  const [thermalPortReady, setThermalPortReady] = useState(hasThermalPrinter);
  const [usbReady, setUsbReady] = useState(hasUsbThermalPrinter);

  const setNetworkPrinter = useCallback(
    (target: NetworkPrinterTarget | null) => {
      setNetworkPrinterState(target);

      try {
        if (target) {
          window.localStorage.setItem(
            NETWORK_PRINTER_KEY,
            JSON.stringify(target),
          );
        } else {
          window.localStorage.removeItem(NETWORK_PRINTER_KEY);
        }
      } catch (error) {
        setStatus(errorMessage(error, 'Printer setting could not be saved.'));
      }
    },
    [],
  );

  const setThermalTransport = useCallback((value: ThermalTransport) => {
    setThermalTransportState(value);

    try {
      window.localStorage.setItem(THERMAL_TRANSPORT_KEY, value);
      setStatus('Thermal printer transport updated.');
    } catch (error) {
      setStatus(errorMessage(error, 'Printer setting could not be saved.'));
    }
  }, []);

  const printReceipt = useCallback(async (order: OrderRecord) => {
    try {
      flushSync(() => setReceipt(order));

      if (window.electron?.printReceipt) {
        await window.electron.printReceipt();
        return;
      }

      window.print();
    } catch (error) {
      setStatus(errorMessage(error, 'Receipt print failed.'));
    }
  }, []);

  const printThermal = useCallback(
    async (order: OrderRecord) => {
      const bytes = buildEscPosReceipt(order);

      try {
        setStatus('Sending receipt to thermal printer...');

        if (thermalTransportState === 'usb') {
          await sendUsbThermalBytes(bytes);
          setUsbReady(true);
          setStatus('Thermal receipt sent via WebUSB.');
          return;
        }

        if (thermalTransportState === 'serial') {
          await sendThermalBytes(bytes);
          setThermalPortReady(true);
          setStatus('Thermal receipt sent via Web Serial.');
          return;
        }

        if (!window.electron?.printEscPos || !networkPrinterState) {
          throw new Error('Save a network printer in Electron first.');
        }

        await window.electron.printEscPos(
          Array.from(bytes),
          networkPrinterState,
        );
        setStatus('Thermal receipt sent over the network.');
      } catch (error) {
        if (isUsbDeviceSelectionCancelled(error)) {
          setStatus('Printer selection cancelled. No receipt was sent.');
          return;
        }

        setStatus(errorMessage(error, 'Thermal print failed.'));
      }
    },
    [networkPrinterState, thermalTransportState],
  );

  const connectThermal = useCallback(
    async (options?: { chooseDevice?: boolean }) => {
      try {
        setStatus('Connecting thermal printer...');

        if (thermalTransportState === 'usb') {
          await connectUsbThermalPrinter(Boolean(options?.chooseDevice));
          setUsbReady(true);
          setStatus('WebUSB thermal printer connected.');
          return;
        }

        if (thermalTransportState === 'serial') {
          await connectThermalPrinter();
          setThermalPortReady(true);
          setStatus('Web Serial thermal printer connected.');
          return;
        }

        setStatus(
          networkPrinterState
            ? 'Network printer selected.'
            : 'Save a network printer first.',
        );
      } catch (error) {
        if (isUsbDeviceSelectionCancelled(error)) {
          setStatus('Printer selection cancelled. No settings changed.');
          return;
        }

        setStatus(errorMessage(error, 'Thermal printer connection failed.'));
      }
    },
    [networkPrinterState, thermalTransportState],
  );

  const value = useMemo<PrintContextValue>(
    () => ({
      networkPrinter: networkPrinterState,
      setNetworkPrinter,
      thermalTransport: thermalTransportState,
      setThermalTransport,
      thermalReady: isTransportReady(
        thermalTransportState,
        usbReady,
        thermalPortReady,
        networkPrinterState !== null,
      ),
      usbReady,
      usbDeviceLabel: getUsbThermalDeviceLabel(),
      canUseThermal: canUseTransport(thermalTransportState),
      status,
      printReceipt,
      printThermal,
      connectThermal,
    }),
    [
      networkPrinterState,
      setNetworkPrinter,
      thermalTransportState,
      setThermalTransport,
      usbReady,
      thermalPortReady,
      status,
      printReceipt,
      printThermal,
      connectThermal,
    ],
  );

  return (
    <PrintContext.Provider value={value}>
      {children}
      <ReceiptPrint receipt={receipt} />
    </PrintContext.Provider>
  );
};

export const usePrint = () => {
  const context = useContext(PrintContext);

  if (!context) {
    throw new Error('usePrint must be used within PrintProvider');
  }

  return context;
};

export default PrintProvider;
