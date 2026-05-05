import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "./src/api";

type Screen = "login" | "home";

interface Account { balance: number; locked: number; available: number }

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [token, setToken] = useState<string | null>(null);
  const [base, setBase] = useState(api.base);
  const [email, setEmail] = useState("alice@example.com");
  const [password, setPassword] = useState("correcthorsebattery");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);

  useEffect(() => { api.setBase(base); }, [base]);

  const onLogin = async () => {
    setBusy(true); setErr(null);
    try {
      const t = await api.login(email, password);
      setToken(t.access);
      setScreen("home");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (screen !== "home" || !token) return;
    let cancel = false;
    Promise.all([api.account(token), api.symbols()])
      .then(([a, s]) => {
        if (cancel) return;
        setAccount(a);
        setSymbols(s.map((x) => x.symbol));
      })
      .catch((e) => !cancel && setErr(String(e)));
    return () => { cancel = true; };
  }, [screen, token]);

  if (screen === "login") {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <Text style={styles.title}>Platform</Text>
        <TextInput
          value={base}
          onChangeText={setBase}
          autoCapitalize="none"
          placeholder="API base URL"
          placeholderTextColor="#666"
          style={styles.input}
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="email"
          placeholderTextColor="#666"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="password"
          placeholderTextColor="#666"
          style={styles.input}
        />
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
      <Text style={styles.title}>Account</Text>
      {account ? (
        <View style={styles.card}>
          <Row label="balance" value={fmt(account.balance)} />
          <Row label="locked" value={fmt(account.locked)} />
          <Row label="available" value={fmt(account.available)} />
        </View>
      ) : <ActivityIndicator color="#d1d4dc" />}
      <Text style={styles.section}>Symbols</Text>
      <FlatList
        data={symbols}
        keyExtractor={(s) => s}
        renderItem={({ item }) => <Text style={styles.symbol}>{item}</Text>}
        style={styles.list}
      />
      <Pressable onPress={() => { setToken(null); setScreen("login"); }} style={styles.linkBtn}>
        <Text style={styles.linkText}>log out</Text>
      </Pressable>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0e14", padding: 24, paddingTop: 60 },
  title: { color: "#d1d4dc", fontSize: 28, fontWeight: "700", marginBottom: 24 },
  section: { color: "#d1d4dc", fontSize: 16, fontWeight: "600", marginTop: 24, marginBottom: 8 },
  input: {
    backgroundColor: "#1e222d", color: "#d1d4dc", padding: 12, borderRadius: 6,
    marginBottom: 12, fontSize: 16,
  },
  button: {
    backgroundColor: "#26a69a", padding: 14, borderRadius: 6, alignItems: "center", marginTop: 8,
  },
  buttonText: { color: "#0b0e14", fontWeight: "700", fontSize: 16 },
  err: { color: "#ef5350", marginTop: 12 },
  card: { backgroundColor: "#1e222d", padding: 16, borderRadius: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  rowLabel: { color: "#888" }, rowValue: { color: "#d1d4dc", fontVariant: ["tabular-nums"] },
  symbol: { color: "#d1d4dc", padding: 10, borderBottomWidth: 1, borderBottomColor: "#1e222d" },
  list: { flex: 1 },
  linkBtn: { paddingVertical: 12, alignItems: "center" },
  linkText: { color: "#888", textDecorationLine: "underline" },
});
