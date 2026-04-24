"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PreviewResult, SheetInfo } from "@/lib/types";

const REQUIRED_FIELDS = [
  "cardholder", "date", "merchant", "amount", "receipt",
  "compte", "net", "vat", "gross", "details",
];

const FIELD_LABELS: Record<string, string> = {
  cardholder: "카드 사용자", date: "날짜", merchant: "가맹점",
  amount: "금액", receipt: "영수증", compte: "계정코드",
  net: "순액", vat: "부가세", gross: "총액", details: "상세내역",
};

interface Props {
  preview: PreviewResult;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ColumnMapper({ preview, onConfirm, onCancel }: Props) {
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
          <h2 className="text-lg font-semibold text-slate-800">시트 구조 확인</h2>
          <p className="text-sm text-slate-500 mt-1">
            파일에서 감지된 시트 구조를 확인하세요. 자동 매핑 결과입니다.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {mappingSheets.length > 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm mb-1">
                <CheckCircle className="h-4 w-4" />
                계정코드 매핑 시트 발견
              </div>
              {mappingSheets.map(({ filename, sheet }) => (
                <p key={filename + sheet.name} className="text-xs text-emerald-600">
                  {filename} → {sheet.name} ({sheet.row_count}개 계정 코드)
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
          <Button variant="outline" onClick={onCancel}>취소</Button>
          <Button
            onClick={() => { setConfirmed(true); onConfirm(); }}
            disabled={confirmed}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {confirmed ? "분석 중..." : "분석 시작"}
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
            {sheet.bank || "Unknown"}
          </span>
          <span className="text-xs text-slate-500">{sheet.row_count.toLocaleString()}건</span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-slate-500 mb-2 font-medium">감지된 컬럼</p>
        <div className="flex flex-wrap gap-1.5">
          {sheet.columns.map((col, i) => {
            const conf = getConfidence(col);
            return (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${confBadge[conf]}`}
                title={`신뢰도: ${conf}`}
              >
                {col || `열 ${i + 1}`}
              </span>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> <span><b className="text-slate-600">핵심 데이터</b> — 금액·날짜 등 분석 필수 컬럼</span></span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> <span><b className="text-slate-600">참조 데이터</b> — 가맹점·계정코드 등 분류용 컬럼</span></span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> <span><b className="text-slate-600">이름 불명확</b> — 자동 감지로 처리 (분석에 영향 없음)</span></span>
        </div>
      </div>
    </div>
  );
}
