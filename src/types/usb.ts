export interface UsbEndpoint {
  direction: 'in' | 'out';
  endpointNumber: number;
  type: 'bulk' | 'interrupt' | 'isochronous' | 'control';
}

export interface UsbAlternateSetting {
  endpoints: UsbEndpoint[];
  interfaceClass?: number;
}

export interface UsbInterface {
  alternates: UsbAlternateSetting[];
  claimed?: boolean;
  interfaceNumber: number;
}

export interface UsbConfiguration {
  configurationValue: number;
  interfaces: UsbInterface[];
}

export interface UsbOutTransferResult {
  bytesWritten: number;
  status: 'ok' | 'stall' | 'babble' | 'overflow';
}

export interface UsbDevice {
  opened: boolean;
  configurations: UsbConfiguration[];
  configuration: UsbConfiguration | null;
  productId: number;
  productName?: string;
  serialNumber?: string;
  vendorId: number;
  close(): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  open(): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  transferOut(
    endpointNumber: number,
    data: Uint8Array,
  ): Promise<UsbOutTransferResult>;
}

export interface Usb {
  getDevices(): Promise<UsbDevice[]>;
  requestDevice(options: {
    filters?: Record<string, number>[];
  }): Promise<UsbDevice>;
}
