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
        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-green-700 mb-1">
            Job Description Uploaded
          </h4>

          {/* File info */}
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700 font-medium truncate">
              {file.fileName}
            </span>
            <span className="text-xs text-gray-400">
              ({formatFileSize(file.fileSize)})
            </span>
          </div>

          <p className="text-xs text-gray-400">Uploaded successfully</p>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={onRemove}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all duration-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
            <button
              onClick={handleReplaceClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all duration-200"
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
