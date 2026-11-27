type BrowserSerialPort = Awaited<
  ReturnType<NonNullable<Navigator['serial']>['requestPort']>
>;

let thermalPort: BrowserSerialPort | null = null;
let isThermalPortOpen = false;

const getSerial = () =>
  typeof navigator === 'undefined' ? undefined : navigator.serial;

export const isThermalSupported = () => Boolean(getSerial()?.requestPort);

export const hasThermalPrinter = () =>
  isThermalPortOpen && thermalPort !== null;

export const connectThermalPrinter = async () => {
  const serial = getSerial();

  if (!serial) {
    throw new Error('Web Serial is not available in this browser.');
  }

  const ports = await serial.getPorts();
  const selected = thermalPort ?? ports[0] ?? (await serial.requestPort());

  if (!isThermalPortOpen) {
    await selected.open({ baudRate: 9600 });
    isThermalPortOpen = true;
  }

  thermalPort = selected;
};

export const sendThermalBytes = async (bytes: Uint8Array) => {
  if (!thermalPort || !isThermalPortOpen) {
    await connectThermalPrinter();
  }

  if (!thermalPort?.writable) {
    throw new Error('Thermal printer is not ready.');
  }

  const writer = thermalPort.writable.getWriter();

  try {
    await writer.write(bytes);
  } finally {
    writer.releaseLock();
  }
};
