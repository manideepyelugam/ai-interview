"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { uploadJD, deleteJD, getJDByUser } from "@/src/services/jd.service";
import { jdFileSchema } from "@/src/validators/jd.validator";
import type { InterviewType, UploadedFileInfo, UploadState } from "@/src/types";

interface UseJDUploadReturn {
  uploadState: UploadState;
  uploadedFile: UploadedFileInfo | null;
  uploadProgress: number;
  handleUpload: (file: File) => Promise<void>;
  handleRemove: () => Promise<void>;
  handleReplace: (file: File) => Promise<void>;
  loadExisting: (userId: string) => Promise<void>;
}

export function useJDUpload(
  userId: string | undefined,
  interviewType: InterviewType
): UseJDUploadReturn {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = useCallback((file: File): boolean => {
    const result = jdFileSchema.safeParse({ file });
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Invalid file";
      toast.error(errorMessage);
      return false;
    }
    return true;
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!userId) {
        toast.error("Please log in to upload files");
        return;
      }

      if (!validateFile(file)) return;

      try {
        setUploadState("uploading");
        setUploadProgress(0);

        // Simulate progress since Appwrite SDK doesn't provide upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + Math.random() * 15;
          });
        }, 200);

        const result = await uploadJD(file, userId, interviewType);

        clearInterval(progressInterval);
        setUploadProgress(100);

        setTimeout(() => {
          setUploadedFile(result);
          setUploadState("success");
          toast.success("Job Description uploaded successfully!");
        }, 300);
      } catch (error) {
        setUploadState("error");
        setUploadProgress(0);
        const message =
          error instanceof Error ? error.message : "Upload failed. Please try again.";
        toast.error(message);
        // Reset to idle after error
        setTimeout(() => setUploadState("idle"), 2000);
      }
    },
    [userId, interviewType, validateFile]
  );

  const handleRemove = useCallback(async () => {
    if (!uploadedFile) return;

    try {
      await deleteJD(uploadedFile.fileId, uploadedFile.documentId);
      setUploadedFile(null);
      setUploadState("idle");
      setUploadProgress(0);
      toast.success("File removed successfully");
    } catch {
      toast.error("Failed to remove file. Please try again.");
    }
  }, [uploadedFile]);

  const handleReplace = useCallback(
    async (file: File) => {
      if (uploadedFile) {
        try {
          await deleteJD(uploadedFile.fileId, uploadedFile.documentId);
        } catch {
          // Continue with upload even if delete fails
        }
      }
      setUploadedFile(null);
      setUploadState("idle");
      setUploadProgress(0);
      await handleUpload(file);
    },
    [uploadedFile, handleUpload]
  );

  const loadExisting = useCallback(
    async (uid: string) => {
      try {
        const existing = await getJDByUser(uid, interviewType);
        if (existing) {
          setUploadedFile({
            fileId: existing.storageFileId,
            documentId: existing.$id,
            fileName: existing.fileName,
            fileSize: existing.fileSize,
            uploadedAt: existing.uploadedAt,
          });
          setUploadState("success");
        }
      } catch {
        // Silently fail — user can re-upload
      }
    },
    [interviewType]
  );

  return {
    uploadState,
    uploadedFile,
    uploadProgress,
    handleUpload,
    handleRemove,
    handleReplace,
    loadExisting,
  };
}
