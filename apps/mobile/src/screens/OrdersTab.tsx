import { useCallback, useEffect, useState } from "react";
import {
  FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View,
} from "react-native";
import { api, type Order } from "../api";
import { tabStyles } from "./styles";

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [symbol, setSymbol] = useState("ESM6");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState("1");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setOrders(await api.orders()); }
    catch (e) { setErr(String(e)); }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const place = async () => {
    setBusy(true); setErr(null);
    try {
      await api.placeOrder({ symbol, side, type: "market", qty });
      setQty("0.0001");
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
        <View style={styles.sideRow}>
          {(["buy", "sell"] as const).map((s) => (
            <Pressable key={s} onPress={() => setSide(s)}
              style={[tabStyles.secondaryBtn, side === s && tabStyles.secondaryBtnActive, { flex: 1 }]}>
              <Text style={{ color: side === s ? "#0b0e14" : "#d1d4dc", fontWeight: "600" }}>{s}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={qty} onChangeText={setQty}
          keyboardType="decimal-pad" placeholder="qty"
          placeholderTextColor="#666" style={tabStyles.input}
        />
        <Pressable onPress={place} disabled={busy} style={tabStyles.primaryBtn}>
          <Text style={tabStyles.primaryBtnText}>{busy ? "…" : `place market ${side}`}</Text>
        </Pressable>
        {err && <Text style={tabStyles.err}>{err}</Text>}
      </View>
      <Text style={tabStyles.section}>Recent Orders</Text>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#d1d4dc" />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.line}>
                <Text style={{ color: item.side === "buy" ? "#26a69a" : "#ef5350" }}>{item.side}</Text>
                {" "}{item.qty}{" "}{item.symbol}
              </Text>
              <Text style={tabStyles.muted}>{item.type} · {item.status}{item.avg_fill_price ? ` @ ${item.avg_fill_price.toFixed(2)}` : ""}</Text>
            </View>
            {(item.status === "open" || item.status === "pending") && (
              <Pressable onPress={async () => { try { await api.cancelOrder(item.id); load(); } catch {} }}>
                <Text style={styles.cancelBtn}>×</Text>
              </Pressable>
            )}
          </View>
        )}
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sideRow: { flexDirection: "row", marginBottom: 8 },
  row: { flexDirection: "row", padding: 10, borderBottomWidth: 1, borderBottomColor: "#1e222d", alignItems: "center" },
  line: { color: "#d1d4dc", fontVariant: ["tabular-nums"] },
  cancelBtn: { color: "#ef5350", fontSize: 22, paddingHorizontal: 8 },
});
