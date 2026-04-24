"use client";

interface Props {
  years: number[];
  selected: number[];
  onChange: (years: number[]) => void;
}

export function YearFilter({ years, selected, onChange }: Props) {
  const allSelected = selected.length === 0 || selected.length === years.length;

  function toggle(year: number) {
    if (selected.includes(year)) {
      const next = selected.filter((y) => y !== year);
      onChange(next.length === years.length ? [] : next);
    } else {
      const next = [...selected, year];
      onChange(next.length === years.length ? [] : next);
    }
  }

  function selectAll() {
    onChange([]);
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={selectAll}
        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
          allSelected
            ? "bg-indigo-600 text-white"
            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
        }`}
      >
        전체
      </button>
      {years.map((y) => {
        const active = !allSelected && selected.includes(y);
        return (
          <button
            key={y}
            onClick={() => toggle(y)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              active
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {y}
          </button>
        );
      })}
    </div>
  );
}
