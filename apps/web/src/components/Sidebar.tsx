import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Receipt, 
  Package, 
  Users, 
  Settings, 
  LogOut,
  FileText,
  Truck,
  Store,
  Menu,
  X,
  Sparkles
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const location = useLocation();
  const { logout, profile } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Billing POS", path: "/billing", icon: Receipt },
    { name: "Invoices", path: "/invoices", icon: FileText },
    { name: "Products & Stock", path: "/products", icon: Package },
    { name: "Interested Products", path: "/interested-products", icon: Sparkles, badge: "New" },
    { name: "Restock Products", path: "/restock", icon: Truck },
    { name: "Customers", path: "/customers", icon: Users },
    { name: "Profile & Settings", path: "/profile", icon: Settings },
  ];

  if (profile?.role === "super_admin") {
    menuItems.push({ name: "Admin: Restock", path: "/admin/restock", icon: Truck });
    menuItems.push({ name: "Admin: Shops", path: "/admin/shops", icon: Store });
  }

  const currentRouteName = menuItems.find(m => m.path === location.pathname)?.name || "Pashu Central";

  return (
    <>
      {/* ============================================================== */}
      {/* 1. MOBILE & TABLET TOP HEADER BAR (Hidden on lg+ screens)      */}
      {/* ============================================================== */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 px-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-1 text-gray-700 hover:text-green-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Pashu Central"
              className="h-10 w-auto object-contain"
            />
            <span className="text-xs font-bold text-gray-500 hidden sm:inline-block border-l border-gray-200 pl-2">
              {currentRouteName}
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-200 p-0.5 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-md" />
              ) : (
                <Users className="w-4 h-4 text-green-600" />
              )}
            </div>
          </Link>
        </div>
      </header>

      {/* Mobile Header Spacer to prevent content overlapping on mobile */}
      <div className="lg:hidden h-16 w-full flex-shrink-0" />

      {/* ============================================================== */}
      {/* 2. MOBILE & TABLET SLIDE-OVER DRAWER OVERLAY                   */}
      {/* ============================================================== */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-10 animate-slide-in">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <img
                src="/logo.png"
                alt="Pashu Central"
                className="h-12 w-auto object-contain"
              />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-green-600 text-white shadow-sm"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-950"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${
                        isActive ? "bg-white text-green-800" : "bg-emerald-600 text-white"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Bottom Profile & Logout */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-white border border-gray-200 hover:border-green-300 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 p-0.5 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Users className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-sm font-bold text-gray-900 truncate">
                    {profile?.full_name || "User Account"}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{profile?.role?.replace("_", " ") || "Staff"}</div>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowLogoutModal(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. DESKTOP PERMANENT SIDEBAR (Hidden on mobile/tablet)         */}
      {/* ============================================================== */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col justify-between h-screen sticky top-0 flex-shrink-0">
        <div className="p-5">
          {/* Logo Section */}
          <div className="flex items-center justify-center mb-6">
            <img
              src="/logo.png"
              alt="Pashu Central"
              className="h-[130px] w-auto max-w-[220px] object-contain"
            />
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-green-50 text-green-700 border border-green-200 font-bold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-600 text-white shadow-2xs">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-5 border-t border-gray-200">
          <Link
            to="/profile"
            className="flex items-center gap-3 mb-4 p-2 -mx-2 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 p-0.5 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Users className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-sm font-bold text-gray-900 truncate group-hover:text-green-700 transition-colors">
                {profile?.full_name || "User Account"}
              </div>
              <div className="text-xs text-gray-500 capitalize">{profile?.role?.replace("_", " ") || "Staff"}</div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 4. LOGOUT CONFIRMATION MODAL POPUP                            */}
      {/* ============================================================== */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                <LogOut className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-950">Confirm Sign Out</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Are you sure you want to end your current session and sign out of Pashu Central Billing?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutModal(false);
                  await logout();
                }}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-md hover:shadow-red-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
