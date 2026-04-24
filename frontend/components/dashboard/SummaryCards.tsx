"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Summary } from "@/lib/types";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function SummaryCards({ summary }: { summary: Summary }) {
  const { totalAmount, totalCount, uniqueUsers, banks, dateRange, years } = summary;

  const cards = [
    {
      label: "총 지출",
      value: fmt(totalAmount),
      sub: `${years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : years[0]}년`,
    },
    {
      label: "총 건수",
      value: totalCount.toLocaleString() + "건",
      sub: banks.join(" + "),
    },
    {
      label: "카드 사용자",
      value: uniqueUsers.length + "명",
      sub: uniqueUsers.join(", "),
    },
    {
      label: "분석 기간",
      value: dateRange.start.slice(0, 7),
      sub: `~ ${dateRange.end.slice(0, 7)}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="border-slate-200">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500 font-medium mb-1">{c.label}</p>
            <p className="text-xl font-bold text-slate-800 leading-tight">{c.value}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate" title={c.sub}>{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
