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
    <div className="bg-white rounded-2xl border border-[#ECECEC] p-6 sm:p-8">
      <div className="flex flex-col items-center gap-5">
        {/* Spinning loader */}
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-blue-50/80 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-[13px] font-medium text-[#111111]">
            Uploading{fileName ? ` "${fileName}"` : ""}...
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1">
            {clampedProgress < 100
              ? "Please wait while your file is being uploaded"
              : "Almost done..."}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs">
          <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300 ease-out",
                clampedProgress < 100
                  ? "bg-blue-400"
                  : "bg-green-400"
              )}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <p className="text-xs text-[#9CA3AF] text-center mt-2">
            {Math.round(clampedProgress)}%
          </p>
        </div>
      </div>
    </div>
  );
}
