"use client";

import { useEffect } from "react";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { useJDUpload } from "@/src/hooks/useJDUpload";
import { DropZone } from "./DropZone";
import { UploadProgress } from "./UploadProgress";
import { UploadedFileCard } from "./UploadedFileCard";
import type { InterviewType } from "@/src/types";
import { FileText } from "lucide-react";

interface JDUploadCardProps {
  interviewType: InterviewType;
}

export function JDUploadCard({ interviewType }: JDUploadCardProps) {
  const { user } = useAuth();
  const {
    uploadState,
    uploadedFile,
    uploadProgress,
    handleUpload,
    handleRemove,
    handleReplace,
    loadExisting,
  } = useJDUpload(user?.$id, interviewType);

  // Load existing upload on mount
  useEffect(() => {
    if (user?.$id) {
      loadExisting(user.$id);
    }
  }, [user?.$id, loadExisting]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-[#ECECEC] overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50/80 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#111111]">
                Upload Job Description
              </h2>
            </div>
          </div>
          <p className="text-[13px] text-[#9CA3AF] leading-relaxed">
            Upload the Job Description PDF. Future interview questions will be
            generated based on this document.
          </p>
        </div>

        {/* Upload Area */}
        <div className="px-8 pb-8">
          {uploadState === "idle" && (
            <DropZone onFileSelect={handleUpload} />
          )}

          {uploadState === "dragging" && (
            <DropZone onFileSelect={handleUpload} />
          )}

          {uploadState === "uploading" && (
            <UploadProgress
              progress={uploadProgress}
              fileName={undefined}
            />
          )}

          {uploadState === "success" && uploadedFile && (
            <UploadedFileCard
              file={uploadedFile}
              onRemove={handleRemove}
              onReplace={handleReplace}
            />
          )}

          {uploadState === "error" && (
            <DropZone onFileSelect={handleUpload} />
          )}
        </div>
      </div>
    </div>
  );
}
