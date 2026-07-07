"use client";

import { useCallback, useState, useRef, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import { Upload, FileText } from "lucide-react";
import { ACCEPTED_FILE_EXTENSIONS } from "@/src/constants";

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function DropZone({ onFileSelect, disabled = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect, disabled]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
        // Reset input so same file can be selected again
        e.target.value = "";
      }
    },
    [onFileSelect]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        "relative border-2 border-dashed rounded-2xl p-6 sm:p-12 text-center cursor-pointer transition-all duration-150",
        isDragging
          ? "border-blue-300 bg-blue-50/30"
          : "border-[#E5E5E5] hover:border-blue-200 hover:bg-[#F7F7F7]/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_EXTENSIONS.join(",")}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-4">
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-150",
            isDragging ? "bg-blue-50" : "bg-[#F7F7F7]"
          )}
        >
          {isDragging ? (
            <FileText className="w-6 h-6 text-blue-400" />
          ) : (
            <Upload className="w-6 h-6 text-[#9CA3AF]" />
          )}
        </div>

        <div>
          <p className="text-[13px] font-medium text-[#6B7280]">
            {isDragging ? (
              "Drop your PDF here"
            ) : (
              <>
                <span className="text-blue-500">Click to upload</span> or drag
                and drop
              </>
            )}
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1">PDF only · Max 20MB</p>
        </div>
      </div>

      {/* Animated border effect when dragging */}
      {isDragging && (
        <div className="absolute inset-0 rounded-2xl border-2 border-blue-300 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
