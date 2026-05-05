// Token persistence: expo-secure-store on iOS/Android (Keychain/Keystore),
// localStorage on web. SecureStore.getItem returns null on web for keys it
// doesn't manage; the polyfill below makes the same calls work everywhere
// for dev. Production web should rely on cookies/SSO instead.
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY_ACCESS = "auth.access";
const KEY_REFRESH = "auth.refresh";
const KEY_BASE = "api.base";

async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === "web") {
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export interface StoredAuth {
  access: string;
  refresh: string;
  base: string;
}

export async function loadAuth(): Promise<StoredAuth | null> {
  const [a, r, b] = await Promise.all([
    getItem(KEY_ACCESS), getItem(KEY_REFRESH), getItem(KEY_BASE),
  ]);
  if (!a || !r) return null;
  return { access: a, refresh: r, base: b ?? "" };
}

export async function saveAuth(a: StoredAuth) {
  await Promise.all([
    setItem(KEY_ACCESS, a.access),
    setItem(KEY_REFRESH, a.refresh),
    setItem(KEY_BASE, a.base),
  ]);
}

export async function clearAuth() {
  await Promise.all([
    deleteItem(KEY_ACCESS), deleteItem(KEY_REFRESH),
  ]);
}
