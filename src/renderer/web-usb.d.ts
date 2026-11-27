import type { Usb } from '../types/usb';

declare global {
  interface Navigator {
    readonly usb?: Usb;
  }
}

export {};
