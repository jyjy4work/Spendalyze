"use client";

import { useState, useMemo, useRef } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useT } from "@/lib/i18n/context";
import type { CategoryData, Transaction } from "@/lib/types";

const COLORS = [
  "#4F46E5","#10B981","#F59E0B","#EF4444","#8B5CF6",
  "#06B6D4","#F97316","#84CC16","#EC4899","#64748B",
];

const euFmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

const dateFmt = (d: string) => d?.slice(0, 10) ?? "";

function norm(s: string): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

interface Props {
  categories: CategoryData[];
  transactions: Transaction[];
}

export function CategoryChart({ categories, transactions }: Props) {
  const { t } = useT();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  // Tx table filters
  const [txSearch, setTxSearch] = useState("");
  const [txBank, setTxBank] = useState<"all" | "BRED" | "HSBC">("all");
  const [txSort, setTxSort] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  const detailRef = useRef<HTMLDivElement>(null);

  const top10 = useMemo(() => categories.slice(0, 10), [categories]);

  // Mirrors computeCategories in aggregations.ts — prefer libellé, fallback to compte.
  function txLabel(t: Transaction): string {
    return norm(t.libelle && t.libelle !== "기타" ? t.libelle : (t.compte || "기타"));
  }

  const selectedCategory = useMemo(
    () => selectedCat ? categories.find((c) => c.libelle === selectedCat) ?? null : null,
    [categories, selectedCat],
  );
  const selectedColor = useMemo(() => {
    if (!selectedCat) return "#4F46E5";
    const idx = top10.findIndex((c) => c.libelle === selectedCat);
    return idx >= 0 ? COLORS[idx % COLORS.length] : "#4F46E5";
  }, [selectedCat, top10]);

  const catTxns = useMemo(() => {
    if (!selectedCat) return [];
    return transactions.filter((t) => txLabel(t) === selectedCat);
  }, [transactions, selectedCat]);

  const visibleTxns = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    let list = catTxns;
    if (q) {
      list = list.filter((t) =>
        (t.merchant ?? "").toLowerCase().includes(q) ||
        (t.cardholder ?? "").toLowerCase().includes(q) ||
        String(t.amount).includes(q) ||
        (t.date ?? "").includes(q)
      );
    }
    if (txBank !== "all") list = list.filter((t) => t.bank === txBank);
    const sorted = [...list];
    switch (txSort) {
      case "date-asc": sorted.sort((a, b) => a.date.localeCompare(b.date)); break;
      case "amount-desc": sorted.sort((a, b) => b.amount - a.amount); break;
      case "amount-asc": sorted.sort((a, b) => a.amount - b.amount); break;
      default: sorted.sort((a, b) => b.date.localeCompare(a.date));
    }
    return sorted;
  }, [catTxns, txSearch, txBank, txSort]);

  const visibleTotal = useMemo(() => visibleTxns.reduce((s, t) => s + t.amount, 0), [visibleTxns]);
  const hasFilter = txSearch.trim() !== "" || txBank !== "all";

  function pickCategory(label: string | undefined | null) {
    if (!label) return;
    setSelectedCat((prev) => (prev === label ? null : label));
    setTxSearch(""); setTxBank("all");
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  // Robust extractor — Recharts passes different shapes for Pie vs Bar vs Cell clicks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractLabel(arg: any): string | undefined {
    if (!arg) return undefined;
    return arg.libelle
      ?? arg.payload?.libelle
      ?? arg.name
      ?? arg?.activePayload?.[0]?.payload?.libelle;
  }

  return (
    <div className="space-y-5">
      {/* ── Charts ───────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie Chart + legend buttons as reliable click target */}
        <div>
          <p className="text-sm font-medium text-slate-600 mb-3 text-center">{t("ratio_tip")}</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={top10}
                  dataKey="amount"
                  nameKey="libelle"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  onMouseEnter={(_, i) => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(d: any) => pickCategory(extractLabel(d))}
                  style={{ cursor: "pointer" }}
                  isAnimationActive={false}
                >
                  {top10.map((c, i) => (
                    <Cell
                      key={c.libelle}
                      fill={COLORS[i % COLORS.length]}
                      opacity={
                        selectedCat
                          ? selectedCat === c.libelle ? 1 : 0.3
                          : activeIndex === null || activeIndex === i ? 1 : 0.4
                      }
                      stroke={selectedCat === c.libelle ? "#1e1b4b" : "none"}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => euFmt(v)}
                  labelFormatter={(_, payload) => payload?.[0]?.name ?? ""}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend buttons — always clickable (HTML buttons, not SVG) */}
          <div className="flex flex-wrap gap-1.5 justify-center mt-2">
            {top10.map((c, i) => (
              <button
                key={c.libelle}
                onClick={() => pickCategory(c.libelle)}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                  selectedCat === c.libelle
                    ? "text-white border-transparent shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600"
                }`}
                style={
                  selectedCat === c.libelle
                    ? { background: COLORS[i % COLORS.length], borderColor: COLORS[i % COLORS.length] }
                    : {}
                }
                title={`${c.libelle}: ${euFmt(c.amount)} (${c.percentage.toFixed(1)}%)`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="truncate max-w-[80px]">{c.libelle}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bar Chart with HTML button row for reliable clicks */}
        <div>
          <p className="text-sm font-medium text-slate-600 mb-3 text-center">{t("amount_tip")}</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top10}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(d: any) => pickCategory(extractLabel(d))}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="libelle"
                  width={90}
                  interval={0}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                />
                <Tooltip formatter={(v: number) => euFmt(v)} />
                <Bar
                  dataKey="amount"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(d: any) => pickCategory(extractLabel(d))}
                >
                  {top10.map((c, i) => (
                    <Cell
                      key={c.libelle}
                      fill={COLORS[i % COLORS.length]}
                      opacity={selectedCat && selectedCat !== c.libelle ? 0.3 : 1}
                      stroke={selectedCat === c.libelle ? "#1e1b4b" : "none"}
                      strokeWidth={1.5}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Detail panel ─────────────────────────────────────────── */}
      {selectedCategory && (
        <div ref={detailRef} className="border border-slate-200 rounded-xl overflow-hidden scroll-mt-4">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100" style={{ background: `${selectedColor}12` }}>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: selectedColor }} />
              <span className="font-semibold text-slate-800">{selectedCategory.libelle}</span>
              {selectedCategory.compte && (
                <span className="text-xs text-slate-400 font-mono">#{selectedCategory.compte}</span>
              )}
            </div>
            <div className="flex gap-6 text-sm">
              <span className="text-slate-500">
                {t("total_spend")} <b className="text-slate-800">{euFmt(visibleTotal)}</b>
                {hasFilter && <span className="text-xs text-slate-400 ml-1">/ {euFmt(selectedCategory.amount)}</span>}
              </span>
              <span className="text-slate-500">
                {t("count")} <b className="text-slate-800">{visibleTxns.length.toLocaleString()}{t("unit_items")}</b>
                {hasFilter && <span className="text-xs text-slate-400 ml-1">/ {selectedCategory.count.toLocaleString()}</span>}
              </span>
              <span className="text-slate-500">{t("share")} <b className="text-slate-800">{selectedCategory.percentage.toFixed(1)}%</b></span>
            </div>
            <button
              onClick={() => setSelectedCat(null)}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              aria-label={t("close")}
            >
              ✕
            </button>
          </div>

          {/* Filter/Search row */}
          <div className="px-5 py-2.5 flex items-center gap-2 flex-wrap bg-white border-b border-slate-100">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder={t("search_placeholder_cat")}
                className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
              />
              {txSearch && (
                <button
                  onClick={() => setTxSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm leading-none"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 mr-1">{t("bank")}</span>
              {(["all", "BRED", "HSBC"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setTxBank(b)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    txBank === b
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {b === "all" ? t("all") : b}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[10px] text-slate-400 mr-1">{t("sort")}</span>
              <select
                value={txSort}
                onChange={(e) => setTxSort(e.target.value as typeof txSort)}
                className="text-xs px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-600 focus:outline-none focus:border-indigo-400"
              >
                <option value="date-desc">{t("sort_date_desc")}</option>
                <option value="date-asc">{t("sort_date_asc")}</option>
                <option value="amount-desc">{t("sort_amount_desc")}</option>
                <option value="amount-asc">{t("sort_amount_asc")}</option>
              </select>
            </div>

            {hasFilter && (
              <button
                onClick={() => { setTxSearch(""); setTxBank("all"); }}
                className="text-xs text-slate-400 hover:text-slate-700 underline"
              >
                {t("reset_filter")}
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            {visibleTxns.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {catTxns.length === 0 ? t("no_tx_in_cat") : t("no_search_result")}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                  <tr className="text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-2 text-left font-medium">{t("col_date")}</th>
                    <th className="px-4 py-2 text-left font-medium">{t("col_user")}</th>
                    <th className="px-4 py-2 text-left font-medium">{t("col_merchant")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("col_amount")}</th>
                    <th className="px-4 py-2 text-left font-medium">{t("col_bank")}</th>
                    <th className="px-4 py-2 text-center font-medium">{t("col_receipt")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visibleTxns.map((t, i) => (
                    <tr key={`${t.date}-${t.merchant}-${t.amount}-${i}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{dateFmt(t.date)}</td>
                      <td className="px-4 py-2 text-slate-700 whitespace-nowrap">{t.cardholder}</td>
                      <td className="px-4 py-2 text-slate-700 max-w-[200px] truncate" title={t.merchant}>{t.merchant}</td>
                      <td className={`px-4 py-2 text-right font-medium tabular-nums whitespace-nowrap ${t.amount < 0 ? "text-red-500" : "text-slate-800"}`}>
                        {euFmt(t.amount)}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${t.bank === "BRED" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"}`}>
                          {t.bank}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {t.receipt
                          ? <span className="text-emerald-500">✓</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
