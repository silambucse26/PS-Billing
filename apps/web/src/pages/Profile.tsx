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
  CheckCircle2
} from "lucide-react";

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

  const [activeTab, setActiveTab] = useState<"user" | "shop">("user");

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
      </main>
    </div>
  );
}
