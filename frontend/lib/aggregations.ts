import type { Transaction, CategoryData, UserData, MerchantData } from "./types";

/** Normalize a name string: collapse whitespace, trim.
 *  Prevents "EUN-KEUNG KIM" vs "EUN-KEUNG KIM " being treated as different keys.
 */
function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Filter transactions by active bank + year selection */
export function filterTransactions(
  transactions: Transaction[],
  bankFilter: string,
  selectedYears: number[],
): Transaction[] {
  let list = transactions;
  if (bankFilter !== "all") list = list.filter((t) => t.bank === bankFilter);
  if (selectedYears.length > 0) {
    const yearSet = new Set(selectedYears);
    list = list.filter((t) => yearSet.has(t.year));
  }
  return list;
}

/** Recompute category breakdown from a filtered transaction list */
export function computeCategories(transactions: Transaction[]): CategoryData[] {
  const map = new Map<string, { compte: string; libelle: string; amount: number; count: number }>();

  for (const t of transactions) {
    const displayLabel = norm(t.libelle && t.libelle !== "기타" ? t.libelle : (t.compte || "기타"));
    if (!map.has(displayLabel)) {
      map.set(displayLabel, { compte: t.compte ?? "", libelle: displayLabel, amount: 0, count: 0 });
    }
    const e = map.get(displayLabel)!;
    e.amount += t.amount;
    e.count += 1;
  }

  const total = [...map.values()].reduce((s, e) => s + e.amount, 0);
  return [...map.values()]
    .map((e) => ({ ...e, percentage: total > 0 ? (e.amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

/** Recompute per-user stats from a filtered transaction list */
export function computeUsers(transactions: Transaction[]): UserData[] {
  const map = new Map<string, {
    displayName: string;
    totalAmount: number;
    totalCount: number;
    monthly: Map<string, number>;
    merchants: Map<string, number>;
  }>();

  for (const t of transactions) {
    const key = norm(t.cardholder);
    if (!map.has(key)) {
      map.set(key, {
        displayName: t.cardholder,
        totalAmount: 0, totalCount: 0,
        monthly: new Map(), merchants: new Map(),
      });
    }
    const e = map.get(key)!;
    e.totalAmount += t.amount;
    e.totalCount += 1;

    const monthKey = t.date ? t.date.slice(0, 7) : "unknown";
    e.monthly.set(monthKey, (e.monthly.get(monthKey) ?? 0) + t.amount);

    const mKey = norm(t.merchant);
    e.merchants.set(mKey, (e.merchants.get(mKey) ?? 0) + t.amount);
  }

  return [...map.entries()]
    .map(([, d]) => ({
      cardholder: d.displayName,
      totalAmount: d.totalAmount,
      totalCount: d.totalCount,
      monthlyAmounts: [...d.monthly.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => ({ month, amount })),
      topMerchants: [...d.merchants.entries()]
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([merchant, amount]) => ({ merchant, amount })),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

/** Recompute top-20 merchant stats from a filtered transaction list */
export function computeMerchants(transactions: Transaction[]): MerchantData[] {
  // Use normalized name as map key, but track original display name
  const map = new Map<string, { displayName: string; totalAmount: number; count: number }>();

  for (const t of transactions) {
    const key = norm(t.merchant);
    if (!map.has(key)) {
      map.set(key, { displayName: t.merchant, totalAmount: 0, count: 0 });
    }
    const e = map.get(key)!;
    e.totalAmount += t.amount;
    e.count += 1;
  }

  return [...map.values()]
    .map((d) => ({
      merchant: d.displayName,
      totalAmount: d.totalAmount,
      count: d.count,
      avgAmount: d.count > 0 ? d.totalAmount / d.count : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 20);
}
