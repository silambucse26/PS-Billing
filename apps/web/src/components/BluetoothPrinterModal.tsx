import { useState } from "react";
import { useBluetoothPrinter } from "../context/BluetoothPrinterContext";
import { 
  Printer, 
  Bluetooth, 
  X, 
  RefreshCw, 
  Power, 
  HelpCircle
} from "lucide-react";

export default function BluetoothPrinterModal() {
  const {
    isConnected,
    isConnecting,
    isPrinting,
    printerName,
    isSupported,
    autoPrint,
    setAutoPrint,
    connect,
    disconnect,
    printTestReceipt,
    showPrinterModal,
    setShowPrinterModal,
  } = useBluetoothPrinter();

  const [testResult, setTestResult] = useState<string | null>(null);

  if (!showPrinterModal) return null;

  const handleConnect = async () => {
    setTestResult(null);
    const success = await connect();
    if (success) {
      setTestResult("Connected successfully!");
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const handleTestPrint = async () => {
    setTestResult("Printing test receipt...");
    const res = await printTestReceipt();
    if (res.success) {
      setTestResult("Test receipt printed successfully! ✓");
    } else {
      setTestResult(`Error: ${res.error || "Failed to print"}`);
    }
    setTimeout(() => setTestResult(null), 4000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 relative">
          <button
            onClick={() => setShowPrinterModal(false)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Printer className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">SC588 Thermal Printer</h2>
              <p className="text-xs text-blue-200">58mm Portable Bluetooth Mobile Receipt Printer</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Connection Status Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isConnected 
              ? "bg-emerald-50/70 border-emerald-200" 
              : "bg-gray-50 border-gray-200"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isConnected ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  <Bluetooth className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Connection Status
                  </div>
                  <div className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                    {isConnected ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected: <span className="text-emerald-800">{printerName || "SC588"}</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                        Not Connected
                      </>
                    )}
                  </div>
                </div>
              </div>

              {isConnected ? (
                <button
                  type="button"
                  onClick={disconnect}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-100/60 hover:bg-red-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Power className="w-3.5 h-3.5" />
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-4 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-md hover:shadow-blue-200 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? "animate-spin" : ""}`} />
                  {isConnecting ? "Pairing..." : "Connect SC588"}
                </button>
              )}
            </div>

            {testResult && (
              <div className="mt-3 text-xs font-bold text-emerald-800 bg-emerald-100/70 p-2.5 rounded-xl text-center border border-emerald-200 animate-fade-in">
                {testResult}
              </div>
            )}
          </div>

          {/* Test Print Action */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleTestPrint}
              disabled={isPrinting || isConnecting}
              className="flex-1 py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Printer className={`w-4 h-4 ${isPrinting ? "animate-bounce" : ""}`} />
              <span>{isPrinting ? "Printing Test..." : "Print Test Receipt (58mm)"}</span>
            </button>
          </div>

          {/* Preferences */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Billing POS Settings
            </div>
            
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-gray-800">Auto-Print on Checkout</div>
                <div className="text-xs text-gray-500">Automatically print bill as soon as an invoice is created</div>
              </div>
              <input
                type="checkbox"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 cursor-pointer accent-blue-600"
              />
            </label>
          </div>

          {/* Step-by-Step Pairing Guide */}
          <div className="border-t border-gray-100 pt-4 space-y-2.5 text-xs text-gray-600">
            <div className="font-bold text-gray-800 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              How to pair your SC588 Thermal Printer:
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-gray-500">
              <li>Turn ON your portable <strong>SC588 thermal printer</strong> (confirm paper roll is inserted).</li>
              <li>Ensure <strong>Bluetooth is enabled</strong> on your phone or PC.</li>
              <li>Click <strong>"Connect SC588"</strong> above. A browser popup will open.</li>
              <li>Select <strong>"SC588"</strong> (or your printer's Bluetooth name) from the list and tap <strong>Pair</strong>.</li>
              <li>Once connected, bills in Billing POS and Invoices will print wirelessly!</li>
            </ol>
            {!isSupported && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-medium mt-2">
                ⚠️ Web Bluetooth is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Samsung Internet on Android/Windows.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={() => setShowPrinterModal(false)}
            className="px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
