import type { AnalysisResult, PreviewResult } from "./types";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export async function previewFiles(files: File[]): Promise<PreviewResult> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await fetch("/api/analyze/preview", { method: "POST", body: form });
  return handleResponse<PreviewResult>(res);
}

export async function analyzeFiles(
  files: File[],
  mapping: Record<string, unknown> = {}
): Promise<AnalysisResult> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  form.append("mapping", JSON.stringify(mapping));
  const res = await fetch("/api/analyze", { method: "POST", body: form });
  return handleResponse<AnalysisResult>(res);
}
