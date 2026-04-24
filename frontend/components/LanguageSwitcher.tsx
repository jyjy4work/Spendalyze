"use client";

import { useT } from "@/lib/i18n/context";
import { LANGUAGES, type Lang } from "@/lib/i18n/translations";

export function LanguageSwitcher() {
  const { lang, setLang } = useT();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div className="relative inline-flex">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="appearance-none text-xs font-medium border border-slate-200 rounded-lg pl-7 pr-6 py-1.5 bg-white text-slate-600 hover:border-slate-400 focus:outline-none focus:border-indigo-400 cursor-pointer"
        aria-label="Language"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm">
        {current.flag}
      </span>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
        ▾
      </span>
    </div>
  );
}
