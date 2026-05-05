// ChartTab renders an inline lightweight-charts candlestick view inside a
// WebView. The host RN side fetches candles from /v1/market/candles and
// pipes them in via postMessage; the WebView is library-agnostic from the
// app's perspective. Live tick streaming is deferred — refresh button
// re-pulls history.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { WebView } from "react-native-webview";
import { api, type Candle } from "../api";
import { tabStyles } from "./styles";

const TFS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
type TF = typeof TFS[number];

const HTML = `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  html, body, #c { margin: 0; padding: 0; height: 100%; background: #0b0e14; }
</style>
<script src="https://unpkg.com/lightweight-charts@5.2.0/dist/lightweight-charts.standalone.production.js"></script>
</head><body>
<div id="c"></div>
<script>
  const lwc = window.LightweightCharts;
  const chart = lwc.createChart(document.getElementById('c'), {
    layout: { background: { type: 'solid', color: '#0b0e14' }, textColor: '#d1d4dc' },
    grid:   { vertLines: { color: '#1e222d' }, horzLines: { color: '#1e222d' } },
    crosshair: { mode: 1 },
    rightPriceScale: { borderColor: '#1e222d' },
    timeScale: { borderColor: '#1e222d', timeVisible: true, secondsVisible: false },
    autoSize: true,
  });
  const candles = chart.addSeries(lwc.CandlestickSeries, {
    upColor: '#26a69a', downColor: '#ef5350',
    wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    borderVisible: false,
  });
  function apply(bars) {
    candles.setData(bars);
    chart.timeScale().fitContent();
  }
  document.addEventListener('message', (e) => {
    try { apply(JSON.parse(e.data)); } catch {}
  });
  // iOS uses window.addEventListener; Android uses document
  window.addEventListener('message', (e) => {
    try { apply(JSON.parse(e.data)); } catch {}
  });
</script></body></html>`;

export default function ChartTab() {
  const [symbol, setSymbol] = useState("BTC-USD");
  const [tf, setTf] = useState<TF>("1m");
  const [symbols, setSymbols] = useState<string[]>([]);
  const webRef = useRef<WebView | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.symbols().then((s) => setSymbols(s.map((x) => x.symbol))).catch(() => {});
  }, []);

  const push = useCallback((bars: Array<{ time: number; open: number; high: number; low: number; close: number }>) => {
    webRef.current?.postMessage(JSON.stringify(bars));
  }, []);

  const load = useCallback(async () => {
    if (!ready) return;
    try {
      const cs: Candle[] = await api.candles(symbol, tf, 500);
      const bars = cs.map((c) => ({
        time: Math.floor(new Date(c.time).getTime() / 1000),
        open: c.open, high: c.high, low: c.low, close: c.close,
      }));
      push(bars);
    } catch { /* ignore */ }
  }, [ready, symbol, tf, push]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={tabStyles.body}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.symRow}>
        {symbols.slice(0, 12).map((s) => (
          <Pressable key={s} onPress={() => setSymbol(s)}
            style={[styles.chip, symbol === s && styles.chipActive]}>
            <Text style={[styles.chipText, symbol === s && styles.chipTextActive]}>{s}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.tfRow}>
        {TFS.map((t) => (
          <Pressable key={t} onPress={() => setTf(t)}
            style={[styles.chip, tf === t && styles.chipActive]}>
            <Text style={[styles.chipText, tf === t && styles.chipTextActive]}>{t}</Text>
          </Pressable>
        ))}
        <Pressable onPress={load} style={[styles.chip, { marginLeft: "auto" }]}>
          <Text style={styles.chipText}>refresh</Text>
        </Pressable>
      </View>
      <View style={styles.chartHost}>
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html: HTML }}
          onLoadEnd={() => setReady(true)}
          javaScriptEnabled
          domStorageEnabled={false}
          style={{ backgroundColor: "#0b0e14" }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  symRow: { flexGrow: 0, marginBottom: 8 },
  tfRow: { flexDirection: "row", marginBottom: 8 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
    backgroundColor: "#1e222d", marginRight: 6,
  },
  chipActive: { backgroundColor: "#26a69a" },
  chipText: { color: "#d1d4dc", fontWeight: "600" },
  chipTextActive: { color: "#0b0e14" },
  chartHost: { flex: 1, borderRadius: 6, overflow: "hidden", backgroundColor: "#0b0e14" },
});
