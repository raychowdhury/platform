import { useCallback, useEffect, useState } from "react";
import {
  FlatList, Pressable, RefreshControl, StyleSheet, Text, View,
} from "react-native";
import { api, type Notification } from "../api";
import { tabStyles } from "./styles";

export default function NotificationsTab() {
  const [items, setItems] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setItems(await api.notifications()); }
    catch { /* surface elsewhere */ }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={tabStyles.body}>
      <View style={styles.headerRow}>
        <Text style={tabStyles.section}>Notifications</Text>
        <Pressable onPress={async () => { await api.markAllRead(); load(); }}>
          <Text style={tabStyles.muted}>mark all read</Text>
        </Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => String(n.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#d1d4dc" />}
        renderItem={({ item }) => (
          <Pressable
            onPress={async () => {
              if (!item.read_at) { await api.markRead(item.id); load(); }
            }}
            style={[styles.row, !item.read_at && styles.unread]}
          >
            <Text style={styles.title}>{item.title}</Text>
            {item.body && <Text style={tabStyles.muted}>{item.body}</Text>}
          </Pressable>
        )}
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#1e222d" },
  unread: { backgroundColor: "#1e222d22", borderLeftWidth: 3, borderLeftColor: "#26a69a" },
  title: { color: "#d1d4dc", fontWeight: "600" },
});
