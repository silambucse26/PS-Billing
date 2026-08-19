import { useEffect, useState } from "react";
import { api } from "../lib/api";
import Sidebar from "../components/Sidebar";
import { 
  Truck, 
  Store, 
  Package, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  Phone, 
  MapPin, 
  Check, 
  X 
} from "lucide-react";

export default function AdminRestock() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reject modal state
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get("/restock");
      setRequests(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load restock requests");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: "approved" | "rejected", remarks?: string) => {
    try {
      setActionLoadingId(id);
      setError(null);

      const updated = await api.put(`/restock/${id}/status`, {
        status,
        adminRemarks: remarks || null
      });

      setSuccessMsg(
        status === "approved"
          ? `Request ${updated.requestNumber} approved! Stock has been automatically added to the shop catalog.`
          : `Request ${updated.requestNumber} has been rejected.`
      );

      // Update local state
      setRequests(requests.map(r => r.id === id ? updated : r));
      setRejectModalId(null);
      setRejectRemarks("");
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err: any) {
      setError(err.message || "Failed to update restock status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = requests.filter(r => {
    const q = search.toLowerCase();
    const matchesSearch =
      r.requestNumber?.toLowerCase().includes(q) ||
      r.shopName?.toLowerCase().includes(q) ||
      r.shopPhone?.includes(q) ||
      r.items?.some((i: any) => i.productName?.toLowerCase().includes(q));

    const matchesStatus =
      filterStatus === "all" ||
      r.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const pendingCount = requests.filter(r => r.status === "pending").length;
  const approvedCount = requests.filter(r => r.status === "approved").length;
  const totalValueRequested = requests.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
  const uniqueShopsCount = new Set(requests.map(r => r.shopId)).size;

  return (
    <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen text-gray-900 animate-fade-in">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 sm:space-y-8 min-w-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <Truck className="w-8 h-8 text-blue-600" />
              Central Restock & Inventory Dispatch (Admin)
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Review and approve incoming franchise inventory requests. Approving automatically increments the shop's product stock.
            </p>
          </div>
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-xs cursor-pointer self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            Refresh Requests
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
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Review</p>
              <p className="text-2xl font-black text-amber-600 mt-0.5">{pendingCount} requests</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Approved & Dispatched</p>
              <p className="text-2xl font-black text-green-700 mt-0.5">{approvedCount} fulfilled</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Value Requested</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5 font-mono">
                ₹{totalValueRequested.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Shops</p>
              <p className="text-2xl font-black text-purple-700 mt-0.5">{uniqueShopsCount} shops</p>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-96 bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Request #, Shop Name, Product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none text-gray-900 placeholder-gray-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            {[
              { id: "all", label: `All (${requests.length})` },
              { id: "pending", label: `Pending (${pendingCount})`, highlight: true },
              { id: "approved", label: `Approved (${approvedCount})` },
              { id: "rejected", label: `Rejected (${requests.filter(r => r.status === "rejected").length})` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterStatus === tab.id
                    ? tab.highlight
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-gray-900 text-white shadow-xs"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-medium bg-white border border-gray-200 rounded-2xl">
            Loading restock applications...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-medium bg-white border border-gray-200 rounded-2xl">
            No restock requests found matching your filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => {
              const isActionLoading = actionLoadingId === req.id;
              const dateStr = new Date(req.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });

              return (
                <div
                  key={req.id}
                  className={`bg-white border rounded-2xl p-6 shadow-xs transition-all space-y-4 ${
                    req.status === "pending"
                      ? "border-amber-300 ring-2 ring-amber-50/50"
                      : "border-gray-200"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-base">{req.shopName}</h3>
                          <span className="text-xs font-black font-mono text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {req.requestNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {req.shopState || "N/A"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {req.shopPhone || "N/A"}
                          </span>
                          <span>Requested: {dateStr}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-auto">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                        req.status === "approved"
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : req.status === "rejected"
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                      }`}>
                        {req.status === "approved" && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {req.status === "rejected" && <XCircle className="w-3.5 h-3.5" />}
                        {req.status === "pending" && <Clock className="w-3.5 h-3.5" />}
                        {req.status === "approved" ? "Approved & Dispatched" : req.status}
                      </span>
                    </div>
                  </div>

                  {/* Products Table in Request */}
                  <div className="bg-gray-50/70 border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100/70 text-gray-500 font-bold border-b border-gray-200">
                          <th className="py-2.5 px-4">Product</th>
                          <th className="py-2.5 px-4">SKU</th>
                          <th className="py-2.5 px-4 text-center">Requested Qty</th>
                          <th className="py-2.5 px-4 text-right">Unit Cost</th>
                          <th className="py-2.5 px-4 text-right">Total Line Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200/60">
                        {req.items?.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-white transition-colors">
                            <td className="py-2.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 p-0.5 flex-shrink-0">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-contain" />
                                ) : (
                                  <Package className="w-3.5 h-3.5 text-gray-400 m-auto" />
                                )}
                              </div>
                              {item.productName}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-gray-600">{item.sku || "-"}</td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                +{item.quantity} {item.unit || "pcs"}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right text-gray-600">₹{Number(item.unitPurchasePrice).toFixed(2)}</td>
                            <td className="py-2.5 px-4 text-right font-black font-mono text-gray-900">
                              ₹{Number(item.lineTotal || (item.quantity * item.unitPurchasePrice)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Card Footer with Notes & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-gray-500 uppercase tracking-wider">Payment Mode:</span>
                        <span className="font-bold text-gray-900 uppercase bg-gray-100 px-2 py-0.5 rounded">
                          {req.paymentMode}
                        </span>
                      </div>
                      {req.notes && (
                        <p className="text-xs text-gray-600 italic">
                          <strong className="not-italic text-gray-700">Shopkeeper Note:</strong> "{req.notes}"
                        </p>
                      )}
                      {req.adminRemarks && (
                        <p className="text-xs text-blue-700 font-medium">
                          <strong>Admin Remarks:</strong> {req.adminRemarks}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase block">Total Cost</span>
                        <span className="text-xl font-black font-mono text-gray-950">
                          ₹{Number(req.totalAmount || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Admin Actions */}
                      {req.status === "pending" && (
                        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                          <button
                            type="button"
                            onClick={() => setRejectModalId(req.id)}
                            disabled={isActionLoading}
                            className="px-3.5 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(req.id, "approved")}
                            disabled={isActionLoading}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-500 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {isActionLoading ? "Processing..." : "Approve & Dispatch Stock"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reject Modal */}
        {rejectModalId && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900">Reject Restock Application</h3>
                <button
                  onClick={() => setRejectModalId(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason for rejection / Admin Remarks
                </label>
                <textarea
                  rows={3}
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  placeholder="e.g. Out of stock at central warehouse, please reapply next week"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalId(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(rejectModalId, "rejected", rejectRemarks)}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
