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
        "relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300",
        isDragging
          ? "border-blue-400 bg-blue-50/50 scale-[1.01]"
          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30",
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
            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300",
            isDragging ? "bg-blue-100 scale-110" : "bg-gray-50"
          )}
        >
          {isDragging ? (
            <FileText className="w-7 h-7 text-blue-500" />
          ) : (
            <Upload className="w-7 h-7 text-gray-400" />
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700">
            {isDragging ? (
              "Drop your PDF here"
            ) : (
              <>
                <span className="text-blue-600">Click to upload</span> or drag
                and drop
              </>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF only • Max 20MB</p>
        </div>
      </div>

      {/* Animated border effect when dragging */}
      {isDragging && (
        <div className="absolute inset-0 rounded-2xl border-2 border-blue-400 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
