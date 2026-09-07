import { createClient } from "@supabase/supabase-js";

const rawUrl = (process.env.REACT_APP_SUPABASE_URL || "").trim();
const rawKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || "").trim();

const isValidUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const cleanUrl = rawUrl.replace(/\/functions\/v1\/?$/, "").replace(/\/$/, "");

export const isSupabaseConfigured = Boolean(
  cleanUrl &&
  rawKey &&
  isValidUrl(cleanUrl) &&
  !cleanUrl.includes("your_supabase_project_url")
);

const supabaseUrl = isSupabaseConfigured
  ? cleanUrl
  : "https://placeholder.supabase.co";
const supabaseAnonKey = isSupabaseConfigured ? rawKey : "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.sessionStorage,
    autoRefreshToken: isSupabaseConfigured,
    persistSession: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured,
  },
});

const rawFunctionsUrl = (process.env.REACT_APP_SUPABASE_FUNCTIONS_URL || "").trim();
export const supabaseFunctionsUrl = rawFunctionsUrl
  ? rawFunctionsUrl.replace(/\/$/, "")
  : `${supabaseUrl}/functions/v1`;


