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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Upload Job Description
              </h2>
            </div>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
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
