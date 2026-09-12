import { useEffect, useState, useRef, useMemo } from "react";
import { api } from "../lib/api";
import { supabase } from "../lib/supabaseClient";
import Sidebar from "../components/Sidebar";
import { generateMasterCsvContent } from "../data/masterCatalog";
import { FRANCHISE_PRODUCTS, FRANCHISE_SUMMARY, generateFranchiseCsvContent } from "../data/franchiseInventory";
import { 
  Store, Search, Plus, X, Barcode, Check, Upload, Download, Sparkles, ArrowLeft, Package, Trash2, AlertTriangle, RefreshCw,
  IndianRupee, TrendingUp, Edit2, ShieldCheck, ShoppingCart, FileSpreadsheet, Send
} from "lucide-react";

export default function AdminShops() {
  const [shops, setShops] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drill-down State
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedShopName, setSelectedShopName] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [shopToDelete, setShopToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingShop, setDeletingShop] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempSalePrice, setTempSalePrice] = useState("");

  // Add Product Form State (Admin managing selected shop inventory)
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

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Stock edit modal & shop approval states
  const [editingStockProduct, setEditingStockProduct] = useState<any | null>(null);
  const [editStockVal, setEditStockVal] = useState<number | "">("");
  const [editPurchasePriceVal, setEditPurchasePriceVal] = useState<number | "">("");
  const [editSalePriceVal, setEditSalePriceVal] = useState<number | "">("");
  const [editMrpVal, setEditMrpVal] = useState<number | "">("");
  const [updatingStock, setUpdatingStock] = useState(false);
  const [approvingShopId, setApprovingShopId] = useState<string | null>(null);

  // Franchise Master Model State
  const [activeTab, setActiveTab] = useState<"shops" | "franchise_model">("shops");
  const [selectedDeployShopId, setSelectedDeployShopId] = useState<string>("");
  const [deployingStock, setDeployingStock] = useState(false);
  const [franchiseFilterCategory, setFranchiseFilterCategory] = useState("All");
  const [franchiseSearch, setFranchiseSearch] = useState("");

  const franchiseCategories = ["All", "Mastitis", "Accessories", "Hygiene", "Diagnostic Kits", "Feed Supplement", "Breeding Tool"];

  const filteredFranchiseProducts = useMemo(() => {
    return FRANCHISE_PRODUCTS.filter(p => {
      const matchesCat = franchiseFilterCategory === "All" || p.category.toLowerCase() === franchiseFilterCategory.toLowerCase();
      const matchesSearch = !franchiseSearch || 
        p.name.toLowerCase().includes(franchiseSearch.toLowerCase()) || 
        p.category.toLowerCase().includes(franchiseSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(franchiseSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [franchiseFilterCategory, franchiseSearch]);

  const handleDeployStandardStock = async (shopId: string, shopName: string) => {
    if (!window.confirm(`Deploy the standard franchise stock package (20 products, 944 total stock units, ₹3,00,000 cost value) to "${shopName}"? Existing master products will have their stock and standard pricing updated.`)) {
      return;
    }
    setDeployingStock(true);
    setError(null);
    try {
      const res = await api.post(`/reports/admin/shops/${shopId}/deploy-standard-stock`, {});
      setSuccessMsg(res.message || `Standard franchise inventory (944 units across 20 products) deployed successfully to ${shopName}!`);
      setTimeout(() => setSuccessMsg(null), 5000);
      fetchShops();
      if (selectedShopId === shopId) {
        fetchShopProducts(shopId);
      }
    } catch (err: any) {
      setError(err.message || "Failed to deploy standard stock");
    } finally {
      setDeployingStock(false);
    }
  };

  // Selected shop summary metrics (Full Margin Price calculations)
  const catalogSummary = useMemo(() => {
    let totalItems = products.length;
    let totalUnits = 0;
    let totalCost = 0;
    let totalRetail = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      const stock = Number(p.current_stock || 0);
      const sPrice = Number(p.sale_price || 0);
      const pPrice = Number(p.purchase_price || (sPrice * 0.6));
      if (stock > 0) {
        totalUnits += stock;
        totalRetail += (stock * sPrice);
        totalCost += (stock * pPrice);
      } else {
        outOfStockCount++;
      }
    }

    const totalMargin = totalRetail - totalCost;
    const avgMarginPct = totalRetail > 0 ? (totalMargin / totalRetail) * 100 : 0;

    return {
      totalItems,
      totalUnits,
      totalCost,
      totalRetail,
      totalMargin,
      avgMarginPct,
      outOfStockCount
    };
  }, [products]);

  const handleToggleShopApproval = async (shopId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "approved" ? "pending" : "approved";
    setApprovingShopId(shopId);
    try {
      await api.put(`/reports/admin/shops/${shopId}/approve`, { status: nextStatus });
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, status: nextStatus } : s));
      setSuccessMsg(
        nextStatus === "approved"
          ? "Shop approved successfully! Standard 944 units franchise stock and catalog automatically provisioned."
          : "Shop approval status reverted to pending."
      );
      fetchShops();
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err: any) {
      setError(err.message || "Failed to update shop approval");
    } finally {
      setApprovingShopId(null);
    }
  };

  const handleQuickStockStep = async (product: any, delta: number) => {
    if (!selectedShopId) return;
    const newStock = Math.max(0, Number(product.current_stock || 0) + delta);
    try {
      const res = await api.put(`/reports/admin/shops/${selectedShopId}/products/${product.id}/stock`, {
        current_stock: newStock
      });
      if (res.product) {
        setProducts(prev => prev.map(p => p.id === product.id ? res.product : p));
      }
    } catch (err: any) {
      alert("Failed to update stock: " + (err.message || "Error"));
    }
  };

  const openEditStockModal = (product: any) => {
    setEditingStockProduct(product);
    setEditStockVal(product.current_stock ?? 0);
    setEditPurchasePriceVal(product.purchase_price ?? 0);
    setEditSalePriceVal(product.sale_price ?? 0);
    setEditMrpVal(product.mrp ?? product.sale_price ?? 0);
  };

  const handleSaveStockAndPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId || !editingStockProduct) return;
    setUpdatingStock(true);
    try {
      const res = await api.put(`/reports/admin/shops/${selectedShopId}/products/${editingStockProduct.id}/stock`, {
        current_stock: editStockVal === "" ? 0 : Number(editStockVal),
        purchase_price: editPurchasePriceVal === "" ? 0 : Number(editPurchasePriceVal),
        sale_price: editSalePriceVal === "" ? 0 : Number(editSalePriceVal),
        mrp: editMrpVal === "" ? 0 : Number(editMrpVal)
      });
      if (res.product) {
        setProducts(prev => prev.map(p => p.id === editingStockProduct.id ? res.product : p));
        setSuccessMsg(`Stock and pricing updated for ${editingStockProduct.name}!`);
        setTimeout(() => setSuccessMsg(null), 3500);
      }
      setEditingStockProduct(null);
    } catch (err: any) {
      setError(err.message || "Failed to save stock update");
    } finally {
      setUpdatingStock(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    if (selectedShopId) {
      fetchShopProducts(selectedShopId);
    }
  }, [selectedShopId]);

  const fetchShops = () => {
    setLoadingShops(true);
    api.get("/reports/admin/shops")
      .then((res) => setShops(res))
      .catch((err) => {
        console.error(err);
        setError(err.message || "Failed to load shops");
      })
      .finally(() => setLoadingShops(false));
  };

  const fetchShopProducts = async (shopId: string) => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("shop_id", shopId);
    if (error) {
      console.error("Error fetching shop products:", error);
    }
    if (data) setProducts(data);
    setLoadingProducts(false);
  };

  const handleDeleteProduct = (productId: string) => {
    setDeleteConfirmId(productId);
  };

  const confirmDeleteProduct = async () => {
    if (!deleteConfirmId) return;
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
      
      if (selectedShopId) fetchShopProducts(selectedShopId);
    } catch (err: any) {
      setError(err.message || "Failed to delete product");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const confirmDeleteShop = async () => {
    if (!shopToDelete) return;
    setDeletingShop(true);
    setError(null);
    try {
      const res = await api.delete(`/reports/admin/shops/${shopToDelete.id}`);
      setSuccessMsg(res.message || `Shop "${shopToDelete.name}" and all associated data deleted successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);

      if (selectedShopId === shopToDelete.id) {
        setSelectedShopId(null);
        setSelectedShopName("");
        setProducts([]);
      }

      setShopToDelete(null);
      fetchShops();
    } catch (err: any) {
      setError(err.message || "Failed to delete shop and its data");
      setShopToDelete(null);
    } finally {
      setDeletingShop(false);
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
      
      if (selectedShopId) fetchShopProducts(selectedShopId);
      setIsEditingPrice(false);
    } catch (err: any) {
      alert(err.message || "Failed to update selling price");
    }
  };

  const handleSelectShop = (shopId: string, shopName: string) => {
    setSelectedShopId(shopId);
    setSelectedShopName(shopName);
    setError(null);
  };

  const handleBackToShops = () => {
    setSelectedShopId(null);
    setSelectedShopName("");
    setProducts([]);
    setError(null);
  };

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
    if (!selectedShopId) return;
    setError(null);
    setSubmitting(true);

    try {
      const calcMrp = Number(mrp) || 0;
      const calcPurchase = Number(purchasePrice) || 0;
      const calcSale = Number(salePrice) || 0;
      const marginVal = calcSale - calcPurchase;
      const marginPct = calcSale > 0 ? (marginVal / calcSale) * 100 : 0;

      const { error: insErr } = await supabase.from("products").insert({
        shop_id: selectedShopId,
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
      fetchShopProducts(selectedShopId);
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

  // Franchise 944 Units Spreadsheet CSV download helper (20 Products, 944 Stock, ₹3L Cost, ₹4.5L Sales)
  const downloadFranchiseCsv = () => {
    const csvData = generateFranchiseCsvContent();
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "franchise_inventory_944_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sync Master Catalog to Selected Shop with Stock = 0
  const handleSyncMasterCatalog = async () => {
    if (!selectedShopId) return;

    setLoadingProducts(true);
    setError(null);
    try {
      const res = await api.post("/reports/admin/sync-master-catalog", { shopId: selectedShopId });
      setSuccessMsg(res.message || "Master catalog synced successfully with 0 initial stock!");
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchShopProducts(selectedShopId);
    } catch (err: any) {
      setError(err.message || "Failed to sync master catalog");
      setLoadingProducts(false);
    }
  };

  // Smart CSV parser & stock updater (Upsert) for selected shop
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedShopId) return;

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
            shop_id: selectedShopId,
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
          throw new Error("No valid products parsed from CSV.");
        }

        // Call backend bulk upsert endpoint to update existing product stock & insert new items
        const res = await api.post("/reports/admin/bulk-upsert-products", {
          shopId: selectedShopId,
          products: parsedProducts
        });

        setSuccessMsg(res.message || `Successfully updated stock for ${parsedProducts.length} products!`);
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchShopProducts(selectedShopId);
      } catch (err: any) {
        setError(err.message || "Failed to parse or upload CSV data.");
        setLoadingProducts(false);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen text-gray-900 animate-fade-in">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {selectedShopId ? (
            /* DRILL-DOWN SHOP PRODUCT INVENTORY VIEW */
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleBackToShops}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    <ArrowLeft className="w-4 h-4 text-green-600" />
                    Back to Shops List
                  </button>

                  <button
                    onClick={() => setShopToDelete({ id: selectedShopId, name: selectedShopName })}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:text-red-700 rounded-xl transition-all cursor-pointer shadow-sm"
                    title="Permanently Delete This Shop & All Data"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>Delete Shop</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDeployStandardStock(selectedShopId, selectedShopName)}
                    disabled={deployingStock}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
                    title="Deploy Standard Franchise Package (20 products, 944 stock units, ₹3,00,000 cost value)"
                  >
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    {deployingStock ? "Deploying 944 Units..." : "Deploy Standard Stock (944 Units)"}
                  </button>

                  <button
                    onClick={handleSyncMasterCatalog}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 rounded-xl transition-all cursor-pointer shadow-sm"
                    title="Initialize or Repair Master Products with Stock = 0"
                  >
                    <RefreshCw className="w-4 h-4 text-green-600" />
                    Sync Master (0 Stock)
                  </button>

                  <button
                    onClick={downloadFranchiseCsv}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-all cursor-pointer shadow-sm"
                    title="Download 20 Franchise Products / 944 Units CSV"
                  >
                    <Download className="w-4 h-4 text-blue-600" />
                    Franchise CSV (944 Units)
                  </button>

                  <button
                    onClick={downloadCsvTemplate}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all cursor-pointer shadow-sm"
                    title="Download Master Catalog CSV Template"
                  >
                    <Download className="w-4 h-4 text-gray-600" />
                    Master CSV
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all cursor-pointer shadow-sm"
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
                    className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-500 rounded-xl transition-all shadow-md hover:shadow-green-100 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Product
                  </button>
                </div>
              </div>

              {/* Header Title & Actions */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                    <Package className="w-8 h-8 text-green-600" />
                    Inventory for {selectedShopName}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">Super Admin product catalog, live stock allocation, and full margin analysis.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (selectedShopId) fetchShopProducts(selectedShopId);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>
              </div>

              {/* Selected Shop Catalog & Full Margin Overview KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Catalog Products */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Catalog Items</span>
                    <Package className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-2xl font-black text-gray-950 mt-2">{catalogSummary.totalItems} Products</div>
                  <div className="text-xs text-gray-500 mt-1 font-medium">
                    {catalogSummary.outOfStockCount > 0 ? (
                      <span className="text-red-700 font-extrabold bg-red-50 px-1.5 py-0.5 rounded">
                        {catalogSummary.outOfStockCount} Out of Stock
                      </span>
                    ) : (
                      <span className="text-green-700 font-bold">All Products in Stock</span>
                    )}
                  </div>
                </div>

                {/* 2. Total Units in Stock */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Live Units</span>
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-700 mt-2">{catalogSummary.totalUnits} Units</div>
                  <div className="text-xs text-gray-500 mt-1 font-medium">
                    Across {catalogSummary.totalItems - catalogSummary.outOfStockCount} stocked items
                  </div>
                </div>

                {/* 3. Total Stock Retail Valuation */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stock Selling Worth</span>
                    <IndianRupee className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-purple-700 mt-2">
                    ₹{catalogSummary.totalRetail.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 font-medium">
                    Cost Price: ₹{catalogSummary.totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* 4. Full Margin Potential (Profit) */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Potential Stock Profit</span>
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600 mt-2">
                    ₹{catalogSummary.totalMargin.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 font-medium flex items-center justify-between">
                    <span>Overall Rate:</span>
                    <span className="text-emerald-800 font-extrabold bg-emerald-50 px-2 py-0.5 rounded">
                      {catalogSummary.avgMarginPct.toFixed(1)}% Full Margin
                    </span>
                  </div>
                </div>
              </div>

              {/* Zero Stock Warning Banner for New Shops */}
              {catalogSummary.totalUnits === 0 && (
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3.5">
                  <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-extrabold text-amber-950">New / Unstocked Shop Inventory Notice</h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      This shop currently has <strong>0 total units in stock</strong> across all products ({catalogSummary.outOfStockCount} out of stock items).
                      Use the quick <strong>+1, +5, +10</strong> adjusters in the table or click <strong>Edit Stock & Prices</strong> on any product to assign inventory and start billing!
                    </p>
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="p-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {successMsg}
                </div>
              )}

              {error && (
                <div className="p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl">
                  {error}
                </div>
              )}

              {/* Search bar */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products in this shop's stock by name, SKU or barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                />
              </div>

              {loadingProducts ? (
                <div className="text-gray-500 font-medium">Loading shop products catalog...</div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs font-bold uppercase tracking-wider">
                          <th className="py-4 px-6">Product</th>
                          <th className="py-4 px-6">SKU / Barcode</th>
                          <th className="py-4 px-6 text-right">MRP</th>
                          <th className="py-4 px-6 text-right">Purchase Price</th>
                          <th className="py-4 px-6 text-right">Selling Price</th>
                          <th className="py-4 px-6 text-right">Unit Margin</th>
                          <th className="py-4 px-6 text-right">Full Stock Margin</th>
                          <th className="py-4 px-6 text-center">Stock & Quick Adjust</th>
                          <th className="py-4 px-6 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {products
                          .filter((p) => 
                            p.name.toLowerCase().includes(search.toLowerCase()) ||
                            (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
                            (p.barcode && p.barcode.includes(search))
                          )
                          .length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 px-6 text-center text-gray-500">
                              No products found in this shop's inventory.
                            </td>
                          </tr>
                        ) : (
                          products
                            .filter((p) => 
                              p.name.toLowerCase().includes(search.toLowerCase()) ||
                              (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
                              (p.barcode && p.barcode.includes(search))
                            )
                            .map((p) => {
                              const stock = Number(p.current_stock || 0);
                              const sPrice = Number(p.sale_price || 0);
                              const pPrice = Number(p.purchase_price || 0);
                              const mrpPrice = Number(p.mrp || sPrice);
                              const marginValue = sPrice - pPrice;
                              const marginPercent = sPrice > 0 ? (marginValue / sPrice) * 100 : 0;
                              const totalStockMargin = stock * marginValue;

                              return (
                                <tr 
                                  key={p.id} 
                                  className="text-sm hover:bg-gray-50 transition-colors"
                                >
                                  {/* Product Image & Name */}
                                  <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                      <div className="w-11 h-11 bg-white border border-gray-200 rounded-xl p-1 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-2xs">
                                        {p.image_url ? (
                                          <img
                                            src={p.image_url}
                                            alt={p.name}
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = "https://placehold.co/100x100.png?text=Product";
                                            }}
                                          />
                                        ) : (
                                          <Package className="w-5 h-5 text-gray-400" />
                                        )}
                                      </div>
                                      <div>
                                        <span className="font-extrabold text-gray-950 block">{p.name}</span>
                                        <span className="text-xs text-gray-500 font-medium">{p.unit || "pcs"} • GST {p.gst_rate || 0}%</span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* SKU & Barcode */}
                                  <td className="py-4 px-6 font-mono text-xs text-gray-600">
                                    <div>{p.sku || "N/A"}</div>
                                    {p.barcode && (
                                      <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                                        <Barcode className="w-3.5 h-3.5" />
                                        {p.barcode}
                                      </div>
                                    )}
                                  </td>

                                  {/* MRP */}
                                  <td className="py-4 px-6 text-right font-medium text-gray-700">
                                    ₹{mrpPrice.toFixed(2)}
                                  </td>

                                  {/* Purchase Price (Cost) */}
                                  <td className="py-4 px-6 text-right font-medium text-gray-600">
                                    ₹{pPrice.toFixed(2)}
                                  </td>

                                  {/* Selling Price */}
                                  <td className="py-4 px-6 text-right font-black text-gray-950">
                                    ₹{sPrice.toFixed(2)}
                                  </td>
                                  
                                  {/* Unit Margin (Value & %) */}
                                  <td className="py-4 px-6 text-right">
                                    <div className="font-extrabold text-emerald-700">
                                      ₹{marginValue.toFixed(2)}
                                    </div>
                                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                      {marginPercent.toFixed(1)}%
                                    </span>
                                  </td>

                                  {/* Full Stock Margin (Total potential profit) */}
                                  <td className="py-4 px-6 text-right">
                                    <div className="font-black text-purple-700">
                                      ₹{totalStockMargin.toFixed(2)}
                                    </div>
                                    <span className="text-[11px] text-gray-400 font-medium block">
                                      for {stock} units
                                    </span>
                                  </td>

                                  {/* Current Stock with Quick Adjusters */}
                                  <td className="py-4 px-6 text-center">
                                    <div className="flex flex-col items-center gap-1.5">
                                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                                        stock <= 0
                                          ? "bg-red-100 text-red-800 border-red-300 animate-pulse"
                                          : stock <= Number(p.reorder_level || 5)
                                          ? "bg-amber-100 text-amber-800 border-amber-300"
                                          : "bg-green-100 text-green-800 border-green-300"
                                      }`}>
                                        {stock <= 0 ? "0 Left (Out of Stock)" : `${stock} ${p.unit || "pcs"}`}
                                      </span>

                                      {/* Quick Stock Step Controls */}
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleQuickStockStep(p, -1)}
                                          disabled={stock <= 0}
                                          className="w-6 h-6 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-black text-xs flex items-center justify-center cursor-pointer disabled:opacity-30"
                                          title="Decrease stock by 1"
                                        >
                                          -1
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleQuickStockStep(p, 1)}
                                          className="w-6 h-6 bg-green-100 hover:bg-green-200 text-green-800 rounded font-black text-xs flex items-center justify-center cursor-pointer"
                                          title="Add 1 to stock"
                                        >
                                          +1
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleQuickStockStep(p, 5)}
                                          className="px-1.5 h-6 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded font-bold text-[11px] flex items-center justify-center cursor-pointer"
                                          title="Add 5 to stock"
                                        >
                                          +5
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleQuickStockStep(p, 10)}
                                          className="px-1.5 h-6 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded font-bold text-[11px] flex items-center justify-center cursor-pointer"
                                          title="Add 10 to stock"
                                        >
                                          +10
                                        </button>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Actions: Edit Stock / Margins & Delete */}
                                  <td className="py-4 px-6 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openEditStockModal(p)}
                                        className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                        title="Edit Stock, Selling Price & Cost Margins"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteProduct(p.id);
                                        }}
                                        className="p-1.5 text-red-600 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-red-100"
                                        title="Delete Product"
                                      >
                                        <Trash2 className="w-4 h-4" />
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
            </div>
          ) : (
            /* REGISTERED SHOPS OVERVIEW OR FRANCHISE MODEL */
            <div className="space-y-6">
              {/* Top View Mode Navigation Tabs */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200 w-fit">
                <button
                  type="button"
                  onClick={() => setActiveTab("shops")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    activeTab === "shops"
                      ? "bg-white text-gray-950 shadow-sm border border-gray-200/80"
                      : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                  }`}
                >
                  <Store className="w-4 h-4 text-green-600" />
                  <span>Partner Shops ({shops.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("franchise_model")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    activeTab === "franchise_model"
                      ? "bg-white text-gray-950 shadow-sm border border-gray-200/80"
                      : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Franchise Master Stock & Margin Model (944 Units / ₹3.00L)</span>
                  <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-full">
                    20 Products
                  </span>
                </button>
              </div>

              {activeTab === "franchise_model" ? (
                /* FRANCHISE MASTER STOCK & MARGIN MODEL (20 PRODUCTS, 944 UNITS, ₹3.00L COST, ₹4.50L REVENUE) */
                <div className="space-y-6 animate-fade-in">
                  {/* Header & Quick Action Deploy */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10 space-y-1.5 max-w-2xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-extrabold text-blue-200 border border-white/10 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-blue-300" /> Standard Franchise Onboarding Model
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                        Franchise Master Stock, Inventory & Price Model
                      </h1>
                      <p className="text-sm text-blue-200/90 leading-relaxed">
                        Standard baseline stock and pricing structure automatically deployed to new shops upon acceptance: 
                        <strong className="text-white"> 20 products, 944 total stock units, ₹3,00,000 cost value, ₹4,50,000 retail sales revenue, ₹1,50,000 net profit (50% avg margin)</strong>, and 36 promotional demo kits.
                      </p>
                    </div>

                    {/* Deploy to Any Shop Widget */}
                    <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col gap-2.5 min-w-[280px]">
                      <label className="text-xs font-extrabold uppercase tracking-wider text-blue-100 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-blue-300" /> Deploy Package to Shop
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={selectedDeployShopId}
                          onChange={(e) => setSelectedDeployShopId(e.target.value)}
                          className="flex-1 bg-white text-gray-900 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none border-none shadow-sm cursor-pointer"
                        >
                          <option value="">Select Partner Shop...</option>
                          {shops.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!selectedDeployShopId || deployingStock}
                          onClick={() => {
                            const shop = shops.find(s => s.id === selectedDeployShopId);
                            if (shop) handleDeployStandardStock(shop.id, shop.name);
                          }}
                          className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-gray-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {deployingStock ? "Deploying..." : "Deploy"}
                        </button>
                      </div>
                      <span className="text-[11px] text-blue-200">Applies 944 standard units & prices instantly.</span>
                      <button
                        type="button"
                        onClick={downloadFranchiseCsv}
                        className="w-full mt-1 py-2 bg-white/90 hover:bg-white text-blue-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        title="Download Franchise 944 Units Excel / CSV Spreadsheet"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-700" />
                        Download 944 Excel / CSV
                      </button>
                    </div>
                  </div>

                  {/* Metric Cards Directly Matching Spreadsheet Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* 1. Products */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Master Catalog</span>
                      <div className="text-2xl font-black text-gray-900 mt-1">{FRANCHISE_SUMMARY.totalProducts}</div>
                      <span className="text-[11px] text-gray-500 font-medium">Standard SKUs</span>
                    </div>

                    {/* 2. Total Units */}
                    <div className="bg-white border border-blue-200/80 bg-gradient-to-b from-blue-50/30 to-white rounded-2xl p-4 shadow-xs">
                      <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Total Quantity</span>
                      <div className="text-2xl font-black text-blue-800 mt-1">{FRANCHISE_SUMMARY.totalStockUnits.toLocaleString("en-IN")}</div>
                      <span className="text-[11px] text-blue-600 font-medium">Stock units per center</span>
                    </div>

                    {/* 3. Cost Value */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Total Inventory Cost</span>
                      <div className="text-2xl font-black text-gray-950 mt-1">₹{FRANCHISE_SUMMARY.totalCostValue.toLocaleString("en-IN")}</div>
                      <span className="text-[11px] text-gray-500 font-medium">₹3.00 Lakh purchase</span>
                    </div>

                    {/* 4. Sales Revenue */}
                    <div className="bg-white border border-emerald-200/80 bg-gradient-to-b from-emerald-50/30 to-white rounded-2xl p-4 shadow-xs">
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Revenue on Sales</span>
                      <div className="text-2xl font-black text-emerald-800 mt-1">₹{FRANCHISE_SUMMARY.totalRevenue.toLocaleString("en-IN")}</div>
                      <span className="text-[11px] text-emerald-600 font-medium">₹4.50 Lakh retail</span>
                    </div>

                    {/* 5. Net Profit & Margin */}
                    <div className="bg-white border border-purple-200/80 bg-gradient-to-b from-purple-50/30 to-white rounded-2xl p-4 shadow-xs">
                      <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">Gross Profit</span>
                      <div className="text-2xl font-black text-purple-800 mt-1">₹{FRANCHISE_SUMMARY.totalProfit.toLocaleString("en-IN")}</div>
                      <span className="text-[11px] text-purple-600 font-semibold">{FRANCHISE_SUMMARY.averageMargin}% avg profit margin</span>
                    </div>

                    {/* 6. Demo Kits */}
                    <div className="bg-white border border-amber-200/80 bg-gradient-to-b from-amber-50/30 to-white rounded-2xl p-4 shadow-xs">
                      <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Demo Kits</span>
                      <div className="text-2xl font-black text-amber-800 mt-1">{FRANCHISE_SUMMARY.totalDemoKits} Kits</div>
                      <span className="text-[11px] text-amber-700 font-bold">₹{FRANCHISE_SUMMARY.totalDemoValue.toLocaleString("en-IN")} value</span>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                    {/* Category Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {franchiseCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFranchiseFilterCategory(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            franchiseFilterCategory === cat
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Search Bar */}
                    <div className="relative min-w-[240px]">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={franchiseSearch}
                        onChange={(e) => setFranchiseSearch(e.target.value)}
                        placeholder="Search products or SKU..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* The 12-Column Spreadsheet Master Table */}
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse font-sans text-xs">
                        <thead>
                          <tr className="bg-gray-100/90 border-b border-gray-200 text-gray-700 font-extrabold uppercase tracking-wider text-[11px]">
                            <th className="py-3.5 px-3">Category</th>
                            <th className="py-3.5 px-3">Product Name</th>
                            <th className="py-3.5 px-3 text-right">MRP</th>
                            <th className="py-3.5 px-3 text-right">Selling Price</th>
                            <th className="py-3.5 px-3 text-right">Unit Cost</th>
                            <th className="py-3.5 px-3 text-center">Quantity</th>
                            <th className="py-3.5 px-3 text-right">Value</th>
                            <th className="py-3.5 px-3 text-right">Revenue on sales</th>
                            <th className="py-3.5 px-3 text-right">Profit</th>
                            <th className="py-3.5 px-3 text-center">Margin</th>
                            <th className="py-3.5 px-3 text-center">Demo Kits</th>
                            <th className="py-3.5 px-3 text-right">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredFranchiseProducts.map((prod, idx) => {
                            let catBg = "bg-gray-100 text-gray-800 border-gray-200";
                            if (prod.category === "Mastitis") catBg = "bg-purple-50 text-purple-800 border-purple-200";
                            else if (prod.category === "Accessories") catBg = "bg-blue-50 text-blue-800 border-blue-200";
                            else if (prod.category === "Hygiene") catBg = "bg-teal-50 text-teal-800 border-teal-200";
                            else if (prod.category === "Diagnostic Kits") catBg = "bg-emerald-50 text-emerald-800 border-emerald-200";
                            else if (prod.category === "Feed Supplement") catBg = "bg-amber-50 text-amber-800 border-amber-200";
                            else if (prod.category === "Breeding Tool") catBg = "bg-rose-50 text-rose-800 border-rose-200";

                            return (
                              <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                <td className="py-3 px-3">
                                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${catBg}`}>
                                    {prod.category}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-bold text-gray-900">{prod.name}</div>
                                  <div className="text-[10px] font-mono text-gray-400">{prod.sku}</div>
                                </td>
                                <td className="py-3 px-3 text-right font-medium text-gray-600">
                                  ₹{prod.mrp.toLocaleString("en-IN")}
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-gray-900">
                                  ₹{prod.sale_price.toLocaleString("en-IN")}
                                </td>
                                <td className="py-3 px-3 text-right font-semibold text-gray-700">
                                  ₹{prod.purchase_price.toLocaleString("en-IN")}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-900 font-black rounded-md text-xs">
                                    {prod.default_stock}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-gray-800">
                                  ₹{prod.value.toLocaleString("en-IN")}
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-emerald-700">
                                  ₹{prod.revenue.toLocaleString("en-IN")}
                                </td>
                                <td className="py-3 px-3 text-right font-black text-purple-700">
                                  ₹{prod.profit.toLocaleString("en-IN")}
                                </td>
                                <td className="py-3 px-3 text-center font-black text-emerald-700">
                                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                                    {prod.margin_percent}%
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center font-bold text-amber-800">
                                  {prod.demo_kits > 0 ? (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md font-extrabold">
                                      {prod.demo_kits}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">0</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-amber-900">
                                  ₹{prod.demo_value.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* Table Footer Totals directly matching user spreadsheet */}
                        <tfoot>
                          <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-800">
                            <td colSpan={5} className="py-4 px-3 uppercase tracking-wider text-slate-300 text-sm">
                              Total Inventory Cost
                            </td>
                            <td className="py-4 px-3 text-center text-blue-300 text-sm">
                              {FRANCHISE_SUMMARY.totalStockUnits}
                            </td>
                            <td className="py-4 px-3 text-right text-white text-sm">
                              ₹ {FRANCHISE_SUMMARY.totalCostValue.toLocaleString("en-IN")}
                            </td>
                            <td className="py-4 px-3 text-right text-emerald-300 text-sm">
                              ₹ {FRANCHISE_SUMMARY.totalRevenue.toLocaleString("en-IN")}
                            </td>
                            <td className="py-4 px-3 text-right text-purple-300 text-sm">
                              ₹ {FRANCHISE_SUMMARY.totalProfit.toLocaleString("en-IN")}
                            </td>
                            <td className="py-4 px-3 text-center text-emerald-300">
                              {FRANCHISE_SUMMARY.averageMargin}%
                            </td>
                            <td className="py-4 px-3 text-center text-amber-300 text-sm">
                              {FRANCHISE_SUMMARY.totalDemoKits}
                            </td>
                            <td className="py-4 px-3 text-right text-amber-300 text-sm">
                              ₹ {FRANCHISE_SUMMARY.totalDemoValue.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* MAIN REGISTERED SHOPS OVERVIEW LIST */
                <div className="space-y-6">
                  {/* Header Title */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <Store className="w-8 h-8 text-green-600" />
                        Registered Shops & Centers (Admin)
                      </h1>
                      <p className="text-sm text-gray-500 mt-1">Review shop registrations, approve partners, update stock, and audit profit margins.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={fetchShops}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl cursor-pointer shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-green-600" /> Refresh List
                      </button>
                    </div>
                  </div>

                  {/* Network Overview Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Registered Shops</span>
                        <Store className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="text-2xl font-black text-gray-950 mt-2">{shops.length} Shops</div>
                      <div className="flex items-center gap-2 text-xs font-bold mt-1">
                        <span className="text-green-700">{shops.filter(s => s.status === 'approved').length} Approved</span>
                        <span>•</span>
                        <span className="text-amber-700">{shops.filter(s => s.status === 'pending').length} Pending</span>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Network Revenue</span>
                        <IndianRupee className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-2xl font-black text-green-700 mt-2">
                        ₹{shops.reduce((a, s) => a + Number(s.totalRevenue || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-medium">
                        {shops.reduce((a, s) => a + Number(s.invoiceCount || 0), 0)} Total Invoices Billed
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Network Live Stock</span>
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-2xl font-black text-blue-700 mt-2">
                        ₹{shops.reduce((a, s) => a + Number(s.totalStockValue || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-medium">
                        {shops.reduce((a, s) => a + Number(s.totalUnitsInStock || 0), 0)} Units in Total Inventory
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Network Potential Margin</span>
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-black text-emerald-600 mt-2">
                        ₹{shops.reduce((a, s) => a + Number(s.totalPotentialMargin || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-medium">
                        Cumulative gross profit across partner shops
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
                      {error}
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      {successMsg}
                    </div>
                  )}

                  {loadingShops ? (
                    <div className="text-gray-500 font-medium">Loading shops list...</div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs font-bold uppercase tracking-wider">
                              <th className="py-4 px-6">Shop Name & Status</th>
                              <th className="py-4 px-6">Owner & Contact</th>
                              <th className="py-4 px-6">Location & GSTIN</th>
                              <th className="py-4 px-6 text-right">Sales Revenue</th>
                              <th className="py-4 px-6 text-center">Live Stock</th>
                              <th className="py-4 px-6 text-right">Stock Worth & Margin</th>
                              <th className="py-4 px-6 text-center">Approval Action</th>
                              <th className="py-4 px-6 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {shops.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-8 px-6 text-center text-gray-500">
                                  No shops registered yet.
                                </td>
                              </tr>
                            ) : (
                              shops.map((shop) => {
                                const isApproved = shop.status === "approved";
                                const isApproving = approvingShopId === shop.id;

                                return (
                                  <tr key={shop.id} className="text-sm hover:bg-gray-50 transition-colors">
                                    {/* Shop Name & Approval Badge */}
                                    <td className="py-4 px-6">
                                      <button
                                        onClick={() => handleSelectShop(shop.id, shop.name)}
                                        className="font-extrabold text-gray-950 hover:text-green-700 hover:underline transition-colors text-left cursor-pointer text-base block"
                                      >
                                        {shop.name}
                                      </button>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                                          isApproved
                                            ? "bg-green-100 text-green-800 border-green-300"
                                            : "bg-amber-100 text-amber-800 border-amber-300"
                                        }`}>
                                          {isApproved ? "Approved Shop" : "Pending Approval"}
                                        </span>
                                        <span className="text-xs text-gray-400">{shop.franchise?.name || "Partner"}</span>
                                      </div>
                                    </td>

                                    {/* Owner & Phone */}
                                    <td className="py-4 px-6">
                                      <div className="font-bold text-gray-900">{shop.owner?.full_name || "Unassigned"}</div>
                                      <div className="text-xs text-gray-500 mt-0.5">{shop.phone || shop.owner?.phone || "No phone"}</div>
                                    </td>

                                    {/* Location & GSTIN */}
                                    <td className="py-4 px-6 text-xs text-gray-600">
                                      <div className="font-semibold text-gray-800">{shop.state || "India"}</div>
                                      <div className="font-mono text-gray-400 mt-0.5">{shop.gstin || "No GSTIN"}</div>
                                    </td>

                                    {/* Sales in Period */}
                                    <td className="py-4 px-6 text-right">
                                      <div className="font-extrabold text-gray-950">
                                        ₹{Number(shop.totalRevenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </div>
                                      <span className="text-xs text-gray-500 font-medium">
                                        {shop.invoiceCount || 0} bills issued
                                      </span>
                                    </td>

                                    {/* Stock & Out-of-Stock count */}
                                    <td className="py-4 px-6 text-center">
                                      <div className="font-extrabold text-blue-700">
                                        {shop.totalUnitsInStock || 0} units
                                      </div>
                                      <div className="mt-0.5">
                                        {Number(shop.outOfStockCount || 0) > 0 ? (
                                          <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-extrabold text-[11px] border border-red-200">
                                            {shop.outOfStockCount} Out of Stock
                                          </span>
                                        ) : (
                                          <span className="text-green-700 text-xs font-semibold">In Stock</span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Stock Valuation & Potential Margin */}
                                    <td className="py-4 px-6 text-right">
                                      <div className="font-bold text-purple-700">
                                        ₹{Number(shop.totalStockValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </div>
                                      <div className="text-xs text-emerald-700 font-extrabold mt-0.5">
                                        Margin: ₹{Number(shop.totalPotentialMargin || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })} ({Number(shop.marginPercentage || 0).toFixed(1)}%)
                                      </div>
                                    </td>

                                    {/* Shop Approval Action Button */}
                                    <td className="py-4 px-6 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleShopApproval(shop.id, shop.status || (isApproved ? "approved" : "pending"))}
                                        disabled={isApproving}
                                        className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1 mx-auto shadow-2xs ${
                                          isApproved
                                            ? "bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-800 border border-gray-200"
                                            : "bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                        }`}
                                        title={isApproved ? "Click to revoke or set to Pending" : "Click to Approve this Shop & auto-deploy 944 stock units"}
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        {isApproving ? "Updating..." : isApproved ? "Revoke / Pending" : "Approve Shop"}
                                      </button>
                                    </td>

                                    {/* Actions */}
                                    <td className="py-4 px-6 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleDeployStandardStock(shop.id, shop.name)}
                                          disabled={deployingStock}
                                          className="px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1 disabled:opacity-50"
                                          title="Deploy standard 944 units franchise stock allotment (20 products)"
                                        >
                                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                          Deploy 944 Stock
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSelectShop(shop.id, shop.name)}
                                          className="px-2.5 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                                          title="Manage Catalog, Update Stock & Margins"
                                        >
                                          <Package className="w-3.5 h-3.5" />
                                          Manage Stock
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setShopToDelete({ id: shop.id, name: shop.name })}
                                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200/60 rounded-xl transition-all cursor-pointer shadow-2xs"
                                          title={`Delete Shop "${shop.name}" and all associated data`}
                                        >
                                          <Trash2 className="w-4 h-4" />
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
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal - Admin Product Creation specific to selected Shop */}
      {isModalOpen && selectedShopId && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-600" />
                Add Product to {selectedShopName} Inventory
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
      {deleteConfirmId && (
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
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-150 space-y-1">
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

      {/* Modal - Delete Shop and All Related Data Confirmation */}
      {shopToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl shadow-2xl border border-red-100 w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-red-50 via-rose-50 to-amber-50 px-6 py-5 border-b border-red-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-red-950">Delete Shop & All Data</h2>
                  <p className="text-xs text-red-700 font-semibold">Irreversible permanent action</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !deletingShop && setShopToDelete(null)}
                disabled={deletingShop}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
                <p className="text-sm font-bold text-gray-900 leading-snug">
                  Are you sure you want to permanently delete <span className="text-red-700 font-black underline decoration-red-400 decoration-2">{shopToDelete.name}</span>?
                </p>
                <p className="text-xs text-amber-900 font-medium mt-1.5">
                  This will completely and permanently erase all associated data for this shop, including:
                </p>
                <ul className="mt-2.5 space-y-1 text-xs text-amber-950 font-semibold list-disc list-inside">
                  <li>All Invoices & billing line items</li>
                  <li>All Products & catalog inventory stock</li>
                  <li>All Stock movements & valuation logs</li>
                  <li>All Customer records belonging to this shop</li>
                  <li>All Restock requests & pending orders</li>
                  <li>All Associated Shopkeeper User Accounts & Auth Profiles</li>
                </ul>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span>This action cannot be undone. All data will be permanently wiped.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShopToDelete(null)}
                disabled={deletingShop}
                className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteShop}
                disabled={deletingShop}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-extrabold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deletingShop ? "Deleting All Shop Data..." : "Yes, Delete Shop & All Data"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal - Admin Direct Stock & Full Margin Pricing Update */}
      {editingStockProduct && selectedShopId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-950">Update Stock & Margins</h2>
                  <p className="text-xs text-gray-500 font-medium">Assign inventory & price controls for {selectedShopName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStockProduct(null)}
                disabled={updatingStock}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white/80 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStockAndPrice} className="p-6 space-y-5">
              {/* Product mini header */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-3.5">
                <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {editingStockProduct.image_url ? (
                    <img src={editingStockProduct.image_url} alt={editingStockProduct.name} className="w-full h-full object-contain" />
                  ) : (
                    <Package className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-gray-950 text-sm leading-snug">{editingStockProduct.name}</h3>
                  <span className="text-xs text-gray-500 font-mono mt-0.5 block">{editingStockProduct.sku || "No SKU"} • {editingStockProduct.unit || "pcs"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Current Stock */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
                    Stock Quantity ({editingStockProduct.unit || "pcs"}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editStockVal}
                    onChange={(e) => setEditStockVal(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10)))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-black text-blue-900 focus:outline-none focus:border-blue-600"
                    placeholder="0"
                    required
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">Live stock in shop inventory</span>
                </div>

                {/* MRP */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
                    MRP (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editMrpVal}
                    onChange={(e) => setEditMrpVal(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-900 focus:outline-none focus:border-blue-600"
                    placeholder="0.00"
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">Maximum retail printed price</span>
                </div>

                {/* Purchase Price (Cost) */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
                    Purchase Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPurchasePriceVal}
                    onChange={(e) => setEditPurchasePriceVal(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-900 focus:outline-none focus:border-blue-600"
                    placeholder="0.00"
                    required
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">Franchise cost price</span>
                </div>

                {/* Sale Price (Selling) */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editSalePriceVal}
                    onChange={(e) => setEditSalePriceVal(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-900 focus:outline-none focus:border-blue-600"
                    placeholder="0.00"
                    required
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">Customer retail bill price</span>
                </div>
              </div>

              {/* Dynamic Live Margin Price Calculations */}
              {(() => {
                const sPrice = Number(editSalePriceVal || 0);
                const pPrice = Number(editPurchasePriceVal || 0);
                const stockQty = Number(editStockVal || 0);
                const unitMargin = sPrice - pPrice;
                const marginPct = sPrice > 0 ? (unitMargin / sPrice) * 100 : 0;
                const totalStockProfit = stockQty * unitMargin;

                return (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wider block">
                      Live Margin Price Calculations
                    </span>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-200/70">
                        <span className="text-[11px] text-gray-500 font-bold block">Unit Profit</span>
                        <span className="text-base font-black text-emerald-700">₹{unitMargin.toFixed(2)}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-200/70">
                        <span className="text-[11px] text-gray-500 font-bold block">Margin Rate</span>
                        <span className="text-base font-black text-emerald-700">{marginPct.toFixed(1)}%</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-200/70">
                        <span className="text-[11px] text-gray-500 font-bold block">Stock Profit</span>
                        <span className="text-base font-black text-purple-700">₹{totalStockProfit.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingStockProduct(null)}
                  disabled={updatingStock}
                  className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStock}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {updatingStock ? "Saving Changes..." : "Save Stock & Margins"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
