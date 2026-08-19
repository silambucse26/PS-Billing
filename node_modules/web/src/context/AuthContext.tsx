import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'super_admin' | 'franchise_admin' | 'shopkeeper' | 'staff';
  shop_id: string | null;
  franchise_id: string | null;
  avatar_url?: string | null;
}

interface Shop {
  id: string;
  name: string;
  state: string;
  invoice_prefix: string;
  phone?: string | null;
  gstin?: string | null;
  address?: string | null;
  logo_url?: string | null;
  image_url?: string | null;
}

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  shop: Shop | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const saved = localStorage.getItem("pc_profile");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [shop, setShop] = useState<Shop | null>(() => {
    try {
      const saved = localStorage.getItem("pc_shop");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile();
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile();
      } else {
        setProfile(null);
        setShop(null);
        localStorage.removeItem("pc_profile");
        localStorage.removeItem("pc_shop");
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    const session = await supabase.auth.getSession();
    const currentUser = session.data.session?.user ?? null;
    setUser(currentUser);
    if (currentUser) {
      setLoading(true);
      await fetchProfile();
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/reports/me');
      if (res?.profile) {
        setProfile(res.profile);
        localStorage.setItem("pc_profile", JSON.stringify(res.profile));
      }
      if (res?.shop) {
        setShop(res.shop);
        localStorage.setItem("pc_shop", JSON.stringify(res.shop));
      }
    } catch (e) {
      console.warn('Network issue fetching profile/shop from backend, using cached profile:', e);
      const cachedProf = localStorage.getItem("pc_profile");
      const cachedShop = localStorage.getItem("pc_shop");
      if (cachedProf) setProfile(JSON.parse(cachedProf));
      if (cachedShop) setShop(JSON.parse(cachedShop));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem("pc_profile");
    localStorage.removeItem("pc_shop");
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, shop, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
