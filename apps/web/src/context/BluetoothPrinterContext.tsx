import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { btPrinter, type InvoicePrintData } from "../utils/bluetoothPrinter";

interface BluetoothPrinterContextType {
  isConnected: boolean;
  isConnecting: boolean;
  isPrinting: boolean;
  printerName: string | null;
  isSupported: boolean;
  autoPrint: boolean;
  setAutoPrint: (enabled: boolean) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  printInvoice: (invoiceData: InvoicePrintData) => Promise<{ success: boolean; error?: string }>;
  printTestReceipt: () => Promise<{ success: boolean; error?: string }>;
  printViaBrowser: (invoiceData: InvoicePrintData) => void;
  showPrinterModal: boolean;
  setShowPrinterModal: (open: boolean) => void;
}

const BluetoothPrinterContext = createContext<BluetoothPrinterContextType | null>(null);

export const BluetoothPrinterProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [autoPrint, setAutoPrintState] = useState<boolean>(() => {
    return localStorage.getItem("pashu_bt_autoprint") === "true";
  });
  const [showPrinterModal, setShowPrinterModal] = useState<boolean>(false);

  const isSupported = btPrinter.isSupported();

  useEffect(() => {
    // Check initial cached name
    const cachedName = localStorage.getItem("pashu_bt_printer_name");
    if (cachedName) {
      setPrinterName(cachedName);
    }

    // Register callback for hardware disconnects
    btPrinter.setStatusCallback((status) => {
      setIsConnected(status.connected);
      if (status.deviceName) setPrinterName(status.deviceName);
    });
  }, []);

  const setAutoPrint = (enabled: boolean) => {
    setAutoPrintState(enabled);
    localStorage.setItem("pashu_bt_autoprint", String(enabled));
  };

  const connect = async (): Promise<boolean> => {
    try {
      setIsConnecting(true);
      const res = await btPrinter.connect();
      if (res.success) {
        setIsConnected(true);
        setPrinterName(res.deviceName || "SC588");
        return true;
      } else {
        alert(res.error || "Failed to connect to Bluetooth printer");
        return false;
      }
    } catch (err: any) {
      alert(err.message || "Failed to connect printer");
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    btPrinter.disconnect();
    setIsConnected(false);
  };

  const printInvoice = async (invoiceData: InvoicePrintData): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsPrinting(true);
      const res = await btPrinter.printInvoice(invoiceData);
      if (!res.success && res.error) {
        console.warn("Bluetooth thermal print notice:", res.error);
      }
      return res;
    } finally {
      setIsPrinting(false);
    }
  };

  const printTestReceipt = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsPrinting(true);
      return await btPrinter.printTestReceipt();
    } finally {
      setIsPrinting(false);
    }
  };

  const printViaBrowser = (invoiceData: InvoicePrintData) => {
    btPrinter.printViaBrowser(invoiceData);
  };

  return (
    <BluetoothPrinterContext.Provider
      value={{
        isConnected,
        isConnecting,
        isPrinting,
        printerName,
        isSupported,
        autoPrint,
        setAutoPrint,
        connect,
        disconnect,
        printInvoice,
        printTestReceipt,
        printViaBrowser,
        showPrinterModal,
        setShowPrinterModal,
      }}
    >
      {children}
    </BluetoothPrinterContext.Provider>
  );
};

export const useBluetoothPrinter = () => {
  const context = useContext(BluetoothPrinterContext);
  if (!context) {
    throw new Error("useBluetoothPrinter must be used within a BluetoothPrinterProvider");
  }
  return context;
};
