"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
}

export function FileDropzone({ files, onChange }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      const xlsxOnly = accepted.filter((f) => f.name.endsWith(".xlsx"));
      onChange([...files, ...xlsxOnly]);
    },
    [files, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
    multiple: true,
  });

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-indigo-500 bg-indigo-50"
            : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-10 w-10 text-slate-400 mb-3" />
        {isDragActive ? (
          <p className="text-indigo-600 font-medium">파일을 여기에 놓으세요</p>
        ) : (
          <>
            <p className="text-slate-700 font-medium">
              엑셀 파일을 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-slate-400 text-sm mt-1">.xlsx 형식만 지원 · 여러 파일 동시 업로드 가능</p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-sm text-slate-700 truncate">{file.name}</span>
                <span className="text-xs text-slate-400 shrink-0">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>
              <button
                onClick={() => removeFile(i)}
                className="ml-2 text-slate-400 hover:text-red-500 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
