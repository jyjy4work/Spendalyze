"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/upload/FileDropzone";
import { ColumnMapper } from "@/components/upload/ColumnMapper";
import { useAnalysis } from "@/app/context/AnalysisContext";
import { previewFiles, analyzeFiles } from "@/lib/api";
import type { PreviewResult } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
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
      setError(e instanceof Error ? e.message : "파일 읽기 실패");
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
      setError(e instanceof Error ? e.message : "분석 실패");
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BarChart3 className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Spendalyze</h1>
          </div>
          <p className="text-slate-500">법인카드 지출 내역 분석 대시보드</p>
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
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 파일 읽는 중...</>
            ) : (
              `분석 시작 ${files.length > 0 ? `(${files.length}개 파일)` : ""}`
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          파일은 분석 후 저장되지 않습니다
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
