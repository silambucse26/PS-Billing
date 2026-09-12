import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Registration steps: 1 = Basic Info, 2 = Billing/Tax Details, 3 = Welcome Screen
  const [registerStep, setRegisterStep] = useState(1);

  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [state, setState] = useState("Delhi");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [phone, setPhone] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName || !shopName || !email || !password) {
      setError("Please fill out all required fields to continue.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setRegisterStep(2);
  };

  const handleBackStep = () => {
    setError(null);
    setRegisterStep(1);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: authData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpErr || !authData.user) {
      setError(signUpErr?.message || "Registration failed");
      setLoading(false);
      return;
    }

    try {
      await api.post("/reports/register-shop", {
        userId: authData.user.id,
        shopName,
        fullName,
        state,
        address,
        gstin,
        phone
      });

      // Refresh global authentication state with the newly created profile
      await refreshProfile();

      // Registration successful! Go to step 3 (Welcome Screen)
      setRegisterStep(3);
    } catch (err: any) {
      setError(err.message || "Failed to create shop profiles");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      navigate("/");
    }
  };

  if (isRegistering && registerStep === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 p-4 animate-fade-in">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-200 text-center space-y-6">
          <div className="flex justify-center">
            <img src="/logo.png" alt="Pashu Central" className="h-18 w-auto max-w-[220px] object-contain" />
          </div>
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-green-700 mb-2">Welcome, {fullName}!</h1>
            <p className="text-gray-600 text-sm">
              Your shop <span className="font-semibold text-gray-900">"{shopName}"</span> has been correctly registered in our database.
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-left text-xs space-y-2">
            <div><span className="font-semibold text-gray-700">GSTIN:</span> {gstin || "N/A"}</div>
            <div><span className="font-semibold text-gray-700">State:</span> {state}</div>
            <div><span className="font-semibold text-gray-700">Phone:</span> {phone || "N/A"}</div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3.5 bg-green-600 hover:bg-green-500 active:scale-98 transition-all font-bold text-white rounded-xl shadow-lg hover:shadow-green-100 cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-950 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-200">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Pashu Central" className="h-20 w-auto max-w-[240px] object-contain" />
          </div>
        <p className="text-center text-gray-500 text-sm mb-6">Premium Billing Platform</p>

        {isRegistering ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-green-600">Register Shop</span>
              <span className="text-xs font-semibold text-gray-500">Step {registerStep} of 2</span>
            </div>

            {registerStep === 1 ? (
              <form onSubmit={handleNextStep} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 text-gray-900 placeholder-gray-400"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Shop / Center Name *</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 text-gray-900 placeholder-gray-400"
                    placeholder="Enter shop or center name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 text-gray-900 placeholder-gray-400"
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 pr-11 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 text-gray-900 placeholder-gray-400"
                      placeholder="Min. 6 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                <button
                  type="submit"
                  className="w-full py-3 bg-green-600 hover:bg-green-500 transition-colors font-bold text-white rounded-xl shadow-md hover:shadow-green-100 cursor-pointer"
                >
                  Continue
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 text-gray-900 placeholder-gray-400"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">State (Supply) *</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 text-gray-900 placeholder-gray-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">GSTIN</label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 text-gray-900 placeholder-gray-400"
                      placeholder="GSTIN if available"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 text-gray-900 placeholder-gray-400 h-20"
                    placeholder="Enter shop address details"
                  />
                </div>

                {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={handleBackStep}
                    className="col-span-1 py-3 bg-gray-100 hover:bg-gray-200 transition-colors font-bold text-gray-700 rounded-xl cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="col-span-2 py-3 bg-green-600 hover:bg-green-500 transition-colors font-bold text-white rounded-xl disabled:opacity-50 cursor-pointer shadow-md hover:shadow-green-100"
                  >
                    {loading ? "Registering..." : "Register & Create"}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 text-gray-900 placeholder-gray-400"
                placeholder="name@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 pr-11 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 text-gray-900 placeholder-gray-400"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-500 transition-colors font-bold text-white rounded-xl disabled:opacity-50 cursor-pointer shadow-md hover:shadow-green-100"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center border-t border-gray-100 pt-4">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setRegisterStep(1);
              setError(null);
            }}
            className="text-sm text-green-600 hover:underline font-semibold"
          >
            {isRegistering ? "Already have a shop? Login here" : "Don't have a shop? Register now"}
          </button>
        </div>
      </div>
    </div>
  );
}
