"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { useAuth } from "@/src/components/providers/AuthProvider";
import { LoginCard } from "@/src/components/Auth/LoginCard";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/dashboard");
      } else {
        setChecked(true);
      }
    }
  }, [user, loading, router]);

  if (loading || !checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white font-sans">
      {/* Left Panel */}
      <div className="flex min-h-screen flex-1 flex-col bg-white">
        {/* Header */}
        <header className="flex items-center justify-between px-6 sm:px-10 py-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill="white"
                />
              </svg>
            </div>

            <span className="text-[15px] font-medium tracking-tight text-[#111111]">
              intervue
            </span>
          </div>

          <button className="text-[13px] font-medium text-[#111111] transition-colors duration-150 hover:text-blue-500">
            Sign in
          </button>
        </header>

        <main className="flex flex-1 justify-center items-center px-6 py-12">
          <div className="w-full flex items-center justify-center">
            <LoginCard />
          </div>
        </main>

        {/* Footer */}
        <footer className="flex items-center justify-between px-6 sm:px-10 py-5">
          <span className="text-xs text-[#9CA3AF]">
            © 2026 intervue
          </span>

          <div className="flex gap-6">
            <button className="text-xs text-[#9CA3AF] transition-colors duration-150 hover:text-[#6B7280]">
              Privacy
            </button>

            <button className="text-xs text-[#9CA3AF] transition-colors duration-150 hover:text-[#6B7280]">
              Terms
            </button>
          </div>
        </footer>
      </div>

      {/* Right Panel */}
      <div className="relative  hidden m-4 rounded-lg w-1/2 overflow-hidden lg:block">
        <Image
          src="/interview.png"
          alt="AI Interview Platform"
          fill
          priority
          className="object-cover object-center"
        />
      </div>
    </div>
  );
}