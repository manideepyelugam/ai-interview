"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { LoginCard } from "@/src/components/Auth/LoginCard";
import Image from "next/image";

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

  // Show loading while checking auth or redirecting
  if (loading || !checked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Login Form */}
      <div className="flex flex-1 flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white">
        <div className="mx-auto w-full max-w-md">
          <LoginCard />
        </div>

        {/* Bottom Footer */}
        <div className="mt-auto pt-8 pb-6 mx-auto w-full max-w-md">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>© 2026 Intervue</span>
            <div className="flex gap-4">
              <span className="hover:text-gray-600 cursor-pointer transition-colors">
                Privacy
              </span>
              <span className="hover:text-gray-600 cursor-pointer transition-colors">
                Terms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Illustration */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl" />
        </div>

        {/* Illustration Image */}
        <div className="relative z-10 w-full max-w-2xl p-12">
          <Image
            src="/ChatGPT Image Jul 6, 2026, 02_59_22 PM.png"
            alt="AI Interview Platform — Practice interviews with AI-powered feedback"
            width={800}
            height={800}
            className="w-full h-auto object-contain drop-shadow-2xl"
            priority
          />
        </div>
      </div>
    </div>
  );
}
