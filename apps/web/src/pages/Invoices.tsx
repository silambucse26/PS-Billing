import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { supabase } from "../lib/supabaseClient";
import Sidebar from "../components/Sidebar";
import { 
  Search, 
  ReceiptText, 
  Store, 
  User, 
  Phone, 
  Download, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  IndianRupee, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Send,
  Check,
  X,
  Printer,
  Bluetooth
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBluetoothPrinter } from "../context/BluetoothPrinterContext";
import type { InvoicePrintData } from "../utils/bluetoothPrinter";

export default function Invoices() {
  const { profile, shop } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  // Bulk Selection & WhatsApp Dispatcher State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSentStatus, setBulkSentStatus] = useState<Record<string, boolean>>({});
  const [manualPhoneInvoice, setManualPhoneInvoice] = useState<any | null>(null);
  const [manualPhoneNumber, setManualPhoneNumber] = useState("");

  // Bluetooth Printer Hook
  const { 
    isConnected: isBtConnected, 
    printInvoice: printInvoiceBt, 
    setShowPrinterModal,
    printViaBrowser
  } = useBluetoothPrinter();
  const [printingInvId, setPrintingInvId] = useState<string | null>(null);

  const handlePrintBluetoothInvoice = async (inv: any) => {
    try {
      setPrintingInvId(inv.id);
      const items: any[] = (inv.items || []).map((it: any) => ({
        name: it.product?.name || it.description || "Product Item",
        qty: it.quantity || it.qty || 1,
        unitPrice: it.unit_price || it.unitPrice || 0,
        total: it.total_price || it.total || ((it.quantity || 1) * (it.unit_price || 0)),
        unit: it.product?.unit || "pcs"
      }));

      const payload: InvoicePrintData = {
        shopName: inv.shop?.name || shop?.name || "PASHU CENTRAL",
        shopAddress: inv.shop?.address || shop?.address || "",
        shopPhone: inv.shop?.phone || shop?.phone || "",
        shopGstin: inv.shop?.gstin || shop?.gstin || "",
        invoiceNumber: inv.invoice_number,
        invoiceDate: inv.invoice_date || inv.created_at,
        customerName: inv.customer?.name || "Walk-in Customer",
        customerPhone: inv.customer?.phone || "",
        items,
        subtotal: inv.subtotal_amount !== undefined ? Number(inv.subtotal_amount) : Number(inv.total_amount),
        cgst: inv.cgst_amount ? Number(inv.cgst_amount) : undefined,
        sgst: inv.sgst_amount ? Number(inv.sgst_amount) : undefined,
        igst: inv.igst_amount ? Number(inv.igst_amount) : undefined,
        roundOff: inv.round_off ? Number(inv.round_off) : undefined,
        totalAmount: Number(inv.total_amount || 0),
        paymentMode: inv.payment_mode || "CASH"
      };

      const res = await printInvoiceBt(payload);
      if (!res.success) {
        if (res.error && !res.error.includes("cancelled") && !res.error.includes("User cancelled")) {
          if (confirm(`Bluetooth Print Notice: ${res.error}\n\nWould you like to print this invoice using standard 58mm browser print instead?`)) {
            printViaBrowser(payload);
          }
        }
      }
    } catch (err: any) {
      alert(`Print error: ${err.message}`);
    } finally {
      setPrintingInvId(null);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get("/invoices");
      setInvoices(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (invoiceId: string) => {
    try {
      setDownloadingId(invoiceId);
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${API_BASE}/invoices/${invoiceId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token || ""}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to download invoice PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err: any) {
      alert(err.message || "Error downloading invoice PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  // Generate rich WhatsApp Message text for an invoice
  const formatWhatsAppMessage = (inv: any) => {
    const shopName = inv.shop?.name || "Pashu Central Center";
    const shopPhone = inv.shop?.phone ? `📞 Shop Contact: ${inv.shop.phone}\n` : "";
    const dateStr = new Date(inv.invoice_date || inv.created_at).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    const custName = inv.customer?.name || "Valued Customer";
    const amount = Number(inv.total_amount || 0).toFixed(2);
    const paymentMode = (inv.payment_mode || "Cash").toUpperCase();
    const status = (inv.status || "Paid").toUpperCase();

    let itemsText = "";
    if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) {
      itemsText = "\n📦 *Items Purchased:*\n" + inv.items.map((item: any, idx: number) => {
        const pName = item.product?.name || item.product_name || `Product #${idx + 1}`;
        const qty = item.quantity || item.qty || 1;
        const price = Number(item.unit_price || item.unitPrice || 0).toFixed(2);
        const lineTotal = Number(item.line_total || item.lineTotal || (qty * Number(price))).toFixed(2);
        return `• ${pName} (${qty} ${item.unit || item.product?.unit || 'pcs'} x ₹${price}) = ₹${lineTotal}`;
      }).join("\n") + "\n";
    }

    return `🐾 *${shopName.toUpperCase()}*\n` +
      `🧾 *OFFICIAL TAX INVOICE RECEIPT*\n` +
      `----------------------------------------\n` +
      `📄 *Invoice No:* ${inv.invoice_number}\n` +
      `📅 *Date:* ${dateStr}\n` +
      `👤 *Customer:* ${custName}\n` +
      (inv.customer?.phone ? `📱 *Phone:* ${inv.customer.phone}\n` : "") +
      `----------------------------------------` +
      itemsText +
      `----------------------------------------\n` +
      `💰 *Grand Total:* ₹${amount}\n` +
      `💳 *Payment Mode:* ${paymentMode}\n` +
      `✅ *Payment Status:* ${status}\n` +
      `----------------------------------------\n` +
      shopPhone +
      `Thank you for choosing *${shopName}* for your veterinary & livestock care! 🙏`;
  };

  // Direct single WhatsApp share
  const handleSingleWhatsApp = (inv: any) => {
    const phone = inv.customer?.phone ? inv.customer.phone.replace(/[^0-9]/g, "") : "";
    if (!phone || phone.length < 10) {
      setManualPhoneInvoice(inv);
      setManualPhoneNumber(inv.customer?.phone || "");
      return;
    }

    sendWhatsAppDirect(inv, phone);
  };

  const sendWhatsAppDirect = (inv: any, targetPhone: string) => {
    let cleanPhone = targetPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone; // Prefix India country code
    }
    const message = formatWhatsAppMessage(inv);
    const encodedText = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(waUrl, "_blank");

    setBulkSentStatus((prev) => ({ ...prev, [inv.id]: true }));
  };

  const handleManualPhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhoneNumber || manualPhoneNumber.trim().length < 10) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }
    if (manualPhoneInvoice) {
      sendWhatsAppDirect(manualPhoneInvoice, manualPhoneNumber);
      setManualPhoneInvoice(null);
      setManualPhoneNumber("");
    }
  };

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const invNum = (inv.invoice_number || "").toLowerCase();
    const custName = (inv.customer?.name || "").toLowerCase();
    const custPhone = (inv.customer?.phone || "").toLowerCase();
    const shopName = (inv.shop?.name || "").toLowerCase();

    const matchesSearch =
      invNum.includes(q) ||
      custName.includes(q) ||
      custPhone.includes(q) ||
      shopName.includes(q);

    const matchesPayment =
      paymentFilter === "all" ||
      (inv.payment_mode || "").toLowerCase() === paymentFilter.toLowerCase();

    const matchesStatus =
      statusFilter === "all" ||
      (inv.status || "").toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesPayment && matchesStatus;
  });

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map((inv) => inv.id));
    }
  };

  const toggleSelectInvoice = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Selected invoices list
  const selectedInvoicesList = invoices.filter((inv) => selectedIds.includes(inv.id));

  // Calculate Metrics
  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0);
  const totalInvoicesCount = filteredInvoices.length;
  const avgBillValue = totalInvoicesCount > 0 ? totalRevenue / totalInvoicesCount : 0;

  return (
    <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen text-gray-900 animate-fade-in">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <ReceiptText className="w-8 h-8 text-green-600" />
              Invoice History & Billing Records
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View, download PDF GST invoices, and bulk send invoices directly to customers via WhatsApp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            {/* Bulk Send WhatsApp Button */}
            <button
              onClick={() => {
                if (selectedIds.length === 0) {
                  // If none selected, select all filtered
                  setSelectedIds(filteredInvoices.map((inv) => inv.id));
                }
                setShowBulkModal(true);
              }}
              disabled={filteredInvoices.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <MessageSquare className="w-4 h-4" />
              <span>
                {selectedIds.length > 0
                  ? `Bulk Send WhatsApp (${selectedIds.length})`
                  : `Bulk Send All (${filteredInvoices.length}) via WhatsApp`}
              </span>
            </button>

            <button
              onClick={fetchInvoices}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-green-600" : ""}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => setShowPrinterModal(true)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer border ${
                isBtConnected
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-700"
              }`}
            >
              <Bluetooth className={`w-4 h-4 ${isBtConnected ? "text-emerald-600 animate-pulse" : "text-blue-600"}`} />
              <span>{isBtConnected ? "SC588 Connected" : "Connect SC588"}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
              <ReceiptText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Invoices</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{totalInvoicesCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Billed</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Collected</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg. Bill Value</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">₹{avgBillValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-xs mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-96 bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={
                profile?.role === "super_admin"
                  ? "Search by Invoice #, Customer, Phone, or Shop..."
                  : "Search by Invoice #, Customer, or Phone..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none text-gray-900 placeholder-gray-400 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Multi-selection indicator */}
            {selectedIds.length > 0 && (
              <span className="text-xs font-bold px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {selectedIds.length} Selected
              </span>
            )}

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Payment:</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-sm font-semibold rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:border-green-600"
              >
                <option value="all">All Modes</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-sm font-semibold rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:border-green-600"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-medium bg-white border border-gray-200 rounded-2xl">
            Loading billing records...
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-4 px-4 text-center w-12">
                      <input
                        type="checkbox"
                        checked={filteredInvoices.length > 0 && selectedIds.length === filteredInvoices.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded text-green-600 focus:ring-green-500 cursor-pointer"
                        title="Select All Invoices"
                      />
                    </th>
                    <th className="py-4 px-6">Invoice #</th>
                    {profile?.role === "super_admin" && (
                      <th className="py-4 px-6">Shop</th>
                    )}
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Payment Mode</th>
                    <th className="py-4 px-6 text-right">Total Amount</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Actions & WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={profile?.role === "super_admin" ? 9 : 8} className="py-12 px-6 text-center text-gray-500">
                        No invoice records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isDownloading = downloadingId === inv.id;
                      const isSelected = selectedIds.includes(inv.id);
                      const isSentViaWA = bulkSentStatus[inv.id];
                      const dateStr = new Date(inv.invoice_date || inv.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      });

                      return (
                        <tr
                          key={inv.id}
                          className={`text-sm transition-colors ${
                            isSelected ? "bg-emerald-50/50" : "hover:bg-gray-50/80"
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="py-4 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectInvoice(inv.id)}
                              className="w-4 h-4 rounded text-green-600 focus:ring-green-500 cursor-pointer"
                            />
                          </td>

                          {/* Invoice Number */}
                          <td className="py-4 px-6 font-bold text-gray-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 flex-shrink-0">
                                <ReceiptText className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-blue-900 block font-black font-mono">{inv.invoice_number}</span>
                                <span className="text-[11px] text-gray-400 font-sans font-normal">
                                  {new Date(inv.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Shop Info (Admin) */}
                          {profile?.role === "super_admin" && (
                            <td className="py-4 px-6">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 rounded-lg text-xs font-bold border border-blue-200">
                                <Store className="w-3.5 h-3.5 text-blue-600" />
                                {inv.shop?.name || "PashuCentral Shop"}
                              </div>
                            </td>
                          )}

                          {/* Customer */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                                <User className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="font-bold text-gray-900 block">
                                  {inv.customer?.name || "Walk-in Customer"}
                                </span>
                                {inv.customer?.phone ? (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-gray-400" />
                                    {inv.customer.phone}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-600 font-semibold">No Phone (Walk-in)</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-4 px-6 text-gray-600 font-medium">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {dateStr}
                            </div>
                          </td>

                          {/* Payment Mode */}
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold uppercase tracking-wider">
                              <CreditCard className="w-3.5 h-3.5 text-gray-500" />
                              {inv.payment_mode || "CASH"}
                            </span>
                          </td>

                          {/* Total Amount */}
                          <td className="py-4 px-6 text-right font-black text-gray-950 font-mono text-base">
                            ₹{Number(inv.total_amount).toFixed(2)}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-6 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                                (inv.status || "paid").toLowerCase() === "paid"
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {inv.status || "PAID"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* WhatsApp Send Button */}
                              <button
                                onClick={() => handleSingleWhatsApp(inv)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                  isSentViaWA
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border-emerald-200 hover:border-emerald-600"
                                }`}
                                title="Send Invoice Summary via WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                                <span>{isSentViaWA ? "Sent ✓" : "WhatsApp"}</span>
                              </button>

                              {/* SC588 Thermal Print Button */}
                              <button
                                type="button"
                                onClick={() => handlePrintBluetoothInvoice(inv)}
                                disabled={printingInvId === inv.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 hover:bg-gray-800 hover:text-white rounded-lg text-xs font-bold transition-colors border border-gray-200 hover:border-gray-800 cursor-pointer disabled:opacity-50"
                                title="Print 58mm Thermal Receipt on SC588 Bluetooth"
                              >
                                <Printer className={`w-3.5 h-3.5 ${printingInvId === inv.id ? "animate-bounce text-blue-600" : ""}`} />
                                <span>{printingInvId === inv.id ? "Printing..." : "Print"}</span>
                              </button>

                              {/* Download PDF Button */}
                              <button
                                onClick={() => handleDownloadPdf(inv.id)}
                                disabled={isDownloading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-colors border border-blue-200 hover:border-blue-600 cursor-pointer disabled:opacity-50"
                                title="Download GST Invoice PDF"
                              >
                                <Download className={`w-3.5 h-3.5 ${isDownloading ? "animate-bounce" : ""}`} />
                                {isDownloading ? "..." : "PDF"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- BULK WHATSAPP DISPATCHER MODAL --- */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-emerald-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-lg">Bulk WhatsApp Invoice Dispatcher</h3>
                    <p className="text-xs text-gray-500">
                      Sending to {selectedInvoicesList.length} customer invoices.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Invoices Dispatch Queue */}
              <div className="p-6 overflow-y-auto space-y-3 flex-1 divide-y divide-gray-100">
                {selectedInvoicesList.map((inv, idx) => {
                  const isSent = bulkSentStatus[inv.id];
                  const hasPhone = Boolean(inv.customer?.phone && inv.customer.phone.trim().length >= 10);

                  return (
                    <div key={inv.id} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-xs font-mono font-bold text-gray-400">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm">{inv.invoice_number}</span>
                            <span className="text-xs font-semibold text-gray-600">• {inv.customer?.name || "Walk-in"}</span>
                          </div>
                          <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {hasPhone ? inv.customer.phone : "No Phone Specified"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-gray-900">
                          ₹{Number(inv.total_amount).toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleSingleWhatsApp(inv)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                            isSent
                              ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              : "bg-emerald-600 text-white hover:bg-emerald-700"
                          }`}
                        >
                          <Send className="w-3 h-3" />
                          {isSent ? "Sent Again" : "Send WhatsApp"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Tip: Web WhatsApp will open in a new tab for each customer with their personalized invoice summary pre-filled.
                </span>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- MANUAL PHONE NUMBER INPUT MODAL --- */}
        {manualPhoneInvoice && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <button
                  onClick={() => setManualPhoneInvoice(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900">Enter WhatsApp Number</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Invoice {manualPhoneInvoice.invoice_number} has no phone on record. Enter recipient number to send.
                </p>
              </div>

              <form onSubmit={handleManualPhoneSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mobile / WhatsApp Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={manualPhoneNumber}
                    onChange={(e) => setManualPhoneNumber(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-600"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setManualPhoneInvoice(null)}
                    className="px-3.5 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Open WhatsApp
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
