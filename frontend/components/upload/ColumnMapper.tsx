"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";
import type { PreviewResult, SheetInfo } from "@/lib/types";

const REQUIRED_FIELDS = [
  "cardholder", "date", "merchant", "amount", "receipt",
  "compte", "net", "vat", "gross", "details",
];

interface Props {
  preview: PreviewResult;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ColumnMapper({ preview, onConfirm, onCancel }: Props) {
  const { t } = useT();
  const [confirmed, setConfirmed] = useState(false);

  const transactionSheets = preview.files.flatMap((f) =>
    f.sheets
      .filter((s) => s.type !== "compte_mapping" && s.type !== "unknown")
      .map((s) => ({ filename: f.filename, sheet: s }))
  );

  const mappingSheets = preview.files.flatMap((f) =>
    f.sheets.filter((s) => s.type === "compte_mapping").map((s) => ({ filename: f.filename, sheet: s }))
  );

  function bankColor(bank: string) {
    if (bank === "BRED") return "bg-amber-100 text-amber-700";
    if (bank === "HSBC") return "bg-blue-100 text-blue-700";
    return "bg-slate-100 text-slate-600";
  }

  function getConfidence(col: string): "high" | "medium" | "low" {
    const clean = col.toLowerCase().replace(/[^a-z0-9]/g, "");
    const HIGH = ["date", "amount", "gross", "net", "vat", "receipt", "details"];
    const MED = ["merchant", "compte", "type", "cardholder", "card", "name"];
    if (HIGH.some((k) => clean.includes(k))) return "high";
    if (MED.some((k) => clean.includes(k))) return "medium";
    return "low";
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">{t("sheet_structure")}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {t("auto_mapping_note")}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {mappingSheets.length > 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm mb-1">
                <CheckCircle className="h-4 w-4" />
                {t("compte_mapping_found")}
              </div>
              {mappingSheets.map(({ filename, sheet }) => (
                <p key={filename + sheet.name} className="text-xs text-emerald-600">
                  {filename} → {sheet.name} ({sheet.row_count}{t("unit_accounts")})
                </p>
              ))}
            </div>
          )}

          {transactionSheets.map(({ filename, sheet }) => (
            <SheetCard
              key={filename + sheet.name}
              filename={filename}
              sheet={sheet}
              bankColor={bankColor}
              getConfidence={getConfidence}
            />
          ))}
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>{t("cancel")}</Button>
          <Button
            onClick={() => { setConfirmed(true); onConfirm(); }}
            disabled={confirmed}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {confirmed ? t("analyzing") : t("start_analysis")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SheetCard({
  filename, sheet, bankColor, getConfidence,
}: {
  filename: string;
  sheet: SheetInfo;
  bankColor: (b: string) => string;
  getConfidence: (c: string) => "high" | "medium" | "low";
}) {
  const { t } = useT();
  const confBadge = { high: "bg-emerald-100 text-emerald-700", medium: "bg-amber-100 text-amber-700", low: "bg-red-100 text-red-700" };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
        <div>
          <span className="font-medium text-slate-800 text-sm">{filename}</span>
          <span className="text-slate-400 text-sm"> / {sheet.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${bankColor(sheet.bank)}`}>
            {sheet.bank || t("unknown")}
          </span>
          <span className="text-xs text-slate-500">{sheet.row_count.toLocaleString()}{t("unit_items")}</span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-slate-500 mb-2 font-medium">{t("detected_columns")}</p>
        <div className="flex flex-wrap gap-1.5">
          {sheet.columns.map((col, i) => {
            const conf = getConfidence(col);
            return (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${confBadge[conf]}`}
                title={`${t("confidence")}: ${conf}`}
              >
                {col || `${t("column_prefix")} ${i + 1}`}
              </span>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> <span><b className="text-slate-600">{t("core_data")}</b> — {t("core_data_desc")}</span></span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> <span><b className="text-slate-600">{t("reference_data")}</b> — {t("reference_data_desc")}</span></span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> <span><b className="text-slate-600">{t("name_unclear")}</b> — {t("name_unclear_desc")}</span></span>
        </div>
      </div>
    </div>
  );
}
