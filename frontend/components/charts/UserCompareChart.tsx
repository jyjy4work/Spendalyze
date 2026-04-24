"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell,
} from "recharts";
import { useState, useMemo, useRef, useEffect } from "react";
import { useT } from "@/lib/i18n/context";
import type { UserData, Transaction } from "@/lib/types";

const USER_COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

const euFmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

const dateFmt = (d: string) => d?.slice(0, 10) ?? "";

function yearBreakdown(u: UserData): { year: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const { month, amount } of u.monthlyAmounts) {
    const y = month.slice(0, 4);
    map.set(y, (map.get(y) ?? 0) + amount);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([year, amount]) => ({ year, amount }));
}

function getUserColor(users: UserData[], name: string): string {
  const idx = users.findIndex((u) => u.cardholder === name);
  return idx >= 0 ? USER_COLORS[idx % USER_COLORS.length] : "#4F46E5";
}

/** Simple tooltip — total only (year detail lives in chip row below) */
function UserTooltip({ active, payload, users, t }: {
  active?: boolean;
  payload?: { payload: { name: string } }[];
  users: UserData[];
  t: (k: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const u = users.find((x) => x.cardholder === payload[0].payload.name);
  if (!u) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-md p-2.5 min-w-[180px]">
      <p className="font-semibold text-slate-800 text-sm mb-1">{u.cardholder}</p>
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{t("total_spend")}</span>
        <span className="font-bold text-indigo-600">{euFmt(u.totalAmount)}</span>
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span className="text-slate-400">{t("count")}</span>
        <span className="font-medium text-slate-700">{u.totalCount.toLocaleString()}{t("unit_items")}</span>
      </div>
      <p className="text-[10px] text-indigo-500 mt-2 pt-2 border-t border-slate-100">{t("click_for_year_detail")}</p>
    </div>
  );
}

interface Props {
  users: UserData[];
  transactions: Transaction[];
}

export function UserCompareChart({ users, transactions }: Props) {
  const { t, yearLabel } = useT();
  // Auto-select the first (highest-spending) user on mount so the chip row is always visible
  const [selectedUser, setSelectedUser] = useState<string | null>(users[0]?.cardholder ?? null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  // Transaction table filters
  const [txSearch, setTxSearch] = useState("");
  const [txBank, setTxBank] = useState<"all" | "BRED" | "HSBC">("all");
  const [txReceipt, setTxReceipt] = useState<"all" | "yes" | "no">("all");
  const [txSort, setTxSort] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  const detailRef = useRef<HTMLDivElement>(null);
  const txTableRef = useRef<HTMLDivElement>(null);

  // Re-sync when users list changes (e.g. filter change in parent)
  useEffect(() => {
    if (!selectedUser || !users.find((u) => u.cardholder === selectedUser)) {
      setSelectedUser(users[0]?.cardholder ?? null);
      setSelectedYear(null);
    }
  }, [users, selectedUser]);

  const totalData = useMemo(
    () => users.map((u, i) => ({
      name: u.cardholder,
      amount: u.totalAmount,
      count: u.totalCount,
      colorIdx: i,
    })),
    [users],
  );

  const userData = useMemo(
    () => selectedUser ? users.find((u) => u.cardholder === selectedUser) ?? null : null,
    [users, selectedUser],
  );
  const userColor = useMemo(
    () => selectedUser ? getUserColor(users, selectedUser) : "#4F46E5",
    [users, selectedUser],
  );
  const years = useMemo(() => (userData ? yearBreakdown(userData) : []), [userData]);

  const monthlyData = useMemo(() => {
    if (!userData) return [];
    if (!selectedYear) return userData.monthlyAmounts;
    return userData.monthlyAmounts.filter((m) => m.month.startsWith(selectedYear));
  }, [userData, selectedYear]);

  const drillTxns = useMemo(() => {
    if (!selectedUser) return [];
    return transactions
      .filter((t) => t.cardholder === selectedUser)
      .filter((t) => !selectedYear || String(t.year) === selectedYear)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedUser, selectedYear]);

  // Apply search + bank + receipt filters + sort on top of drillTxns
  const visibleTxns = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    let list = drillTxns;
    if (q) {
      list = list.filter((t) =>
        (t.merchant ?? "").toLowerCase().includes(q) ||
        (t.libelle ?? "").toLowerCase().includes(q) ||
        String(t.amount).includes(q) ||
        (t.date ?? "").includes(q)
      );
    }
    if (txBank !== "all") list = list.filter((t) => t.bank === txBank);
    if (txReceipt !== "all") list = list.filter((t) => (txReceipt === "yes" ? t.receipt : !t.receipt));
    const sorted = [...list];
    switch (txSort) {
      case "date-asc": sorted.sort((a, b) => a.date.localeCompare(b.date)); break;
      case "amount-desc": sorted.sort((a, b) => b.amount - a.amount); break;
      case "amount-asc": sorted.sort((a, b) => a.amount - b.amount); break;
      default: sorted.sort((a, b) => b.date.localeCompare(a.date));
    }
    return sorted;
  }, [drillTxns, txSearch, txBank, txReceipt, txSort]);

  const visibleTotal = useMemo(() => visibleTxns.reduce((s, t) => s + t.amount, 0), [visibleTxns]);
  const hasFilter = txSearch.trim() !== "" || txBank !== "all" || txReceipt !== "all";

  // Top-5 merchants scoped to current user + year filter
  const topMerchants = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of drillTxns) {
      const key = t.merchant.replace(/\s+/g, " ").trim();
      map.set(key, (map.get(key) ?? 0) + t.amount);
    }
    return [...map.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([merchant, amount]) => ({ merchant, amount }));
  }, [drillTxns]);

  // Scoped totals for the header (changes with year filter)
  const scopedTotals = useMemo(() => {
    const total = drillTxns.reduce((s, t) => s + t.amount, 0);
    const count = drillTxns.length;
    return { total, count, avg: count > 0 ? total / count : 0 };
  }, [drillTxns]);

  function selectUserByName(name: string | undefined) {
    if (!name) return;
    setSelectedUser(name);
    setSelectedYear(null);
  }

  function handleBarClick(data: { activePayload?: { payload: { name: string } }[] }) {
    selectUserByName(data?.activePayload?.[0]?.payload?.name);
  }

  function handleYearChipClick(year: string) {
    const isToggle = selectedYear === year;
    setSelectedYear(isToggle ? null : year);
    setTimeout(() => {
      txTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  return (
    <div className="space-y-4">
      {/* ── Summary bar chart ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate-600">{t("user_total_spend")}</p>
          <p className="text-xs text-slate-400">{t("click_bar_select_user")}</p>
        </div>
        <div className="h-52" style={{ overflow: "visible" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={totalData}
              onClick={handleBarClick}
              style={{ cursor: "pointer" }}
              margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} tickLine={false} />
              <Tooltip
                content={<UserTooltip users={users} t={t} />}
                cursor={{ fill: "#f8fafc" }}
                wrapperStyle={{ overflow: "visible", zIndex: 50 }}
              />
              <Bar
                dataKey="amount"
                radius={[4, 4, 0, 0]}
                onClick={(data: { name?: string }) => selectUserByName(data?.name)}
              >
                {totalData.map((d) => (
                  <Cell
                    key={d.name}
                    fill={USER_COLORS[d.colorIdx % USER_COLORS.length]}
                    opacity={selectedUser && selectedUser !== d.name ? 0.35 : 1}
                    stroke={selectedUser === d.name ? "#1e1b4b" : "none"}
                    strokeWidth={2}
                    onClick={() => selectUserByName(d.name)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Year chip row — ALWAYS VISIBLE when a user is selected ────── */}
      {userData && years.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-3 h-3 rounded-full" style={{ background: userColor }} />
            <span className="text-sm font-semibold text-slate-700">{userData.cardholder}</span>
          </div>
          <span className="text-xs text-slate-400 shrink-0">{t("year_select_tip")}</span>
          <button
            onClick={() => {
              setSelectedYear(null);
              setTimeout(() => txTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
            }}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${
              !selectedYear
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600"
            }`}
          >
            {t("all")}
          </button>
          {years.map(({ year, amount }) => (
            <button
              key={year}
              onClick={() => handleYearChipClick(year)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                selectedYear === year
                  ? "text-white border-transparent shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600"
              }`}
              style={
                selectedYear === year
                  ? { background: userColor, borderColor: userColor }
                  : {}
              }
              title={`${yearLabel(year)}: ${euFmt(amount)}`}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {/* ── Detail panel ──────────────────────────────────────────────── */}
      {userData && (
        <div ref={detailRef} className="border border-slate-200 rounded-xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100" style={{ background: `${userColor}12` }}>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: userColor }} />
              <span className="font-semibold text-slate-800">{userData.cardholder}</span>
              {selectedYear && (
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: userColor }}>
                  {yearLabel(selectedYear)}
                </span>
              )}
            </div>
            <div className="flex gap-6 text-sm">
              <span className="text-slate-500">{t("total_spend")} <b className="text-slate-800">{euFmt(scopedTotals.total)}</b></span>
              <span className="text-slate-500">{t("count")} <b className="text-slate-800">{scopedTotals.count.toLocaleString()}{t("unit_items")}</b></span>
              <span className="text-slate-500">{t("average")} <b className="text-slate-800">{euFmt(scopedTotals.avg)}</b></span>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* ① Year breakdown — clickable bars */}
            <div className="p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">{t("year_breakdown")}</p>
              <p className="text-[10px] text-slate-400 mb-2">{t("click_bar_for_year")}</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={years}
                    layout="vertical"
                    margin={{ left: 0, right: 30 }}
                    onClick={(d) => {
                      const y = d?.activePayload?.[0]?.payload?.year as string | undefined;
                      if (!y) return;
                      handleYearChipClick(y);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <XAxis type="number" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} tickLine={false} />
                    <YAxis type="category" dataKey="year" width={36} tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} />
                    <Tooltip formatter={(v: number) => euFmt(v)} />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {years.map(({ year }) => (
                        <Cell
                          key={year}
                          fill={userColor}
                          opacity={selectedYear && selectedYear !== year ? 0.3 : 1}
                          stroke={selectedYear === year ? "#1e1b4b" : "none"}
                          strokeWidth={1.5}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ② Monthly trend */}
            <div className="p-4">
              <p className="text-xs font-medium text-slate-500 mb-3">
                {t("monthly_progression")} {selectedYear ? <span className="text-indigo-500">({selectedYear})</span> : ""}
              </p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} tickLine={false} />
                    <Tooltip formatter={(v: number) => euFmt(v)} />
                    <Line type="monotone" dataKey="amount" stroke={userColor} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ③ Top merchants — scoped to year filter */}
            <div className="p-4">
              <p className="text-xs font-medium text-slate-500 mb-3">
                {t("top_merchants_5")} {selectedYear ? <span className="text-indigo-500">({selectedYear})</span> : ""}
              </p>
              <div className="space-y-2">
                {topMerchants.length === 0 ? (
                  <p className="text-xs text-slate-400">{t("no_data")}</p>
                ) : (
                  topMerchants.map((m, i) => {
                    const pct = scopedTotals.total > 0 ? (m.amount / scopedTotals.total) * 100 : 0;
                    return (
                      <div key={m.merchant}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-slate-600 truncate max-w-[120px]" title={m.merchant}>{i + 1}. {m.merchant}</span>
                          <span className="font-medium text-slate-800 shrink-0 ml-2">{euFmt(m.amount)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: userColor }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Transaction table ──────────────────────────────────────── */}
          <div ref={txTableRef} className="border-t border-slate-100 scroll-mt-4">
            {/* Title bar */}
            <div className="px-5 py-3 flex items-center justify-between bg-slate-50 flex-wrap gap-2">
              <p className="text-sm font-medium text-slate-700">
                {t("tx_history")}
                {selectedYear
                  ? <span className="ml-2 text-xs text-indigo-600 font-semibold">{yearLabel(selectedYear)}</span>
                  : <span className="ml-2 text-xs text-slate-400">{t("whole_period")}</span>}
                <span className="ml-2 text-xs text-slate-400">
                  ({visibleTxns.length.toLocaleString()}
                  {hasFilter ? ` / ${drillTxns.length.toLocaleString()}` : ""}{t("unit_items")})
                </span>
                <span className="ml-3 text-xs text-slate-500">
                  {t("sum")} <b className="text-slate-800 tabular-nums">{euFmt(visibleTotal)}</b>
                </span>
              </p>
              {selectedYear && (
                <button onClick={() => setSelectedYear(null)} className="text-xs text-slate-400 hover:text-slate-600 underline">
                  {t("view_whole_period")}
                </button>
              )}
            </div>

            {/* Filter/Search row */}
            <div className="px-5 py-2.5 flex items-center gap-2 flex-wrap border-t border-slate-100 bg-white">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder={t("search_placeholder_user")}
                  className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                />
                {txSearch && (
                  <button
                    onClick={() => setTxSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm leading-none"
                    aria-label={t("clear_search")}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Bank filter */}
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

              {/* Receipt filter */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 mr-1">{t("col_receipt")}</span>
                {(["all", "yes", "no"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTxReceipt(r)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                      txReceipt === r
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {r === "all" ? t("all") : r === "yes" ? t("receipt_yes") : t("receipt_no")}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[10px] text-slate-400 mr-1">{t("sort")}</span>
                <select
                  value={txSort}
                  onChange={(e) => setTxSort(e.target.value as typeof txSort)}
                  className="text-xs px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-600 focus:outline-none focus:border-indigo-400"
                >
                  <option value="date-desc">{t("sort_date_desc_latest")}</option>
                  <option value="date-asc">{t("sort_date_asc_oldest")}</option>
                  <option value="amount-desc">{t("sort_amount_desc_big")}</option>
                  <option value="amount-asc">{t("sort_amount_asc_small")}</option>
                </select>
              </div>

              {/* Reset */}
              {hasFilter && (
                <button
                  onClick={() => { setTxSearch(""); setTxBank("all"); setTxReceipt("all"); }}
                  className="text-xs text-slate-400 hover:text-slate-700 underline ml-1"
                >
                  {t("reset_filter")}
                </button>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto border-t border-slate-100">
              {visibleTxns.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {drillTxns.length === 0 ? t("no_tx_for_period") : t("no_search_result")}
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                    <tr className="text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-2 text-left font-medium">{t("col_date")}</th>
                      <th className="px-4 py-2 text-left font-medium">{t("col_merchant")}</th>
                      <th className="px-4 py-2 text-right font-medium">{t("col_amount")}</th>
                      <th className="px-4 py-2 text-left font-medium">{t("col_category")}</th>
                      <th className="px-4 py-2 text-left font-medium">{t("col_bank")}</th>
                      <th className="px-4 py-2 text-center font-medium">{t("col_receipt")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {visibleTxns.map((t, i) => (
                      <tr key={`${t.date}-${t.merchant}-${t.amount}-${i}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{dateFmt(t.date)}</td>
                        <td className="px-4 py-2 text-slate-700 max-w-[160px] truncate" title={t.merchant}>{t.merchant}</td>
                        <td className={`px-4 py-2 text-right font-medium tabular-nums whitespace-nowrap ${t.amount < 0 ? "text-red-500" : "text-slate-800"}`}>
                          {euFmt(t.amount)}
                        </td>
                        <td className="px-4 py-2 text-slate-500 max-w-[120px] truncate" title={t.libelle}>{t.libelle || "—"}</td>
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

        </div>
      )}
    </div>
  );
}
