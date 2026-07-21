"use client";

import { lockExamFullscreen } from "@/src/lib/exam-immersive";
import { Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * After route changes, browsers often drop fullscreen.
 * This full-viewport gate requires one click (user gesture) to lock exam mode.
 */
export function ExamFullscreenGate({ active }: { active: boolean }) {
  const [needsLock, setNeedsLock] = useState(false);

  useEffect(() => {
    if (!active) {
      setNeedsLock(false);
      return;
    }

    const sync = () => {
      const inFs = Boolean(document.fullscreenElement);
      setNeedsLock(!inFs);
      if (inFs) {
        document.body.classList.add("exam-fullscreen");
        document.documentElement.classList.add("exam-fullscreen");
      }
    };

    sync();
    // Try immediately (works if still in gesture chain)
    void lockExamFullscreen().then(sync);

    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [active]);

  if (!active || !needsLock) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0a] p-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center">
          <Maximize2 className="w-7 h-7 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight">
            Enter exam fullscreen
          </h2>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            The assessment fills your entire display. Sidebar, browser chrome, and
            other UI stay hidden until you end the test.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            const ok = await lockExamFullscreen();
            if (ok) setNeedsLock(false);
          }}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-3.5 transition"
        >
          Start Fullscreen Exam
        </button>
      </div>
    </div>
  );
}
