/**
 * Bluetooth Thermal Receipt Printer Engine (ESC/POS)
 * Specifically optimized for 58mm portable printers (SC588 / MPT-II / POS-58)
 * 32 characters per line in standard font A.
 */

export interface InvoiceItemPrint {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
  unit?: string;
}

export interface InvoicePrintData {
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  shopGstin?: string;
  invoiceNumber: string;
  invoiceDate?: Date | string;
  customerName?: string;
  customerPhone?: string;
  items: InvoiceItemPrint[];
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  roundOff?: number;
  totalAmount: number;
  paymentMode?: string;
}

// Known GATT Service UUIDs for Portable Bluetooth Thermal Printers (SC588 / POS58 / HM-10)
const PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb", // Standard ESC/POS
  "0000ffe0-0000-1000-8000-00805f9b34fb", // Common HM-10 BLE Serial (SC588 default)
  "0000ff00-0000-1000-8000-00805f9b34fb", // Generic POS-58
  "0000fff0-0000-1000-8000-00805f9b34fb", // Milestone / ZJiang
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC Transparent UART
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Mobile Receipt BLE
  "0000ae30-0000-1000-8000-00805f9b34fb",
];

// ESC/POS Commands
const CMD = {
  INIT: [0x1B, 0x40], // ESC @ Initialize
  ALIGN_LEFT: [0x1B, 0x61, 0x00],
  ALIGN_CENTER: [0x1B, 0x61, 0x01],
  ALIGN_RIGHT: [0x1B, 0x61, 0x02],
  BOLD_ON: [0x1B, 0x45, 0x01],
  BOLD_OFF: [0x1B, 0x45, 0x00],
  DOUBLE_SIZE_ON: [0x1D, 0x21, 0x11], // GS ! 0x11 (2x width & height)
  DOUBLE_HEIGHT_ON: [0x1D, 0x21, 0x01],
  NORMAL_SIZE: [0x1D, 0x21, 0x00],
  LINE_FEED: [0x0A],
  CUT: [0x1D, 0x56, 0x41, 0x00], // GS V 65 0
};

export class BluetoothPrinterService {
  private device: any = null;
  private characteristic: any = null;
  private isConnecting: boolean = false;
  private onStatusChangeCallback?: (status: { connected: boolean; deviceName: string | null }) => void;

  constructor() {
    // Listen for saved preferences if needed
  }

  public setStatusCallback(cb: (status: { connected: boolean; deviceName: string | null }) => void) {
    this.onStatusChangeCallback = cb;
  }

  public isSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  public getIsConnecting(): boolean {
    return this.isConnecting;
  }

  public isConnected(): boolean {
    return Boolean(this.device && this.device.gatt?.connected && this.characteristic);
  }

  public getDeviceName(): string | null {
    return this.device?.name || localStorage.getItem("pashu_bt_printer_name") || null;
  }

