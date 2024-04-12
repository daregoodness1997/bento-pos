// electron-pos-printer.d.ts
declare module 'electron-pos-printer' {
  export class PosPrinter {
    static print(data: any, options: any): Promise<void>;
  }
}
