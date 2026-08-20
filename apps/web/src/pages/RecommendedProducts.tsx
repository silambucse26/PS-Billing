import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { MASTER_PRODUCTS, type MasterProductItem } from "../data/masterCatalog";
import { 
  Sparkles, 
  Package, 
  Search, 
  Check, 
  X,
  Info,
  Layers,
  Flame,
  ArrowRight,
  RefreshCw,
  ShoppingCart,
  ShieldCheck,
  FileText
} from "lucide-react";

export default function RecommendedProducts() {
  const navigate = useNavigate();
  const { shop } = useAuth();
  const [shopProducts, setShopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recommended");
  const [selectedProductDetails, setSelectedProductDetails] = useState<MasterProductItem | null>(null);

  useEffect(() => {
    if (shop?.id) {
      fetchShopInventory();
    }
  }, [shop]);

  const fetchShopInventory = async () => {
    if (!shop?.id) return;
    try {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id, name, sku, current_stock")
        .eq("shop_id", shop.id);
      setShopProducts(data || []);
    } catch (e) {
      console.error("Error fetching shop inventory:", e);
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract product family key to identify and group all pack sizes & variants
  const getProductFamilyKey = (nameOrSku: string): string => {
    const s = (nameOrSku || "").toLowerCase();

    // Combos
    if (s.includes("combo")) return "combo-item";

    // Diagnostic Rapid Test Kits
    if (s.includes("tuberculosis") || s.includes(" tb ")) return "tb-test-kit";
    if (s.includes("brucella") && s.includes("milk")) return "brucella-milk-strip";
    if (s.includes("brucella")) return "brucella-test-kit";
    if (s.includes("diva")) return "fmd-diva-test-kit";
    if (s.includes("foot and mouth") || s.includes("fmd")) return "fmd-test-kit";
    if (s.includes("theileria")) return "theileria-test-kit";
    if (s.includes("hemorrhagic") || s.includes("septicemia") || s.includes("pasteurella")) return "hs-test-kit";
    if (s.includes("ibr") || s.includes("rhinotracheitis")) return "ibr-test-kit";
    if (s.includes("listeria")) return "listeria-test-kit";
    if (s.includes("salmonella")) return "salmonella-test-kit";
    if (s.includes("scrub typhus")) return "scrub-typhus-test-kit";
    if (s.includes("leptospira")) return "leptospira-test-kit";
    if (s.includes("anthrax")) return "anthrax-test-kit";
    if (s.includes("pregkine") || s.includes("pregnancy")) return "pregkine-test-kit";
    if (s.includes("nsure lacto") || s.includes("lacto pack")) return "nsure-lacto";
    if (s.includes("nsure aqua") || s.includes("aqua pack")) return "nsure-aqua";
    if (s.includes("tds") || s.includes("ph, temperature") || s.includes("ph temperature")) return "tds-meter";

    // Teat & Mastitis Care
    if (s.includes("quadmastest")) return "quadmastest";
    if (s.includes("mastitis indicator")) return "mastitis-indicator";
    if (s.includes("cmt paddle") || s.includes("paddle 1 unit")) return "cmt-paddle";
    if (s.includes("cmt kit") || s.includes("california mastitis")) return "cmt-kit";
    if (s.includes("iodokine")) return "iodokine";
    if (s.includes("iogiene")) return "iogiene";
    if (s.includes("finekine")) return "finekine";
    if (s.includes("moofoam")) return "moofoam";
    if (s.includes("mastoveda")) return "mastoveda";
    if (s.includes("h-udderon") || s.includes("hudderon")) return "h-udderon";
    if (s.includes("dip cup") || s.includes("dipcup")) return "dip-cup";

    // Dairy Farm Machinery & Hardware
    if (s.includes("rubber mat") || s.includes("cow mat")) return "rubber-mat";
    if (s.includes("cow lifting") || s.includes("downer cow") || s.includes("cowlift")) return "cow-lifting-machine";
    if (s.includes("cream separator")) return "cream-separator";
    if (s.includes("dairy flow 200") || s.includes("dairyflow")) return "dairy-flow-milking-machine";
    if (s.includes("ecomilk") || s.includes("150bs")) return "ecomilk-milking-machine";
    if (s.includes("nano milk") || s.includes("nanomilk")) return "nanomilk-milking-machine";
    if (s.includes("farm pro 200")) return "chaff-cutter-farm-pro";
    if (s.includes("dairy cutter 1.5")) return "chaff-cutter-dairy-cutter";
    if (s.includes("petrol engine")) return "petrol-engine";
    if (s.includes("power sprayer") || s.includes("sprayer")) return "power-sprayer";
    if (s.includes("anti kick bar") || s.includes("anti-kick")) return "anti-kick-bar";
    if (s.includes("stainless steel water bowl") || s.includes("ss water bowl")) return "drinking-bowl-ss";
    if (s.includes("water bowl") || s.includes("drinking bowl")) return "drinking-bowl-plastic";
    if (s.includes("calf milk feeding bucket") || s.includes("5 nipples")) return "calf-feeding-bucket";
    if (s.includes("calf feeding bottle") || s.includes("rubber nipple")) return "calf-feeding-bottle";
    if (s.includes("bottle topper nipple")) return "bottle-topper-nipple";
    if (s.includes("horn sleeve")) return "horn-sleeve";
    if (s.includes("hoof knife")) return "hoof-knife";
    if (s.includes("hoof cutting tool") || s.includes("trimming shears")) return "hoof-shears";
    if (s.includes("pulsator repair kit")) return "pulsator-repair-kit";
    if (s.includes("pulsator")) return "pulsator-60-40";
    if (s.includes("liner for milking") || s.includes("mcl-027")) return "milking-liner";
    if (s.includes("cleaning brush set") || s.includes("mcl-022") || s.includes("brush set")) return "cleaning-brush";
    if (s.includes("vacuum") && s.includes("regulator") || s.includes("mcl-021")) return "vacuum-regulator";
    if (s.includes("rfid reader")) return "rfid-reader";
    if (s.includes("rfid ear") || s.includes("rfid eartags")) return "rfid-eartags";
    if (s.includes("dehorning paste") || s.includes("off -horn") || s.includes("d-horn")) return "dehorning-paste";
    if (s.includes("calf nose band") || s.includes("nose band")) return "calf-nose-band";
    if (s.includes("face mask") || s.includes("face shield") || s.includes("vetguard")) return "vetguard-mask";
    if (s.includes("thermometer")) return "digital-thermometer";
    if (s.includes("syringe gun")) return "syringe-gun";
    if (s.includes("oral feeding syringe") || s.includes("luer lock")) return "oral-syringe";
    if (s.includes("oral drencher") || s.includes("drencher")) return "oral-drencher";

    // Breeding
    if (s.includes("artificial insemination gun") || s.includes("visual ai")) return "visual-ai-gun";
    if (s.includes("estrus gun") || s.includes("heat detector")) return "estrus-gun";
    if (s.includes("semen thawer") || s.includes("thawer")) return "semen-thawer";
    if (s.includes("liquid nitrogen") || s.includes("ln2")) return "ln2-container";

    // Nutrition & Supplements
    if (s.includes("probos") || s.includes("bevet yeast")) return "probos-yeast";
    if (s.includes("mineral max")) return "mineral-max";
    if (s.includes("calcdex")) return "nutrakine-calcdex";
    if (s.includes("mastovita")) return "nutrakine-mastovita";
    if (s.includes("fertility booster")) return "nutrakine-fertility";
    if (s.includes("milk booster")) return "nutrakine-milkbooster";
    if (s.includes("gain")) return "nutrakine-gain";
    if (s.includes("calfster")) return "nutrakine-calfster";
    if (s.includes("liver tonic")) return "nutrakine-livertonic";
    if (s.includes("d-wormer") || s.includes("dewormer")) return "nutrakine-dwormer";
    if (s.includes("servatac") || s.includes("servatec")) return "servatac-milk-replacer";
    if (s.includes("kidimilk")) return "kidimilk-milk-replacer";
    if (s.includes("tick talc") || s.includes("tic tick tic") || s.includes("tick spray")) return "tick-treatment";

    // Fallback
    return s.replace(/[^a-z0-9]/g, "");
  };

  // Build a Set of all product families currently present in the shop inventory
  const ownedFamiliesSet = useMemo(() => {
    const set = new Set<string>();
    shopProducts.forEach((sp) => {
      if (sp.name) set.add(getProductFamilyKey(sp.name));
      if (sp.sku) set.add(getProductFamilyKey(sp.sku));
    });
    return set;
  }, [shopProducts]);

  // Filter out ANY product whose base family OR exact SKU/name is in the shop inventory
  // AND deduplicate remaining items so only 1 distinct representative per product family is shown
  const unownedProducts = useMemo(() => {
    const seenFamilies = new Set<string>();
    const result: MasterProductItem[] = [];

    for (const master of MASTER_PRODUCTS) {
      // Exclude combos or quadmastest if requested
      if (master.category?.includes("Combo") || master.name?.toLowerCase().includes("combo")) {
        continue;
      }
      if (master.name?.toLowerCase().includes("quadmastest")) {
        continue;
      }

      const familyKey = getProductFamilyKey(master.name || master.sku);
      
      // If the shop ALREADY has ANY variant of this family, exclude all variants!
      if (ownedFamiliesSet.has(familyKey)) {
        continue;
      }

      // Check direct SKU or name match
      const directMatch = shopProducts.some(
        (sp) =>
          sp.sku?.trim().toLowerCase() === master.sku.trim().toLowerCase() ||
          sp.name?.trim().toLowerCase() === master.name.trim().toLowerCase()
      );
      if (directMatch) {
        continue;
      }

      // If family hasn't been shown yet, add it
      if (!seenFamilies.has(familyKey)) {
        seenFamilies.add(familyKey);
        result.push(master);
      }
    }

    return result;
  }, [shopProducts, ownedFamiliesSet]);

  // Categories list
  const categoriesList = [
    { id: "all", label: "All Products" },
    { id: "Dairy Farm Essentials & Machinery", label: "Dairy Farm Machinery" },
    { id: "Diagnostic Rapid Test Kits", label: "Diagnostic Rapid Test Kits" },
    { id: "Breeding & Instruments", label: "Breeding & Instruments" },
    { id: "Nutrition & Supplements", label: "Nutrition & Supplements" }
  ];

  // Search and Sort
  const filteredCatalog = useMemo(() => {
    return unownedProducts.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.tagline && item.tagline.toLowerCase().includes(q)) ||
        (item.tag && item.tag.toLowerCase().includes(q)) ||
        (item.features && item.features.some((f) => f.toLowerCase().includes(q)));

      const matchesCategory =
        activeCategory === "all" ||
        item.category?.toLowerCase() === activeCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      if (sortBy === "margin_desc") {
        const marginA = ((a.sale_price - a.purchase_price) / a.purchase_price) * 100;
        const marginB = ((b.sale_price - b.purchase_price) / b.purchase_price) * 100;
        return marginB - marginA;
      }
      if (sortBy === "price_asc") return a.sale_price - b.sale_price;
      if (sortBy === "price_desc") return b.sale_price - a.sale_price;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });
  }, [unownedProducts, search, activeCategory, sortBy]);

  // Precise 3-color palette rotation (Green, Blue, Purple) as requested in mockup
  const getCardTheme = (_p: MasterProductItem, index: number) => {
    const cycle = index % 3;

    if (cycle === 0) {
      // 🟢 Card 1: Green Theme (Food-Grade Liner)
      return {
        cardBorder: "border-[2px] border-[#009245]",
        badgeBg: "bg-[#007a3d]",
        badgeText: "text-white",
        pedestal: "bg-[#eaf6ef]",
        checkBg: "border border-[#009245] bg-[#f0f9f3] text-[#009245]",
        franchiseBox: "bg-[#eaf6ef] border border-[#cbe9d7]",
        franchiseLabel: "text-[#007a3d]",
        franchisePrice: "text-[#0c4a24]",
        buttonBg: "bg-[#007a3d] hover:bg-[#006230]",
        specsIcon: "text-[#007a3d]",
        defaultTag: "FOOD-GRADE LINER"
      };
    }

    if (cycle === 1) {
      // 🔵 Card 2: Blue Theme (Dairy Sanitation)
      return {
        cardBorder: "border-[2px] border-[#0070ba]",
        badgeBg: "bg-[#0070ba]",
        badgeText: "text-white",
        pedestal: "bg-[#ebf4fa]",
        checkBg: "border border-[#0070ba] bg-[#f0f7fc] text-[#0070ba]",
        franchiseBox: "bg-[#ebf4fa] border border-[#cde3f5]",
        franchiseLabel: "text-[#005a96]",
        franchisePrice: "text-[#083b63]",
        buttonBg: "bg-[#0070ba] hover:bg-[#005a96]",
        specsIcon: "text-[#0070ba]",
        defaultTag: "DAIRY SANITATION"
      };
    }

    // 🟣 Card 3: Purple Theme (Vacuum Balancing & Machinery)
    return {
      cardBorder: "border-[2px] border-[#6b38c2]",
      badgeBg: "bg-[#6b38c2]",
      badgeText: "text-white",
      pedestal: "bg-[#f3effb]",
      checkBg: "border border-[#6b38c2] bg-[#f8f5fe] text-[#6b38c2]",
      franchiseBox: "bg-[#f3effb] border border-[#dfd4f5]",
      franchiseLabel: "text-[#5829a8]",
      franchisePrice: "text-[#391673]",
      buttonBg: "bg-[#6b38c2] hover:bg-[#5829a8]",
      specsIcon: "text-[#6b38c2]",
      defaultTag: "VACUUM BALANCING"
    };
  };

  // Navigate to Restock Apply page with this item pre-selected
  const handleRequestProduct = (p: MasterProductItem) => {
    navigate("/restock", {
      state: {
        preSelectedProduct: {
          productName: p.name,
          sku: p.sku,
          imageUrl: p.image_url,
          unit: p.unit || "pcs",
          unitPurchasePrice: p.purchase_price,
          unitSalePrice: p.sale_price,
          gstRate: p.gst_rate,
          hsnCode: p.hsn_code,
          currentStock: 0,
          quantity: 10
        }
      }
    });
  };

  return (
    <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen text-gray-900 animate-fade-in">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 min-w-0">
        
        {/* ============================================================== */}
        {/* 1. CLEAN TITLE & FILTER HEADER                                */}
        {/* ============================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight flex items-center gap-2.5">
                <Sparkles className="w-7 h-7 text-emerald-600" />
                Interested Products & Innovations
              </h1>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full uppercase">
                {unownedProducts.length} Available
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Browse products and innovations not yet in your shop inventory. Click <strong>"Request Restock"</strong> to submit an inventory request to Central Admin.
            </p>
          </div>

          <button
            onClick={fetchShopInventory}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            Refresh Inventory
          </button>
        </div>

        {/* ============================================================== */}
        {/* 2. SEARCH BAR & CATEGORY FILTER CHIPS                          */}
        {/* ============================================================== */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by product name, machine, liner, brush or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-green-600 focus:bg-white transition-all placeholder:text-gray-400"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold px-3 py-2.5 text-gray-700 focus:outline-none focus:border-green-600 cursor-pointer"
              >
                <option value="recommended">Featured / Curated</option>
                <option value="margin_desc">Highest Profit Margin %</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. PRODUCTS GRID (MATCHING USER'S SCREENSHOT PIXEL-PERFECT)    */}
        {/* ============================================================== */}
        {loading ? (
          <div className="py-20 text-center text-gray-400 space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-gray-600">Comparing your shop inventory with master catalog...</p>
          </div>
        ) : filteredCatalog.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200 p-8 space-y-3">
            <Package className="w-12 h-12 text-emerald-600/60 mx-auto" />
            <h3 className="text-lg font-bold text-gray-900">
              {unownedProducts.length === 0
                ? "Your shop already has all master catalog products in stock!"
                : "No matching new products found for this filter"}
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              {unownedProducts.length === 0
                ? "You have already provisioned all products from the master catalog into your shop inventory."
                : "Try resetting your search query or switching categories to explore other available products."}
            </p>
            {unownedProducts.length > 0 && (
              <button
                onClick={() => {
                  setSearch("");
                  setActiveCategory("all");
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCatalog.map((p, idx) => {
              const profitMargin = Math.round(((p.sale_price - p.purchase_price) / p.purchase_price) * 100);
              const theme = getCardTheme(p, idx);

              return (
                <div
                  key={p.sku}
                  className={`bg-white rounded-2xl ${theme.cardBorder} overflow-hidden flex flex-col justify-between hover:shadow-xl group transition-all duration-200`}
                >
                  <div>
                    {/* Top Image Stage with Light Background Dome */}
                    <div className="relative h-60 w-full bg-white overflow-hidden p-4 flex items-center justify-center border-b border-gray-100">
                      
                      {/* Subtle Colored Pedestal Dome */}
                      <div className={`w-52 h-52 rounded-full absolute bottom-[-20px] z-0 ${theme.pedestal} opacity-70 blur-[0.5px]`}></div>

                      {/* Product Image */}
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="max-h-44 max-w-[85%] object-contain relative z-10 group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                          loading="lazy"
                        />
                      ) : (
                        <div className="relative z-10 flex flex-col items-center justify-center text-gray-400 gap-2">
                          <Package className="w-12 h-12 stroke-1 text-gray-300" />
                          <span className="text-xs font-semibold">Chimertech Innovation</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 items-start z-20">
                        {/* Tag Pill with Shield Icon */}
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wide ${theme.badgeBg} ${theme.badgeText} uppercase shadow-xs`}>
                          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{p.tag || theme.defaultTag}</span>
                        </div>

                        {/* Margin Pill with Flame Icon */}
                        {profitMargin > 0 && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black text-amber-900 bg-amber-100/95 border border-amber-300 uppercase shadow-2xs">
                            <Flame className="w-3 h-3 text-amber-600 fill-amber-600" />
                            <span>+{profitMargin}% MARGIN</span>
                          </div>
                        )}
                      </div>

                      {/* Brochure Specs Floating Pill Button */}
                      <button
                        onClick={() => setSelectedProductDetails(p)}
                        className="absolute bottom-3.5 right-3.5 px-2.5 py-1 bg-white/95 hover:bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-lg text-[11px] font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer z-20 backdrop-blur-xs"
                        title="View Full Brochure Specifications"
                      >
                        <FileText className={`w-3.5 h-3.5 ${theme.specsIcon}`} />
                        <span>Brochure Specs</span>
                      </button>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-3">
                      {/* SKU & Pack Size Header */}
                      <div className="flex items-center justify-between text-xs text-gray-400 font-sans tracking-normal font-medium">
                        <span>SKU: {p.sku}</span>
                        <span>{p.unit ? `Pack: ${p.unit}` : "Pcs"}</span>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-[17px] text-gray-900 line-clamp-2 leading-snug">
                        {p.name}
                      </h3>

                      {/* Tagline / Subtitle */}
                      {p.tagline && (
                        <p className="text-xs text-gray-500 italic line-clamp-2 leading-relaxed">
                          {p.tagline}
                        </p>
                      )}

                      {/* Subtle Dotted Separator */}
                      <div className="border-t border-dashed border-gray-200/80 my-1.5"></div>

                      {/* Feature Bullet Highlights */}
                      {p.features && p.features.length > 0 && (
                        <div className="space-y-2 text-xs text-gray-700 min-h-[52px]">
                          {p.features.slice(0, 2).map((feat, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${theme.checkBg} flex-shrink-0 mt-0.5`}>
                                <Check className="w-2.5 h-2.5" />
                              </div>
                              <span className="leading-snug line-clamp-2">{feat}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Commercial Pricing Grid */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className={`p-3 rounded-xl ${theme.franchiseBox} text-center`}>
                          <span className={`text-[10px] font-bold tracking-wider uppercase block ${theme.franchiseLabel}`}>
                            FRANCHISE COST
                          </span>
                          <span className={`text-xl font-bold font-sans tracking-tight block mt-0.5 ${theme.franchisePrice}`}>
                            ₹{p.purchase_price.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/70 text-center">
                          <span className="text-[10px] font-bold tracking-wider uppercase block text-gray-500">
                            RETAIL MRP
                          </span>
                          <span className="text-xl font-bold font-sans tracking-tight text-gray-900 block mt-0.5">
                            ₹{p.sale_price.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="p-5 pt-0 flex items-center gap-2.5">
                    <button
                      onClick={() => setSelectedProductDetails(p)}
                      className="w-24 sm:w-28 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 text-gray-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Info className="w-3.5 h-3.5 text-gray-500" />
                      Details
                    </button>

                    <button
                      onClick={() => handleRequestProduct(p)}
                      className={`flex-1 py-2.5 ${theme.buttonBg} text-white font-black text-xs rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Request Restock</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. MODAL: FULL BROCHURE SPECIFICATIONS & DETAILS               */}
        {/* ============================================================== */}
        {selectedProductDetails && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 p-6 sm:p-8 space-y-6 relative">
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedProductDetails(null)}
                className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Product Header */}
              <div className="space-y-2 pr-8">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-900 rounded-full text-xs font-black uppercase tracking-wider border border-green-200">
                    {selectedProductDetails.category || "Chimertech Innovation"}
                  </span>
                  {selectedProductDetails.tag && (
                    <span className="px-3 py-1 bg-emerald-950 text-white rounded-full text-xs font-black uppercase tracking-wider">
                      {selectedProductDetails.tag}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-950">
                  {selectedProductDetails.name}
                </h2>
                {selectedProductDetails.tagline && (
                  <p className="text-sm text-gray-600 italic">
                    "{selectedProductDetails.tagline}"
                  </p>
                )}
              </div>

              {/* Product Image */}
              {selectedProductDetails.image_url && (
                <div className="h-56 bg-gray-50 rounded-2xl border border-gray-200 p-4 flex items-center justify-center">
                  <img
                    src={selectedProductDetails.image_url}
                    alt={selectedProductDetails.name}
                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                  />
                </div>
              )}

              {/* Key Features */}
              {selectedProductDetails.features && selectedProductDetails.features.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Key Features & Benefits
                  </h3>
                  <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs sm:text-sm text-gray-800">
                    {selectedProductDetails.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center border border-emerald-300 bg-emerald-50 text-emerald-600 flex-shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                        <span className="leading-relaxed">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Specifications */}
              {selectedProductDetails.specs && selectedProductDetails.specs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Technical Specifications
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedProductDetails.specs.map((sp, idx) => (
                      <div key={idx} className="p-2.5 bg-blue-50/50 border border-blue-150 rounded-xl text-blue-950 font-medium">
                        {sp}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing & Commercial Matrix */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase block">Franchise Price</span>
                  <span className="text-lg font-bold text-emerald-950 font-sans tracking-tight block mt-0.5">
                    ₹{selectedProductDetails.purchase_price.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase block">Retail Sale Price</span>
                  <span className="text-lg font-bold text-gray-900 font-sans tracking-tight block mt-0.5">
                    ₹{selectedProductDetails.sale_price.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase block">Profit Margin</span>
                  <span className="text-lg font-extrabold text-emerald-600 font-sans tracking-tight block mt-0.5">
                    +{Math.round(((selectedProductDetails.sale_price - selectedProductDetails.purchase_price) / selectedProductDetails.purchase_price) * 100)}%
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedProductDetails(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const prod = selectedProductDetails;
                    setSelectedProductDetails(null);
                    handleRequestProduct(prod);
                  }}
                  className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Proceed to Restock Application
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
