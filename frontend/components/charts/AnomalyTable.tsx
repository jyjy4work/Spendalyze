"use client";

import { useT } from "@/lib/i18n/context";
import type { AnomalyData } from "@/lib/types";

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-red-50 text-red-700 ring-red-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-slate-50 text-slate-600 ring-slate-200",
};

const ROW_STYLES: Record<string, string> = {
  high: "bg-red-50/30",
  medium: "bg-amber-50/20",
  low: "",
};

const euFmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

interface Props {
  anomalies: AnomalyData[];
}

export function AnomalyTable({ anomalies }: Props) {
  const { t } = useT();

  const REASON_LABELS: Record<string, string> = {
    high_amount: t("reason_high_amount"),
    no_receipt: t("reason_no_receipt"),
    duplicate: t("reason_duplicate"),
    weekend: t("reason_weekend"),
  };

  if (anomalies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-medium">{t("no_anomaly")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wide">
            <th className="pb-2 pr-3 text-left font-medium">{t("anomaly_severity")}</th>
            <th className="pb-2 pr-3 text-left font-medium">{t("anomaly_type")}</th>
            <th className="pb-2 pr-3 text-left font-medium">{t("col_date")}</th>
            <th className="pb-2 pr-3 text-left font-medium">{t("anomaly_cardholder")}</th>
            <th className="pb-2 pr-3 text-left font-medium">{t("col_merchant")}</th>
            <th className="pb-2 pr-3 text-right font-medium">{t("col_amount")}</th>
            <th className="pb-2 pr-3 text-left font-medium">{t("anomaly_account")}</th>
            <th className="pb-2 pr-3 text-left font-medium">{t("col_bank")}</th>
            <th className="pb-2 text-left font-medium">{t("anomaly_notes")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {anomalies.map((a, i) => (
            <tr key={i} className={`${ROW_STYLES[a.severity] ?? ""} hover:bg-slate-50 transition-colors`}>
              <td className="py-2 pr-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES.low}`}>
                  {a.severity === "high" ? t("severity_high") : a.severity === "medium" ? t("severity_medium") : t("severity_low")}
                </span>
              </td>
              <td className="py-2 pr-3 font-medium text-slate-700">
                {REASON_LABELS[a.reason] ?? a.reason}
              </td>
              <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{a.date}</td>
              <td className="py-2 pr-3 text-slate-700">{a.cardholder}</td>
              <td className="py-2 pr-3 text-slate-700 max-w-[160px] truncate" title={a.merchant}>
                {a.merchant}
              </td>
              <td className="py-2 pr-3 text-right font-medium text-slate-800 whitespace-nowrap">
                {euFmt(a.amount)}
              </td>
              <td className="py-2 pr-3 text-slate-500 max-w-[120px] truncate" title={a.libelle}>
                {a.libelle ?? "—"}
              </td>
              <td className="py-2 pr-3">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${a.bank === "BRED" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"}`}>
                  {a.bank}
                </span>
              </td>
              <td className="py-2 text-slate-400 text-xs max-w-[180px] truncate" title={a.details}>
                {a.details ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-400 mt-3">{t("anomaly_count_prefix")} {anomalies.length}{t("anomaly_count_suffix")}</p>
    </div>
  );
}
