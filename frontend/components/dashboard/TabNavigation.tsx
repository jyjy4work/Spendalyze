"use client";

import { useT } from "@/lib/i18n/context";

export type TabType = "trends" | "categories" | "users" | "merchants" | "anomalies";

export interface TabDef {
  id: TabType;
  labelKey: string;
}

export const DEFAULT_TABS: TabDef[] = [
  { id: "trends",     labelKey: "tab_trends"     },
  { id: "categories", labelKey: "tab_categories" },
  { id: "users",      labelKey: "tab_users"      },
  { id: "merchants",  labelKey: "tab_merchants"  },
  { id: "anomalies",  labelKey: "tab_anomalies"  },
];

interface Props {
  tabs?: TabDef[];
  active: TabType;
  onChange: (id: TabType) => void;
  anomalyCount?: number;
}

export function TabNavigation({ tabs = DEFAULT_TABS, active, onChange, anomalyCount = 0 }: Props) {
  const { t } = useT();
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
            {t(tab.labelKey)}
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
