// Shared style tokens for screen-level layout. Components keep their own
// element styles; this exists so multiple tabs share the same body/card/
// section/section-button look without re-stating it.
import { StyleSheet } from "react-native";

export const tabStyles = StyleSheet.create({
  body: { flex: 1 },
  card: { backgroundColor: "#1e222d", padding: 16, borderRadius: 6 },
  section: { color: "#d1d4dc", fontSize: 16, fontWeight: "600", marginTop: 24, marginBottom: 8 },
  input: {
    backgroundColor: "#1e222d", color: "#d1d4dc", padding: 10, borderRadius: 6,
    marginBottom: 8, fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: "#26a69a", padding: 12, borderRadius: 6, alignItems: "center", marginTop: 6,
  },
  primaryBtnText: { color: "#0b0e14", fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: "#2a2e39", padding: 10, borderRadius: 6, alignItems: "center", marginRight: 6,
  },
  secondaryBtnActive: { backgroundColor: "#26a69a" },
  err: { color: "#ef5350", marginTop: 8 },
  muted: { color: "#888" },
});
