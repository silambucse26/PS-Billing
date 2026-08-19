import { useState, useEffect } from "react";
import { calcInvoiceTotals } from "../lib/gst";
import type { CartLine } from "../lib/gst";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import Sidebar from "../components/Sidebar";
import { Package, Plus, Minus, Trash2, ShoppingCart, Search } from "lucide-react";

export default function Billing() {
  const { shop } = useAuth();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCattleCount, setCustomerCattleCount] = useState("");
  const [autoFilledMatchName, setAutoFilledMatchName] = useState<string | null>(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  useEffect(() => {
    if (shop?.id) {
      fetchProducts();
      fetchCustomers();
    }
  }, [shop]);

  const fetchProducts = async () => {
    if (!shop?.id) return;
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("shop_id", shop.id);
    if (data) setProducts(data);
  };

  const fetchCustomers = async () => {
    try {
      const data = await api.get("/customers");
      if (data) setCustomers(data);
    } catch {
      // Fallback
      const { data } = await supabase.from("customers").select("*");
      if (data) setCustomers(data);
    }
  };

  const handlePhoneChange = (inputPhone: string) => {
    setCustomerPhone(inputPhone);
    const cleaned = inputPhone.replace(/\D/g, ""); // extract digits
    if (cleaned.length >= 7) {
      const match = customers.find(c => {
        if (!c.phone) return false;
        const cDigits = String(c.phone).replace(/\D/g, "");
        return cDigits === cleaned || (cleaned.length >= 10 && cDigits.endsWith(cleaned.slice(-10)));
      });

      if (match) {
        setSelectedCustomerId(match.id);
        setCustomerName(match.name || "");
        if (match.gstin) setCustomerGstin(match.gstin);
        if (match.state) setCustomerState(match.state);
        if (match.address) setCustomerAddress(match.address);
        const cattle = match.cattleCount || match.credit_limit;
        if (cattle !== undefined && cattle !== null && cattle !== "") {
          setCustomerCattleCount(String(cattle));
        }
        setAutoFilledMatchName(match.name);
        return;
      }
    }
    setAutoFilledMatchName(null);
  };

  const totals = calcInvoiceTotals(cart, shop?.state || "Delhi", customerState || shop?.state || "Delhi");

  const addToCart = (p: any) => {
    const existing = cart.find((c) => c.productId === p.id);
    if (existing) {
      setCart(cart.map((c) => c.productId === p.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, {
        productId: p.id,
        name: p.name,
        qty: 1,
        unitPrice: p.sale_price,
        gstRate: p.gst_rate,
        imageUrl: p.image_url,
        unit: p.unit
      }]);
    }
  };

  const increaseQty = (productId: string) => {
    setCart(cart.map((c) => c.productId === productId ? { ...c, qty: c.qty + 1 } : c));
  };

  const decreaseQty = (productId: string) => {
    const existing = cart.find((c) => c.productId === productId);
    if (!existing) return;
    if (existing.qty <= 1) {
      setCart(cart.filter((c) => c.productId !== productId));
    } else {
      setCart(cart.map((c) => c.productId === productId ? { ...c, qty: c.qty - 1 } : c));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((c) => c.productId !== productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError("Please add at least one product to the cart before checking out.");
      return;
    }

    // MANDATORY Customer Data Validation
    if (!customerName.trim()) {
      setError("Customer Name is required. Please enter customer details before generating the invoice.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!customerPhone.trim()) {
      setError("Customer Phone Number is required. Please enter a valid contact number.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!customerAddress.trim()) {
      setError("Customer Full Address is required. Please enter the village / farm address.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let finalCustId = selectedCustomerId || null;

      // Register or update the customer via backend API
      if (customerName.trim()) {
        const newCust = await api.post("/customers", {
          name: customerName.trim(),
          phone: customerPhone.trim() || null,
          gstin: customerGstin.trim() || null,
          state: customerState.trim() || shop?.state || "Delhi",
          address: customerAddress.trim() || null,
          cattleCount: Number(customerCattleCount) || 0,
          shopId: shop?.id
        });
        if (newCust?.id) finalCustId = newCust.id;
      }

      const res = await api.post("/invoices", {
        items: cart.map((c) => ({
          productId: c.productId,
          qty: c.qty,
          unitPrice: c.unitPrice,
          gstRate: c.gstRate,
          discount: c.discount || 0
        })),
        customerId: finalCustId,
        paymentMode,
        paidAmount: totals.totalAmount
      });

      // Fetch PDF with auth header
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const pdfRes = await fetch(`http://localhost:5000/api/invoices/${res.id}/pdf`, {
        headers: { Authorization: `Bearer ${token || ""}` }
      });
      if (!pdfRes.ok) {
        const errData = await pdfRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to download invoice PDF");
      }
      const pdfBlob = await pdfRes.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
      
      // Clear forms
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerGstin("");
      setCustomerState("");
      setCustomerAddress("");
      setCustomerCattleCount("");
      setSelectedCustomerId("");
      setAutoFilledMatchName(null);
      
      // Reload customers list
      fetchCustomers();
    } catch (e: any) {
      setError(e.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleProductSearch = (val: string) => {
    setSearch(val);
    if (!val) {
      setShowProductDropdown(false);
      return;
    }
    
    const exactMatch = products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === val.toLowerCase().trim()
    );
    if (exactMatch) {
      addToCart(exactMatch);
      setSearch("");
      setShowProductDropdown(false);
    } else {
      setShowProductDropdown(true);
    }
  };

  const scrollToCheckout = () => {
    const el = document.getElementById("checkout-section");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen text-gray-900">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto space-y-6 min-w-0 pb-28 lg:pb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">POS Billing</h1>
          <p className="text-xs text-gray-500 mt-1">Create retail tax invoices and manage checkout instantly.</p>
        </div>

        {/* 1. CUSTOMER INVOICE INFO (HIGH VISIBILITY SECTION) */}
        <div className="bg-white border-2 border-gray-200 p-4 sm:p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">
                1. Customer & Cattle Details
              </h2>
              {autoFilledMatchName && (
                <span className="text-[11px] text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full font-bold border border-green-200 animate-fade-in flex items-center gap-1">
                  ✓ Existing Client Auto-Filled: <strong>{autoFilledMatchName}</strong>
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 font-medium">* Cattle count recorded for internal records only</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Auto-fill Registered Client
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedCustomerId(id);
                  if (id) {
                    const cust = customers.find((c) => c.id === id);
                    if (cust) {
                      setCustomerName(cust.name || "");
                      setCustomerPhone(cust.phone || "");
                      setCustomerGstin(cust.gstin || "");
                      setCustomerState(cust.state || shop?.state || "Delhi");
                      setCustomerAddress(cust.address || "");
                      setCustomerCattleCount(cust.cattleCount ? String(cust.cattleCount) : (cust.credit_limit ? String(cust.credit_limit) : ""));
                      setAutoFilledMatchName(cust.name);
                    }
                  } else {
                    setCustomerName("");
                    setCustomerPhone("");
                    setCustomerGstin("");
                    setCustomerAddress("");
                    setCustomerCattleCount("");
                    setCustomerState(shop?.state || "Delhi");
                    setAutoFilledMatchName(null);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-100 rounded-xl text-gray-950 font-bold text-xs cursor-pointer shadow-2xs outline-none transition-all"
              >
                <option value="">-- Choose registered customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""} {c.cattleCount ? `[${c.cattleCount} Cattle]` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter Customer / Farmer Name"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setSelectedCustomerId("");
                }}
                className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-100 rounded-xl text-gray-950 font-semibold shadow-2xs outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 9876543210 (Auto-Detects)"
                value={customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-100 rounded-xl text-gray-950 font-semibold shadow-2xs outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                No. of Cattle (Heads/Count)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 15 Cattle"
                value={customerCattleCount}
                onChange={(e) => {
                  setCustomerCattleCount(e.target.value);
                  setSelectedCustomerId("");
                }}
                className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-100 rounded-xl text-gray-950 font-semibold shadow-2xs outline-none transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Full Customer Address (Farm / Street Address) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Plot 4B, Near Dairy Farm, Village Road, Hosur"
                value={customerAddress}
                onChange={(e) => {
                  setCustomerAddress(e.target.value);
                  setSelectedCustomerId("");
                }}
                className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-100 rounded-xl text-gray-950 font-semibold shadow-2xs outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                State (Supply Region)
              </label>
              <input
                type="text"
                placeholder="State (e.g. Tamil Nadu)"
                value={customerState}
                onChange={(e) => {
                  setCustomerState(e.target.value);
                  setSelectedCustomerId("");
                }}
                className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-100 rounded-xl text-gray-950 font-semibold shadow-2xs outline-none transition-all placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* 2. INVENTORY SEARCH & PRODUCT SELECTOR (FULL PAGE CART LIST) */}
        <div className="bg-white border-2 border-gray-200 p-4 sm:p-6 rounded-2xl shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider mb-1">
              2. Products & Cart Line Details
            </h2>
            <p className="text-xs text-gray-400">Search for inventory items or scan their SKU barcodes to auto-add.</p>
          </div>

          {/* Autocomplete Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search product by name, SKU, or scan barcode to add..."
              value={search}
              onChange={(e) => handleProductSearch(e.target.value)}
              onFocus={() => setShowProductDropdown(true)}
              className="w-full pl-11 pr-4 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-100 rounded-xl text-sm font-bold text-gray-950 shadow-2xs outline-none transition-all placeholder:text-gray-400"
            />

            {/* Dropdown autocompletion menu */}
            {showProductDropdown && search.trim().length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-gray-150 animate-fade-in">
                {products
                  .filter((p) => 
                    p.name.toLowerCase().includes(search.toLowerCase()) ||
                    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
                    (p.barcode && p.barcode.includes(search))
                  )
                  .length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No products found matching filters.</div>
                ) : (
                  products
                    .filter((p) => 
                    p.name.toLowerCase().includes(search.toLowerCase()) ||
                    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
                    (p.barcode && p.barcode.includes(search))
                  )
                    .map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          addToCart(p);
                          setSearch("");
                          setShowProductDropdown(false);
                        }}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-lg flex items-center justify-center border border-gray-200 flex-shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-bold text-gray-900">{p.name}</div>
                            <div className="text-xxs text-gray-500 mt-0.5">
                              SKU: {p.sku || "N/A"} | Stock: {p.current_stock} {p.unit || "pcs"}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-gray-950">₹{Number(p.sale_price || 0).toFixed(2)}</span>
                      </div>
                    ))
                )}
              </div>
            )}
            
            {/* Click-away overlay to close dropdown */}
            {showProductDropdown && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowProductDropdown(false)}
              />
            )}
          </div>

          {/* Cart items listing details */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            {cart.length === 0 ? (
              <div className="text-gray-500 text-sm flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <ShoppingCart className="w-12 h-12 text-gray-300 mb-2" />
                <p className="font-semibold text-gray-400">Your invoice is empty</p>
                <p className="text-xs text-gray-400 mt-0.5">Search and select items in the bar above to construct invoice.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="hidden sm:flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100 px-2">
                  <span>Product Item</span>
                  <div className="flex gap-20 mr-12">
                    <span>Quantity</span>
                    <span>Prices</span>
                  </div>
                </div>

                {cart.map((item) => (
                  <div 
                    key={item.productId} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 bg-gray-50 hover:bg-gray-100/50 border border-gray-200 rounded-2xl transition-all gap-3 sm:gap-4"
                  >
                    {/* Item Details */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded-xl border border-gray-200 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/100x100.png?text=Product";
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-white text-gray-400 rounded-xl flex items-center justify-center border border-gray-200 flex-shrink-0">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-sm text-gray-900 truncate leading-snug">{item.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xxs font-bold text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200 uppercase">
                            {item.unit || "pcs"}
                          </span>
                          <span className="text-xxs font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-150">
                            GST {item.gstRate}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity & Prices on Mobile / Desktop */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/60">
                      {/* Quantity Modifiers */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => decreaseQty(item.productId)}
                          className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 border border-gray-200 hover:border-gray-300 text-gray-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center font-black text-gray-900 text-sm select-none">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => increaseQty(item.productId)}
                          className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 border border-gray-200 hover:border-gray-300 text-gray-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Prices */}
                      <div className="text-right">
                        <div className="text-xs text-gray-400 font-medium">₹{Number(item.unitPrice).toFixed(2)}</div>
                        <div className="text-sm font-black text-gray-950">₹{(item.qty * item.unitPrice).toFixed(2)}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-100"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. CHECKOUT TOTALS & INVOICE GENERATOR */}
        <div id="checkout-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Checkout Payment mode */}
          <div className="lg:col-span-2 bg-white border-2 border-gray-200 p-6 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">3. Settlement & Payment Mode</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-100 rounded-xl text-gray-950 font-bold text-sm cursor-pointer shadow-2xs outline-none transition-all"
                >
                  <option value="cash">Cash Settlement</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="card">Card Swipe</option>
                  <option value="credit">Credit / Account</option>
                </select>
              </div>
              
              {error && (
                <div className="flex items-center text-red-700 bg-red-50 border-2 border-red-200 rounded-xl p-4 text-xs font-bold leading-normal self-end">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Checkout Invoice Totals */}
          <div className="bg-white border-2 border-gray-200 p-6 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider border-b border-gray-150 pb-2">Taxes & Summary</h2>
            <div className="space-y-2.5 text-xs text-gray-700">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-500">Subtotal</span>
                <span className="font-bold text-gray-900 font-mono">₹{totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.isInterState ? (
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">IGST</span>
                  <span className="font-bold text-gray-900 font-mono">₹{totals.igst.toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-500">CGST</span>
                    <span className="font-bold text-gray-900 font-mono">₹{totals.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-500">SGST</span>
                    <span className="font-bold text-gray-900 font-mono">₹{totals.sgst.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Round off</span>
                <span className="font-bold text-gray-900 font-mono">₹{totals.roundOff.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-green-700 pt-2 pb-3">
                <span>Total Bill Amount</span>
                <span className="font-mono text-lg">₹{totals.totalAmount}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading || cart.length === 0}
              className="w-full py-3.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg transition-all text-center cursor-pointer shadow-green-100"
            >
              {loading ? "Generating Invoice..." : "Generate Invoice & Print"}
            </button>
          </div>
        </div>

        {/* Floating Mobile Sticky Checkout Bar */}
        {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 shadow-xl flex items-center justify-between gap-3 animate-slide-up">
            <div>
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                {cart.reduce((s, i) => s + i.qty, 0)} items in Cart
              </div>
              <div className="text-lg font-black text-green-700 font-mono">
                ₹{totals.totalAmount}
              </div>
            </div>
            <button
              type="button"
              onClick={scrollToCheckout}
              className="px-5 py-3 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              Review & Checkout ➔
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
