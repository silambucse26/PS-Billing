import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { 
  User, 
  Store, 
  Camera, 
  Upload, 
  Save, 
  AlertCircle, 
  Mail, 
  Building,
  Image as ImageIcon,
  CheckCircle2,
  Type,
  Check,
  Printer,
  Bluetooth,
  Power,
  RefreshCw,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import { useBluetoothPrinter } from "../context/BluetoothPrinterContext";
import { isIOS } from "../utils/bluetoothPrinter";

export default function Profile() {
  const { user, profile, shop, refreshProfile } = useAuth();

  // User Profile Form State
  const [fullName, setFullName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [userLoading, setUserLoading] = useState(false);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);

  // Shop Profile Form State
  const [shopName, setShopName] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopState, setShopState] = useState("");
  const [shopGstin, setShopGstin] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopLogo, setShopLogo] = useState("");
  const [shopLoading, setShopLoading] = useState(false);
  const [shopSuccess, setShopSuccess] = useState<string | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"user" | "shop" | "appearance" | "printer">("user");
  const {
    isConnected: isBtConnected,
    isConnecting: isBtConnecting,
    isPrinting: isBtPrinting,
    printerName,
    isSupported: isBtSupported,
    autoPrint,
    setAutoPrint,
    connect: connectBt,
    disconnect: disconnectBt,
    printTestReceipt
  } = useBluetoothPrinter();
  const [testResult, setTestResult] = useState<string | null>(null);

  const [fontSize, setFontSize] = useState<string>(() => {
    return localStorage.getItem("pc_font_size") || "medium";
  });
  const [fontStyle, setFontStyle] = useState<string>(() => {
    return localStorage.getItem("pc_font_style") || "inter";
  });

  const fontStylesList = [
    {
      id: "inter",
      name: "Inter",
      badge: "Clean Modern (Default)",
      family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      desc: "Ultra-crisp, neutral, highly legible modern dashboard style.",
      sampleHeading: "Super Admin Central Dashboard"
    },
    {
      id: "roboto",
      name: "Roboto",
      badge: "Neutral Corporate",
      family: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      desc: "Crisp, reliable, and widely familiar corporate sans-serif.",
      sampleHeading: "Super Admin Central Dashboard"
    },
    {
      id: "outfit",
      name: "Outfit",
      badge: "Friendly Rounded",
      family: "'Outfit', sans-serif",
      desc: "Soft curved geometric aesthetic with modern warmth.",
      sampleHeading: "Super Admin Central Dashboard"
    },
    {
      id: "opensans",
      name: "Open Sans",
      badge: "Humanist Legible",
      family: "'Open Sans', sans-serif",
      desc: "Classic open forms optimized for effortless reading.",
      sampleHeading: "Super Admin Central Dashboard"
    },
    {
      id: "jakarta",
      name: "Plus Jakarta Sans",
      badge: "Bold Display",
      family: "'Plus Jakarta Sans', sans-serif",
      desc: "Punchy, contemporary geometric display typography.",
      sampleHeading: "Super Admin Central Dashboard"
    },
    {
      id: "system",
      name: "System UI",
      badge: "Native OS",
      family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      desc: "Fast, native operating system system font.",
      sampleHeading: "Super Admin Central Dashboard"
    }
  ];

  const handleFontStyleChange = (styleId: string) => {
    setFontStyle(styleId);
    localStorage.setItem("pc_font_style", styleId);
    const chosen = fontStylesList.find(f => f.id === styleId);
    if (chosen) {
      document.documentElement.style.setProperty('--app-font-family', chosen.family);
      document.documentElement.style.fontFamily = chosen.family;
    }
  };

  const handleFontSizeChange = (size: "small" | "medium" | "large" | "xlarge") => {
    setFontSize(size);
    localStorage.setItem("pc_font_size", size);
    const fontSizesMap: Record<string, string> = {
      small: "14px",
      medium: "16px",
      large: "18px",
      xlarge: "20px",
    };
    document.documentElement.style.fontSize = fontSizesMap[size] || "16px";
  };

  const userFileRef = useRef<HTMLInputElement>(null);
  const shopFileRef = useRef<HTMLInputElement>(null);

  // Default avatars list
  const avatarPresets = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80"
  ];

  // Initialize values
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setUserPhone(profile.phone || "");
      setUserAvatar(profile.avatar_url || "");
    }
    if (shop) {
      setShopName(shop.name || "");
      setShopPhone(shop.phone || "");
      setShopState(shop.state || "");
      setShopGstin(shop.gstin || "");
      setShopAddress(shop.address || "");
      setShopLogo(shop.logo_url || shop.image_url || "");
    }
  }, [profile, shop]);

  // Handle local user avatar file upload
  const handleUserAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image size exceeds 2MB limit. Please select a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setUserAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle local shop logo file upload
  const handleShopLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Logo image size exceeds 3MB limit. Please choose a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setShopLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save User Profile
  const handleSaveUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserLoading(true);
    setUserSuccess(null);
    setUserError(null);

    try {
      await api.put("/reports/profile", {
        full_name: fullName.trim(),
        phone: userPhone.trim(),
        avatar_url: userAvatar
      });

      await refreshProfile();
      setUserSuccess("User profile and avatar updated successfully!");
      setTimeout(() => setUserSuccess(null), 4000);
    } catch (err: any) {
      setUserError(err.message || "Failed to update profile details");
    } finally {
      setUserLoading(false);
    }
  };

  // Save Shop Details & Logo
  const handleSaveShopProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setShopLoading(true);
    setShopSuccess(null);
    setShopError(null);

    try {
      await api.put("/reports/update-shop", {
        shopId: shop?.id,
        name: shopName.trim(),
        phone: shopPhone.trim(),
        state: shopState.trim(),
        gstin: shopGstin.trim(),
        address: shopAddress.trim(),
        logo_url: shopLogo,
        image_url: shopLogo
      });

      await refreshProfile();
      setShopSuccess("Shop profile and branding logo updated successfully!");
      setTimeout(() => setShopSuccess(null), 4000);
    } catch (err: any) {
      setShopError(err.message || "Failed to update shop details");
    } finally {
      setShopLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen text-gray-900 animate-fade-in">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <User className="w-8 h-8 text-green-600" />
            Profile & Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Customize your user profile avatar, account information, and shop branding logo.
          </p>
        </div>

        {/* Top User & Shop Banner Card */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs mb-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              {/* User Avatar Display */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-green-50 border-2 border-green-200 p-1 flex items-center justify-center overflow-hidden shadow-sm">
                  {userAvatar ? (
                    <img src={userAvatar} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <User className="w-10 h-10 text-green-600" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("user");
                    userFileRef.current?.click();
                  }}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center shadow-md cursor-pointer transition-all"
                  title="Change User Avatar Photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2.5">
                  <h2 className="text-2xl font-black text-gray-900">{profile?.full_name || "User Account"}</h2>
                  <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded-full uppercase tracking-wider">
                    {profile?.role?.replace("_", " ") || "Staff"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {user?.email || "No email"}
                </p>
                <p className="text-xs text-gray-500 flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                  <Building className="w-3.5 h-3.5 text-gray-400" />
                  {shop?.name || "PashuCentral Franchise"}
                </p>
              </div>
            </div>

            {/* Shop Quick Banner Info */}
            {shop && (
              <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 p-4 rounded-2xl w-full md:w-auto">
                <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {shopLogo ? (
                    <img src={shopLogo} alt="Shop Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Store className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Shop / Center</span>
                  <span className="text-sm font-bold text-gray-900 block">{shop.name}</span>
                  <span className="text-xs text-gray-500 font-mono">{shop.gstin || shop.state || "Active Store"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("user")}
            className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === "user"
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <User className="w-4 h-4" />
            User Profile & Image Setup
          </button>
          <button
            onClick={() => setActiveTab("shop")}
            className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === "shop"
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Store className="w-4 h-4" />
            Shop Branding & Image Setup
          </button>
          <button
            onClick={() => setActiveTab("appearance")}
            className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === "appearance"
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Type className="w-4 h-4" />
            Website Font Size & Display
          </button>
          <button
            onClick={() => setActiveTab("printer")}
            className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === "printer"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>SC588 Bluetooth Printer</span>
            {isBtConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* --- TAB 1: USER PROFILE & AVATAR SETUP --- */}
        {activeTab === "user" && (
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">User Profile & Avatar Photo</h3>
              <p className="text-xs text-gray-500">Upload a custom user image or pick a preset avatar photo.</p>
            </div>

            {userSuccess && (
              <div className="p-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="font-semibold">{userSuccess}</span>
              </div>
            )}

            {userError && (
              <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span>{userError}</span>
              </div>
            )}

            {/* User Avatar Setup Widget */}
            <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                1. User Avatar Image Setup
              </span>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-gray-300 p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {userAvatar ? (
                    <img src={userAvatar} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  )}
                </div>

                <div className="space-y-2.5 text-center sm:text-left flex-1">
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <input
                      type="file"
                      ref={userFileRef}
                      onChange={handleUserAvatarFile}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => userFileRef.current?.click()}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload Photo from Computer
                    </button>

                    {userAvatar && (
                      <button
                        type="button"
                        onClick={() => setUserAvatar("")}
                        className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Remove Avatar
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">Supports PNG, JPG, JPEG under 2MB.</p>
                </div>
              </div>

              {/* Preset Avatars Selection */}
              <div>
                <span className="text-[11px] font-bold text-gray-500 mb-2 block">Or choose a preset avatar:</span>
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {avatarPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setUserAvatar(preset)}
                      className={`w-12 h-12 rounded-xl border-2 overflow-hidden transition-all flex-shrink-0 cursor-pointer ${
                        userAvatar === preset
                          ? "border-green-600 ring-2 ring-green-600/30 scale-105"
                          : "border-gray-200 hover:border-gray-400 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Direct URL Input */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Or paste image URL:</label>
                <input
                  type="url"
                  placeholder="https://example.com/my-photo.jpg"
                  value={userAvatar}
                  onChange={(e) => setUserAvatar(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-green-600"
                />
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSaveUserProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="text"
                    value={user?.email || ""}
                    disabled
                    className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Role / Permissions</label>
                  <input
                    type="text"
                    value={profile?.role?.toUpperCase() || "STAFF"}
                    disabled
                    className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 cursor-not-allowed uppercase font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={userLoading}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {userLoading ? "Saving..." : "Save User Profile"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- TAB 2: SHOP DETAILS & IMAGE SETUP --- */}
        {activeTab === "shop" && (
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Shop Branding & Storefront Logo</h3>
              <p className="text-xs text-gray-500">Configure your center details, invoice headers, and store logo.</p>
            </div>

            {shopSuccess && (
              <div className="p-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="font-semibold">{shopSuccess}</span>
              </div>
            )}

            {shopError && (
              <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span>{shopError}</span>
              </div>
            )}

            {/* Shop Logo Setup Widget */}
            <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                1. Shop Logo & Storefront Image Setup
              </span>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-28 h-28 rounded-2xl bg-white border-2 border-dashed border-gray-300 p-2 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {shopLogo ? (
                    <img src={shopLogo} alt="Shop Preview" className="w-full h-full object-contain" />
                  ) : (
                    <Store className="w-10 h-10 text-gray-300" />
                  )}
                </div>

                <div className="space-y-2.5 text-center sm:text-left flex-1">
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <input
                      type="file"
                      ref={shopFileRef}
                      onChange={handleShopLogoFile}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => shopFileRef.current?.click()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload Store Logo / Photo
                    </button>

                    {shopLogo && (
                      <button
                        type="button"
                        onClick={() => setShopLogo("")}
                        className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    This logo appears on your bills, printable invoices, and enterprise reports.
                  </p>
                </div>
              </div>

              {/* Shop Logo Direct URL Input */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Or paste Shop Logo URL:</label>
                <input
                  type="url"
                  placeholder="https://example.com/shop-logo.png"
                  value={shopLogo}
                  onChange={(e) => setShopLogo(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Shop Fields */}
            <form onSubmit={handleSaveShopProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Shop / Center Name *</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Center Phone Number</label>
                  <input
                    type="tel"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">State / Supply Region</label>
                  <input
                    type="text"
                    value={shopState}
                    onChange={(e) => setShopState(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">GSTIN Identifier</label>
                  <input
                    type="text"
                    value={shopGstin}
                    onChange={(e) => setShopGstin(e.target.value)}
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 focus:outline-none focus:border-green-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Physical Store Address</label>
                <textarea
                  rows={2}
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  placeholder="Plot / Street, City, Pincode"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-600"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={shopLoading}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {shopLoading ? "Saving..." : "Save Shop Details"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- TAB 3: DASHBOARD FONT STYLE, SIZE & DISPLAY SETTINGS --- */}
        {activeTab === "appearance" && (
          <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-8 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-5">
              <div>
                <h3 className="text-xl font-black text-gray-950 flex items-center gap-2.5">
                  <Type className="w-6 h-6 text-green-600" />
                  Dashboard Font Style & Display Controls
                </h3>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  Customize the typeface (font family) and scale used across your dashboard, billing POS, and reports.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleFontStyleChange("inter");
                    handleFontSizeChange("medium");
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  Reset to Recommended (Inter, Medium)
                </button>
              </div>
            </div>

            {/* SECTION 1: DASHBOARD FONT STYLE (TYPEFACE) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-extrabold text-gray-900">1. Select Dashboard Font Style</h4>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Choose the font aesthetic that best matches your reading preference.
                  </p>
                </div>
                <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">
                  Active: {fontStylesList.find(f => f.id === fontStyle)?.name || "Inter"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {fontStylesList.map((f) => {
                  const isSelected = fontStyle === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() => handleFontStyleChange(f.id)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between group ${
                        isSelected
                          ? "border-green-600 bg-green-50/40 shadow-sm ring-2 ring-green-100"
                          : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-2 py-0.5 text-[11px] font-extrabold rounded-md uppercase tracking-wider ${
                            isSelected ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
                          }`}>
                            {f.badge}
                          </span>
                          {isSelected && (
                            <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        {/* Title rendered in its actual font */}
                        <h5 
                          className="text-lg font-black text-gray-950 tracking-tight"
                          style={{ fontFamily: f.family }}
                        >
                          {f.name}
                        </h5>
                        <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">
                          {f.desc}
                        </p>
                      </div>

                      {/* Live text specimen */}
                      <div 
                        className="mt-4 pt-3 border-t border-gray-100 text-sm font-bold text-gray-800"
                        style={{ fontFamily: f.family }}
                      >
                        Super Admin Central Dashboard
                        <div className="text-xs text-gray-500 font-normal mt-0.5">
                          ₹9,31,680.00 • 1,876 items in stock
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: FONT SIZE CONTROLS */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-extrabold text-gray-900">2. Select Global Font Size</h4>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Scale all text across dashboard tables, metrics cards, and invoice displays.
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                  Active: {fontSize.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Small */}
                <div
                  onClick={() => handleFontSizeChange("small")}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    fontSize === "small"
                      ? "border-green-600 bg-green-50/50 shadow-sm ring-2 ring-green-100"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Compact</span>
                      {fontSize === "small" && (
                        <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <h5 className="text-base font-bold text-gray-950">Small (14px)</h5>
                    <p className="text-xs text-gray-500 mt-1">High density. Fits more items, table rows and charts on screen.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600">
                    Aa Bb 123 (87.5% Scale)
                  </div>
                </div>

                {/* 2. Medium (Default) */}
                <div
                  onClick={() => handleFontSizeChange("medium")}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    fontSize === "medium"
                      ? "border-green-600 bg-green-50/50 shadow-sm ring-2 ring-green-100"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[11px] font-extrabold rounded-md uppercase tracking-wider">
                        Default Standard
                      </span>
                      {fontSize === "medium" && (
                        <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <h5 className="text-lg font-black text-gray-950">Medium (16px)</h5>
                    <p className="text-xs text-gray-500 mt-1">Balanced modern sizing designed for high readability.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 text-sm text-gray-700 font-medium">
                    Aa Bb 123 (100% Scale)
                  </div>
                </div>

                {/* 3. Large */}
                <div
                  onClick={() => handleFontSizeChange("large")}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    fontSize === "large"
                      ? "border-green-600 bg-green-50/50 shadow-sm ring-2 ring-green-100"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Enhanced</span>
                      {fontSize === "large" && (
                        <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <h5 className="text-xl font-black text-gray-950">Large (18px)</h5>
                    <p className="text-xs text-gray-500 mt-1">Easier reading from a distance on POS counters and tablet displays.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 text-base text-gray-800 font-semibold">
                    Aa Bb 123 (112.5% Scale)
                  </div>
                </div>

                {/* 4. Extra Large */}
                <div
                  onClick={() => handleFontSizeChange("xlarge")}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    fontSize === "xlarge"
                      ? "border-green-600 bg-green-50/50 shadow-sm ring-2 ring-green-100"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Maximum</span>
                      {fontSize === "xlarge" && (
                        <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <h5 className="text-2xl font-black text-gray-950">Extra Large (20px)</h5>
                    <p className="text-xs text-gray-500 mt-1">Maximum readability with ultra-clear large text for high visibility.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 text-lg text-gray-900 font-black">
                    Aa Bb 123 (125% Scale)
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: LIVE DASHBOARD PREVIEW SIMULATOR */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Live Dashboard Visual Preview
                </span>
                <span className="text-xs font-bold text-green-800 bg-green-100 px-3 py-1 rounded-full">
                  Font: {fontStylesList.find(f => f.id === fontStyle)?.name} • Size: {fontSize.toUpperCase()}
                </span>
              </div>

              {/* Exact Mock of the Dashboard Header and Cards from the User's Screenshot */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
                {/* Shop Banner Mock */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl sm:text-2xl font-black text-gray-950">
                        {shop?.name || "Pashucentral of theni"}
                      </span>
                      <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> VERIFIED STORE
                      </span>
                    </div>
                    <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-1">
                      Central Admin
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                    ● POS & Store Active
                  </span>
                </div>

                {/* Dashboard Title Mock */}
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                    Super Admin Central Dashboard
                  </h3>
                  <p className="text-sm text-gray-500 font-medium mt-0.5">
                    Real-time network intelligence, franchise revenue, and inventory valuation across all registered shops.
                  </p>
                </div>

                {/* KPI Cards Mock */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                      Period Revenue
                    </span>
                    <div className="text-2xl font-black text-gray-950 mt-1">₹0.00</div>
                    <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded mt-2 inline-block">
                      ₹0 AOV • 0 Invoices
                    </span>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                      Profit Margin
                    </span>
                    <div className="text-2xl font-black text-emerald-600 mt-1">₹0.00</div>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded mt-2 inline-block">
                      0.0% Margin Rate
                    </span>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                      Invoices Generated
                    </span>
                    <div className="text-2xl font-black text-purple-700 mt-1">0</div>
                    <span className="text-xs text-gray-500 font-medium block mt-2">
                      Collected: ₹0
                    </span>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                      Live Stock Worth
                    </span>
                    <div className="text-2xl font-black text-blue-700 mt-1">₹9,31,680.00</div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded mt-2 inline-block">
                      1,876 items in stock
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 4: SC588 BLUETOOTH THERMAL PRINTER SETUP --- */}
        {activeTab === "printer" && (
          <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
                <Printer className="w-6 h-6 text-blue-600" />
                SC588 Bluetooth Portable Thermal Printer Setup
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Wirelessly print customer tax receipts directly on your 58mm mobile thermal printer from POS Billing and Invoices.
              </p>
            </div>

            {/* Connection Status Box */}
            <div className={`p-6 rounded-2xl border transition-all ${
              isBtConnected ? "bg-emerald-50/80 border-emerald-300" : "bg-gray-50 border-gray-200"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    isBtConnected ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "bg-gray-200 text-gray-500"
                  }`}>
                    <Bluetooth className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Hardware Status</div>
                    <div className="text-lg font-black text-gray-900 flex items-center gap-2">
                      {isBtConnected ? (
                        <>
                          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Connected: <strong className="text-emerald-800">{printerName || "SC588"}</strong></span>
                        </>
                      ) : (
                        <>
                          <span className="w-3 h-3 rounded-full bg-gray-400" />
                          <span>Not Connected</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {isBtConnected ? "Printer is online and ready to print sales slips." : "Connect your portable Bluetooth printer to enable instant wireless printing."}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isBtConnected ? (
                    <button
                      type="button"
                      onClick={disconnectBt}
                      className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Power className="w-4 h-4" />
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        setTestResult(null);
                        const ok = await connectBt();
                        if (ok) {
                          setTestResult("SC588 Connected successfully! ✓");
                          setTimeout(() => setTestResult(null), 3000);
                        }
                      }}
                      disabled={isBtConnecting}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-blue-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isBtConnecting ? "animate-spin" : ""}`} />
                      <span>{isBtConnecting ? "Pairing..." : "Pair & Connect SC588"}</span>
                    </button>
                  )}
                </div>
              </div>

              {testResult && (
                <div className="mt-4 p-3 bg-emerald-100/80 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold text-center animate-fade-in">
                  {testResult}
                </div>
              )}
            </div>

            {/* Actions & Test Print */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Verification & Diagnostic
                </div>
                <p className="text-xs text-gray-600">
                  Press the button below to print a 58mm test slip with Pashu Central branding to verify thermal feed and ink head alignment.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    setTestResult("Printing 58mm test receipt on SC588...");
                    const res = await printTestReceipt();
                    if (res.success) {
                      setTestResult("Test receipt printed successfully! ✓");
                    } else {
                      setTestResult(`Test failed: ${res.error || "Check printer connection"}`);
                    }
                    setTimeout(() => setTestResult(null), 4000);
                  }}
                  disabled={isBtPrinting || isBtConnecting}
                  className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Printer className={`w-4 h-4 ${isBtPrinting ? "animate-bounce" : ""}`} />
                  <span>{isBtPrinting ? "Printing to SC588..." : "Print Test Receipt (58mm)"}</span>
                </button>
              </div>

              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Automation Preference
                </div>
                <label className="flex items-start justify-between gap-4 cursor-pointer">
                  <div>
                    <div className="text-sm font-bold text-gray-800">Auto-Print on Invoice Creation</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Whenever you click "Generate Invoice" in POS Billing, automatically transmit the bill to your SC588 printer without needing extra clicks.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPrint}
                    onChange={(e) => setAutoPrint(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 cursor-pointer accent-blue-600 mt-1"
                  />
                </label>
              </div>
            </div>

            {/* Quick Setup Guide */}
            <div className="border-t border-gray-200 pt-5 space-y-3">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Easy SC588 Mobile Printer Pairing Guide
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-white border border-gray-200 rounded-xl space-y-1 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[11px]">1</div>
                  <div className="font-bold text-gray-900">Power On Printer</div>
                  <div className="text-gray-500 text-[11px]">Turn on your SC588 thermal printer and make sure the paper roll is inserted correctly.</div>
                </div>
                <div className="p-3.5 bg-white border border-gray-200 rounded-xl space-y-1 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[11px]">2</div>
                  <div className="font-bold text-gray-900">Turn On Bluetooth</div>
                  <div className="text-gray-500 text-[11px]">Ensure Bluetooth is switched on in your computer or mobile device settings.</div>
                </div>
                <div className="p-3.5 bg-white border border-gray-200 rounded-xl space-y-1 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[11px]">3</div>
                  <div className="font-bold text-gray-900">Pair in Browser</div>
                  <div className="text-gray-500 text-[11px]">Click "Pair & Connect SC588", pick your printer from the list, and start printing receipts!</div>
                </div>
              </div>
              {!isBtSupported && (
                isIOS() ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-950 text-xs space-y-2">
                    <div className="font-bold text-blue-900 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded-md text-[10px] uppercase tracking-wider font-extrabold">iOS / iPhone Notice</span>
                      Why Bluetooth is unavailable in Safari:
                    </div>
                    <p className="text-blue-800 text-[11px] leading-relaxed">
                      Apple Safari does not support the Web Bluetooth API. On iPhone and iPad, you can connect directly to your SC588 printer using the free <strong>Bluefy</strong> browser.
                    </p>
                    <a
                      href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-blue-200 hover:border-blue-400 text-blue-700 font-bold transition-all shadow-2xs group"
                    >
                      <span>📲 Open / Install <strong>Bluefy (Free Web BLE Browser)</strong></span>
                      <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold">
                    ⚠️ Note: Web Bluetooth is not supported in this browser. Please open Pashu Central in Google Chrome, Microsoft Edge, or Samsung Internet to pair with your SC588 printer.
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
