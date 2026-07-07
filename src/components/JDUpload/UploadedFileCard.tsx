"use client";

import { CheckCircle2, FileText, Trash2, RefreshCw } from "lucide-react";
import type { UploadedFileInfo } from "@/src/types";

interface UploadedFileCardProps {
  file: UploadedFileInfo;
  onRemove: () => void;
  onReplace: (file: File) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function UploadedFileCard({
  file,
  onRemove,
  onReplace,
}: UploadedFileCardProps) {
  const handleReplaceClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        onReplace(target.files[0]);
      }
    };
    input.click();
  };

  return (
    <div className="bg-white rounded-2xl border border-green-100 p-6">
      <div className="flex items-start gap-4">
        {/* Success icon */}
        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-medium text-green-600 mb-1">
            Job Description Uploaded
          </h4>

          {/* File info */}
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span className="text-[13px] text-[#111111] font-medium truncate">
              {file.fileName}
            </span>
            <span className="text-xs text-[#9CA3AF]">
              ({formatFileSize(file.fileSize)})
            </span>
          </div>

          <p className="text-xs text-[#9CA3AF]">Uploaded successfully</p>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={onRemove}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-150"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
            <button
              onClick={handleReplaceClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-150"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Replace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
