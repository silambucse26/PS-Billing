import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import Sidebar from "../components/Sidebar";
import { Search, User, Phone, MapPin, Plus, X, Check, Store, Receipt, Milk } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Customers() {
  const { profile, shop } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New customer creation modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [cattleCount, setCattleCount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get("/customers");
      setCustomers(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      await api.post("/customers", {
        name: name.trim(),
        phone: phone.trim() || null,
        gstin: gstin.trim() || null,
        state: state.trim() || shop?.state || "Delhi",
        address: address.trim() || null,
        cattleCount: Number(cattleCount) || 0,
        shopId: shop?.id
      });

      setSuccessMsg("Customer added successfully!");
      setIsModalOpen(false);
      setName("");
      setPhone("");
      setGstin("");
      setState("");
      setAddress("");
      setCattleCount("");
      fetchCustomers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to add customer");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    const shopName = c.shop?.name || c.invoices?.[0]?.shop?.name || "";
    return (
      c.name?.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.gstin && c.gstin.toLowerCase().includes(q)) ||
      shopName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen text-gray-900 animate-fade-in">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Registered Customers & Dairy Farmers</h1>
            <p className="text-sm text-gray-500 mt-1">
              Directory of customers, cattle counts, farm addresses, and client accounts{profile?.role === "super_admin" ? " across all registered shops." : "."}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-500 rounded-xl transition-all shadow-md hover:shadow-green-150 cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>

        {successMsg && (
          <div className="p-4 mb-6 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl">
            {successMsg}
          </div>
        )}
        {error && (
          <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm mb-6 flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={
              profile?.role === "super_admin"
                ? "Search customers by name, phone, address, GST number, or shop name..."
                : "Search customers by name, phone, address, or GST number..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none text-gray-900 placeholder-gray-400 font-medium"
          />
        </div>

        {/* Customer Catalog Table */}
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-medium bg-white border border-gray-200 rounded-2xl">
            Loading customer catalog...
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Customer</th>
                    {profile?.role === "super_admin" && (
                      <th className="py-4 px-6">Registered Shop</th>
                    )}
                    <th className="py-4 px-6">Contact / Phone</th>
                    <th className="py-4 px-6">No. of Cattle</th>
                    <th className="py-4 px-6">Full Address</th>
                    <th className="py-4 px-6">GSTIN / State</th>
                    <th className="py-4 px-6 text-right">Invoices</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={profile?.role === "super_admin" ? 7 : 6} className="py-12 px-6 text-center text-gray-500">
                        No customers found matching search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => {
                      const shopName = c.shop?.name || c.invoices?.[0]?.shop?.name || "Direct / Central";
                      const invCount = c.invoices?.length || 0;
                      const cCount = Number(c.cattleCount || c.credit_limit || 0);

                      return (
                        <tr key={c.id} className="text-sm hover:bg-gray-50/80 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-50 text-green-700 rounded-xl flex items-center justify-center font-bold text-sm border border-green-100 flex-shrink-0">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="font-bold text-gray-900 block">{c.name}</span>
                                <span className="text-xs text-gray-400">
                                  Joined {new Date(c.created_at).toLocaleDateString("en-IN")}
                                </span>
                              </div>
                            </div>
                          </td>

                          {profile?.role === "super_admin" && (
                            <td className="py-4 px-6">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200">
                                <Store className="w-3.5 h-3.5" />
                                {shopName}
                              </div>
                            </td>
                          )}

                          <td className="py-4 px-6 text-gray-700">
                            {c.phone ? (
                              <span className="flex items-center gap-1.5 font-medium">
                                <Phone className="w-4 h-4 text-gray-400" />
                                {c.phone}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>

                          {/* No. of Cattle */}
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs font-bold border border-amber-200">
                              <Milk className="w-3.5 h-3.5 text-amber-600" />
                              {cCount > 0 ? `${cCount} Cattle` : "Not specified"}
                            </span>
                          </td>

                          {/* Full Address */}
                          <td className="py-4 px-6 text-gray-700 text-xs max-w-xs">
                            {c.address ? (
                              <span className="flex items-start gap-1.5 font-medium line-clamp-2">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                {c.address}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>

                          {/* GSTIN / State */}
                          <td className="py-4 px-6 font-mono text-gray-800 text-xs">
                            <div>
                              {c.gstin ? (
                                <span className="font-bold text-gray-950 block">{c.gstin}</span>
                              ) : (
                                <span className="text-gray-400 font-sans">Consumer</span>
                              )}
                              <span className="text-gray-500 font-sans">{c.state || "N/A"}</span>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-right font-semibold">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                              <Receipt className="w-3.5 h-3.5 text-gray-500" />
                              {invCount} bill{invCount === 1 ? "" : "s"}
                            </span>
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

        {/* Add Customer Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900">Add New Customer / Farmer</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900 text-sm"
                    placeholder="e.g. Ramesh Kumar"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone / Mobile</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900 text-sm"
                      placeholder="+91 9876543210"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">No. of Cattle (Count)</label>
                    <input
                      type="number"
                      min="0"
                      value={cattleCount}
                      onChange={(e) => setCattleCount(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900 text-sm"
                      placeholder="e.g. 12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Customer / Farm Address</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900 text-sm"
                    placeholder="e.g. Plot 14, Near Dairy Cooperative, Village Road, Hosur"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">State / Supply Region</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900 text-sm"
                      placeholder="e.g. Tamil Nadu"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">GSTIN Number</label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900 text-sm font-mono"
                      placeholder="33AAAAA0000A1Z5"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl shadow-sm cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {submitting ? "Saving..." : "Save Customer"}
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

