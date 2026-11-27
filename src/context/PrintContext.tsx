import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

import ReceiptPrint from '../components/ReceiptPrint';
import type { OrderRecord } from './OrderContext';
import { useStore } from './StoreContext';
import { buildEscPosReceipt } from '../utils/escpos';
import { RECEIPT_COPIES } from '../utils/receipt';
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

const NETWORK_PRINTER_KEY = 'bento-network-printer';
const THERMAL_TRANSPORT_KEY = 'bento-thermal-transport';

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

const PrintContext = createContext<PrintContextValue | undefined>(undefined);

const parseNetworkPrinter = (
  raw: string | null,
): NetworkPrinterTarget | null => {
  if (!raw) {
    return null;
  }

  try {
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

const parseThermalTransport = (raw: string | null): ThermalTransport =>
  raw === 'serial' || raw === 'network' ? raw : 'usb';

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

const getPrintBridge = () =>
  typeof window === 'undefined' ? undefined : window.electron;

export const PrintProvider = ({ children }: Props) => {
  const { data: storeData } = useStore();
  const { storeName, terminalId } = storeData.settings;
  const [receipt, setReceipt] = useState<OrderRecord | null>(null);
  const [status, setStatus] = useState('');
  const [networkPrinterState, setNetworkPrinterState] =
    useState<NetworkPrinterTarget | null>(null);
  const [thermalTransportState, setThermalTransportState] =
    useState<ThermalTransport>('usb');
  const [thermalPortReady, setThermalPortReady] = useState(hasThermalPrinter);
  const [usbReady, setUsbReady] = useState(hasUsbThermalPrinter);

  useEffect(() => {
    let cancelled = false;
    const bridge = getPrintBridge();

    if (bridge) {
      const hydrate = async () => {
        const [printerRaw, transportRaw] = await Promise.all([
          bridge.getPreference(NETWORK_PRINTER_KEY),
          bridge.getPreference(THERMAL_TRANSPORT_KEY),
        ]);
        if (cancelled) {
          return undefined;
        }

        const printer = parseNetworkPrinter(printerRaw);
        if (printer) {
          setNetworkPrinterState(printer);
        }

        if (transportRaw) {
          setThermalTransportState(parseThermalTransport(transportRaw));
        }

        return undefined;
      };

      hydrate().catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const setNetworkPrinter = useCallback(
    (target: NetworkPrinterTarget | null) => {
      setNetworkPrinterState(target);
      const bridge = getPrintBridge();
      if (!bridge) {
        return;
      }

      const request = target
        ? bridge.setPreference(NETWORK_PRINTER_KEY, JSON.stringify(target))
        : bridge.removePreference(NETWORK_PRINTER_KEY);
      request.catch((error) => {
        setStatus(errorMessage(error, 'Printer setting could not be saved.'));
      });
    },
    [],
  );

  const setThermalTransport = useCallback((value: ThermalTransport) => {
    setThermalTransportState(value);
    const bridge = getPrintBridge();
    if (!bridge) {
      return;
    }

    bridge
      .setPreference(THERMAL_TRANSPORT_KEY, value)
      .then(() => {
        setStatus('Thermal printer transport updated.');
        return undefined;
      })
      .catch((error) => {
        setStatus(errorMessage(error, 'Printer setting could not be saved.'));
      });
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
      const receiptBytes = RECEIPT_COPIES.map((copy) =>
        buildEscPosReceipt(order, copy, storeName, terminalId),
      );
      const sendCopies = async (send: (bytes: Uint8Array) => Promise<void>) => {
        await receiptBytes.reduce(
          (chain, bytes) => chain.then(() => send(bytes)),
          Promise.resolve(),
        );
      };

      try {
        setStatus('Sending merchant and customer receipts...');

        if (thermalTransportState === 'usb') {
          await sendCopies(sendUsbThermalBytes);
          setUsbReady(true);
          setStatus('Merchant and customer receipts sent via WebUSB.');
          return;
        }

        if (thermalTransportState === 'serial') {
          await sendCopies(sendThermalBytes);
          setThermalPortReady(true);
          setStatus('Merchant and customer receipts sent via Web Serial.');
          return;
        }

        const { electron } = window;
        if (!electron?.printEscPos || !networkPrinterState) {
          throw new Error('Save a network printer in Electron first.');
        }

        await sendCopies(async (bytes) => {
          await electron.printEscPos(Array.from(bytes), networkPrinterState);
        });
        setStatus('Merchant and customer receipts sent over the network.');
      } catch (error) {
        if (isUsbDeviceSelectionCancelled(error)) {
          setStatus('Printer selection cancelled. No receipt was sent.');
          return;
        }

        setStatus(errorMessage(error, 'Thermal print failed.'));
      }
    },
    [networkPrinterState, storeName, terminalId, thermalTransportState],
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
      <ReceiptPrint
        receipt={receipt}
        storeName={storeName}
        terminalId={terminalId}
      />
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
