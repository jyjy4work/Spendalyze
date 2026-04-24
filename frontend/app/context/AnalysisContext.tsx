"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { AnalysisResult } from "@/lib/types";
import type { TabType } from "@/components/dashboard/TabNavigation";

type BankFilter = "all" | "BRED" | "HSBC";

interface AnalysisContextType {
  result: AnalysisResult | null;
  setResult: (r: AnalysisResult) => void;
  selectedYears: number[];
  setSelectedYears: (years: number[]) => void;
  selectedBank: BankFilter;
  setSelectedBank: (bank: BankFilter) => void;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankFilter>("all");
  const [activeTab, setActiveTab] = useState<TabType>("trends");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  return (
    <AnalysisContext.Provider
      value={{
        result, setResult,
        selectedYears, setSelectedYears,
        selectedBank, setSelectedBank,
        activeTab, setActiveTab,
        isLoading, setIsLoading,
        uploadedFiles, setUploadedFiles,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used within AnalysisProvider");
  return ctx;
}
