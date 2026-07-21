"use client";

import { useAuth } from "@/src/components/providers/AuthProvider";
import { useProctoring } from "@/src/components/Interview/ProctoringProvider";
import { ExamFullscreenGate } from "@/src/components/Interview/ExamFullscreenGate";
import {
  lockExamFullscreen,
  setExamImmersive,
  unlockExamFullscreen,
} from "@/src/lib/exam-immersive";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";
import {
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle,
  Clock,
  Code2,
  HelpCircle,
  LogOut,
  Mic,
  Monitor,
  Play,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type View = "loading" | "overview" | "mcq" | "coding" | "aptitude" | "transition";

type MQ = {
  id: string;
  question: string;
  options: string[];
  skill?: string;
};
type CQ = {
  id: string;
  title: string;
  difficulty: string;
  problemStatement: string;
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  testCases: { input: string; output: string; isHidden: boolean }[];
};
type AQ = {
  id: string;
  question: string;
  options: string[];
  category?: string;
};

export default function E2EOAPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const proctoring = useProctoring();
  const [fullSessionId, setFullSessionId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<View>("loading");
  const [ending, setEnding] = useState(false);

  const [mcqs, setMcqs] = useState<MQ[]>([]);
  const [codingQs, setCodingQs] = useState<CQ[]>([]);
  const [apts, setApts] = useState<AQ[]>([]);
  const [mcqIdx, setMcqIdx] = useState(0);
  const [aptIdx, setAptIdx] = useState(0);
  const [codingIdx, setCodingIdx] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [aptAnswers, setAptAnswers] = useState<Record<string, string>>({});
  const [codeByQ, setCodeByQ] = useState<Record<string, string>>({});
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [editorTheme, setEditorTheme] = useState("vs-light");
  const [codeTab, setCodeTab] = useState<"description" | "results">("description");
  const [runResults, setRunResults] = useState<any>(null);
  const [customInput, setCustomInput] = useState("");
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [mcqTime, setMcqTime] = useState(15 * 60);
  const [codingTime, setCodingTime] = useState(30 * 60);
  const [aptTime, setAptTime] = useState(12 * 60);

  const [violations, setViolations] = useState<{ type: string; timestamp: string }[]>([]);
  const [warning, setWarning] = useState<{
    type: "tab" | "fullscreen" | "screenshare";
    count?: number;
  } | null>(null);
  const [screenGrace, setScreenGrace] = useState(0);

  const camRef = useRef<HTMLVideoElement | null>(null);
  const lastTabRef = useRef(0);
  const screenGraceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTestRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  const bootRef = useRef(false);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const activeCode = codingQs[codingIdx]
    ? codeByQ[codingQs[codingIdx].id] || ""
    : "";

  const setActiveCode = (val: string) => {
    const q = codingQs[codingIdx];
    if (!q) return;
    setCodeByQ((prev) => ({ ...prev, [q.id]: val }));
  };

  const getLanguageTemplate = (lang: string, question: CQ) => {
    let fn = "solution";
    if (question.title === "Two Sum") fn = "twoSum";
    else if (question.title === "Valid Parentheses") fn = "isValid";
    else if (question.title.includes("Longest Substring")) fn = "lengthOfLongestSubstring";
    switch (lang) {
      case "python":
        return `def ${fn}(input):\n    # Write your code here\n    pass`;
      case "java":
        return `class Solution {\n    public Object ${fn}(Object input) {\n        // Write your code here\n        return null;\n    }\n}`;
      case "cpp":
        return `class Solution {\npublic:\n    auto ${fn}(auto input) {\n        // Write your code here\n    }\n};`;
      default:
        return `function ${fn}(input) {\n    // Write your code here\n    \n}`;
    }
  };

  const logViolation = (type: "tab_switch" | "fullscreen_exit" | "screen_share_interrupted") => {
    if (type === "tab_switch") {
      const now = Date.now();
      if (now - lastTabRef.current < 2000) return;
      lastTabRef.current = now;
    }
    const v = { type, timestamp: new Date().toLocaleTimeString() };
    setViolations((prev) => {
      const next = [...prev, v];
      const total = next.filter((x) => x.type === type).length;
      if (type === "tab_switch") {
        if (total >= 5) {
          toast.error("Ended due to excessive tab switches.");
          void endTestRef.current(true);
        } else setWarning({ type: "tab", count: total });
      } else if (type === "fullscreen_exit") setWarning({ type: "fullscreen" });
      else setWarning({ type: "screenshare" });
      return next;
    });
  };

  const onScreenEnded = () => {
    logViolation("screen_share_interrupted");
    let left = 30;
    setScreenGrace(30);
    if (screenGraceRef.current) clearInterval(screenGraceRef.current);
    screenGraceRef.current = setInterval(() => {
      left -= 1;
      setScreenGrace(left);
      if (left <= 0) {
        if (screenGraceRef.current) clearInterval(screenGraceRef.current);
        toast.error("Screen share not restored. Ending test.");
        void endTestRef.current(true);
      }
    }, 1000);
  };

  const handleEndTest = async (force = false) => {
    if (!fullSessionId) return;
    if (!force && !window.confirm("End the full interview now and view results?")) return;
    setEnding(true);
    try {
      if (sessionId) {
        await fetch("/api/interview/link-round", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullSessionId,
            roundType: "oa",
            roundSessionId: sessionId,
          }),
        });
      }
      await fetch("/api/interview/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullSessionId }),
      });
      proctoring.stopAll();
      setExamImmersive(false);
      unlockExamFullscreen();
      router.push(`/dashboard/interview?sessionId=${fullSessionId}`);
    } catch {
      toast.error("Failed to end test.");
      setEnding(false);
    }
  };
  endTestRef.current = handleEndTest;

  // Boot session (no second permission prompt if already granted)
  useEffect(() => {
    if (authLoading || !user || bootRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const fId = params.get("fullSessionId");
    const existing = params.get("sessionId");
    if (!fId) {
      toast.error("Missing full interview session.");
      router.push("/dashboard/interview");
      return;
    }
    bootRef.current = true;
    setFullSessionId(fId);
    setExamImmersive(true);

    (async () => {
      try {
        await lockExamFullscreen();
        // Never re-prompt if setup already granted live streams
        const hasLive =
          proctoring.isReady ||
          (Boolean(proctoring.cameraStream) && Boolean(proctoring.screenStream));
        if (!hasLive) {
          // Hard refresh mid-test only — ask once as fallback
          toast.message("Proctoring session lost — please re-enable devices once.");
          const camOk = await proctoring.requestDevices();
          if (!camOk) throw new Error("Camera/mic required");
          const screenOk = await proctoring.requestScreenShare();
          if (!screenOk) throw new Error("Entire screen share required");
          await lockExamFullscreen();
        }

        if (existing) {
          const res = await fetch(`/api/interview/e2e/oa/session?sessionId=${existing}`);
          if (!res.ok) throw new Error("Failed to load OA session");
          const data = await res.json();
          setSessionId(existing);
          setSession(data.session);
          setMcqs(data.mcqQuestions || []);
          setCodingQs(data.codingQuestions || []);
          setApts(data.aptitudeQuestions || []);
          setView("overview");
          return;
        }

        const fullRes = await fetch(`/api/interview/session?sessionId=${fId}`);
        const fullData = await fullRes.json();
        const full = fullData.session;
        if (!full) throw new Error("Full session not found");
        if (full.status === "completed") {
          router.push(`/dashboard/interview?sessionId=${fId}`);
          return;
        }
        if (full.oaSessionId && !full.aiSessionId) {
          router.push(`/dashboard/interview/ai?fullSessionId=${fId}`);
          return;
        }
        if (full.oaSessionId) {
          router.replace(
            `/dashboard/interview/oa?fullSessionId=${fId}&sessionId=${full.oaSessionId}`
          );
          return;
        }

        const ctx = {
          source: "role" as const,
          role: full.blueprint?.role || "Full Stack Developer",
          jd: {
            experience: "Mid level",
            requiredSkills: full.blueprint?.skills || ["JavaScript", "React", "Node.js"],
            preferredSkills: full.blueprint?.frameworks || [],
          },
        };

        const startRes = await fetch("/api/interview/e2e/oa/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.$id, context: ctx }),
        });
        if (!startRes.ok) throw new Error("Failed to start E2E OA");
        const start = await startRes.json();
        setSessionId(start.sessionId);
        setMcqs(start.mcqQuestions || []);
        setCodingQs(start.codingQuestions || []);
        setApts(start.aptitudeQuestions || []);
        const templates: Record<string, string> = {};
        (start.codingQuestions || []).forEach((q: CQ) => {
          templates[q.id] = getLanguageTemplate("javascript", q);
        });
        setCodeByQ(templates);
        setSession({
          id: start.sessionId,
          blueprint: start.blueprint,
          mcqStatus: "not_started",
          codingStatus: "not_started",
          aptitudeStatus: "not_started",
        });
        setView("overview");
      } catch (e: any) {
        toast.error(e.message || "Failed to start OA round");
        router.push(`/dashboard/interview?sessionId=${fId}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  useEffect(() => {
    if (camRef.current && proctoring.cameraStream) {
      camRef.current.srcObject = proctoring.cameraStream;
    }
  }, [proctoring.cameraStream, view]);

  useEffect(() => {
    proctoring.setScreenEndedHandler(onScreenEnded);
    return () => proctoring.setScreenEndedHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (view === "loading" || view === "transition") return;
    const onVis = () => {
      if (document.visibilityState === "hidden") logViolation("tab_switch");
    };
    const onBlur = () => logViolation("tab_switch");
    const onFs = () => {
      if (!document.fullscreenElement) logViolation("fullscreen_exit");
    };
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      setViolations((p) => [
        ...p,
        { type: "copy_attempt", timestamp: new Date().toLocaleTimeString() },
      ]);
      toast.error("Copying is disabled during the assessment.");
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("copy", onCopy);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("copy", onCopy);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (view !== "mcq") return;
    const t = setInterval(() => {
      setMcqTime((s) => {
        if (s <= 1) {
          clearInterval(t);
          void submitMCQ(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (view !== "coding") return;
    const t = setInterval(() => {
      setCodingTime((s) => {
        if (s <= 1) {
          clearInterval(t);
          void finishCodingRound();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (view !== "aptitude") return;
    const t = setInterval(() => {
      setAptTime((s) => {
        if (s <= 1) {
          clearInterval(t);
          void submitApt(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const submitMCQ = async (auto = false) => {
    if (!sessionId || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/interview/e2e/oa/submit/mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers: mcqAnswers, violations }),
      });
      if (!res.ok) throw new Error("MCQ submit failed");
      setViolations([]);
      setSession((s: any) => ({ ...s, mcqStatus: "completed", codingStatus: "in_progress" }));
      toast.success(auto ? "MCQ auto-submitted." : "MCQ submitted.");
      setView("coding");
      setCodeTab("description");
      setRunResults(null);
    } catch {
      toast.error("Failed to submit MCQ.");
    } finally {
      setSubmitting(false);
    }
  };

  const runCode = async () => {
    if (!sessionId || !codingQs[codingIdx]) return;
    setRunning(true);
    setCodeTab("results");
    setRunResults(null);
    try {
      const res = await fetch("/api/interview/e2e/oa/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: codingQs[codingIdx].id,
          code: activeCode,
          language: codeLanguage,
          customInput: useCustomInput ? customInput : undefined,
        }),
      });
      if (!res.ok) throw new Error("Run failed");
      setRunResults(await res.json());
    } catch {
      toast.error("Could not run code.");
    } finally {
      setRunning(false);
    }
  };

  const submitCurrentCoding = async () => {
    if (!sessionId || !codingQs[codingIdx] || submitting) return;
    setSubmitting(true);
    setCodeTab("results");
    try {
      const res = await fetch("/api/interview/e2e/oa/submit/coding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: codingQs[codingIdx].id,
          code: activeCode,
          language: codeLanguage,
          submitAll: false,
          violations,
        }),
      });
      if (!res.ok) throw new Error("Submit failed");
      const data = await res.json();
      setRunResults(data);
      setViolations([]);
      toast.success(`Submitted — ${data.passed}/${data.total} passed.`);
    } catch {
      toast.error("Failed to submit code.");
    } finally {
      setSubmitting(false);
    }
  };

  const finishCodingRound = async () => {
    if (!sessionId || !codingQs[0] || submitting) return;
    setSubmitting(true);
    try {
      // Ensure current problem saved, then finalize round
      await fetch("/api/interview/e2e/oa/submit/coding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: codingQs[codingIdx]?.id || codingQs[0].id,
          code: activeCode || "//",
          language: codeLanguage,
          submitAll: true,
          violations,
        }),
      });
      setViolations([]);
      setSession((s: any) => ({
        ...s,
        codingStatus: "completed",
        aptitudeStatus: "in_progress",
      }));
      toast.success("Coding round complete.");
      setView("aptitude");
    } catch {
      toast.error("Failed to finish coding round.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitApt = async (auto = false) => {
    if (!sessionId || !fullSessionId || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/interview/e2e/oa/submit/aptitude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers: aptAnswers, violations }),
      });
      if (!res.ok) throw new Error("Aptitude submit failed");
      toast.success(auto ? "Aptitude auto-submitted." : "OA complete.");
      setView("transition");
      await fetch("/api/interview/link-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullSessionId,
          roundType: "oa",
          roundSessionId: sessionId,
        }),
      });
      toast.info("Starting live AI interview — same permissions.");
      router.push(`/dashboard/interview/ai?fullSessionId=${fullSessionId}`);
    } catch {
      toast.error("Failed to submit aptitude.");
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "completed")
      return (
        <span className="text-[11px] font-medium text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full">
          Completed
        </span>
      );
    if (status === "in_progress")
      return (
        <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
          Active
        </span>
      );
    return (
      <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2.5 py-0.5 rounded-full">
        Locked
      </span>
    );
  };

  if (authLoading || view === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const timer =
    view === "mcq" ? mcqTime : view === "coding" ? codingTime : view === "aptitude" ? aptTime : 0;

  const mcqStatus = session?.mcqStatus || "not_started";
  const codingStatus = session?.codingStatus || "not_started";
  const aptStatus = session?.aptitudeStatus || "not_started";

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-auto bg-[#FAFAFA]">
      <ExamFullscreenGate active={view !== "transition"} />
      <div className="relative mx-auto max-w-7xl space-y-4 px-4 py-4 pb-28 sm:px-6 lg:px-8 min-h-full">
      <div className="sticky top-0 z-40 flex items-center justify-between rounded-lg border border-[#ECECEC] bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <div>
            <p className="text-xs font-semibold text-[#111111]">Full Interview · OA Round</p>
            <p className="text-[11px] text-[#9CA3AF]">Permissions locked in · Proctored</p>
          </div>
          {view !== "overview" && view !== "transition" && (
            <span className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-[#ECECEC] bg-[#F9FAFB] px-2.5 py-1 text-xs font-semibold text-blue-600">
              <Clock className="h-3.5 w-3.5" /> {fmt(timer)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 text-[11px] sm:flex">
            <span className="inline-flex items-center gap-1 text-green-600">
              <Video className="h-3 w-3" /> Cam
            </span>
            <span className="inline-flex items-center gap-1 text-green-600">
              <Mic className="h-3 w-3" /> Mic
            </span>
            <span className="inline-flex items-center gap-1 text-green-600">
              <Monitor className="h-3 w-3" /> Screen
            </span>
          </div>
          <button
            onClick={() => void handleEndTest(false)}
            disabled={ending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            {ending ? "Ending..." : "End Test"}
          </button>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-50 w-40 overflow-hidden rounded-lg border border-[#ECECEC] bg-black shadow-lg">
        <video
          ref={camRef}
          autoPlay
          playsInline
          muted
          className="h-28 w-full scale-x-[-1] object-cover"
        />
        <div className="flex items-center gap-1 bg-white px-2 py-1 text-[10px] font-semibold text-[#6B7280]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          Live camera
        </div>
      </div>

      {warning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-[#ECECEC] bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-bold text-[#111111]">Proctoring alert</h3>
            </div>
            {warning.type === "tab" && (
              <p className="text-sm text-[#6B7280]">
                Tab switch detected ({warning.count}/5).
              </p>
            )}
            {warning.type === "fullscreen" && (
              <p className="text-sm text-[#6B7280]">Fullscreen required. Re-enter to continue.</p>
            )}
            {warning.type === "screenshare" && (
              <p className="text-sm text-[#6B7280]">
                Screen share stopped. Restore within {screenGrace}s.
              </p>
            )}
            <div className="flex justify-end gap-2">
              {warning.type === "fullscreen" && (
                <button
                  onClick={() => void proctoring.enterFullscreen().then(() => setWarning(null))}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  Re-enter Fullscreen
                </button>
              )}
              {warning.type === "screenshare" && (
                <button
                  onClick={async () => {
                    const ok = await proctoring.requestScreenShare();
                    if (ok) {
                      if (screenGraceRef.current) clearInterval(screenGraceRef.current);
                      setWarning(null);
                    }
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  Restore Screen Share
                </button>
              )}
              {warning.type === "tab" && (
                <button
                  onClick={() => setWarning(null)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  I Understand
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {view === "overview" && (
        <div className="space-y-6 rounded-lg border border-[#ECECEC] bg-white p-6">
          <div>
            <h2 className="text-base font-semibold text-[#111111]">Assessment Rounds</h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Complete OA sections in order, then continue to the live AI interview.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="border border-[#ECECEC] rounded-lg p-5 flex flex-col justify-between min-h-[170px]">
              <div>
                <div className="flex justify-between items-start">
                  <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                    <HelpCircle className="w-4 h-4" />
                  </span>
                  {statusBadge(mcqStatus === "not_started" ? "in_progress" : mcqStatus)}
                </div>
                <h3 className="text-sm font-semibold mt-3">MCQ Section</h3>
                <p className="text-xs text-[#9CA3AF] mt-1">{mcqs.length} questions · 15 mins</p>
              </div>
              <button
                disabled={mcqStatus === "completed"}
                onClick={() => setView("mcq")}
                className="w-full mt-4 py-1.5 bg-blue-600 disabled:bg-gray-100 disabled:text-gray-400 text-white font-medium text-xs rounded-md"
              >
                {mcqStatus === "completed" ? "Completed" : "Start MCQ"}
              </button>
            </div>

            <div
              className={cn(
                "border border-[#ECECEC] rounded-lg p-5 flex flex-col justify-between min-h-[170px]",
                mcqStatus !== "completed" && "opacity-70"
              )}
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                    <Code2 className="w-4 h-4" />
                  </span>
                  {statusBadge(
                    mcqStatus !== "completed"
                      ? "not_started"
                      : codingStatus === "not_started"
                        ? "in_progress"
                        : codingStatus
                  )}
                </div>
                <h3 className="text-sm font-semibold mt-3">Coding Section</h3>
                <p className="text-xs text-[#9CA3AF] mt-1">{codingQs.length} problems · run & submit</p>
              </div>
              <button
                disabled={mcqStatus !== "completed" || codingStatus === "completed"}
                onClick={() => setView("coding")}
                className="w-full mt-4 py-1.5 bg-blue-600 disabled:bg-gray-100 disabled:text-gray-400 text-white font-medium text-xs rounded-md"
              >
                {codingStatus === "completed"
                  ? "Completed"
                  : mcqStatus !== "completed"
                    ? "Locked"
                    : "Enter Coding"}
              </button>
            </div>

            <div
              className={cn(
                "border border-[#ECECEC] rounded-lg p-5 flex flex-col justify-between min-h-[170px]",
                codingStatus !== "completed" && "opacity-70"
              )}
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                    <Brain className="w-4 h-4" />
                  </span>
                  {statusBadge(
                    codingStatus !== "completed"
                      ? "not_started"
                      : aptStatus === "not_started"
                        ? "in_progress"
                        : aptStatus
                  )}
                </div>
                <h3 className="text-sm font-semibold mt-3">Aptitude Section</h3>
                <p className="text-xs text-[#9CA3AF] mt-1">{apts.length} questions · 12 mins</p>
              </div>
              <button
                disabled={codingStatus !== "completed" || aptStatus === "completed"}
                onClick={() => setView("aptitude")}
                className="w-full mt-4 py-1.5 bg-blue-600 disabled:bg-gray-100 disabled:text-gray-400 text-white font-medium text-xs rounded-md"
              >
                {aptStatus === "completed"
                  ? "Completed"
                  : codingStatus !== "completed"
                    ? "Locked"
                    : "Enter Aptitude"}
              </button>
            </div>

            <div className="border border-[#ECECEC] rounded-lg p-5 flex flex-col justify-between min-h-[170px] opacity-70">
              <div>
                <div className="flex justify-between items-start">
                  <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                    <Bot className="w-4 h-4" />
                  </span>
                  {statusBadge("not_started")}
                </div>
                <h3 className="text-sm font-semibold mt-3">Live AI Interview</h3>
                <p className="text-xs text-[#9CA3AF] mt-1">Starts automatically after aptitude</p>
              </div>
              <button
                disabled
                className="w-full mt-4 py-1.5 bg-gray-100 text-gray-400 font-medium text-xs rounded-md"
              >
                Locked until OA finishes
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "mcq" && mcqs[mcqIdx] && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white rounded-lg border border-[#ECECEC] p-6 space-y-6 min-h-[480px]">
            <div className="flex items-center justify-between border-b border-[#ECECEC] pb-4">
              <div>
                <h2 className="text-[16px] font-semibold">MCQ Section</h2>
                <p className="text-xs text-[#9CA3AF]">
                  Question {mcqIdx + 1} of {mcqs.length} · {mcqs[mcqIdx].skill}
                </p>
              </div>
              <button
                onClick={() => setView("overview")}
                className="text-xs font-semibold text-[#6B7280] border border-[#ECECEC] px-3 py-1.5 rounded-lg"
              >
                Overview
              </button>
            </div>
            <h3 className="text-sm font-semibold text-[#111111]">{mcqs[mcqIdx].question}</h3>
            <div className="space-y-2">
              {mcqs[mcqIdx].options.map((opt, i) => {
                const selected = mcqAnswers[mcqs[mcqIdx].id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() =>
                      setMcqAnswers((a) => ({ ...a, [mcqs[mcqIdx].id]: opt }))
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm",
                      selected
                        ? "border-blue-600 bg-blue-50/40"
                        : "border-[#ECECEC] text-[#6B7280]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold",
                        selected ? "border-blue-600 bg-blue-600 text-white" : "border-[#ECECEC]"
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between border-t border-[#ECECEC] pt-4">
              <button
                disabled={mcqIdx === 0}
                onClick={() => setMcqIdx((i) => i - 1)}
                className="rounded-lg border border-[#ECECEC] px-4 py-2 text-xs font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              {mcqIdx < mcqs.length - 1 ? (
                <button
                  onClick={() => setMcqIdx((i) => i + 1)}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white"
                >
                  Next
                </button>
              ) : (
                <button
                  disabled={submitting}
                  onClick={() => void submitMCQ(false)}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white"
                >
                  {submitting ? "Submitting..." : "Submit MCQ"}
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#ECECEC] p-4">
            <h4 className="text-xs font-semibold text-[#111111] mb-3">Question Grid</h4>
            <div className="grid grid-cols-5 gap-2">
              {mcqs.map((q, idx) => {
                const answered = Boolean(mcqAnswers[q.id]);
                const current = idx === mcqIdx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setMcqIdx(idx)}
                    className={cn(
                      "h-9 rounded-md text-xs font-semibold border",
                      current && "border-blue-600 bg-blue-600 text-white",
                      !current && answered && "border-green-200 bg-green-50 text-green-700",
                      !current && !answered && "border-[#ECECEC] text-[#6B7280]"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-4">
              Answered {Object.keys(mcqAnswers).length}/{mcqs.length}
            </p>
          </div>
        </div>
      )}

      {view === "coding" && codingQs[codingIdx] && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {codingQs.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => {
                  setCodingIdx(idx);
                  setRunResults(null);
                  setCodeTab("description");
                  if (!codeByQ[q.id]) {
                    setCodeByQ((p) => ({
                      ...p,
                      [q.id]: getLanguageTemplate(codeLanguage, q),
                    }));
                  }
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border",
                  idx === codingIdx
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-[#6B7280] border-[#ECECEC]"
                )}
              >
                {idx + 1}. {q.title}
              </button>
            ))}
            <button
              onClick={() => setView("overview")}
              className="ml-auto text-xs font-semibold text-[#6B7280] border border-[#ECECEC] px-3 py-1.5 rounded-lg"
            >
              Overview
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[min(720px,calc(100vh-160px))]">
            <div className="lg:col-span-5 bg-white rounded-lg border border-[#ECECEC] flex flex-col overflow-hidden">
              <div className="flex border-b border-[#ECECEC]">
                {(["description", "results"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCodeTab(t)}
                    className={cn(
                      "flex-1 py-3 text-xs font-semibold border-b-2",
                      codeTab === t
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-[#6B7280]"
                    )}
                  >
                    {t === "description" ? "Problem" : "Test Cases"}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-4 text-xs space-y-3">
                {codeTab === "description" ? (
                  <>
                    <div className="flex justify-between items-center">
                      <h2 className="text-sm font-semibold">{codingQs[codingIdx].title}</h2>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {codingQs[codingIdx].difficulty}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-[#111111] leading-relaxed">
                      {codingQs[codingIdx].problemStatement}
                    </p>
                    <div>
                      <p className="font-semibold text-[#111111]">Constraints</p>
                      <ul className="list-disc pl-4 text-[#6B7280]">
                        {codingQs[codingIdx].constraints.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                    {codingQs[codingIdx].examples.map((ex, i) => (
                      <div key={i} className="bg-[#F9FAFB] border border-[#ECECEC] rounded-lg p-3 font-mono">
                        <p className="font-semibold text-[#111111] font-sans">Example {i + 1}</p>
                        <p>Input: {ex.input}</p>
                        <p>Output: {ex.output}</p>
                      </div>
                    ))}
                    <div>
                      <p className="font-semibold text-[#111111] mb-2">Visible test cases</p>
                      {codingQs[codingIdx].testCases
                        .filter((t) => !t.isHidden)
                        .map((t, i) => (
                          <div key={i} className="border border-[#ECECEC] rounded-lg p-2 mb-2 font-mono">
                            <p>Input: {t.input}</p>
                            <p>Expected: {t.output}</p>
                          </div>
                        ))}
                    </div>
                  </>
                ) : running ? (
                  <div className="py-12 text-center text-[#9CA3AF]">Running tests…</div>
                ) : runResults ? (
                  <div className="space-y-3">
                    <p className="text-sm font-bold">
                      {runResults.passed}/{runResults.total} passed · {runResults.compilerStatus}
                    </p>
                    {runResults.results?.map((r: any, i: number) => (
                      <div key={i} className="border border-[#ECECEC] rounded-lg p-3 space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span>Case {i + 1}</span>
                          <span className={r.passed ? "text-green-600" : "text-red-600"}>
                            {r.passed ? "Passed" : "Failed"}
                          </span>
                        </div>
                        <p className="font-mono text-[10px]">Input: {String(r.input).replace(/\n/g, " ")}</p>
                        <p className="font-mono text-[10px]">Expected: {r.expected}</p>
                        <p className="font-mono text-[10px]">Output: {r.output}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-[#9CA3AF]">
                    Run code to see test results.
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-lg border border-[#ECECEC] flex flex-col overflow-hidden relative">
              <div className="flex items-center justify-between p-3 border-b border-[#ECECEC] text-xs gap-2">
                <div className="flex gap-2">
                  <select
                    value={codeLanguage}
                    onChange={(e) => {
                      const lang = e.target.value;
                      setCodeLanguage(lang);
                      setActiveCode(getLanguageTemplate(lang, codingQs[codingIdx]));
                    }}
                    className="bg-white border border-[#ECECEC] rounded px-2 py-1"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                  <select
                    value={editorTheme}
                    onChange={(e) => setEditorTheme(e.target.value)}
                    className="bg-white border border-[#ECECEC] rounded px-2 py-1"
                  >
                    <option value="vs-light">VS Light</option>
                    <option value="vs-dark">VS Dark</option>
                  </select>
                </div>
                <span className="font-semibold text-[#6B7280] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {fmt(codingTime)}
                </span>
              </div>
              <div className="flex-1 min-h-[280px]">
                <Editor
                  height="100%"
                  language={codeLanguage === "cpp" ? "cpp" : codeLanguage}
                  theme={editorTheme}
                  value={activeCode}
                  onChange={(v) => setActiveCode(v || "")}
                  options={{ fontSize: 13, minimap: { enabled: false }, wordWrap: "on" }}
                />
              </div>
              <div className="p-3 border-t border-[#ECECEC] flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-xs text-[#6B7280] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomInput}
                    onChange={(e) => setUseCustomInput(e.target.checked)}
                  />
                  Custom Input
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => void runCode()}
                    disabled={running || submitting}
                    className="inline-flex items-center gap-1 px-4 py-2 border border-[#ECECEC] rounded-lg text-xs font-semibold"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {running ? "Running..." : "Run Code"}
                  </button>
                  <button
                    onClick={() => void submitCurrentCoding()}
                    disabled={running || submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Submit Problem
                  </button>
                  <button
                    onClick={() => void finishCodingRound()}
                    disabled={running || submitting}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Finish Coding Round
                  </button>
                </div>
              </div>
              {useCustomInput && (
                <div className="absolute bottom-16 left-3 right-3 bg-white border border-[#ECECEC] rounded-lg shadow-lg p-3 z-20">
                  <p className="text-[10px] font-bold mb-1">CUSTOM INPUT</p>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="w-full h-20 border border-[#ECECEC] rounded p-2 text-xs font-mono"
                    placeholder="Paste stdin here…"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === "aptitude" && apts[aptIdx] && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white rounded-lg border border-[#ECECEC] p-6 space-y-6 min-h-[480px]">
            <div className="flex items-center justify-between border-b border-[#ECECEC] pb-4">
              <div>
                <h2 className="text-[16px] font-semibold">Aptitude Section</h2>
                <p className="text-xs text-[#9CA3AF]">
                  Question {aptIdx + 1} of {apts.length} · {apts[aptIdx].category}
                </p>
              </div>
            </div>
            <h3 className="text-sm font-semibold">{apts[aptIdx].question}</h3>
            <div className="space-y-2">
              {apts[aptIdx].options.map((opt, i) => {
                const selected = aptAnswers[apts[aptIdx].id] === opt;
                return (
                  <button
                    key={opt + i}
                    onClick={() =>
                      setAptAnswers((a) => ({ ...a, [apts[aptIdx].id]: opt }))
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm",
                      selected
                        ? "border-blue-600 bg-blue-50/40"
                        : "border-[#ECECEC] text-[#6B7280]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold",
                        selected ? "border-blue-600 bg-blue-600 text-white" : "border-[#ECECEC]"
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between border-t border-[#ECECEC] pt-4">
              <button
                disabled={aptIdx === 0}
                onClick={() => setAptIdx((i) => i - 1)}
                className="rounded-lg border border-[#ECECEC] px-4 py-2 text-xs font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              {aptIdx < apts.length - 1 ? (
                <button
                  onClick={() => setAptIdx((i) => i + 1)}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white"
                >
                  Next
                </button>
              ) : (
                <button
                  disabled={submitting}
                  onClick={() => void submitApt(false)}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white"
                >
                  {submitting ? "Finishing..." : "Finish OA → AI Interview"}
                </button>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-[#ECECEC] p-4">
            <h4 className="text-xs font-semibold mb-3">Question Grid</h4>
            <div className="grid grid-cols-5 gap-2">
              {apts.map((q, idx) => {
                const answered = Boolean(aptAnswers[q.id]);
                const current = idx === aptIdx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setAptIdx(idx)}
                    className={cn(
                      "h-9 rounded-md text-xs font-semibold border",
                      current && "border-blue-600 bg-blue-600 text-white",
                      !current && answered && "border-green-200 bg-green-50 text-green-700",
                      !current && !answered && "border-[#ECECEC] text-[#6B7280]"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {view === "transition" && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[#ECECEC] bg-white py-20">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm font-semibold">Entering live AI interview…</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Reusing your camera, mic, and screen share</p>
        </div>
      )}
      </div>
    </div>
  );
}
