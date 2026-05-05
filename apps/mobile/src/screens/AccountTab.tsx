import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { tabStyles } from "./styles";

interface Account { balance: number; locked: number; available: number }

export default function AccountTab() {
  const [account, setAccount] = useState<Account | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const [a, s] = await Promise.all([api.account(), api.symbols()]);
      setAccount(a);
      setSymbols(s.map((x) => x.symbol));
    } catch { /* surface elsewhere */ }
    finally { setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <View style={tabStyles.body}>
      {account ? (
        <View style={tabStyles.card}>
          <Row label="balance" value={fmt(account.balance)} />
          <Row label="locked" value={fmt(account.locked)} />
          <Row label="available" value={fmt(account.available)} />
        </View>
      ) : <ActivityIndicator color="#d1d4dc" />}
      <Text style={tabStyles.section}>Symbols</Text>
      <FlatList
        data={symbols}
        keyExtractor={(s) => s}
        renderItem={({ item }) => <Text style={styles.symbol}>{item}</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#d1d4dc" />}
        style={{ flex: 1 }}
      />
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
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  rowLabel: { color: "#888" }, rowValue: { color: "#d1d4dc", fontVariant: ["tabular-nums"] },
  symbol: { color: "#d1d4dc", padding: 10, borderBottomWidth: 1, borderBottomColor: "#1e222d" },
});
