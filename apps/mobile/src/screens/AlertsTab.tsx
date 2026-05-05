import { useCallback, useEffect, useState } from "react";
import {
  FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View,
} from "react-native";
import { api, type Alert as AlertItem } from "../api";
import { tabStyles } from "./styles";

export default function AlertsTab() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [symbol, setSymbol] = useState("BTC-USD");
  const [cond, setCond] = useState<"price_above" | "price_below">("price_above");
  const [threshold, setThreshold] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setAlerts(await api.alerts()); }
    catch (e) { setErr(String(e)); }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    const t = parseFloat(threshold);
    if (!Number.isFinite(t) || t <= 0) { setErr("threshold must be > 0"); return; }
    setBusy(true); setErr(null);
    try {
      await api.createAlert({ symbol, condition: cond, threshold: t });
      setThreshold("");
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <View style={tabStyles.body}>
      <View style={tabStyles.card}>
        <TextInput
          value={symbol} onChangeText={(t) => setSymbol(t.toUpperCase())}
          autoCapitalize="characters" placeholder="symbol"
          placeholderTextColor="#666" style={tabStyles.input}
        />
        <View style={styles.condRow}>
          {(["price_above", "price_below"] as const).map((c) => (
            <Pressable key={c} onPress={() => setCond(c)}
              style={[tabStyles.secondaryBtn, cond === c && tabStyles.secondaryBtnActive, { flex: 1 }]}>
              <Text style={{ color: cond === c ? "#0b0e14" : "#d1d4dc", fontWeight: "600" }}>
                {c === "price_above" ? "≥ above" : "≤ below"}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={threshold} onChangeText={setThreshold}
          keyboardType="decimal-pad" placeholder="threshold"
          placeholderTextColor="#666" style={tabStyles.input}
        />
        <Pressable onPress={create} disabled={busy} style={tabStyles.primaryBtn}>
          <Text style={tabStyles.primaryBtnText}>{busy ? "…" : "create alert"}</Text>
        </Pressable>
        {err && <Text style={tabStyles.err}>{err}</Text>}
      </View>
      <Text style={tabStyles.section}>Alerts</Text>
      <FlatList
        data={alerts}
        keyExtractor={(a) => a.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#d1d4dc" />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.line}>
                {item.symbol}{" "}
                <Text style={tabStyles.muted}>{item.condition === "price_above" ? "≥" : "≤"}</Text>
                {" "}{item.threshold}
              </Text>
              <Text style={tabStyles.muted}>
                {item.status}
                {item.triggered_price ? ` @ ${item.triggered_price}` : ""}
              </Text>
            </View>
            <Pressable onPress={async () => { try { await api.deleteAlert(item.id); load(); } catch {} }}>
              <Text style={styles.del}>×</Text>
            </Pressable>
          </View>
        )}
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  condRow: { flexDirection: "row", marginBottom: 8 },
  row: { flexDirection: "row", padding: 10, borderBottomWidth: 1, borderBottomColor: "#1e222d", alignItems: "center" },
  line: { color: "#d1d4dc", fontVariant: ["tabular-nums"] },
  del: { color: "#ef5350", fontSize: 22, paddingHorizontal: 8 },
});
