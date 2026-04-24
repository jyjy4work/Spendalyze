"use client";

// Design Ref: §2 — Extracted from dashboard/page.tsx for reusability

export type TabType = "trends" | "categories" | "users" | "merchants" | "anomalies";

export interface TabDef {
  id: TabType;
  label: string;
}

export const DEFAULT_TABS: TabDef[] = [
  { id: "trends",     label: "트렌드"  },
  { id: "categories", label: "카테고리" },
  { id: "users",      label: "사용자"  },
  { id: "merchants",  label: "가맹점"  },
  { id: "anomalies",  label: "이상탐지" },
];

interface Props {
  tabs?: TabDef[];
  active: TabType;
  onChange: (id: TabType) => void;
  anomalyCount?: number;
}

export function TabNavigation({ tabs = DEFAULT_TABS, active, onChange, anomalyCount = 0 }: Props) {
  return (
    <div className="border-b border-slate-200">
      <nav className="flex gap-1 -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              active === tab.id
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.label}
            {tab.id === "anomalies" && anomalyCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-red-100 text-red-600">
                {anomalyCount > 9 ? "9+" : anomalyCount}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
