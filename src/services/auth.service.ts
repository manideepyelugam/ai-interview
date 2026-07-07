import { account } from "@/src/lib/appwrite";
import { OAuthProvider as AppwriteOAuthProvider } from "appwrite";
import { ROUTES } from "@/src/constants";

/**
 * Get the current origin URL for OAuth callbacks.
 */
function getOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:3000";
}

/**
 * Initiate Google OAuth login.
 * Redirects user to Google consent screen, then back to our callback.
 */
export async function loginWithGoogle(): Promise<void> {
  const origin = getOrigin();
  account.createOAuth2Session(
    AppwriteOAuthProvider.Google,
    `${origin}${ROUTES.DASHBOARD}`,
    `${origin}${ROUTES.LOGIN}`
  );
}

/**
 * Initiate GitHub OAuth login.
 * Redirects user to GitHub authorization, then back to our callback.
 */
export async function loginWithGithub(): Promise<void> {
  const origin = getOrigin();
  account.createOAuth2Session(
    AppwriteOAuthProvider.Github,
    `${origin}${ROUTES.DASHBOARD}`,
    `${origin}${ROUTES.LOGIN}`
  );
}

/**
 * Get the currently authenticated user from Appwrite.
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  try {
    const user = await account.get();
    return user;
  } catch {
    return null;
  }
}

/**
 * Delete the current session (logout).
 */
export async function logout(): Promise<void> {
  try {
    await account.deleteSession("current");
  } catch (error) {
    console.error("Logout error:", error);
  }
}
