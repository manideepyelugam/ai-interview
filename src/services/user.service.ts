import { databases } from "@/src/lib/appwrite";
import { APPWRITE_CONFIG } from "@/src/constants";
import { ID, Query } from "appwrite";
import type { UserDocument, OAuthProvider } from "@/src/types";

interface CreateUserParams {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  provider: OAuthProvider;
}

/**
 * Create a user document in Appwrite Database.
 * Called on first login only.
 */
export async function createUserDocument(params: CreateUserParams): Promise<UserDocument> {
  const now = new Date().toISOString();
  const attemptData: any = {
    userId: params.userId,
    name: params.name,
    email: params.email,
    avatar: params.avatar,
    provider: params.provider,
    createdAt: now,
    updatedAt: now,
  };

  while (true) {
    try {
      const doc = await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.usersCollectionId,
        ID.unique(),
        attemptData
      );
      return doc as unknown as UserDocument;
    } catch (err: any) {
      const match = err.message && err.message.match(/Unknown attribute:\s*"([^"]+)"/i);
      if (match && match[1]) {
        const attribute = match[1];
        if (attribute in attemptData) {
          delete attemptData[attribute];
          continue;
        }
      }
      throw err;
    }
  }
}

/**
 * Fetch user document by Appwrite user ID.
 * Returns null if no document found.
 */
export async function getUserDocument(userId: string): Promise<UserDocument | null> {
  try {
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.usersCollectionId,
      [Query.equal("userId", userId)]
    );
    if (response.documents.length > 0) {
      return response.documents[0] as unknown as UserDocument;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Ensure user document exists. Create if first-time login.
 */
export async function ensureUserDocument(params: CreateUserParams): Promise<UserDocument> {
  const existing = await getUserDocument(params.userId);
  if (existing) {
    return existing;
  }
  return createUserDocument(params);
}
