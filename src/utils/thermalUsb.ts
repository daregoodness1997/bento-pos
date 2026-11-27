import type { UsbDevice } from '../types/usb';

let usbDevice: UsbDevice | null = null;
let usbInterfaceNumber: number | null = null;
let usbEndpointNumber: number | null = null;
let usbClaimed = false;

const getUsb = () =>
  typeof navigator === 'undefined' ? undefined : navigator.usb;

export const isUsbThermalSupported = () => Boolean(getUsb()?.requestDevice);

export const hasUsbThermalPrinter = () =>
  usbDevice !== null &&
  usbDevice.opened &&
  usbClaimed &&
  usbEndpointNumber !== null;

export const getUsbThermalDeviceLabel = () => {
  if (!usbDevice) {
    return null;
  }

  const vendor = usbDevice.vendorId.toString(16).padStart(4, '0');
  const product = usbDevice.productId.toString(16).padStart(4, '0');

  return `${usbDevice.productName ?? 'USB printer'} · ${vendor}:${product}`;
};

export const isUsbDeviceSelectionCancelled = (error: unknown) => {
  const details = error as { message?: string; name?: string } | null;

  return (
    details?.name === 'NotFoundError' ||
    /no device selected/i.test(details?.message ?? '')
  );
};

const findPrinterEndpoint = (device: UsbDevice) => {
  const candidates = (device.configuration?.interfaces ?? []).flatMap(
    (usbInterface) =>
      usbInterface.alternates.flatMap((alternate) => {
        const outEndpoint =
          alternate.endpoints.find(
            (endpoint) =>
              endpoint.direction === 'out' && endpoint.type === 'bulk',
          ) ??
          alternate.endpoints.find(
            (endpoint) =>
              endpoint.direction === 'out' && endpoint.type === 'interrupt',
          );

        if (!outEndpoint) {
          return [];
        }

        return [
          {
            endpointNumber: outEndpoint.endpointNumber,
            interfaceClass: alternate.interfaceClass,
            interfaceNumber: usbInterface.interfaceNumber,
          },
        ];
      }),
  );

  const printer =
    candidates.find((candidate) => candidate.interfaceClass === 0x07) ??
    candidates[0];

  if (!printer) {
    throw new Error('No USB printer endpoint was found on this device.');
  }

  return printer;
};

const releaseUsbConnection = async (nextDevice: UsbDevice) => {
  if (!usbDevice) {
    return;
  }

  if (usbInterfaceNumber !== null && usbClaimed) {
    try {
      await usbDevice.releaseInterface(usbInterfaceNumber);
    } catch {
      usbClaimed = false;
    }
  }

  if (usbDevice !== nextDevice && usbDevice.opened) {
    try {
      await usbDevice.close();
    } catch {
      usbDevice = null;
    }
  }

  usbInterfaceNumber = null;
  usbEndpointNumber = null;
  usbClaimed = false;
};

export const connectUsbThermalPrinter = async (chooseDevice = false) => {
  const usb = getUsb();

  if (!usb) {
    throw new Error('WebUSB is not available in this browser.');
  }

  let pairedDevices: UsbDevice[] = [];

  try {
    pairedDevices = await usb.getDevices();
  } catch {
    pairedDevices = [];
  }

  const pairedDevice = pairedDevices[0];
  let device: UsbDevice;

  if (chooseDevice || (!usbDevice && !pairedDevice)) {
    device = await usb.requestDevice({ filters: [] });
  } else {
    device = usbDevice ?? (pairedDevice as UsbDevice);
  }

  await releaseUsbConnection(device);

  if (!device.opened) {
    await device.open();
  }

  if (!device.configuration) {
    const configurationValue =
      device.configurations[0]?.configurationValue ?? 1;
    await device.selectConfiguration(configurationValue);
  }

  const printer = findPrinterEndpoint(device);

  if (!usbClaimed || usbInterfaceNumber !== printer.interfaceNumber) {
    try {
      await device.claimInterface(printer.interfaceNumber);
    } catch {
      throw new Error('The USB printer interface is already in use.');
    }
  }

  usbDevice = device;
  usbInterfaceNumber = printer.interfaceNumber;
  usbEndpointNumber = printer.endpointNumber;
  usbClaimed = true;
};

export const sendUsbThermalBytes = async (bytes: Uint8Array) => {
  if (!hasUsbThermalPrinter()) {
    await connectUsbThermalPrinter();
  }

  if (!usbDevice || usbEndpointNumber === null) {
    throw new Error('The USB thermal printer is not ready.');
  }

  const result = await usbDevice.transferOut(usbEndpointNumber, bytes);

  if (result.status !== 'ok' || result.bytesWritten !== bytes.length) {
    throw new Error('The USB thermal printer did not accept the receipt.');
  }
};
