"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BankFilter = "all" | "BRED" | "HSBC";

interface Props {
  value: BankFilter;
  onChange: (v: BankFilter) => void;
  banks: string[];
}

export function BankFilter({ value, onChange, banks }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as BankFilter)}>
      <SelectTrigger className="w-40 h-9 text-sm">
        <SelectValue placeholder="은행 선택" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체 은행</SelectItem>
        {banks.includes("BRED") && <SelectItem value="BRED">BRED (2013–2016)</SelectItem>}
        {banks.includes("HSBC") && <SelectItem value="HSBC">HSBC (2019–2026)</SelectItem>}
      </SelectContent>
    </Select>
  );
}