  /**
   * Request Bluetooth Pairing & Connect to SC588 printer
   */
  public async connect(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: "Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Samsung Internet with Bluetooth enabled.",
      };
    }

    try {
      this.isConnecting = true;
      const navBt = (navigator as any).bluetooth;

      // Prompt browser native Bluetooth picker dialog
      const device = await navBt.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES,
      });

      if (!device) {
        throw new Error("No printer selected");
      }

      this.device = device;
      device.addEventListener("gattserverdisconnected", () => {
        this.characteristic = null;
        if (this.onStatusChangeCallback) {
          this.onStatusChangeCallback({ connected: false, deviceName: this.device?.name || null });
        }
      });

      const server = await device.gatt.connect();

      // Find the writable characteristic
      let writeChar: any = null;

      // Strategy 1: Search through known printer services
      for (const serviceUuid of PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const chars = await service.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              writeChar = c;
              break;
            }
          }
          if (writeChar) break;
        } catch {
          // Continue trying next known service
        }
      }

      // Strategy 2: If not found in known list, attempt getPrimaryServices
      if (!writeChar && server.getPrimaryServices) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            const chars = await service.getCharacteristics();
            for (const c of chars) {
              if (c.properties.write || c.properties.writeWithoutResponse) {
                writeChar = c;
                break;
              }
            }
            if (writeChar) break;
          }
        } catch {
          // Ignore
        }
      }

      if (!writeChar) {
        throw new Error(
          `Connected to "${device.name || "Device"}", but could not find a writable thermal printer channel. Ensure SC588 is turned on and paired.`
        );
      }

      this.characteristic = writeChar;
      const deviceName = device.name || "SC588 Thermal Printer";
      localStorage.setItem("pashu_bt_printer_name", deviceName);

      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback({ connected: true, deviceName });
      }

      return { success: true, deviceName };
    } catch (err: any) {
      this.characteristic = null;
      return {
        success: false,
        error: err.message || "Failed to pair with Bluetooth printer",
      };
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect active printer
   */
  public disconnect() {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.characteristic = null;
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback({ connected: false, deviceName: this.device?.name || null });
    }
  }

  /**
   * Transmit raw ESC/POS byte array with MTU packet chunking (60-80 bytes)
   * Essential for preventing buffer overruns on low-power mobile printers like SC588
   */
  public async sendRawBytes(bytes: Uint8Array): Promise<void> {
    if (!this.characteristic) {
      throw new Error("Printer is not connected");
    }

    const CHUNK_SIZE = 64; // Safe BLE MTU limit
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.slice(i, i + CHUNK_SIZE);
      if (this.characteristic.writeValueWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.characteristic.writeValue(chunk);
      }
      // 20ms pause between chunks gives SC588 processor time to write to thermal paper
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  /**
   * Format a two-column row to exactly fit 32 columns (standard 58mm width)
   */
  private formatRow(left: string, right: string, width = 32): string {
    const cleanLeft = left.trim();
    const cleanRight = right.trim();
    const spaceNeeded = width - (cleanLeft.length + cleanRight.length);
    if (spaceNeeded > 0) {
      return cleanLeft + " ".repeat(spaceNeeded) + cleanRight;
    }
    // If text exceeds width, truncate left side slightly
    const maxLeft = Math.max(1, width - cleanRight.length - 1);
    return cleanLeft.substring(0, maxLeft) + " " + cleanRight;
  }

  /**
   * Convert Unicode string to ASCII bytes safe for thermal printer code pages
   * Replaces Rupee symbol ₹ with Rs.
   */
  private textToBytes(text: string): number[] {
    const cleanText = text.replace(/₹/g, "Rs.");
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(cleanText));
  }

  /**
   * Generate ESC/POS byte commands for a complete 58mm Tax Invoice
   */
  public buildInvoiceEscPos(data: InvoicePrintData): Uint8Array {
    const buffer: number[] = [];
    const push = (...args: number[][]) => {
      for (const arr of args) {
        buffer.push(...arr);
      }
    };
    const pushText = (text: string) => {
      buffer.push(...this.textToBytes(text + "\n"));
    };

    // 1. Initialize Printer
    push(CMD.INIT);

    // 2. Shop Header (Centered)
    push(CMD.ALIGN_CENTER);
    push(CMD.DOUBLE_SIZE_ON);
    push(CMD.BOLD_ON);
    pushText(data.shopName || "PASHU CENTRAL");
    push(CMD.NORMAL_SIZE);
    push(CMD.BOLD_OFF);

    pushText("Livestock & Animal Care Hub");
    if (data.shopAddress) {
      pushText(data.shopAddress);
    }
    if (data.shopPhone) {
      pushText(`Ph: ${data.shopPhone}`);
    }
    if (data.shopGstin) {
      pushText(`GSTIN: ${data.shopGstin}`);
    }

    // Divider
    pushText("--------------------------------");
    push(CMD.BOLD_ON);
    pushText("RETAIL TAX INVOICE");
    push(CMD.BOLD_OFF);
    pushText("--------------------------------");

    // 3. Invoice & Customer Meta (Left aligned)
    push(CMD.ALIGN_LEFT);
    pushText(this.formatRow("Invoice No:", data.invoiceNumber));
    
    const formattedDate = data.invoiceDate 
      ? new Date(data.invoiceDate).toLocaleString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date().toLocaleString("en-IN");
    pushText(this.formatRow("Date & Time:", formattedDate));

    if (data.customerName) {
      pushText(this.formatRow("Customer:", data.customerName));
    }
    if (data.customerPhone) {
      pushText(this.formatRow("Phone:", data.customerPhone));
    }
    pushText("--------------------------------");

    // 4. Line Items Table (Optimized for 58mm: Item Name on line 1, Qty x Price & Total on line 2)
    push(CMD.BOLD_ON);
    pushText(this.formatRow("ITEM DETAILS", "AMOUNT"));
    push(CMD.BOLD_OFF);
    pushText("--------------------------------");

    data.items.forEach((item) => {
      // Line 1: Item Name
      pushText(item.name);
      // Line 2: Qty x UnitPrice -> Total
      const qtyStr = `  ${item.qty} ${item.unit || "pcs"} x Rs.${Number(item.unitPrice).toFixed(2)}`;
      const totalStr = `Rs.${Number(item.total).toFixed(2)}`;
      pushText(this.formatRow(qtyStr, totalStr));
    });

    pushText("--------------------------------");

    // 5. Totals & Tax Calculation
    if (data.subtotal !== undefined) {
      pushText(this.formatRow("Sub Total:", `Rs.${Number(data.subtotal).toFixed(2)}`));
    }
    if (data.cgst && data.cgst > 0) {
      pushText(this.formatRow("CGST:", `Rs.${Number(data.cgst).toFixed(2)}`));
    }
    if (data.sgst && data.sgst > 0) {
      pushText(this.formatRow("SGST:", `Rs.${Number(data.sgst).toFixed(2)}`));
    }
    if (data.igst && data.igst > 0) {
      pushText(this.formatRow("IGST:", `Rs.${Number(data.igst).toFixed(2)}`));
    }
    if (data.roundOff !== undefined && data.roundOff !== 0) {
      pushText(this.formatRow("Round Off:", `Rs.${Number(data.roundOff).toFixed(2)}`));
    }

    pushText("================================");

    // 6. Grand Total (Double Height + Bold)
    push(CMD.BOLD_ON);
    push(CMD.DOUBLE_HEIGHT_ON);
    pushText(this.formatRow("TOTAL DUE:", `Rs.${Number(data.totalAmount).toFixed(2)}`));
    push(CMD.NORMAL_SIZE);
    push(CMD.BOLD_OFF);
    pushText("================================");

    // 7. Payment Info
    pushText(this.formatRow("Payment Mode:", (data.paymentMode || "CASH").toUpperCase()));
    pushText(this.formatRow("Status:", "PAID (CONFIRMED)"));
    pushText("--------------------------------");

    // 8. Footer (Centered)
    push(CMD.ALIGN_CENTER);
    push(CMD.BOLD_ON);
    pushText("Thank You! Visit Again");
    push(CMD.BOLD_OFF);
    pushText("Powered by Pashu Central POS");

    // Paper feed & tear off space (4 blank lines)
    push(CMD.LINE_FEED);
    push(CMD.LINE_FEED);
    push(CMD.LINE_FEED);
    push(CMD.LINE_FEED);
    push(CMD.CUT);

    return new Uint8Array(buffer);
  }

  /**
   * Print complete Invoice
   * Automatically triggers Bluetooth connection prompt if not yet paired
   */
  public async printInvoice(data: InvoicePrintData): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConnected()) {
        const conn = await this.connect();
        if (!conn.success) {
          return { success: false, error: conn.error };
        }
      }

      const bytes = this.buildInvoiceEscPos(data);
      await this.sendRawBytes(bytes);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to print receipt" };
    }
  }

  /**
   * Print a quick Test Receipt to verify SC588 Bluetooth connectivity
   */
  public async printTestReceipt(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConnected()) {
        const conn = await this.connect();
        if (!conn.success) {
          return { success: false, error: conn.error };
        }
      }

      const buffer: number[] = [];
      const push = (...args: number[][]) => {
        for (const arr of args) buffer.push(...arr);
      };
      const pushText = (t: string) => {
        buffer.push(...this.textToBytes(t + "\n"));
      };

      push(CMD.INIT);
      push(CMD.ALIGN_CENTER);
      push(CMD.DOUBLE_SIZE_ON);
      push(CMD.BOLD_ON);
      pushText("PASHU CENTRAL");
      push(CMD.NORMAL_SIZE);
      push(CMD.BOLD_OFF);
      pushText("SC588 BLUETOOTH TEST");
      pushText("--------------------------------");
      pushText("Connection: Wireless Bluetooth");
      pushText(`Device: ${this.getDeviceName() || "SC588"}`);
      pushText(`Time: ${new Date().toLocaleTimeString("en-IN")}`);
      pushText("Width: 58mm (32 Columns)");
      pushText("Status: OK - Ready to Print Bills!");
      pushText("--------------------------------");
      push(CMD.LINE_FEED);
      push(CMD.LINE_FEED);
      push(CMD.LINE_FEED);
      push(CMD.CUT);

      await this.sendRawBytes(new Uint8Array(buffer));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to print test receipt" };
    }
  }

  /**
   * Browser Thermal Print Fallback (HTML 58mm print)
   * Opens standard browser print dialog styled for 58mm POS receipt roll
   */
  public printViaBrowser(data: InvoicePrintData) {
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) {
      alert("Popup blocked! Please allow popups to print receipt.");
      return;
    }

    const itemsHtml = data.items
      .map(
        (item) => `
        <div style="margin-bottom: 4px;">
          <div style="font-weight: 600;">${item.name}</div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #444;">
            <span>${item.qty} ${item.unit || "pcs"} x Rs.${Number(item.unitPrice).toFixed(2)}</span>
            <span style="font-weight: bold; color: #000;">Rs.${Number(item.total).toFixed(2)}</span>
          </div>
        </div>
      `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${data.invoiceNumber}</title>
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }
          body {
            font-family: monospace, 'Courier New', Courier;
            font-size: 11px;
            width: 54mm;
            margin: 0 auto;
            padding: 8px 4px 20px 4px;
            color: #000;
            background: #fff;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .title { font-size: 15px; font-weight: 900; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; margin: 4px 0; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="title">${data.shopName || "PASHU CENTRAL"}</div>
          <div style="font-size: 10px;">Livestock & Animal Care Hub</div>
          ${data.shopAddress ? `<div style="font-size: 10px;">${data.shopAddress}</div>` : ""}
          ${data.shopPhone ? `<div style="font-size: 10px;">Ph: ${data.shopPhone}</div>` : ""}
          ${data.shopGstin ? `<div style="font-size: 10px;">GSTIN: ${data.shopGstin}</div>` : ""}
        </div>
        
        <div class="divider"></div>
        <div class="text-center bold">RETAIL TAX INVOICE</div>
        <div class="divider"></div>

        <div class="row"><span>Invoice:</span><span class="bold">${data.invoiceNumber}</span></div>
        <div class="row"><span>Date:</span><span>${new Date(data.invoiceDate || new Date()).toLocaleDateString("en-IN")}</span></div>
        ${data.customerName ? `<div class="row"><span>Client:</span><span class="bold">${data.customerName}</span></div>` : ""}
        ${data.customerPhone ? `<div class="row"><span>Phone:</span><span>${data.customerPhone}</span></div>` : ""}

        <div class="divider"></div>
        <div class="row bold"><span>ITEM</span><span>TOTAL</span></div>
        <div class="divider"></div>

        ${itemsHtml}

        <div class="divider"></div>
        ${data.subtotal !== undefined ? `<div class="row"><span>Sub Total:</span><span>Rs.${Number(data.subtotal).toFixed(2)}</span></div>` : ""}
        ${data.cgst ? `<div class="row"><span>CGST:</span><span>Rs.${Number(data.cgst).toFixed(2)}</span></div>` : ""}
        ${data.sgst ? `<div class="row"><span>SGST:</span><span>Rs.${Number(data.sgst).toFixed(2)}</span></div>` : ""}
        ${data.igst ? `<div class="row"><span>IGST:</span><span>Rs.${Number(data.igst).toFixed(2)}</span></div>` : ""}
        ${data.roundOff ? `<div class="row"><span>Round Off:</span><span>Rs.${Number(data.roundOff).toFixed(2)}</span></div>` : ""}
        
        <div class="double-divider"></div>
        <div class="total-row"><span>GRAND TOTAL:</span><span>Rs.${Number(data.totalAmount).toFixed(2)}</span></div>
        <div class="double-divider"></div>

        <div class="row"><span>Payment:</span><span class="bold">${(data.paymentMode || "CASH").toUpperCase()}</span></div>
        <div class="row"><span>Status:</span><span class="bold">PAID</span></div>

        <div class="divider"></div>
        <div class="text-center bold" style="margin-top: 6px;">Thank You! Visit Again</div>
        <div class="text-center" style="font-size: 9px; color: #555;">Powered by Pashu Central POS</div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 800);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

// Global Singleton Instance
export const btPrinter = new BluetoothPrinterService();
