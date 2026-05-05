import { create } from "zustand";
import type { TokenPair } from "../api/types";

const STORAGE_KEY = "platform.auth";

interface Persisted {
  access: string;
  refresh: string;
}

function load(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

function save(p: Persisted | null) {
  if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  else localStorage.removeItem(STORAGE_KEY);
}

interface AuthState {
  access: string | null;
  refresh: string | null;
  setTokens: (p: TokenPair) => void;
  clear: () => void;
}

const initial = load();

export const useAuth = create<AuthState>((set) => ({
  access: initial?.access ?? null,
  refresh: initial?.refresh ?? null,
  setTokens: (p) => {
    const next = { access: p.access_token, refresh: p.refresh_token };
    save(next);
    set(next);
  },
  clear: () => {
    save(null);
    set({ access: null, refresh: null });
  },
}));

export function getAuth(): { access: string | null; refresh: string | null } {
  const s = useAuth.getState();
  return { access: s.access, refresh: s.refresh };
}
