import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Billing from "./pages/Billing";
import Dashboard from "./pages/Dashboard";
import AdminShops from "./pages/AdminShops";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Invoices from "./pages/Invoices";
import RestockApply from "./pages/RestockApply";
import AdminRestock from "./pages/AdminRestock";
import Profile from "./pages/Profile";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, logout } = useAuth();
  if (loading) return <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center font-medium">Loading profile...</div>;
  if (!user) return <Navigate to="/login" replace />;
  // Wait until profile record is fetched or loaded
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center font-medium gap-4">
        <div>Setting up workspace...</div>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
        >
          Sign Out / Clear Session
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <Billing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <Invoices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restock"
            element={
              <ProtectedRoute>
                <RestockApply />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/restock"
            element={
              <ProtectedRoute>
                <AdminRestock />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/shops"
            element={
              <ProtectedRoute>
                <AdminShops />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <Customers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
