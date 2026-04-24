"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/upload/FileDropzone";
import { ColumnMapper } from "@/components/upload/ColumnMapper";
import { useAnalysis } from "@/app/context/AnalysisContext";
import { useT } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { previewFiles, analyzeFiles } from "@/lib/api";
import type { PreviewResult } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { t } = useT();
  const { setResult, setIsLoading, setUploadedFiles } = useAnalysis();
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  async function handlePreview() {
    if (files.length === 0) return;
    setIsPreviewing(true);
    setError(null);
    try {
      const result = await previewFiles(files);
      setPreview(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("file_read_failed"));
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleAnalyze() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeFiles(files);
      setResult(result);
      setUploadedFiles(files);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("analysis_failed"));
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BarChart3 className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Spendalyze</h1>
          </div>
          <p className="text-slate-500">{t("app_description")}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          <FileDropzone files={files} onChange={setFiles} />

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button
            onClick={handlePreview}
            disabled={files.length === 0 || isPreviewing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11"
          >
            {isPreviewing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("reading_files")}</>
            ) : (
              `${t("start_analysis")}${files.length > 0 ? ` (${files.length}${t("unit_files")})` : ""}`
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          {t("privacy_note")}
        </p>
      </div>

      {preview && (
        <ColumnMapper
          preview={preview}
          onConfirm={handleAnalyze}
          onCancel={() => setPreview(null)}
        />
      )}
    </main>
  );
}
