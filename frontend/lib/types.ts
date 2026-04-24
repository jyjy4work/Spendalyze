export interface Transaction {
  cardholder: string;
  date: string;
  merchant: string;
  amount: number;
  receipt: boolean;
  month: string;
  type: string;
  compte: string;
  libelle: string;
  net: number;
  vat: number;
  gross: number;
  details: string;
  year: number;
  quarter: number;
  bank: "BRED" | "HSBC" | "UNKNOWN";
  comptabilise?: boolean;
  invoiceNumber?: string;
  releve?: number;
  sold?: number;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface Summary {
  totalAmount: number;
  totalCount: number;
  uniqueUsers: string[];
  banks: string[];
  years: number[];
  dateRange: DateRange;
}

export interface TrendData {
  year: number;
  period: string;
  bank: string;
  amount: number;
  count: number;
}

export interface CategoryData {
  compte: string;
  libelle: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface UserData {
  cardholder: string;
  totalAmount: number;
  totalCount: number;
  monthlyAmounts: { month: string; amount: number }[];
  topMerchants: { merchant: string; amount: number }[];
}

export interface MerchantData {
  merchant: string;
  totalAmount: number;
  count: number;
  avgAmount: number;
}

export interface AnomalyData {
  id: number;
  reason: "high_amount" | "no_receipt" | "duplicate" | "weekend";
  severity: "high" | "medium" | "low";
  cardholder: string;
  date: string;
  merchant: string;
  amount: number;
  compte: string;
  libelle: string;
  details: string;
  receipt: boolean;
  bank: string;
  invoice_number: string;
}

export interface AnalysisResult {
  summary: Summary;
  transactions: Transaction[];
  trends: TrendData[];
  categories: CategoryData[];
  users: UserData[];
  merchants: MerchantData[];
  anomalies: AnomalyData[];
}

export interface SheetInfo {
  name: string;
  type: string;
  bank: string;
  row_count: number;
  detected_header_row: number;
  columns: string[];
}

export interface FilePreview {
  filename: string;
  sheets: SheetInfo[];
}

export interface PreviewResult {
  files: FilePreview[];
}
