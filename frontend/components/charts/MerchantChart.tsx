"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { MerchantData } from "@/lib/types";

const euFmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

interface Props {
  merchants: MerchantData[];
}

export function MerchantChart({ merchants }: Props) {
  const top20 = merchants.slice(0, 20);

  return (
    <div className="h-[480px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top20} layout="vertical" margin={{ left: 10, right: 40, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="merchant"
            width={130}
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickLine={false}
          />
          <Tooltip
            formatter={(v: number, name: string) =>
              name === "totalAmount" ? [euFmt(v), "총액"] : [v, "건수"]
            }
          />
          <Bar dataKey="totalAmount" radius={[0, 4, 4, 0]} name="totalAmount">
            {top20.map((_, i) => (
              <Cell
                key={i}
                fill={`hsl(${230 + i * 4}, ${70 - i}%, ${50 + i}%)`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
