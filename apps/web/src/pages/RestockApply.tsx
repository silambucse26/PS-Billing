import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { supabase } from "../lib/supabaseClient";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { 
  PackagePlus, 
  Package, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Truck, 
  RefreshCw,
  AlertCircle
} from "lucide-react";

export default function RestockApply() {
  const location = useLocation();
  const { shop } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState("");
  
  // Selected items for restock request
  const [orderItems, setOrderItems] = useState<{
    productId?: string;
    productName: string;
    sku: string;
    imageUrl: string | null;
    unit: string;
    currentStock: number;
    unitPurchasePrice: number;
    quantity: number;
  }[]>([]);

  const [paymentMode, setPaymentMode] = useState("upi");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Past requests
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Check if incoming from Interested Products page with a preselected product
  useEffect(() => {
    if (location.state?.preSelectedProduct) {
      const p = location.state.preSelectedProduct;
      setOrderItems((prev) => {
        const exists = prev.some((it) => it.sku?.toLowerCase() === p.sku?.toLowerCase());
        if (exists) return prev;
        return [
          ...prev,
          {
            productId: p.productId,
            productName: p.productName,
            sku: p.sku || "N/A",
            imageUrl: p.imageUrl || null,
            unit: p.unit || "pcs",
            currentStock: Number(p.currentStock || 0),
            unitPurchasePrice: Number(p.unitPurchasePrice || 0),
            quantity: Number(p.quantity || 10)
          }
        ];
      });
    }
  }, [location.state]);

  useEffect(() => {
    if (shop?.id) {
      fetchProducts();
      fetchMyRequests();
    }
  }, [shop]);

  const fetchProducts = async () => {
    if (!shop?.id) return;
    try {
      setLoadingProducts(true);
      const { data, error: pErr } = await supabase
        .from("products")
        .select("*")
        .eq("shop_id", shop.id)
        .order("name");

      if (pErr) throw pErr;
      setProducts(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchMyRequests = async () => {
    try {
      setLoadingRequests(true);
      const data = await api.get("/restock");
      setMyRequests(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const getItemKey = (item: any) => item.sku || item.productId || item.id;

  const addItemToOrder = (p: any) => {
    const key = p.sku || p.id;
    const existing = orderItems.find(item => getItemKey(item) === key);
    if (existing) {
      setOrderItems(orderItems.map(item => 
        getItemKey(item) === key ? { ...item, quantity: item.quantity + 5 } : item
      ));
    } else {
      setOrderItems([...orderItems, {
        productId: p.id,
        productName: p.name,
        sku: p.sku || "N/A",
        imageUrl: p.image_url || null,
        unit: p.unit || "pcs",
        currentStock: Number(p.current_stock || 0),
        unitPurchasePrice: Number(p.purchase_price || (p.sale_price * 0.6)),
        quantity: 10 // default request 10 units
      }]);
    }
  };

  const updateQuantity = (key: string, newQty: number) => {
    if (newQty <= 0) {
      setOrderItems(orderItems.filter(item => getItemKey(item) !== key));
    } else {
      setOrderItems(orderItems.map(item => 
        getItemKey(item) === key ? { ...item, quantity: newQty } : item
      ));
    }
  };

  const removeItem = (key: string) => {
    setOrderItems(orderItems.filter(item => getItemKey(item) !== key));
  };

  const totalEstimatedCost = orderItems.reduce(
    (sum, item) => sum + (item.quantity * item.unitPurchasePrice), 0
  );
  const totalUnits = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      setError("Please select at least one product to restock.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post("/restock", {
        shopId: shop?.id,
        items: orderItems,
        totalAmount: totalEstimatedCost,
        paymentMode,
        notes: notes.trim()
      });

      setSuccessMsg(`Restock Request ${res.requestNumber} submitted successfully! Admin will review and dispatch.`);
      setOrderItems([]);
      setNotes("");
      fetchMyRequests();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to submit restock request");
    } finally {
      setSubmitting(false);
    }
  };

  const [stockFilter, setStockFilter] = useState<"low" | "all">("low");

  const lowStockCount = products.filter(
    (p) => Number(p.current_stock || 0) <= Number(p.reorder_level || 5)
  ).length;

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
    if (!matchesSearch) return false;

    if (stockFilter === "low") {
      const stock = Number(p.current_stock || 0);
      const reorderLevel = Number(p.reorder_level || 5);
      return stock <= reorderLevel;
    }
    return true;
  });

  const addAllLowStockItems = () => {
    const lowItems = products.filter(
      (p) => Number(p.current_stock || 0) <= Number(p.reorder_level || 5)
    );
    lowItems.forEach((p) => addItemToOrder(p));
  };

  return (
    <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen text-gray-900 animate-fade-in">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 sm:space-y-8 min-w-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <Truck className="w-8 h-8 text-green-600" />
              Product Restock Application
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Select products needing inventory replenishment, specify quantities and preferred payment mode to request restock.
            </p>
          </div>
          <button
            onClick={() => { fetchProducts(); fetchMyRequests(); }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-xs cursor-pointer self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {successMsg && (
          <div className="p-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: Product Catalog Picker (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    1. Select Products to Restock
                  </h2>
                  <span className="text-xs text-gray-400 font-medium">
                    {filteredProducts.length} items shown
                  </span>
                </div>

                {/* Filter Switch Buttons */}
                <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setStockFilter("low")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      stockFilter === "low"
                        ? "bg-white text-red-700 shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Low & Out of Stock ({lowStockCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockFilter("all")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      stockFilter === "all"
                        ? "bg-white text-gray-900 shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    All Products ({products.length})
                  </button>
                </div>
              </div>

              {/* Banner when low stock filter active */}
              {stockFilter === "low" && lowStockCount > 0 && (
                <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-red-800 font-medium">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span><strong>{lowStockCount} products</strong> have reached reorder level or run out of stock.</span>
                  </div>
                  <button
                    type="button"
                    onClick={addAllLowStockItems}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs transition-all shadow-xs cursor-pointer flex-shrink-0"
                  >
                    + Add All Low Stock
                  </button>
                </div>
              )}

              {/* Search Bar */}
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search product by name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none text-gray-900 placeholder-gray-400 font-medium"
                />
              </div>

              {/* Products List */}
              {loadingProducts ? (
                <div className="py-12 text-center text-gray-400 text-sm">Loading products catalog...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  {stockFilter === "low"
                    ? "Great news! No products are currently low or out of stock. Switch to 'All Products' to restock other items."
                    : "No products found matching search."}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto pr-1">
                  {filteredProducts.map((p) => {
                    const isSelected = orderItems.some(i => i.productId === p.id);
                    const stock = Number(p.current_stock || 0);
                    const isLow = stock <= Number(p.reorder_level || 5);
                    const costPrice = Number(p.purchase_price || (p.sale_price * 0.6));

                    return (
                      <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                            ) : (
                              <Package className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 text-sm block">{p.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                                stock <= 0 
                                  ? "bg-red-100 text-red-700" 
                                  : isLow 
                                  ? "bg-amber-100 text-amber-800" 
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                Stock: {stock} {p.unit || "pcs"}
                              </span>
                              <span className="text-xs text-gray-500 font-semibold">
                                Cost: ₹{costPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => addItemToOrder(p)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-green-100 text-green-800 border border-green-200 hover:bg-green-200"
                              : "bg-green-600 hover:bg-green-500 text-white shadow-xs"
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {isSelected ? "Add +5 More" : "Request Stock"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Restock Request Form & Items (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <PackagePlus className="w-5 h-5 text-green-600" />
                  2. Restock Request Batch
                </h2>
                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {orderItems.length} Products
                </span>
              </div>

              {/* Items List */}
              {orderItems.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-xl p-4">
                  No products selected yet. Click "+ Request Stock" from the catalog on the left.
                </div>
              ) : (
                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                  {orderItems.map((item) => {
                    const key = getItemKey(item);
                    return (
                      <div key={key} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 p-0.5 flex-shrink-0">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-contain" />
                              ) : (
                                <Package className="w-4 h-4 text-gray-400 m-auto" />
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-gray-900 block line-clamp-1">{item.productName}</span>
                              <span className="text-[11px] text-gray-400">₹{item.unitPurchasePrice.toFixed(2)} / unit</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(key)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                          {/* Quantity Stepper */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(key, item.quantity - 1)}
                              className="w-6 h-6 rounded-lg bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(key, parseInt(e.target.value) || 1)}
                              className="w-14 text-center font-bold text-xs bg-white border border-gray-300 rounded-lg py-1 text-gray-900"
                            />
                            <button
                              type="button"
                              onClick={() => updateQuantity(key, item.quantity + 1)}
                              className="w-6 h-6 rounded-lg bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                        <span className="font-black font-mono text-xs text-gray-900">
                          ₹{(item.quantity * item.unitPurchasePrice).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}

              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-gray-500" />
                  Preferred Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "upi", name: "UPI Transfer" },
                    { id: "bank_transfer", name: "Bank / NEFT" },
                    { id: "cash", name: "Cash on Delivery" },
                    { id: "credit", name: "Credit / 30 Days" }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMode(mode.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                        paymentMode === mode.id
                          ? "bg-green-50 border-green-500 text-green-800 shadow-2xs"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {mode.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Urgency / Delivery Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Urgent stock needed before weekend rush"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-green-600 font-medium"
                />
              </div>

              {/* Summary & Submit */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Total Units Requested:</span>
                  <span className="font-bold text-gray-900">{totalUnits} units</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-700">Estimated Restock Cost:</span>
                  <span className="font-black text-lg text-green-700 font-mono">
                    ₹{totalEstimatedCost.toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || orderItems.length === 0}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className={`w-4 h-4 ${submitting ? "animate-spin" : ""}`} />
                  {submitting ? "Submitting Application..." : "Submit Restock Application"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 3. My Past Restock Requests History */}
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              My Restock Request History & Status
            </h2>
            <button
              onClick={fetchMyRequests}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Refresh Status
            </button>
          </div>

          {loadingRequests ? (
            <div className="py-8 text-center text-gray-400 text-sm">Loading requests history...</div>
          ) : myRequests.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              No restock requests submitted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => {
                const dateStr = new Date(req.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <div key={req.id} className="p-5 bg-gray-50/80 border border-gray-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2.5 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-black font-mono text-sm text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                          {req.requestNumber}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">{dateStr}</span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                          req.status === "approved"
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : req.status === "rejected"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                          {req.status === "approved" && <CheckCircle2 className="w-3 h-3" />}
                          {req.status === "rejected" && <XCircle className="w-3 h-3" />}
                          {req.status === "pending" && <Clock className="w-3 h-3" />}
                          {req.status === "approved" ? "Approved & Dispatched" : req.status}
                        </span>
                      </div>

                      {/* Shop Name and Location details */}
                      <div className="text-xs text-gray-600 flex flex-wrap items-center gap-2">
                        <span className="font-bold text-gray-900">{req.shopName || shop?.name || "My Shop"}</span>
                        <span className="text-gray-300">•</span>
                        <span>{req.shopState || shop?.state || "N/A"}</span>
                        <span className="text-gray-300">•</span>
                        <span>{req.shopPhone || shop?.phone || "N/A"}</span>
                      </div>

                      {/* Product items list with images */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {req.items?.map((item: any, idx: number) => (
                          <div key={idx} className="bg-white p-1.5 pr-2.5 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 p-0.5 flex-shrink-0 flex items-center justify-center overflow-hidden">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-contain" />
                              ) : (
                                <Package className="w-3.5 h-3.5 text-gray-400" />
                              )}
                            </div>
                            <span className="text-xs font-semibold text-gray-800">{item.productName}</span>
                            <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-mono">
                              &times; {item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>

                      {req.notes && (
                        <p className="text-xs text-gray-500 italic pt-0.5">"{req.notes}"</p>
                      )}
                      {req.adminRemarks && (
                        <p className="text-xs text-blue-600 font-medium pt-0.5">Admin: {req.adminRemarks}</p>
                      )}
                    </div>

                    <div className="text-right md:min-w-[140px] pl-4 md:border-l md:border-gray-200">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Total Amount</span>
                      <span className="text-lg font-black font-mono text-gray-950 block">
                        ₹{Number(req.totalAmount || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-gray-500 uppercase font-bold bg-gray-100 px-2 py-0.5 rounded inline-block mt-1">
                        {req.paymentMode}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
