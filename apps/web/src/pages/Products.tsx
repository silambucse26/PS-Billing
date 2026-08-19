import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import { api } from "../lib/api";
import { generateMasterCsvContent } from "../data/masterCatalog";
import { 
  Package, Search, Plus, X, Barcode, Check, Upload, Download, Sparkles, Store, ArrowLeft, Trash2, AlertTriangle, RefreshCw
} from "lucide-react";

export default function Products() {
  const { shop, profile } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if current user is super_admin
  const isSuperAdmin = profile?.role === "super_admin";

  // Admin Shops state
  const [shops, setShops] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedShopName, setSelectedShopName] = useState<string>("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempSalePrice, setTempSalePrice] = useState("");

  // Modal State for adding products
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [mrp, setMrp] = useState<number | "">("");
  const [purchasePrice, setPurchasePrice] = useState<number | "">("");
  const [salePrice, setSalePrice] = useState<number | "">("");
  const [gstRate, setGstRate] = useState<number>(18);
  const [hsnCode, setHsnCode] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [currentStock, setCurrentStock] = useState<number | "">("");
  const [reorderLevel, setReorderLevel] = useState<number>(5);
  const [imageUrl, setImageUrl] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchShops();
    } else if (shop?.id) {
      fetchProducts(shop.id);
    }
  }, [shop, profile]);

  const fetchShops = async () => {
    setLoadingShops(true);
    try {
      const res = await api.get("/reports/admin/shops");
      setShops(res);
    } catch (err: any) {
      console.error("Error fetching shops:", err);
      setError(err.message || "Failed to load shops");
    } finally {
      setLoadingShops(false);
    }
  };

  const fetchProducts = async (shopId: string) => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("shop_id", shopId);
    if (error) {
      console.error("Error fetching products:", error);
    }
    if (data) setProducts(data);
    setLoadingProducts(false);
  };

  const handleDeleteProduct = (productId: string) => {
    if (!isSuperAdmin) return;
    setDeleteConfirmId(productId);
  };

  const confirmDeleteProduct = async () => {
    if (!deleteConfirmId || !isSuperAdmin) return;
    try {
      // 1. Delete associated stock movements first to prevent foreign key violations
      await supabase
        .from("stock_movements")
        .delete()
        .eq("product_id", deleteConfirmId);

      // 2. Delete the product itself
      const { error: delErr } = await supabase
        .from("products")
        .delete()
        .eq("id", deleteConfirmId);

      if (delErr) throw delErr;

      setSuccessMsg("Product deleted successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
      
      const activeShopId = isSuperAdmin ? selectedShopId : shop?.id;
      if (activeShopId) fetchProducts(activeShopId);
    } catch (err: any) {
      setError(err.message || "Failed to delete product");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleSaveSellingPrice = async () => {
    if (!viewingProduct) return;
    const newPrice = Number(tempSalePrice);
    if (isNaN(newPrice) || newPrice < 0) {
      alert("Please enter a valid price.");
      return;
    }

    try {
      const marginVal = newPrice - Number(viewingProduct.purchase_price || 0);
      const marginPct = newPrice > 0 ? (marginVal / newPrice) * 100 : 0;

      const { error: updErr } = await supabase
        .from("products")
        .update({
          sale_price: newPrice,
          margin_value: marginVal,
          margin_percent: marginPct
        })
        .eq("id", viewingProduct.id);

      if (updErr) throw updErr;

      setViewingProduct({
        ...viewingProduct,
        sale_price: newPrice,
        margin_value: marginVal,
        margin_percent: marginPct
      });
      
      setSuccessMsg("Selling Price updated successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
      
      const activeShopId = isSuperAdmin ? selectedShopId : shop?.id;
      if (activeShopId) fetchProducts(activeShopId);
      setIsEditingPrice(false);
    } catch (err: any) {
      alert(err.message || "Failed to update selling price");
    }
  };

  const handleSelectShop = (shopId: string, shopName: string) => {
    setSelectedShopId(shopId);
    setSelectedShopName(shopName);
    fetchProducts(shopId);
    setError(null);
  };

  const handleBackToShops = () => {
    setSelectedShopId(null);
    setSelectedShopName("");
    setProducts([]);
    setError(null);
  };

  // Arithmetic automatic generation of SKU and Barcode
  const autoGenerateIdentifiers = () => {
    const randomSku = "SKU-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    setSku(randomSku);

    let randomBarcode = "890";
    for (let i = 0; i < 9; i++) {
      randomBarcode += Math.floor(Math.random() * 10).toString();
    }
    setBarcode(randomBarcode);
  };

  const handleOpenModal = () => {
    if (!isSuperAdmin) return;
    setError(null);
    setName("");
    setMrp("");
    setPurchasePrice("");
    setSalePrice("");
    setGstRate(18);
    setHsnCode("");
    setUnit("pcs");
    setCurrentStock("");
    setReorderLevel(5);
    setImageUrl("");
    autoGenerateIdentifiers();
    setIsModalOpen(true);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeShopId = isSuperAdmin ? selectedShopId : shop?.id;
    if (!activeShopId || !isSuperAdmin) return;
    setError(null);
    setSubmitting(true);

    try {
      const calcMrp = Number(mrp) || 0;
      const calcPurchase = Number(purchasePrice) || 0;
      const calcSale = Number(salePrice) || 0;
      const marginVal = calcSale - calcPurchase;
      const marginPct = calcSale > 0 ? (marginVal / calcSale) * 100 : 0;

      const { error: insErr } = await supabase.from("products").insert({
        shop_id: activeShopId,
        name,
        sku: sku || null,
        barcode: barcode || null,
        mrp: calcMrp,
        purchase_price: calcPurchase,
        sale_price: calcSale,
        margin_value: marginVal,
        margin_percent: marginPct,
        gst_rate: Number(gstRate) || 0,
        hsn_code: hsnCode || null,
        unit: unit || "pcs",
        opening_stock: Number(currentStock) || 0,
        current_stock: Number(currentStock) || 0,
        reorder_level: Number(reorderLevel) || 0,
        image_url: imageUrl || null
      });

      if (insErr) throw insErr;

      setIsModalOpen(false);
      setSuccessMsg("Product added successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchProducts(activeShopId);
    } catch (err: any) {
      setError(err.message || "Failed to add product");
    } finally {
      setSubmitting(false);
    }
  };

  // CSV format download helper (Downloads full 20 Master Catalog Products)
  const downloadCsvTemplate = () => {
    const csvData = generateMasterCsvContent();
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "master_products_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sync Master Catalog to Active Shop with Stock = 0
  const handleSyncMasterCatalog = async () => {
    const activeShopId = isSuperAdmin ? selectedShopId : shop?.id;
    if (!activeShopId) return;

    setLoadingProducts(true);
    setError(null);
    try {
      const res = await api.post("/reports/admin/sync-master-catalog", { shopId: activeShopId });
      setSuccessMsg(res.message || "Master catalog synced successfully with 0 initial stock!");
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchProducts(activeShopId);
    } catch (err: any) {
      setError(err.message || "Failed to sync master catalog");
      setLoadingProducts(false);
    }
  };

  // Smart CSV parser & stock updater (Upsert)
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const activeShopId = isSuperAdmin ? selectedShopId : shop?.id;
    const file = e.target.files?.[0];
    if (!file || !activeShopId || !isSuperAdmin) return;

    setError(null);
    setLoadingProducts(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) throw new Error("Empty CSV file");

        const lines = text.split(/\r\n|\n|\r/).filter(line => line.trim() !== "");
        if (lines.length <= 1) throw new Error("CSV does not contain any product data rows.");

        const parsedProducts: any[] = [];

        // Auto-detect separator
        const header = lines[0];
        let separator = ",";
        if (header.includes(";")) separator = ";";
        else if (header.includes("\t")) separator = "\t";

        const parseCsvLine = (line: string) => {
          const result = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === separator && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        for (let i = 1; i < lines.length; i++) {
          const columns = parseCsvLine(lines[i]);
          if (columns.length < 2 || !columns[0]) continue;

          const productName = columns[0];
          
          let productSku = columns[1];
          if (!productSku) {
            productSku = "SKU-" + Math.random().toString(36).substring(2, 8).toUpperCase();
          }

          let productBarcode = columns[2];
          if (!productBarcode) {
            productBarcode = "890";
            for (let j = 0; j < 9; j++) {
              productBarcode += Math.floor(Math.random() * 10).toString();
            }
          }

          const productMrp = Number(columns[3]) || 0;
          const productPurchase = Number(columns[4]) || 0;
          const productSale = Number(columns[5]) || 0;
          const productGst = Number(columns[6]) || 0;
          const productHsn = columns[7] || null;
          const productUnit = columns[8] || "pcs";
          const productStock = Number(columns[9]) || 0;
          const productReorder = Number(columns[10]) || 5;
          const productImage = columns[11] || null;

          const productMarginVal = productSale - productPurchase;
          const productMarginPct = productSale > 0 ? (productMarginVal / productSale) * 100 : 0;

          parsedProducts.push({
            shop_id: activeShopId,
            name: productName,
            sku: productSku,
            barcode: productBarcode,
            mrp: productMrp,
            purchase_price: productPurchase,
            sale_price: productSale,
            margin_value: productMarginVal,
            margin_percent: productMarginPct,
            gst_rate: productGst,
            hsn_code: productHsn,
            unit: productUnit,
            opening_stock: productStock,
            current_stock: productStock,
            reorder_level: productReorder,
            image_url: productImage
          });
        }

        if (parsedProducts.length === 0) {
          throw new Error("No valid products were parsed from the CSV.");
        }

        // Call backend bulk upsert endpoint to update existing product stock & insert new items
        const res = await api.post("/reports/admin/bulk-upsert-products", {
          shopId: activeShopId,
          products: parsedProducts
        });

        setSuccessMsg(res.message || `Successfully updated stock for ${parsedProducts.length} products!`);
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchProducts(activeShopId);
      } catch (err: any) {
        setError(err.message || "Failed to parse or upload CSV data.");
        setLoadingProducts(false);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Render Admin Shops Selection List
  const renderShopsList = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <Store className="w-8 h-8 text-green-600" />
          Shop Catalogs (Admin)
        </h1>
        <p className="text-sm text-gray-500 mt-1">Select a shop to manage and override its product inventory.</p>
      </div>

      {loadingShops ? (
        <div className="text-gray-500 font-medium">Loading shops list...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm font-semibold">
                  <th className="py-4 px-6">Shop Name</th>
                  <th className="py-4 px-6">Franchise</th>
                  <th className="py-4 px-6">Owner</th>
                  <th className="py-4 px-6">Phone</th>
                  <th className="py-4 px-6">State</th>
                  <th className="py-4 px-6">GSTIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shops.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-6 text-center text-gray-500">
                      No shops registered yet.
                    </td>
                  </tr>
                ) : (
                  shops.map((s) => (
                    <tr key={s.id} className="text-sm hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleSelectShop(s.id, s.name)}
                          className="font-bold text-green-700 hover:text-green-600 hover:underline text-left cursor-pointer transition-colors"
                        >
                          {s.name}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-gray-600">{s.franchise?.name || "N/A"}</td>
                      <td className="py-4 px-6 font-medium text-gray-800">{s.owner?.full_name || "N/A"}</td>
                      <td className="py-4 px-6 text-gray-600">{s.phone || s.owner?.phone || "N/A"}</td>
                      <td className="py-4 px-6 text-gray-600">{s.state}</td>
                      <td className="py-4 px-6 font-mono text-gray-600">{s.gstin || "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // Render Product Catalog Table
  const renderProductCatalog = () => {
    const displayTitle = isSuperAdmin ? `Inventory for ${selectedShopName}` : "Products & Stock Catalog";
    const displaySub = isSuperAdmin ? "Super Admin catalog overrides" : `Manage inventory under: "${shop?.name}"`;

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <button
                onClick={handleBackToShops}
                className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-5 h-5 text-green-600" />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                <Package className="w-8 h-8 text-green-600" />
                {displayTitle}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{displaySub}</p>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSyncMasterCatalog}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 rounded-xl transition-all cursor-pointer shadow-sm"
                title="Initialize or Repair Master Products with Stock = 0"
              >
                <RefreshCw className="w-4 h-4 text-green-600" />
                Sync Master (0 Stock)
              </button>

              <button
                onClick={downloadCsvTemplate}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all cursor-pointer shadow-sm"
                title="Download Master Catalog CSV Template"
              >
                <Download className="w-4 h-4 text-green-600" />
                Download CSV
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all cursor-pointer shadow-sm"
                title="Upload CSV to Update Shop Stock & Products"
              >
                <Upload className="w-4 h-4 text-green-600" />
                Upload CSV / Stock
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCsvUpload}
                accept=".csv"
                className="hidden"
              />

              <button
                onClick={handleOpenModal}
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-500 rounded-xl transition-all shadow-md hover:shadow-green-100 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Add Product
              </button>
            </div>
          )}
        </div>

        {successMsg && (
          <div className="p-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4" />
            {successMsg}
          </div>
        )}

        {/* Search & Stock Filter bar */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-3 w-full md:w-96">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            />
          </div>

          {/* Stock status filter tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => setStockFilter("all")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === "all"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              All ({products.length})
            </button>
            <button
              onClick={() => setStockFilter("low")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                stockFilter === "low"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Low Stock ({products.filter(p => Number(p.current_stock) > 0 && Number(p.current_stock) <= Number(p.reorder_level || 5)).length})
            </button>
            <button
              onClick={() => setStockFilter("out")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                stockFilter === "out"
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-red-50 text-red-800 hover:bg-red-100 border border-red-200"
              }`}
            >
              <X className="w-3.5 h-3.5" />
              Out of Stock ({products.filter(p => Number(p.current_stock) <= 0).length})
            </button>
          </div>
        </div>

        {loadingProducts ? (
          <div className="text-gray-500 font-medium">Loading products catalog...</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm font-semibold">
                    <th className="py-4 px-6">Image</th>
                    <th className="py-4 px-6">Product ID / SKU</th>
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Barcode</th>
                    <th className="py-4 px-6 text-right">MRP</th>
                    <th className="py-4 px-6 text-right">Purchase Price</th>
                    <th className="py-4 px-6 text-right">Selling Price</th>
                    <th className="py-4 px-6 text-right">Margin (Val / %)</th>
                    <th className="py-4 px-6 text-center">GST %</th>
                    <th className="py-4 px-6 text-center">Stock Status</th>
                    {isSuperAdmin && <th className="py-4 px-6 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products
                    .filter((p) => {
                      const matchesSearch =
                        p.name.toLowerCase().includes(search.toLowerCase()) ||
                        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
                        (p.barcode && p.barcode.includes(search));

                      const stock = Number(p.current_stock || 0);
                      const reorder = Number(p.reorder_level || 5);

                      if (stockFilter === "low") {
                        return matchesSearch && stock > 0 && stock <= reorder;
                      }
                      if (stockFilter === "out") {
                        return matchesSearch && stock <= 0;
                      }
                      return matchesSearch;
                    })
                    .length === 0 ? (
                    <tr>
                      <td colSpan={isSuperAdmin ? 11 : 10} className="py-8 px-6 text-center text-gray-500">
                        No products found matching filters.
                      </td>
                    </tr>
                  ) : (
                    products
                      .filter((p) => {
                        const matchesSearch =
                          p.name.toLowerCase().includes(search.toLowerCase()) ||
                          (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
                          (p.barcode && p.barcode.includes(search));

                        const stock = Number(p.current_stock || 0);
                        const reorder = Number(p.reorder_level || 5);

                        if (stockFilter === "low") {
                          return matchesSearch && stock > 0 && stock <= reorder;
                        }
                        if (stockFilter === "out") {
                          return matchesSearch && stock <= 0;
                        }
                        return matchesSearch;
                      })
                      .map((p) => {
                        const marginValue = Number(p.sale_price || 0) - Number(p.purchase_price || 0);
                        const marginPercent = p.sale_price > 0 ? (marginValue / Number(p.sale_price)) * 100 : 0;
                        const stock = Number(p.current_stock || 0);
                        const reorder = Number(p.reorder_level || 5);
                        
                        return (
                          <tr 
                            key={p.id} 
                            onClick={() => setViewingProduct(p)}
                            className="text-sm hover:bg-gray-150 transition-colors cursor-pointer"
                          >
                            <td className="py-4 px-6">
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="w-10 h-10 object-cover rounded-lg border border-gray-100"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://placehold.co/100x100.png?text=Product";
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-lg flex items-center justify-center border border-gray-200">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6 font-mono font-semibold text-gray-700">{p.sku || "N/A"}</td>
                            <td className="py-4 px-6 font-bold text-gray-900">{p.name}</td>
                            <td className="py-4 px-6 text-gray-600 flex items-center gap-1 mt-3">
                              <Barcode className="w-4 h-4 text-gray-400" />
                              {p.barcode || "N/A"}
                            </td>
                            <td className="py-4 px-6 text-right font-semibold text-gray-900">₹{p.mrp ? Number(p.mrp).toFixed(2) : "0.00"}</td>
                            <td className="py-4 px-6 text-right text-gray-600">₹{p.purchase_price ? Number(p.purchase_price).toFixed(2) : "0.00"}</td>
                            <td className="py-4 px-6 text-right text-gray-950 font-bold">₹{p.sale_price ? Number(p.sale_price).toFixed(2) : "0.00"}</td>
                            
                            <td className="py-4 px-6 text-right font-semibold text-green-700">
                              <div>₹{marginValue.toFixed(2)}</div>
                              <div className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-150 inline-block mt-0.5">
                                {marginPercent.toFixed(1)}%
                              </div>
                            </td>

                            <td className="py-4 px-6 text-center text-gray-600">{p.gst_rate}%</td>
                            
                            {/* Stock Status Badge */}
                            <td className="py-4 px-6 text-center">
                              {stock <= 0 ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-800 border border-red-300 shadow-2xs">
                                  🔴 OUT OF STOCK (0)
                                </span>
                              ) : stock <= reorder ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                  ⚠️ LOW STOCK ({stock} {p.unit || "pcs"})
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {stock} {p.unit || "pcs"} in stock
                                </span>
                              )}
                            </td>

                            {isSuperAdmin && (
                              <td className="py-4 px-6 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProduct(p.id);
                                  }}
                                  className="p-2 text-red-600 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-red-100"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen text-gray-900 animate-fade-in">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
        <div className="max-w-6xl mx-auto space-y-6">
          {error && (
            <div className="p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          {isSuperAdmin && !selectedShopId ? renderShopsList() : renderProductCatalog()}
        </div>
      </main>

      {/* Add Product Modal Overlay */}
      {isModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-600" />
                Add Product to Shop Catalog
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-150 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900"
                    placeholder="e.g. Calcium Supplement 5L"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Product ID / SKU *</label>
                    <button
                      type="button"
                      onClick={() => setSku("SKU-" + Math.random().toString(36).substring(2, 8).toUpperCase())}
                      className="text-xs text-green-600 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Auto
                    </button>
                  </div>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900"
                    placeholder="e.g. FEED-CALC-5L"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Barcode</label>
                    <button
                      type="button"
                      onClick={() => {
                        let bc = "890";
                        for (let j = 0; j < 9; j++) bc += Math.floor(Math.random() * 10).toString();
                        setBarcode(bc);
                      }}
                      className="text-xs text-green-600 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Auto
                    </button>
                  </div>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900"
                    placeholder="Scan or generate barcode"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 col-span-1 md:col-span-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">MRP *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={mrp}
                      onChange={(e) => setMrp(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Selling Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">GST Rate (%) *</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit of Measurement</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900"
                    placeholder="pcs, bottles, bags"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Current Stock *</label>
                  <input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900"
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reorder Alert Level</label>
                  <input
                    type="number"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(Number(e.target.value))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900"
                    placeholder="e.g. 2309"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Product Image URL</label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 font-medium text-gray-900"
                    placeholder="https://image-link.png"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl shadow-md cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {submitting ? "Adding..." : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Custom Animated Delete Confirmation Modal */}
      {deleteConfirmId && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-50 text-red-600 rounded-full">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Product</h3>
                <p className="text-xs text-gray-500 mt-0.5">Confirm permanent removal</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Are you sure you want to delete this product from the inventory? This action is permanent and cannot be undone.
            </p>

            <div className="flex gap-3 justify-end pt-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer transition-all"
              >
                No, Keep it
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                className="px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl cursor-pointer shadow-md shadow-red-100 transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Product Details Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-lg overflow-hidden p-6 space-y-6 transform transition-all duration-300 scale-100 animate-scale-in">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                {viewingProduct.image_url ? (
                  <img
                    src={viewingProduct.image_url}
                    alt={viewingProduct.name}
                    className="w-14 h-14 object-cover rounded-xl border border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/100x100.png?text=Product";
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center border border-gray-200">
                    <Package className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-tight">{viewingProduct.name}</h3>
                  <span className="inline-block text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded mt-1 border border-gray-150">
                    {viewingProduct.sku || "NO SKU"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingProduct(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
                <span className="text-xs font-bold text-gray-500 block">Identifier / Barcode</span>
                <span className="font-semibold text-gray-800 flex items-center gap-1">
                  <Barcode className="w-4 h-4 text-gray-400" />
                  {viewingProduct.barcode || "N/A"}
                </span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
                <span className="text-xs font-bold text-gray-500 block">HSN & GST</span>
                <span className="font-semibold text-gray-800">
                  HSN: {viewingProduct.hsn_code || "N/A"} | GST: {viewingProduct.gst_rate}%
                </span>
              </div>

              <div className="col-span-2 grid grid-cols-3 gap-2">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                  <span className="text-xs font-bold text-gray-500 block">MRP</span>
                  <span className="font-bold text-gray-900 text-base">₹{Number(viewingProduct.mrp || 0).toFixed(2)}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                  <span className="text-xs font-bold text-gray-500 block">Purchase Price</span>
                  <span className="font-bold text-gray-700 text-base">₹{Number(viewingProduct.purchase_price || 0).toFixed(2)}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center relative flex flex-col justify-center items-center">
                  <span className="text-xs font-bold text-gray-500 block">Selling Price</span>
                  {isEditingPrice ? (
                    <div className="flex flex-col items-center gap-1 mt-1">
                      <input
                        type="number"
                        step="0.01"
                        value={tempSalePrice}
                        onChange={(e) => setTempSalePrice(e.target.value)}
                        className="w-20 text-center bg-white border border-gray-300 rounded p-1 text-sm text-gray-900 focus:outline-none focus:border-green-600 font-bold"
                      />
                      <div className="flex gap-1 justify-center w-full">
                        <button
                          type="button"
                          onClick={handleSaveSellingPrice}
                          className="bg-green-650 hover:bg-green-600 bg-green-650 bg-green-600 text-white rounded px-2 py-0.5 text-xxs cursor-pointer font-bold transition-colors"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingPrice(false)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded px-2 py-0.5 text-xxs cursor-pointer font-bold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <span className="font-bold text-green-700 text-base">₹{Number(viewingProduct.sale_price || 0).toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTempSalePrice(viewingProduct.sale_price.toString());
                          setIsEditingPrice(true);
                        }}
                        className="text-xxs text-green-600 font-bold hover:underline cursor-pointer mt-0.5"
                      >
                        Edit Price
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-2 bg-green-50/50 p-4 rounded-xl border border-green-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-green-700 block">Computed Profit Margin</span>
                  <span className="text-lg font-bold text-green-950">
                    ₹{((viewingProduct.margin_value !== undefined ? Number(viewingProduct.margin_value) : (Number(viewingProduct.sale_price || 0) - Number(viewingProduct.purchase_price || 0)))).toFixed(2)}
                  </span>
                </div>
                <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-bold shadow-md shadow-green-100">
                  {((viewingProduct.margin_percent !== undefined ? Number(viewingProduct.margin_percent) : (viewingProduct.sale_price > 0 ? ((Number(viewingProduct.sale_price || 0) - Number(viewingProduct.purchase_price || 0)) / Number(viewingProduct.sale_price)) * 100 : 0))).toFixed(1)}%
                </span>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
                <span className="text-xs font-bold text-gray-500 block">Current Stock</span>
                <span className={`text-base font-bold ${
                  viewingProduct.current_stock <= viewingProduct.reorder_level
                    ? "text-red-600"
                    : "text-green-700"
                }`}>
                  {viewingProduct.current_stock} {viewingProduct.unit || "pcs"}
                </span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
                <span className="text-xs font-bold text-gray-500 block">Stock Details</span>
                <span className="text-gray-700 font-medium">
                  Min Alert Level: {viewingProduct.reorder_level || 5}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
