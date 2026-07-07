"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface UploadProgressProps {
  progress: number;
  fileName?: string;
}

export function UploadProgress({ progress, fileName }: UploadProgressProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8">
      <div className="flex flex-col items-center gap-5">
        {/* Spinning loader */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900">
            Uploading{fileName ? ` "${fileName}"` : ""}...
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {clampedProgress < 100
              ? "Please wait while your file is being uploaded"
              : "Almost done..."}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300 ease-out",
                clampedProgress < 100
                  ? "bg-gradient-to-r from-blue-500 to-blue-600"
                  : "bg-green-500"
              )}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            {Math.round(clampedProgress)}%
          </p>
        </div>
      </div>
    </div>
  );
}
