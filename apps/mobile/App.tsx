import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "./src/api";
import AccountTab from "./src/screens/AccountTab";
import AlertsTab from "./src/screens/AlertsTab";
import ChartTab from "./src/screens/ChartTab";
import NotificationsTab from "./src/screens/NotificationsTab";
import OrdersTab from "./src/screens/OrdersTab";

type Screen = "boot" | "login" | "home";
type Tab = "account" | "chart" | "orders" | "alerts" | "notif";

const TABS: ReadonlyArray<{ key: Tab; label: string }> = [
  { key: "account", label: "Account" },
  { key: "chart", label: "Chart" },
  { key: "orders", label: "Orders" },
  { key: "alerts", label: "Alerts" },
  { key: "notif", label: "Notif" },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("boot");
  const [tab, setTab] = useState<Tab>("account");
  const [base, setBase] = useState(api.base);
  const [email, setEmail] = useState("alice@example.com");
  const [password, setPassword] = useState("correcthorsebattery");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    (async () => {
      const hydrated = await api.hydrate();
      if (hydrated) {
        try {
          await api.account();
          setBase(api.base);
          setScreen("home");
          return;
        } catch { /* fall through */ }
      }
      setScreen("login");
    })();
  }, []);

  useEffect(() => { api.setBase(base); }, [base]);

  // Poll unread badge while on home — cheap, /unread_count is a single COUNT.
  useEffect(() => {
    if (screen !== "home") return;
    let cancel = false;
    const fetchOnce = () => api.unreadCount().then((n) => { if (!cancel) setUnread(n); }).catch(() => {});
    fetchOnce();
    const t = setInterval(fetchOnce, 10_000);
    return () => { cancel = true; clearInterval(t); };
  }, [screen, tab]);

  const onLogin = async () => {
    setBusy(true); setErr(null);
    try {
      await api.login(email, password);
      setScreen("home");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  if (screen === "boot") {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar style="light" />
        <ActivityIndicator color="#d1d4dc" />
      </View>
    );
  }

  if (screen === "login") {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <Text style={styles.title}>Platform</Text>
        <TextInput value={base} onChangeText={setBase} autoCapitalize="none"
          placeholder="API base URL" placeholderTextColor="#666" style={styles.input} />
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none"
          keyboardType="email-address" placeholder="email"
          placeholderTextColor="#666" style={styles.input} />
        <TextInput value={password} onChangeText={setPassword} secureTextEntry
          placeholder="password" placeholderTextColor="#666" style={styles.input} />
        <Pressable onPress={onLogin} disabled={busy} style={styles.button}>
          {busy ? <ActivityIndicator color="#0b0e14" /> : <Text style={styles.buttonText}>log in</Text>}
        </Pressable>
        {err && <Text style={styles.err}>{err}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.headerRow}>
        <Text style={styles.title}>Platform</Text>
        <Pressable onPress={async () => { await api.logout(); setScreen("login"); }}>
          <Text style={styles.muted}>log out</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>
        {tab === "account" && <AccountTab />}
        {tab === "chart" && <ChartTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "alerts" && <AlertsTab />}
        {tab === "notif" && <NotificationsTab />}
      </View>
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tabItem}>
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
              {t.label}
              {t.key === "notif" && unread > 0 && (
                <Text style={styles.badge}> · {unread}</Text>
              )}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0e14", paddingHorizontal: 16, paddingTop: 60 },
  center: { alignItems: "center", justifyContent: "center" },
  title: { color: "#d1d4dc", fontSize: 24, fontWeight: "700" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  input: {
    backgroundColor: "#1e222d", color: "#d1d4dc", padding: 12, borderRadius: 6,
    marginBottom: 12, fontSize: 16,
  },
  button: {
    backgroundColor: "#26a69a", padding: 14, borderRadius: 6, alignItems: "center", marginTop: 8,
  },
  buttonText: { color: "#0b0e14", fontWeight: "700", fontSize: 16 },
  err: { color: "#ef5350", marginTop: 12 },
  muted: { color: "#888" },
  tabBar: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: "#1e222d",
    paddingVertical: 8, backgroundColor: "#0b0e14",
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 8 },
  tabLabel: { color: "#888", fontWeight: "600" },
  tabLabelActive: { color: "#26a69a" },
  badge: { color: "#ef5350" },
});
