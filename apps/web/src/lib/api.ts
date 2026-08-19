import { supabase } from "./supabaseClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function parseResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
    }
    return data;
  }

  // If text or HTML returned
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  async get(route: string) {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const res = await fetch(`${API_BASE}${route}`, {
      headers: {
        Authorization: `Bearer ${token || ""}`
      }
    });
    return parseResponse(res);
  },

  async post(route: string, body: any) {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const res = await fetch(`${API_BASE}${route}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token || ""}`
      },
      body: JSON.stringify(body)
    });
    return parseResponse(res);
  },

  async put(route: string, body: any) {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const res = await fetch(`${API_BASE}${route}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token || ""}`
      },
      body: JSON.stringify(body)
    });
    return parseResponse(res);
  },

  async delete(route: string) {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const res = await fetch(`${API_BASE}${route}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token || ""}`
      }
    });
    return parseResponse(res);
  }
};
