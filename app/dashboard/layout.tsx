"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/src/components/Dashboard/Sidebar";
import { Navbar } from "@/src/components/Dashboard/Navbar";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { isExamImmersive } from "@/src/lib/exam-immersive";
import { cn } from "@/lib/utils";

/** Full-interview exam rooms — no dashboard chrome. */
function isImmersiveInterviewPath(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname.startsWith("/dashboard/interview/oa") ||
    pathname.startsWith("/dashboard/interview/ai")
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [examFlag, setExamFlag] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else {
        setChecked(true);
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    const sync = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      setExamFlag(isExamImmersive());
    };
    sync();
    document.addEventListener("fullscreenchange", sync);
    const id = window.setInterval(() => setExamFlag(isExamImmersive()), 400);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      window.clearInterval(id);
    };
  }, [pathname]);

  if (loading || !checked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-[#9CA3AF]">Loading...</p>
        </div>
      </div>
    );
  }

  const hideChrome =
    isImmersiveInterviewPath(pathname) || isFullscreen || examFlag;

  // Keep the same React tree always — only hide chrome with CSS.
  // Switching between two return trees remounted children and flashed the config page.
  return (
    <div
      className={cn(
        "flex min-h-screen bg-[#FAFAFA]",
        hideChrome && "fixed inset-0 z-50 w-screen h-screen overflow-hidden"
      )}
    >
      <div className={cn(hideChrome && "hidden")}>
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className={cn(hideChrome && "hidden")}>
          <Navbar />
        </div>
        <main
          className={cn(
            "flex-1 min-h-0",
            hideChrome ? "overflow-auto p-0 m-0 w-full h-full" : "p-6 lg:p-8"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
