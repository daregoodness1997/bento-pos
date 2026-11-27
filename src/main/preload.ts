// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

import type { BentoData } from 'types/store';

export type Channels =
  | 'ipc-example'
  | 'print-receipt'
  | 'print-escpos-network'
  | 'store:load'
  | 'store:save'
  | 'prefs:get'
  | 'prefs:set'
  | 'prefs:remove';

export interface NetworkPrinterTarget {
  host: string;
  port: number;
}

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  printReceipt: () => ipcRenderer.invoke('print-receipt') as Promise<boolean>,
  printEscPos: (bytes: number[], target: NetworkPrinterTarget) =>
    ipcRenderer.invoke(
      'print-escpos-network',
      bytes,
      target,
    ) as Promise<boolean>,
  loadStore: () =>
    ipcRenderer.invoke('store:load') as Promise<BentoData | null>,
  saveStore: (data: BentoData) =>
    ipcRenderer.invoke('store:save', data) as Promise<void>,
  getPreference: (key: string) =>
    ipcRenderer.invoke('prefs:get', key) as Promise<string | null>,
  setPreference: (key: string, value: string) =>
    ipcRenderer.invoke('prefs:set', key, value) as Promise<void>,
  removePreference: (key: string) =>
    ipcRenderer.invoke('prefs:remove', key) as Promise<void>,
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
