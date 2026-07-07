import { databases, storage } from "@/src/lib/appwrite";
import { APPWRITE_CONFIG } from "@/src/constants";
import { ID, Query } from "appwrite";
import type { JDDocument, InterviewType, UploadedFileInfo } from "@/src/types";

/**
 * Upload a JD PDF file to Appwrite Storage and create a DB document.
 */
export async function uploadJD(
  file: File,
  userId: string,
  interviewType: InterviewType
): Promise<UploadedFileInfo> {
  // Upload file to storage
  const storageFile = await storage.createFile(
    APPWRITE_CONFIG.storageBucketId,
    ID.unique(),
    file
  );

  // Create database document
  const doc = await databases.createDocument(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.jdCollectionId,
    ID.unique(),
    {
      userId,
      interviewType,
      storageFileId: storageFile.$id,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      status: "uploaded",
    }
  );

  return {
    fileId: storageFile.$id,
    documentId: doc.$id,
    fileName: file.name,
    fileSize: file.size,
    uploadedAt: doc.$createdAt,
  };
}

/**
 * Delete a JD upload — removes file from storage and document from DB.
 */
export async function deleteJD(fileId: string, documentId: string): Promise<void> {
  await Promise.all([
    storage.deleteFile(APPWRITE_CONFIG.storageBucketId, fileId),
    databases.deleteDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.jdCollectionId,
      documentId
    ),
  ]);
}

/**
 * Get existing JD document for a user and interview type.
 */
export async function getJDByUser(
  userId: string,
  interviewType: InterviewType
): Promise<JDDocument | null> {
  try {
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.jdCollectionId,
      [
        Query.equal("userId", userId),
        Query.equal("interviewType", interviewType),
        Query.orderDesc("$createdAt"),
        Query.limit(1),
      ]
    );
    if (response.documents.length > 0) {
      return response.documents[0] as unknown as JDDocument;
    }
    return null;
  } catch {
    return null;
  }
}
