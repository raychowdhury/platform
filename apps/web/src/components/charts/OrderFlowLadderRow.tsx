"use client";
import { memo } from "react";
import type { OrderFlowLadderRow as Row } from "@/types/orderFlow";

interface Props {
  row: Row;
  cobMax: number;
  svpMax: number;
  deltaMax: number;
  cqcMax: number;
  aboveMid: boolean;
  belowMid: boolean;
}

// Renders a single ladder row. Bars sit behind values; values stay readable
// because text has `relative z-10` over an absolute-positioned bar layer.
function OrderFlowLadderRowImpl({
  row,
  cobMax,
  svpMax,
  deltaMax,
  cqcMax,
  aboveMid,
  belowMid,
}: Props) {
  const isCur = !!row.isCurrentPrice;
  const priceCls = isCur
    ? "text-foreground font-semibold"
    : aboveMid
      ? "text-bear/80"
      : belowMid
        ? "text-bull/80"
        : "text-foreground";

  const rowBg = isCur
    ? "bg-accent/10 ring-1 ring-inset ring-accent/40"
    : aboveMid
      ? "bg-bear/[0.03]"
      : belowMid
        ? "bg-bull/[0.03]"
        : "";

  const cobPct   = row.cob   != null && cobMax   > 0 ? (row.cob   / cobMax)   * 100 : 0;
  const svpPct   = row.svp   != null && svpMax   > 0 ? (row.svp   / svpMax)   * 100 : 0;
  const cqcPct   = row.cqc   != null && cqcMax   > 0 ? (row.cqc   / cqcMax)   * 100 : 0;
  const deltaPct = row.delta != null && deltaMax > 0 ? (Math.abs(row.delta) / deltaMax) * 100 : 0;

  const buyShare = row.totalVolume && row.buyVolume != null && row.totalVolume > 0
    ? row.buyVolume / row.totalVolume
    : 0.5;

  return (
    <div
      className={`relative grid items-center text-[12px] font-mono border-b border-white/[0.02] ${rowBg}`}
      style={{ gridTemplateColumns: "76px 1fr 1fr 1fr 1fr", height: 22 }}
    >
      {/* LAST marker tab on current row */}
      {isCur && (
        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" aria-hidden />
      )}

      {/* Price */}
      <span className={`tabular-nums px-2 ${priceCls}`}>
        {row.price.toFixed(2)}
        {isCur && <span className="ml-1 text-[9px] uppercase tracking-wider text-accent">last</span>}
      </span>

      {/* COB — L1 size only on mbp-1 plan; bar from center */}
      <Cell value={row.cob} formatted={fmtInt(row.cob)} muted="text-muted-foreground">
        {row.cob != null && row.cob > 0 && (
          <span
            className={belowMid || isCur ? "absolute inset-y-0 right-1/2 bg-bull/55" : "absolute inset-y-0 left-1/2 bg-bear/55"}
            style={{ width: `${cobPct / 2}%` }}
            aria-hidden
          />
        )}
      </Cell>

      {/* SVP — buy/sell split bar */}
      <Cell value={row.svp} formatted={fmtInt(row.svp)} muted="">
        {row.svp != null && row.svp > 0 && (
          <>
            <span
              className="absolute inset-y-0 left-0 bg-bull/35"
              style={{ width: `${svpPct * buyShare}%` }}
              aria-hidden
            />
            <span
              className="absolute inset-y-0 bg-bear/35"
              style={{ left: `${svpPct * buyShare}%`, width: `${svpPct * (1 - buyShare)}%` }}
              aria-hidden
            />
          </>
        )}
      </Cell>

      {/* Delta — bipolar bar around centerline */}
      <Cell
        value={row.delta}
        formatted={row.delta != null && row.delta !== 0 ? `${row.delta > 0 ? "+" : ""}${Math.round(row.delta)}` : row.delta == null ? "--" : ""}
        muted=""
        valueCls={row.delta == null ? "text-muted-foreground" : row.delta > 0 ? "text-bull" : row.delta < 0 ? "text-bear" : "text-muted-foreground"}
      >
        {row.delta != null && row.delta !== 0 && (
          <span
            className={row.delta > 0 ? "absolute inset-y-0 left-1/2 bg-bull/40" : "absolute inset-y-0 right-1/2 bg-bear/40"}
            style={{ width: `${deltaPct / 2}%` }}
            aria-hidden
          />
        )}
      </Cell>

      {/* CQC */}
      <Cell value={row.cqc} formatted={fmtInt(row.cqc)} muted="text-muted-foreground">
        {row.cqc != null && row.cqc > 0 && (
          <span
            className="absolute inset-y-0 right-0 bg-accent/20"
            style={{ width: `${cqcPct}%` }}
            aria-hidden
          />
        )}
      </Cell>
    </div>
  );
}

function Cell({
  value,
  formatted,
  muted,
  valueCls,
  children,
}: {
  value: number | null | undefined;
  formatted: string;
  muted: string;
  valueCls?: string;
  children?: React.ReactNode;
}) {
  const empty = value == null;
  return (
    <span className="relative h-full flex items-center justify-end px-2 overflow-hidden">
      {children}
      <span className={`relative z-10 tabular-nums ${empty ? "text-muted-foreground/60" : valueCls ?? muted ?? ""}`}>
        {empty ? "--" : formatted}
      </span>
    </span>
  );
}

function fmtInt(v: number | null | undefined): string {
  if (v == null) return "--";
  if (v === 0) return "";
  return Math.round(v).toLocaleString();
}

export default memo(OrderFlowLadderRowImpl);
