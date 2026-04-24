"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import type { TrendData } from "@/lib/types";

// ── colour palettes ──────────────────────────────────────────────────────────
const BANK_COLORS: Record<string, string> = {
  BRED: "#F59E0B",
  HSBC: "#4F46E5",
};

function yearColor(year: number, allYears: number[]): string {
  const idx = allYears.indexOf(year);
  const hue = Math.round((idx / Math.max(allYears.length - 1, 1)) * 300);
  return `hsl(${hue}, 65%, 48%)`;
}

// ── data builders ────────────────────────────────────────────────────────────
function buildTimelineData(trends: TrendData[], bankFilter: string, selectedYears: number[]) {
  const yearSet = new Set(selectedYears);
  const filtered = trends
    .filter((t) => bankFilter === "all" || t.bank === bankFilter)
    .filter((t) => yearSet.size === 0 || yearSet.has(t.year));

  const periodMap = new Map<string, Record<string, number>>();
  for (const t of filtered) {
    if (!periodMap.has(t.period)) periodMap.set(t.period, {});
    const entry = periodMap.get(t.period)!;
    entry[t.bank] = (entry[t.bank] ?? 0) + t.amount;
  }

  return Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, vals]) => ({ period, ...vals }));
}

const MONTH_LABELS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const MONTH_KEYS   = ["01","02","03","04","05","06","07","08","09","10","11","12"];

function buildYoyData(trends: TrendData[], bankFilter: string, selectedYears: number[]) {
  const yearSet = new Set(selectedYears);
  const filtered = trends
    .filter((t) => bankFilter === "all" || t.bank === bankFilter)
    .filter((t) => yearSet.size === 0 || yearSet.has(t.year));

  const years = [...new Set(filtered.map((t) => t.year))].sort();

  return MONTH_KEYS.map((m, idx) => {
    const row: Record<string, number | string> = { month: MONTH_LABELS[idx] };
    for (const y of years) {
      const total = filtered
        .filter((t) => t.year === y && t.period.slice(-2) === m)
        .reduce((sum, t) => sum + t.amount, 0);
      if (total > 0) row[String(y)] = total;
    }
    return row;
  });
}

function getVisibleBanks(trends: TrendData[], bankFilter: string): string[] {
  const all = [...new Set(trends.map((t) => t.bank))];
  return bankFilter === "all" ? all : all.filter((b) => b === bankFilter);
}

const euFmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

// ── component ────────────────────────────────────────────────────────────────
interface Props {
  trends: TrendData[];
  bankFilter: string;
  selectedYears: number[];
}

type ViewMode = "timeline" | "yoy";

export function TrendChart({ trends, bankFilter, selectedYears }: Props) {
  const [mode, setMode] = useState<ViewMode>("timeline");

  const timelineData = buildTimelineData(trends, bankFilter, selectedYears);
  const yoyData      = buildYoyData(trends, bankFilter, selectedYears);
  const banks        = getVisibleBanks(trends, bankFilter);

  const yearSet = new Set(selectedYears);
  const visibleYears = [...new Set(
    trends
      .filter((t) => bankFilter === "all" || t.bank === bankFilter)
      .filter((t) => yearSet.size === 0 || yearSet.has(t.year))
      .map((t) => t.year)
  )].sort();

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
          <button
            onClick={() => setMode("timeline")}
            className={`px-3 py-1.5 transition-colors ${
              mode === "timeline"
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            타임라인
          </button>
          <button
            onClick={() => setMode("yoy")}
            className={`px-3 py-1.5 transition-colors ${
              mode === "yoy"
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            연도별 비교
          </button>
        </div>
      </div>

      {mode === "timeline" ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(v: number) => euFmt(v)} />
              <Legend />
              {banks.map((bank) => (
                <Line
                  key={bank}
                  type="monotone"
                  dataKey={bank}
                  stroke={BANK_COLORS[bank] ?? "#64748b"}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yoyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(v: number) => euFmt(v)} />
              <Legend />
              {visibleYears.map((y) => (
                <Line
                  key={y}
                  type="monotone"
                  dataKey={String(y)}
                  stroke={yearColor(y, visibleYears)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
