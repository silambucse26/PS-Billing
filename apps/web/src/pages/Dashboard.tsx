import React, { useEffect, useState, useMemo, useRef } from "react";
import { api } from "../lib/api";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { 
  DollarSign, 
  Package, 
  TrendingUp, 
  Receipt, 
  Store, 
  Phone, 
  MapPin, 
  FileText, 
  User, 
  Edit2, 
  Check, 
  X, 
  ArrowLeft, 
  Award, 
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Calendar,
  Download,
  Printer,
  FileSpreadsheet,
  ArrowUpDown,
  Filter,
  ChevronDown,
  Mail,
  Building2,
  CheckCircle2
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user, shop, profile, refreshProfile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  // Time Period & Date Filters State
  const [period, setPeriod] = useState<string>("this_month");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"preset" | "granular" | "custom">("preset");

  // Sorting for analytics / best selling
  const [productSortBy, setProductSortBy] = useState<"units" | "revenue" | "margin">("units");

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Shop details local state for inline editing
  const [localShop, setLocalShop] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editState, setEditState] = useState("");
  const [editGstin, setEditGstin] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDashboardData = async (shopId?: string | null) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (shopId) params.append("shopId", shopId);

      if (filterMode === "preset") {
        params.append("period", period);
      } else if (filterMode === "custom") {
        params.append("period", "custom");
        if (customStart) params.append("startDate", customStart);
        if (customEnd) params.append("endDate", customEnd);
      } else if (filterMode === "granular") {
        if (selectedYear) params.append("year", selectedYear);
        if (selectedMonth) params.append("month", selectedMonth);
        if (selectedDay) params.append("day", selectedDay);
      }

      const url = `/reports/dashboard?${params.toString()}`;
      const res = await api.get(url);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedShopId);
  }, [selectedShopId, period, filterMode, selectedYear, selectedMonth, selectedDay]);

  useEffect(() => {
    const activeShop = data?.targetShop || shop;
    if (activeShop) {
      setLocalShop(activeShop);
      setEditName(activeShop.name || "");
      setEditPhone(activeShop.phone || "");
      setEditState(activeShop.state || "");
      setEditGstin(activeShop.gstin || "");
      setEditAddress(activeShop.address || "");
    }
  }, [shop, data?.targetShop]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setError(null);
    try {
      const updated = await api.put("/reports/update-shop", {
        name: editName,
        phone: editPhone,
        state: editState,
        gstin: editGstin,
        address: editAddress
      });
      setLocalShop(updated);
      setIsEditing(false);
      await refreshProfile();
      fetchDashboardData(selectedShopId);
    } catch (err: any) {
      setError(err.message || "Failed to update shop details");
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancel = () => {
    if (localShop) {
      setEditName(localShop.name || "");
      setEditPhone(localShop.phone || "");
      setEditState(localShop.state || "");
      setEditGstin(localShop.gstin || "");
      setEditAddress(localShop.address || "");
    }
    setIsEditing(false);
    setError(null);
  };

  const isSuperAdmin = profile?.role === "super_admin";
  const viewingSingleShop = !isSuperAdmin || selectedShopId !== null;
  const currentShopInfo = data?.targetShop || localShop || shop;

  // Sorted best selling products according to user sort choice
  const sortedBestSellingProducts = useMemo(() => {
    if (!data?.bestSellingProducts) return [];
    const prods = [...(data.bestSellingProducts || [])];
    if (productSortBy === "units") {
      return prods.sort((a, b) => b.unitsSold - a.unitsSold);
    } else if (productSortBy === "revenue") {
      return prods.sort((a, b) => b.revenue - a.revenue);
    } else if (productSortBy === "margin") {
      return prods.sort((a, b) => b.marginEarned - a.marginEarned);
    }
    return prods;
  }, [data?.bestSellingProducts, productSortBy]);


  // Formatted Date Filter Label
  const activeDateLabel = useMemo(() => {
    if (filterMode === "preset") {
      switch (period) {
        case "today": return "Today (Daily View)";
        case "yesterday": return "Yesterday";
        case "this_week": return "This Week";
        case "this_month": return "This Month (Current)";
        case "last_month": return "Last Month";
        case "this_year": return "This Year (" + new Date().getFullYear() + ")";
        case "last_year": return "Last Year (" + (new Date().getFullYear() - 1) + ")";
        case "all": return "All-Time Overview";
        default: return period;
      }
    } else if (filterMode === "custom") {
      return `Custom Range: ${customStart || "Beginning"} to ${customEnd || "Now"}`;
    } else if (filterMode === "granular") {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      let label = `Year ${selectedYear}`;
      if (selectedMonth) label += ` • ${monthNames[parseInt(selectedMonth, 10) - 1]}`;
      if (selectedDay) label += ` • Day ${selectedDay}`;
      return label;
    }
    return "All Time";
  }, [filterMode, period, customStart, customEnd, selectedYear, selectedMonth, selectedDay]);

  // --- Export to CSV Generator ---
  const handleExportCSV = () => {
    setShowExportMenu(false);
    if (!data) return;

    const shopName = currentShopInfo?.name || "PashuCentral Network";
    const timestamp = new Date().toLocaleString("en-IN");
    
    let csvContent = `data:text/csv;charset=utf-8,`;
    
    // Header section
    csvContent += `PASHUCENTRAL BILLING & ANALYTICS REPORT\r\n`;
    csvContent += `Shop / Center:,"${shopName}"\r\n`;
    csvContent += `Period / Date Filter:,"${activeDateLabel}"\r\n`;
    csvContent += `Generated At:,"${timestamp}"\r\n\r\n`;

    // KPI Summary Section
    csvContent += `EXECUTIVE SUMMARY METRICS\r\n`;
    csvContent += `Metric,Value\r\n`;
    csvContent += `Total Revenue (INR),${Number(data.totalSales || 0).toFixed(2)}\r\n`;
    csvContent += `Profit Margin Earned (INR),${Number(data.realizedMargin || 0).toFixed(2)}\r\n`;
    csvContent += `Margin Percentage,${Number(data.marginPercentage || 0).toFixed(1)}%\r\n`;
    csvContent += `Invoices Issued,${data.invoiceCount || 0}\r\n`;
    csvContent += `Average Order Value (INR),${Number(data.averageOrderValue || 0).toFixed(2)}\r\n`;
    csvContent += `Total Amount Collected (INR),${Number(data.totalCollected || 0).toFixed(2)}\r\n`;
    csvContent += `Current Stock Value (Selling Price INR),${Number(data.totalStockValue || 0).toFixed(2)}\r\n`;
    csvContent += `Current Units in Catalog Stock,${data.totalUnitsInStock || 0}\r\n\r\n`;

    // Best Selling Products Section
    csvContent += `TOP PERFORMING PRODUCTS IN PERIOD\r\n`;
    csvContent += `Rank,Product Name,Units Sold,Total Revenue (INR),Margin Earned (INR),Stock Remaining\r\n`;
    (sortedBestSellingProducts || []).forEach((p: any, idx: number) => {
      csvContent += `${idx + 1},"${(p.name || '').replace(/"/g, '""')}",${p.unitsSold || 0},${Number(p.revenue || 0).toFixed(2)},${Number(p.marginEarned || 0).toFixed(2)},${p.currentStock || 0}\r\n`;
    });
    csvContent += `\r\n`;

    // Time Trends Breakdown
    if (data.timeTrends && data.timeTrends.length > 0) {
      csvContent += `TIME SERIES TREND BREAKDOWN (${data.granularity?.toUpperCase() || 'DAILY'})\r\n`;
      csvContent += `Time Interval,Revenue (INR),Margin (INR),Invoices Count\r\n`;
      data.timeTrends.forEach((t: any) => {
        csvContent += `"${t.label}",${Number(t.revenue || 0).toFixed(2)},${Number(t.margin || 0).toFixed(2)},${t.invoiceCount || 0}\r\n`;
      });
      csvContent += `\r\n`;
    }

    // Recent Invoices Section
    if (data.recentInvoices && data.recentInvoices.length > 0) {
      csvContent += `INVOICES IN PERIOD\r\n`;
      csvContent += `Invoice Number,Date,Customer Name,Payment Mode,Total Amount (INR),Status\r\n`;
      data.recentInvoices.forEach((inv: any) => {
        const invDate = new Date(inv.date).toLocaleDateString("en-IN");
        csvContent += `"${inv.invoice_number}","${invDate}","${(inv.customerName || '').replace(/"/g, '""')}","${inv.payment_mode}",${Number(inv.total_amount || 0).toFixed(2)},"${inv.status}"\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const cleanFileName = `Analytics_Report_${(shopName).replace(/\s+/g, '_')}_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("download", cleanFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Export to PDF / Print Trigger ---
  const handleExportPDF = () => {
    setShowExportMenu(false);
    window.print();
  };

  const yearsList = [
    new Date().getFullYear().toString(),
    (new Date().getFullYear() - 1).toString(),
    (new Date().getFullYear() - 2).toString()
  ];

  const monthsList = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
  ];

  return (
    <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen text-gray-900 animate-fade-in print:bg-white">
      {/* Sidebar hidden in print */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto print:p-0 print:overflow-visible min-w-0">
        {/* Printable Header for PDF Export */}
        <div className="hidden print:block mb-6 border-b pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                {currentShopInfo?.name || "PashuCentral Billing & Enterprise Analytics"}
              </h1>
              <p className="text-xs text-gray-600 mt-1">
                {currentShopInfo?.address || "Franchise Store"} {currentShopInfo?.state ? `• ${currentShopInfo.state}` : ""}
              </p>
              {currentShopInfo?.gstin && (
                <p className="text-xs text-gray-600 font-mono">GSTIN: {currentShopInfo.gstin}</p>
              )}
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-lg block mb-1">
                {activeDateLabel}
              </span>
              <p className="text-[11px] text-gray-500">Report Generated: {new Date().toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PREMIUM SHOP & OWNER IDENTITY HERO CARD                        */}
        {/* ============================================================== */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 sm:p-6 mb-6 print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Left: Brand Visuals (Shop Image + User Avatar) & Core Information */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              
              {/* Separate Visual Slots: Shop Store Image + Owner Profile Photo */}
              <div className="flex items-center gap-3.5 flex-shrink-0">
                {/* 1. Shop Store Logo Frame */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200/90 shadow-2xs overflow-hidden flex items-center justify-center p-1.5">
                    {currentShopInfo?.logo_url || currentShopInfo?.image_url ? (
                      <img
                        src={currentShopInfo.logo_url || currentShopInfo.image_url}
                        alt={currentShopInfo.name || "Shop Image"}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-emerald-800 bg-emerald-100/50 rounded-xl">
                        <Store className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Shop Image</span>
                </div>

                {/* 2. Owner Profile Photo Frame */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-gray-100 border-2 border-gray-200/90 shadow-2xs overflow-hidden flex items-center justify-center p-1">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name || "Owner Profile"}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 bg-slate-200/70 rounded-xl">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Profile Photo</span>
                </div>
              </div>

              {/* Shop Title, Badges, and Details Grid */}
              <div className="space-y-2">
                {/* Shop Name & Status Badges */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
                    {currentShopInfo?.name || "PASHUCENTRAL STORE"}
                  </h2>
                  
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Store
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    {profile?.role === "super_admin" ? "Central Admin" : "Franchise Partner"}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5 text-xs text-gray-600 font-medium">
                  
                  {/* Owner Name */}
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                    <span>Owner: <strong className="text-gray-900 font-bold">{profile?.full_name || "Franchise Partner"}</strong></span>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                    <span>Phone: <strong className="text-gray-900">{currentShopInfo?.phone || profile?.phone || "Not Specified"}</strong></span>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                    <span className="truncate max-w-[220px]">Email: <strong className="text-gray-900">{user?.email || "N/A"}</strong></span>
                  </div>

                  {/* Address */}
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                    <span className="line-clamp-1">
                      Address: <strong className="text-gray-900">{currentShopInfo?.address || "Franchise Store"}{currentShopInfo?.state ? `, ${currentShopInfo.state}` : ""}</strong>
                    </span>
                  </div>

                  {/* GSTIN */}
                  {currentShopInfo?.gstin && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                      <span>GSTIN: <strong className="text-gray-900 font-bold">{currentShopInfo.gstin}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-100 flex-shrink-0">
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
                Edit Profile & Shop
              </Link>

              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>POS & Store Active</span>
              </div>
            </div>

          </div>
        </div>

        {/* Dashboard Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:hidden">
          <div>
            {selectedShopId && (
              <button
                onClick={() => setSelectedShopId(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 mb-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to All Shops Overview
              </button>
            )}
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              {selectedShopId ? (
                <>
                  <Store className="w-8 h-8 text-blue-600 flex-shrink-0" />
                  <span>{currentShopInfo?.name || "Shop Dashboard"}</span>
                </>
              ) : isSuperAdmin ? (
                "Super Admin Central Dashboard"
              ) : (
                "Billing & Analytics Dashboard"
              )}
            </h1>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              {selectedShopId
                ? `Detailed metrics, live stock valuation, profit margins, and sales for ${currentShopInfo?.name || "this shop"}.`
                : isSuperAdmin
                ? "Real-time network intelligence, franchise revenue, and inventory valuation across all registered shops."
                : "Real-time revenue, live stock valuation, profit margin analytics, and best sellers."}
            </p>
          </div>

          {/* Action Bar (Refresh + Export Suite) */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Dashboard</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={handleExportPDF}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-green-600" />
                    <div>
                      <span className="block font-bold">Print / Export to PDF</span>
                      <span className="text-[10px] text-gray-400 font-normal">Printable formatted dashboard</span>
                    </div>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors border-t border-gray-100 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="block font-bold">Download CSV / Excel</span>
                      <span className="text-[10px] text-gray-400 font-normal">Full metrics & invoice tables</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => fetchDashboardData(selectedShopId)}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-green-600" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* --- TIME & DATE FILTERING CONTROL BAR --- */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs mb-8 print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Filter Mode Selector */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-50 text-green-700 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-900 block flex items-center gap-1.5">
                  Analytics Time Period Filter
                </span>
                <span className="text-[11px] text-gray-400">
                  Active Filter: <strong className="text-green-700 font-bold">{activeDateLabel}</strong>
                </span>
              </div>
            </div>

            {/* Quick Presets / Mode Selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "today", label: "Day (Today)" },
                { id: "yesterday", label: "Yesterday" },
                { id: "this_month", label: "This Month" },
                { id: "last_month", label: "Last Month" },
                { id: "this_year", label: "This Year" },
                { id: "all", label: "All Time" }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setFilterMode("preset");
                    setPeriod(p.id);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    filterMode === "preset" && period === p.id
                      ? "bg-green-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}

              <button
                onClick={() => setFilterMode("granular")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                  filterMode === "granular"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Filter className="w-3 h-3" /> Select Day / Month / Year
              </button>

              <button
                onClick={() => setFilterMode("custom")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  filterMode === "custom"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Granular Day / Month / Year Dropdowns (Visible when filterMode === "granular") */}
          {filterMode === "granular" && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  1. Select Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-600"
                >
                  {yearsList.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  2. Select Month (Optional)
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="">All Months in {selectedYear}</option>
                  {monthsList.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  3. Select Specific Day (Optional)
                </label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  disabled={!selectedMonth}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-600 disabled:opacity-50"
                >
                  <option value="">Entire Month</option>
                  {Array.from({ length: 31 }, (_, i) => (i + 1).toString()).map((d) => (
                    <option key={d} value={d}>Day {d}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Custom Date Range Picker (Visible when filterMode === "custom") */}
          {filterMode === "custom" && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="flex-1 w-full">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                />
              </div>

              <button
                onClick={() => fetchDashboardData(selectedShopId)}
                className="mt-4 sm:mt-5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer w-full sm:w-auto"
              >
                Apply Range
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-gray-500 font-medium bg-white border border-gray-200 rounded-2xl">
            <RefreshCw className="w-6 h-6 animate-spin text-green-600 mx-auto mb-3" />
            Calculating analytics, inventory valuation, and {activeDateLabel} sales data...
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 1. Total Revenue in Period */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {isSuperAdmin && !selectedShopId ? "Period Network Revenue" : "Period Revenue"}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-gray-900 mt-2 font-mono">
                  ₹{Number(data?.totalSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                  <span>{data?.invoiceCount || 0} Invoices</span>
                  <span className="font-semibold text-green-700">
                    ₹{Number(data?.averageOrderValue || 0).toFixed(0)} AOV
                  </span>
                </div>
              </div>

              {/* 2. Margin Earned (Realized Profit) */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Profit Margin Earned
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-emerald-600 mt-2 font-mono">
                  ₹{Number(data?.realizedMargin || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                  <span className="text-emerald-700 font-bold">
                    {Number(data?.marginPercentage || 0).toFixed(1)}% Margin Rate
                  </span>
                  <span>In {activeDateLabel}</span>
                </div>
              </div>

              {/* 3. Invoices Issued in Period */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Invoices Generated
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-purple-700 mt-2 font-mono">
                  {data?.invoiceCount || 0}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                  <span>Collected: ₹{Number(data?.totalCollected || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}</span>
                  <span>Due: ₹{Number(data?.outstanding || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}</span>
                </div>
              </div>

              {/* 4. Current Stock Valuation (Selling Value) */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Live Stock Worth
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-blue-700 mt-2 font-mono">
                  ₹{Number(data?.totalStockValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                  <span className="font-semibold text-blue-600">{data?.totalUnitsInStock || 0} items in stock</span>
                  <span>Potential: ₹{Number(data?.potentialStockMargin || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>



            {/* SUPER ADMIN VIEW: All Registered Shops Grid */}
            {isSuperAdmin && !selectedShopId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                      <Store className="w-5 h-5 text-blue-600" />
                      All Registered Shops Performance ({activeDateLabel})
                    </h2>
                    <p className="text-xs text-gray-500">
                      Click on any shop card to drill down into its full individual dashboard and live stock values.
                    </p>
                  </div>
                  <Link
                    to="/admin/shops"
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    Manage Shops Settings <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {(data?.shopsSummary || []).map((s: any) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedShopId(s.id)}
                      className="bg-white border border-gray-200 hover:border-blue-500 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group relative"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold">
                            <Store className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {s.name}
                            </h3>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {s.state || "India"}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                          <ChevronRight className="w-5 h-5" />
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 py-3 border-t border-b border-gray-100 my-2">
                        <div>
                          <span className="text-[11px] font-semibold text-gray-400 uppercase block">Sales in Period</span>
                          <span className="text-base font-black text-gray-900 font-mono">
                            ₹{Number(s.totalRevenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-gray-400 uppercase block">Stock Worth</span>
                          <span className="text-base font-black text-blue-600 font-mono">
                            ₹{Number(s.stockValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                        <span>{s.invoiceCount || 0} Invoices</span>
                        <span>{s.productCount || 0} Products</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inventory Alerts: Out of Stock & Low Stock Warnings */}
            {((data?.outOfStockCount || 0) > 0 || (data?.lowStockCount || 0) > 0) && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4 print:hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center font-bold flex-shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        Inventory Stock Alerts
                        {(data?.outOfStockCount || 0) > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-black rounded-full border border-red-200">
                            {data.outOfStockCount} Out of Stock
                          </span>
                        )}
                        {(data?.lowStockCount || 0) > 0 && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-black rounded-full border border-amber-200">
                            {data.lowStockCount} Low Stock
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-gray-400">
                        Immediate inventory attention required to prevent checkout delays.
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/products"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs self-start sm:self-auto"
                  >
                    Manage & Restock in Products <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {/* Out of Stock Items */}
                  {(data?.outOfStockProducts || []).slice(0, 6).map((p: any) => (
                    <div
                      key={p.id}
                      className="p-3.5 bg-red-50/50 border border-red-200 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white border border-red-200 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                          ) : (
                            <Package className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 text-xs block line-clamp-1">{p.name}</span>
                          <span className="text-[11px] text-red-700/80 font-medium block">{p.shopName || shop?.name || "Shop Inventory"}</span>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-red-600 text-white text-[11px] font-black rounded-lg uppercase tracking-wider flex-shrink-0">
                        0 Left
                      </span>
                    </div>
                  ))}

                  {/* Low Stock Items */}
                  {(data?.lowStockProducts || []).slice(0, 6).map((p: any) => (
                    <div
                      key={p.id}
                      className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white border border-amber-200 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                          ) : (
                            <Package className="w-5 h-5 text-amber-400" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 text-xs block line-clamp-1">{p.name}</span>
                          <span className="text-[11px] text-gray-500 font-medium block">{p.shopName || shop?.name || "Shop Inventory"}</span>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-amber-600 text-white text-[11px] font-black rounded-lg uppercase tracking-wider flex-shrink-0">
                        {p.current_stock} Left
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Best Selling Products & Recent Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Best Selling Products (2 cols) */}
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      Top Performing Products ({activeDateLabel})
                    </h2>
                    <p className="text-xs text-gray-400">
                      Ranked performance during the selected time period.
                    </p>
                  </div>

                  {/* Analytics Sorting Controls */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto bg-gray-50 p-1 rounded-xl border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-400 px-1 uppercase flex items-center gap-0.5">
                      <ArrowUpDown className="w-2.5 h-2.5" /> Sort:
                    </span>
                    <button
                      onClick={() => setProductSortBy("units")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        productSortBy === "units"
                          ? "bg-white text-green-700 shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Units Sold
                    </button>
                    <button
                      onClick={() => setProductSortBy("revenue")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        productSortBy === "revenue"
                          ? "bg-white text-green-700 shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Revenue (₹)
                    </button>
                    <button
                      onClick={() => setProductSortBy("margin")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        productSortBy === "margin"
                          ? "bg-white text-green-700 shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Margin (₹)
                    </button>
                  </div>
                </div>

                {(!sortedBestSellingProducts || sortedBestSellingProducts.length === 0) ? (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    No product sales recorded for {activeDateLabel}.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {sortedBestSellingProducts.map((p: any, idx: number) => (
                      <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 text-center font-mono font-black text-xs ${
                            idx === 0 ? "text-amber-500 text-sm" : idx === 1 ? "text-slate-400 text-sm" : idx === 2 ? "text-amber-700 text-sm" : "text-gray-400"
                          }`}>
                            #{idx + 1}
                          </span>
                          <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                            ) : (
                              <Package className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 text-sm block">{p.name}</span>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                              <span>Stock Left: <strong className="text-gray-700">{p.currentStock}</strong></span>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold">Margin: ₹{Number(p.marginEarned || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-gray-900 block font-mono">
                            ₹{Number(p.revenue).toFixed(2)}
                          </span>
                          <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            {p.unitsSold} units sold
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Invoices Card (1 col) */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-purple-600" />
                        Invoices in Period
                      </h2>
                      <p className="text-xs text-gray-400">{activeDateLabel} billing records.</p>
                    </div>
                    <Link
                      to="/invoices"
                      className="text-xs font-bold text-blue-600 hover:text-blue-800"
                    >
                      View All
                    </Link>
                  </div>

                  {(!data?.recentInvoices || data.recentInvoices.length === 0) ? (
                    <div className="py-12 text-center text-gray-400 text-sm">
                      No invoices recorded for {activeDateLabel}.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.recentInvoices.map((inv: any) => (
                        <div
                          key={inv.id}
                          className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-xs text-blue-900 font-mono block">
                              {inv.invoice_number}
                            </span>
                            <span className="text-xs text-gray-500 font-medium">
                              {inv.customerName}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-xs text-gray-950 font-mono block">
                              ₹{inv.total_amount.toFixed(2)}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                              {inv.payment_mode}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  to="/billing"
                  className="w-full mt-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-center font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 print:hidden"
                >
                  <Sparkles className="w-4 h-4" /> Open Billing POS
                </Link>
              </div>
            </div>

            {/* Shop Profile Details (Inline Editable) */}
            {viewingSingleShop && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs print:hidden">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                      <Store className="w-5 h-5 text-green-600" />
                      Shop Profile Details
                    </h2>
                    <p className="text-xs text-gray-500">Manage and update your center settings.</p>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-xl border border-green-200 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Details
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Shop Name *</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-green-600 text-gray-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-green-600 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">State / Supply Region</label>
                        <input
                          type="text"
                          value={editState}
                          onChange={(e) => setEditState(e.target.value)}
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-green-600 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">GSTIN</label>
                        <input
                          type="text"
                          value={editGstin}
                          onChange={(e) => setEditGstin(e.target.value)}
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-green-600 text-gray-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
                      <textarea
                        rows={2}
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-green-600 text-gray-900"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={editLoading}
                        className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={editLoading}
                        className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-500 rounded-xl cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {editLoading ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Shop Name</span>
                        <span className="font-bold text-gray-900 text-base">{currentShopInfo?.name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Phone Number</span>
                        <span className="font-medium text-gray-700 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {currentShopInfo?.phone || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Owner / Contact</span>
                        <span className="font-medium text-gray-700 flex items-center gap-1.5 mt-0.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {profile?.full_name || "Center Manager"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">State & Supply Region</span>
                        <span className="font-medium text-gray-700 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {currentShopInfo?.state || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">GSTIN Identifier</span>
                        <span className="font-mono font-bold text-gray-900 flex items-center gap-1.5 mt-0.5">
                          <FileText className="w-3.5 h-3.5 text-gray-400" />
                          {currentShopInfo?.gstin || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Address</span>
                        <span className="font-medium text-gray-700 flex items-start gap-1.5 mt-0.5 whitespace-pre-line">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                          {currentShopInfo?.address || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
