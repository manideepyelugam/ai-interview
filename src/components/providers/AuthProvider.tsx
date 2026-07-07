"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  logout as logoutService,
} from "@/src/services/auth.service";
import { ensureUserDocument } from "@/src/services/user.service";
import type { AuthUser, OAuthProvider } from "@/src/types";
import { ROUTES } from "@/src/constants";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      const appwriteUser = await getCurrentUser();

      if (appwriteUser) {
        const provider: OAuthProvider = "google";
        const avatar = appwriteUser.name
          ? `https://ui-avatars.com/api/?name=${encodeURIComponent(appwriteUser.name)}&background=3B82F6&color=fff`
          : "";

        // Set user immediately so routes work even if DB write fails
        setUser({
          $id: appwriteUser.$id,
          name: appwriteUser.name,
          email: appwriteUser.email,
          avatar,
          provider,
        });

        // Try to ensure user document exists in DB (non-blocking)
        try {
          await ensureUserDocument({
            userId: appwriteUser.$id,
            name: appwriteUser.name,
            email: appwriteUser.email,
            avatar,
            provider,
          });
        } catch (dbError) {
          // Database might not be configured yet — that's okay
          console.warn("Could not sync user to database:", dbError);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutService();
    setUser(null);
    router.push(ROUTES.LOGIN);
  }, [router]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
