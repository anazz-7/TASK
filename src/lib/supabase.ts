import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://uxkimcabvvgbrdpkvond.supabase.co';
const DEFAULT_SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_g3dzrIJkPdEPu4Aw7LxsnA_hpQIo5Qw';

export interface SupabaseConfig {
  url: string;
  key: string;
}

export function getConfig(): SupabaseConfig | null {
  try {
    const stored = JSON.parse(localStorage.getItem('br_config') || 'null');
    if (stored && stored.url && stored.key) return stored;
  } catch (e) {
    // fallback
  }
  if (DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_KEY) {
    return { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_KEY };
  }
  return null;
}

export function saveConfig(url: string, key: string): void {
  localStorage.setItem('br_config', JSON.stringify({ url, key }));
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  const cfg = getConfig();
  if (!cfg || !cfg.url || !cfg.key) return null;
  supabaseInstance = createClient(cfg.url, cfg.key, {
    auth: { persistSession: false }
  });
  return supabaseInstance;
}

export function resetSupabase(url: string, key: string): SupabaseClient {
  saveConfig(url, key);
  supabaseInstance = createClient(url, key, {
    auth: { persistSession: false }
  });
  return supabaseInstance;
}
