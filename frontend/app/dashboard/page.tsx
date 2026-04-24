"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAnalysis } from "@/app/context/AnalysisContext";
import { filterTransactions, computeCategories, computeUsers, computeMerchants } from "@/lib/aggregations";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { BankFilter } from "@/components/dashboard/BankFilter";
import { YearFilter } from "@/components/dashboard/YearFilter";
import { TrendChart } from "@/components/charts/TrendChart";
import { CategoryChart } from "@/components/charts/CategoryChart";
import { UserCompareChart } from "@/components/charts/UserCompareChart";
import { MerchantChart } from "@/components/charts/MerchantChart";
import { AnomalyTable } from "@/components/charts/AnomalyTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabNavigation } from "@/components/dashboard/TabNavigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useT } from "@/lib/i18n/context";

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useT();
  const {
    result,
    selectedBank, setSelectedBank,
    selectedYears, setSelectedYears,
    activeTab, setActiveTab,
  } = useAnalysis();

  useEffect(() => {
    if (!result) router.replace("/");
  }, [result, router]);

  // ── filtered transactions (source of truth for all tabs) ─────────────────
  const filtered = useMemo(
    () => result ? filterTransactions(result.transactions, selectedBank, selectedYears) : [],
    [result, selectedBank, selectedYears],
  );

  // ── per-tab aggregations from filtered transactions ───────────────────────
  const filteredCategories = useMemo(() => computeCategories(filtered), [filtered]);
  const filteredUsers      = useMemo(() => computeUsers(filtered),      [filtered]);
  const filteredMerchants  = useMemo(() => computeMerchants(filtered),  [filtered]);

  // Trends: filter raw trend records (already period-level, not transaction-level)
  const filteredTrends = useMemo(() => {
    if (!result) return [];
    const yearSet = new Set(selectedYears);
    return result.trends
      .filter((t) => selectedBank === "all" || t.bank === selectedBank)
      .filter((t) => yearSet.size === 0 || yearSet.has(t.year));
  }, [result, selectedBank, selectedYears]);

  // Anomalies: filter by bank + year
  const filteredAnomalies = useMemo(() => {
    if (!result) return [];
    const yearSet = new Set(selectedYears);
    return result.anomalies
      .filter((a) => selectedBank === "all" || a.bank === selectedBank)
      .filter((a) => yearSet.size === 0 || yearSet.has(new Date(a.date).getFullYear()));
  }, [result, selectedBank, selectedYears]);

  // ── filtered summary stats ────────────────────────────────────────────────
  const filteredSummary = useMemo(() => {
    if (!result) return result;
    if (filtered.length === result.transactions.length) return result.summary;
    const amounts  = filtered.map((t) => t.amount);
    const total    = amounts.reduce((s, a) => s + a, 0);
    const users    = [...new Set(filtered.map((t) => t.cardholder))];
    const banks    = [...new Set(filtered.map((t) => t.bank))];
    const years    = [...new Set(filtered.map((t) => t.year))].sort();
    const dates    = filtered.map((t) => t.date).sort();
    return {
      ...result.summary,
      totalAmount:  total,
      totalCount:   filtered.length,
      uniqueUsers:  users,
      banks,
      years,
      dateRange: { start: dates[0] ?? "", end: dates[dates.length - 1] ?? "" },
    };
  }, [result, filtered]);

  const allYears = useMemo(
    () => result ? [...result.summary.years].sort() : [],
    [result],
  );

  if (!result || !filteredSummary) return null;

  const banks = result.summary.banks;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-indigo-600 tracking-tight">Spendalyze</span>
            <span className="hidden sm:inline text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {allYears.length > 1 ? `${allYears[0]}–${allYears[allYears.length - 1]}` : allYears[0]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <BankFilter value={selectedBank} onChange={setSelectedBank} banks={banks} />
            <LanguageSwitcher />
            <button
              onClick={() => router.push("/")}
              className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-slate-50"
            >
              {t("add_file")}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ── KPI Cards (reflect current filter) ─────────────────────────── */}
        <SummaryCards summary={filteredSummary} />

        {/* ── Year Filter bar ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{t("year_filter")}</span>
            <YearFilter years={allYears} selected={selectedYears} onChange={setSelectedYears} />
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <TabNavigation
          active={activeTab}
          onChange={setActiveTab}
          anomalyCount={filteredAnomalies.length}
        />

        {/* ── Tab content ─────────────────────────────────────────────────── */}
        {activeTab === "trends" && (
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-700">{t("monthly_trend_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart trends={filteredTrends} bankFilter={selectedBank} selectedYears={selectedYears} />
            </CardContent>
          </Card>
        )}

        {activeTab === "categories" && (
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-700">{t("category_breakdown_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryChart categories={filteredCategories} transactions={filtered} />
            </CardContent>
          </Card>
        )}

        {activeTab === "users" && (
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-700">{t("user_compare_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <UserCompareChart users={filteredUsers} transactions={filtered} />
            </CardContent>
          </Card>
        )}

        {activeTab === "merchants" && (
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-700">{t("top_merchants_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <MerchantChart merchants={filteredMerchants} />
            </CardContent>
          </Card>
        )}

        {activeTab === "anomalies" && (
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-700">{t("anomaly_detection_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <AnomalyTable anomalies={filteredAnomalies} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
