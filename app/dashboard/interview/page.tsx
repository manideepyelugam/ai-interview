"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { InterviewConfiguration } from "@/src/components/Dashboard/InterviewConfiguration";
import { useProctoring } from "@/src/components/Interview/ProctoringProvider";
import {
  lockExamFullscreen,
  setExamImmersive,
  unlockExamFullscreen,
} from "@/src/lib/exam-immersive";
import {
  Bot,
  Code2,
  CheckCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Award,
  AlertTriangle,
  Download,
  ChevronRight,
  Loader2,
  RefreshCw,
  Mic,
  Monitor,
  Shield,
  Video,
  CheckCircle2,
  HelpCircle,
  Brain,
} from "lucide-react";
import { toast } from "sonner";

type GateView = "config" | "review" | "permissions" | "rounds" | "lobby" | "hub";

export default function FullInterviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const proctoring = useProctoring();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [gateView, setGateView] = useState<GateView>("config");
  const [countdown, setCountdown] = useState(5);

  const previewRef = useRef<HTMLVideoElement>(null);
  const startedRef = useRef(false);
  const { perms, cameraStream } = proctoring;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sId = params.get("sessionId");
    if (sId) {
      setSessionId(sId);
      fetchSession(sId);
    } else {
      localStorage.removeItem("interview_context_full");
      setContext(null);
      setSessionId(null);
      setSession(null);
      setGateView("config");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (previewRef.current && cameraStream) {
      previewRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, gateView]);

  const fetchSession = async (id: string) => {
    try {
      const res = await fetch(`/api/interview/session?sessionId=${id}`);
      if (!res.ok) throw new Error("Failed to load Full Interview session.");
      const data = await res.json();
      const sess = data.session;
      setSession(sess);
      setGateView("hub");

      if (sess.status !== "completed") {
        if (
          (sess.currentRound === "ai" || sess.oaSessionId) &&
          !sess.aiSessionId &&
          sess.oaSessionId
        ) {
          toast.success("OA complete. Starting AI Interview round...");
          setTimeout(() => {
            router.push(`/dashboard/interview/ai?fullSessionId=${id}`);
          }, 900);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load session.");
    } finally {
      setLoading(false);
    }
  };

  const startCountdownAndLaunch = async () => {
    if (!proctoring.isReady) {
      toast.error("Grant camera, microphone, and screen share first.");
      return;
    }
    // User gesture → lock fullscreen immediately before countdown/navigation
    setExamImmersive(true);
    await lockExamFullscreen();
    setGateView("lobby");
    setCountdown(5);
    startedRef.current = false;

    let remaining = 5;
    const interval = setInterval(() => {
      remaining -= 1;
      setCountdown(Math.max(remaining, 0));
      if (remaining <= 0) {
        clearInterval(interval);
        if (!startedRef.current) {
          startedRef.current = true;
          launchFullInterview();
        }
      }
    }, 1000);
  };

  const launchFullInterview = async () => {
    const savedContext =
      context ||
      (typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("interview_context_full") || "null")
        : null);
    if (!savedContext || !user) {
      toast.error("Missing interview context.");
      setGateView("review");
      return;
    }

    setStarting(true);
    try {
      setExamImmersive(true);
      await lockExamFullscreen();
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.$id,
          context: savedContext,
        }),
      });
      if (!res.ok) throw new Error("Failed to start Full E2E Interview.");
      const data = await res.json();
      localStorage.removeItem("interview_context_full");

      toast.success("Entering fullscreen assessment…");
      router.push(`/dashboard/interview/oa?fullSessionId=${data.sessionId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start interview.");
      setGateView("rounds");
      setStarting(false);
    }
  };

  const handleContinueRound = () => {
    if (!sessionId || !session) return;
    if (!session.oaSessionId) {
      router.push(`/dashboard/interview/oa?fullSessionId=${sessionId}`);
      return;
    }
    if (!session.aiSessionId) {
      router.push(`/dashboard/interview/ai?fullSessionId=${sessionId}`);
      return;
    }
    handleEndTest();
  };

  const handleEndTest = async () => {
    if (!sessionId) return;
    const ok = window.confirm(
      "End the full interview now? Partial results from completed rounds will be used for your report."
    );
    if (!ok) return;

    setEnding(true);
    try {
      const res = await fetch("/api/interview/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullSessionId: sessionId }),
      });
      if (!res.ok) throw new Error("Failed to finalize interview.");
      const data = await res.json();
      setSession(data.session);
      toast.success("Interview ended. Your results are ready.");
      setExamImmersive(false);
      unlockExamFullscreen();
    } catch (err: any) {
      toast.error(err.message || "Failed to end test.");
    } finally {
      setEnding(false);
    }
  };

  const handleResetAll = () => {
    proctoring.stopAll();
    setExamImmersive(false);
    unlockExamFullscreen();
    localStorage.removeItem("interview_context_full");
    setSessionId(null);
    setSession(null);
    setContext(null);
    setGateView("config");
    router.push("/dashboard/interview");
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-xs">Loading Full Interview Session...</span>
      </div>
    );
  }

  // ─── CONFIGURATION ───
  if (!sessionId && gateView === "config" && !context) {
    return (
      <div className="max-w-8xl mx-auto pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">
            Full End-to-End Interview
          </h1>
          <p className="text-[#6B7280] mt-1 text-[13px]">
            Proctored OA + live AI interview — configure your role, then enter the exam room.
          </p>
        </div>
        <InterviewConfiguration
          interviewType="full"
          onConfigurationComplete={() => {
            const savedContext = localStorage.getItem("interview_context_full");
            if (savedContext) {
              setContext(JSON.parse(savedContext));
              setGateView("review");
            }
          }}
        />
      </div>
    );
  }

  // ─── REVIEW CONTEXT ───
  if (
    !sessionId &&
    (gateView === "review" || context) &&
    gateView !== "permissions" &&
    gateView !== "rounds" &&
    gateView !== "lobby"
  ) {
    const ctx = context;
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="bg-white border border-[#ECECEC] rounded-lg p-8">
          <h2 className="text-lg font-semibold text-[#111111] mb-2">Ready to Start</h2>
          <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
            You are about to start a proctored end-to-end interview for{" "}
            <span className="font-semibold text-[#111111]">{ctx?.role || "Software Developer"}</span>.
            Rounds: <strong>Online Assessment</strong> → <strong>AI Interview</strong>.
          </p>

          <div className="bg-[#F9FAFB] border border-[#ECECEC] rounded-lg p-5 mb-6 space-y-3 text-sm">
            <div>
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider block">
                Target Role
              </span>
              <span className="font-medium text-[#111111]">{ctx?.role || "Software Developer"}</span>
            </div>
            <div className="flex gap-4 text-xs text-[#6B7280]">
              <span className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-blue-500" /> Round 1: OA
              </span>
              <span className="flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-blue-500" /> Round 2: AI Interview
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setContext(null);
                setGateView("config");
                handleResetAll();
              }}
              className="text-xs font-medium text-[#6B7280] hover:text-[#111111] flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Reconfigure
            </button>
            <button
              onClick={() => setGateView("permissions")}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2"
            >
              Continue to Exam Setup <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── PERMISSIONS GATE ───
  if (!sessionId && gateView === "permissions") {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#111111]">Proctoring Setup</h1>
            <p className="text-sm text-[#6B7280] mt-1">
              Camera, microphone, and screen share are required before the interview starts.
            </p>
          </div>
          <button
            onClick={() => setGateView("review")}
            className="text-xs font-medium text-[#6B7280] border border-[#ECECEC] px-3 py-1.5 rounded-lg hover:bg-white"
          >
            Back
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#ECECEC] rounded-lg p-6 space-y-4">
            {[
              { key: "camera", label: "Camera Access", desc: "Live candidate verification", icon: Video },
              { key: "mic", label: "Microphone Access", desc: "Required for the AI interview round", icon: Mic },
              { key: "screen", label: "Entire Screen Share", desc: "Must share your full screen — tabs/windows are rejected", icon: Monitor },
            ].map((item) => {
              const granted = perms[item.key as keyof typeof perms];
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between border border-[#F3F4F6] rounded-lg p-4"
                >
                  <div className="flex gap-3">
                    <div className="p-2 bg-slate-100 rounded-md">
                      <Icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#111111]">{item.label}</p>
                      <p className="text-[11px] text-[#6B7280]">{item.desc}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      granted ? "bg-green-50 text-green-600" : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {granted ? "Granted" : "Required"}
                  </span>
                </div>
              );
            })}

            <button
              onClick={() => void proctoring.requestDevices()}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 rounded-lg"
            >
              Request Camera & Microphone
            </button>
            <button
              onClick={() => void proctoring.requestScreenShare()}
              disabled={!perms.camera}
              className="w-full bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg"
            >
              Enable Screen Sharing
            </button>
          </div>

          <div className="bg-white border border-[#ECECEC] rounded-lg p-6 flex flex-col">
            <h2 className="text-sm font-semibold text-[#111111] mb-3">Camera Preview</h2>
            <div className="relative aspect-video bg-[#111111] rounded-lg overflow-hidden mb-4">
              <video
                ref={previewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {!perms.camera && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Video className="w-8 h-8 opacity-40" />
                  <span className="text-xs">Camera offline</span>
                </div>
              )}
            </div>
            <div className="space-y-2 text-xs text-[#6B7280] mb-6 flex-1">
              <p className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                Permissions are requested once for the entire interview.
              </p>
              <p className="flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5 text-blue-500" />
                Keep screen sharing active through OA and AI.
              </p>
              <p className="flex items-center gap-2">
                <Video className="w-3.5 h-3.5 text-blue-500" />
                Stay in fullscreen during both rounds.
              </p>
            </div>
            <button
              onClick={() => setGateView("rounds")}
              disabled={!proctoring.isReady}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg"
            >
              Continue to Rounds Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ROUNDS OVERVIEW (after permissions) ───
  if (!sessionId && gateView === "rounds") {
    const rounds = [
      {
        title: "MCQ Section",
        desc: "Technical multiple choice · 15 questions · ~15 mins",
        icon: HelpCircle,
        badge: "OA · Part 1",
      },
      {
        title: "Coding Section",
        desc: "Programming problems · run & submit · ~30 mins",
        icon: Code2,
        badge: "OA · Part 2",
      },
      {
        title: "Aptitude Section",
        desc: "Logical & numerical reasoning · 10 questions · ~12 mins",
        icon: Brain,
        badge: "OA · Part 3",
      },
      {
        title: "Live AI Interview",
        desc: "Proctored voice interview with the AI interviewer",
        icon: Bot,
        badge: "Round 2",
      },
    ];
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#111111]">Interview Rounds</h1>
            <p className="text-sm text-[#6B7280] mt-1">
              Permissions granted. Complete these rounds in order — you will not be asked again.
            </p>
          </div>
          <button
            onClick={() => setGateView("permissions")}
            className="text-xs font-medium text-[#6B7280] border border-[#ECECEC] px-3 py-1.5 rounded-lg hover:bg-white"
          >
            Back
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {rounds.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className="bg-white border border-[#ECECEC] rounded-lg p-5 flex flex-col justify-between min-h-[150px]"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {r.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#111111] mt-3">{r.title}</h3>
                  <p className="text-xs text-[#9CA3AF] mt-1">{r.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white border border-[#ECECEC] rounded-lg p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#6B7280]">
            Your camera, mic, and screen share stay active for the full session.
          </p>
          <button
            onClick={startCountdownAndLaunch}
            disabled={starting || !proctoring.isReady}
            className="px-6 py-2.5 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
          >
            {starting ? "Starting..." : "Begin Assessment"}
          </button>
        </div>
      </div>
    );
  }

  // ─── LOBBY COUNTDOWN ───
  if (!sessionId && gateView === "lobby") {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="bg-white border border-[#ECECEC] rounded-lg p-10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-500 mb-2">
            Interview Starting
          </p>
          <h2 className="text-xl font-semibold text-[#111111] mb-6">
            Locking into proctored mode
          </h2>
          <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center border-4 border-slate-100 rounded-full">
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            <span className="text-4xl font-bold text-[#111111]">{countdown}</span>
          </div>
          <p className="text-xs text-[#6B7280]">
            Round 1 (OA) opens next. After you finish OA, Round 2 (AI Interview) starts automatically.
          </p>
        </div>
      </div>
    );
  }

  // ─── HUB / RESULTS ───
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <p className="text-sm text-[#6B7280]">Session not found.</p>
        <button
          onClick={handleResetAll}
          className="text-xs text-blue-600 font-medium"
        >
          Start a new interview
        </button>
      </div>
    );
  }

  const isCompleted = session.status === "completed";
  const summary = session.report?.candidateSummary || {
    overallScore: session.evaluation?.overallScore || 0,
    technicalScore: 0,
    communicationScore: 0,
    problemSolvingScore: 0,
    confidenceScore: 0,
    duration: "—",
  };

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-[#ECECEC] pb-6">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full mb-2 inline-block">
            Full End-to-End Interview
          </span>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight mt-1">
            {session.blueprint.role}
          </h1>
          <p className="text-[#6B7280] text-xs mt-1">
            Candidate:{" "}
            <span className="font-semibold text-slate-800">
              {session.blueprint.candidateName}
            </span>{" "}
            · {new Date(session.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg transition"
            >
              <Download className="w-4 h-4 text-slate-500" /> Export PDF
            </button>
          ) : (
            <>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                In Progress
              </span>
              <button
                onClick={handleEndTest}
                disabled={ending}
                className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-4 py-2 rounded-lg font-semibold transition"
              >
                {ending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                End Test
              </button>
            </>
          )}
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg"
          >
            Exit
          </button>
        </div>
      </div>

      {!isCompleted && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-[#ECECEC] rounded-lg p-6">
              <h2 className="text-sm font-bold text-[#111111] mb-1">Assessment Rounds</h2>
              <p className="text-xs text-slate-500 mb-6">
                Complete OA, then the live AI interview. Results unlock when both rounds finish — or
                use End Test anytime.
              </p>

              {/* OA */}
              <div className="relative flex gap-5 border-l-2 border-slate-100 pb-8 pl-6 ml-4">
                <div
                  className={`absolute -left-[13px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    session.oaSessionId
                      ? "bg-green-500 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {session.oaSessionId ? <CheckCircle className="w-4 h-4" /> : "1"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800">
                      Round 1: Online Assessment
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        session.oaSessionId
                          ? "bg-green-50 text-green-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {session.oaSessionId ? "Completed" : "Current"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    MCQ, coding, and aptitude — proctored with tab monitoring.
                  </p>
                  {!session.oaSessionId && (
                    <button
                      onClick={handleContinueRound}
                      className="mt-3 flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg"
                    >
                      Enter OA Round <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* AI */}
              <div className="relative flex gap-5 pl-6 ml-4">
                <div
                  className={`absolute -left-[13px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    session.aiSessionId
                      ? "bg-green-500 text-white"
                      : !session.oaSessionId
                        ? "bg-slate-100 text-slate-400"
                        : "bg-blue-600 text-white"
                  }`}
                >
                  {session.aiSessionId ? <CheckCircle className="w-4 h-4" /> : "2"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800">
                      Round 2: Live AI Interview
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        session.aiSessionId
                          ? "bg-green-50 text-green-600"
                          : !session.oaSessionId
                            ? "bg-slate-100 text-slate-400"
                            : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {session.aiSessionId
                        ? "Completed"
                        : !session.oaSessionId
                          ? "Locked"
                          : "Ready"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Live TTS/STT technical interview with camera, mic, and screen share.
                  </p>
                  {session.oaSessionId && !session.aiSessionId && (
                    <button
                      onClick={handleContinueRound}
                      className="mt-3 flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg"
                    >
                      Enter AI Round <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-[#F9FAFB] border border-[#ECECEC] rounded-lg p-6 text-center">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                Status
              </span>
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto my-5 border-4 border-white">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xs font-bold text-slate-800">
                {!session.oaSessionId
                  ? "OA Round Pending"
                  : !session.aiSessionId
                    ? "AI Round Pending"
                    : "Ready to Finalize"}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Use <strong>End Test</strong> anytime to stop and view available results.
              </p>
              <button
                onClick={handleEndTest}
                disabled={ending}
                className="mt-4 w-full text-xs font-semibold text-rose-600 bg-white border border-rose-100 hover:bg-rose-50 py-2 rounded-lg"
              >
                {ending ? "Ending..." : "End Test & View Results"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-[#ECECEC] rounded-lg p-6 text-center shadow-sm">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                Overall score
              </span>
              <div className="relative w-28 h-28 flex items-center justify-center bg-blue-50 border-4 border-white shadow-md rounded-full mx-auto my-5">
                <span className="text-2xl font-extrabold text-blue-600">
                  {summary.overallScore}%
                </span>
              </div>
              <span
                className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase border ${
                  session.evaluation?.passed
                    ? "bg-green-50 text-green-600 border-green-200"
                    : "bg-rose-50 text-rose-600 border-rose-200"
                }`}
              >
                {session.evaluation?.passed ? "Passed" : "Needs Review"}
              </span>
            </div>

            <div className="bg-white border border-[#ECECEC] rounded-lg p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                Completed Rounds
              </h3>
              {session.oaSessionId ? (
                <a
                  href={`/dashboard/interview/oa?sessionId=${session.oaSessionId}&fullSessionId=${sessionId}`}
                  className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold text-slate-700">Online Assessment</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </a>
              ) : (
                <p className="text-[11px] text-slate-400 px-2">OA not completed</p>
              )}
              {session.aiSessionId ? (
                <a
                  href={`/dashboard/interview/ai?sessionId=${session.aiSessionId}&fullSessionId=${sessionId}`}
                  className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold text-slate-700">AI Technical Round</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </a>
              ) : (
                <p className="text-[11px] text-slate-400 px-2">AI round not completed</p>
              )}
            </div>

            <button
              onClick={handleResetAll}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-600 border border-[#ECECEC] hover:bg-slate-50 py-2 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Start New Assessment
            </button>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white border border-[#ECECEC] rounded-lg p-6">
              <h3 className="text-sm font-bold text-[#111111] mb-5 border-b border-slate-100 pb-3">
                Performance Breakdown
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Technical
                  </span>
                  <span className="text-xl font-extrabold text-slate-800 mt-1 block">
                    {summary.technicalScore}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Problem Solving
                  </span>
                  <span className="text-xl font-extrabold text-slate-800 mt-1 block">
                    {summary.problemSolvingScore}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Communication
                  </span>
                  <span className="text-xl font-extrabold text-slate-800 mt-1 block">
                    {summary.communicationScore}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Confidence
                  </span>
                  <span className="text-xl font-extrabold text-slate-800 mt-1 block">
                    {summary.confidenceScore}%
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-[#ECECEC] rounded-lg p-6">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-green-600 mb-4 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Strengths
                </h3>
                <ul className="space-y-3 text-xs text-slate-600">
                  {(session.report?.strengths || []).map((str: string, i: number) => (
                    <li key={i} className="flex gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white border border-[#ECECEC] rounded-lg p-6">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-rose-600 mb-4 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Growth Areas
                </h3>
                <ul className="space-y-3 text-xs text-slate-600">
                  {(session.report?.weaknesses || []).map((weak: string, i: number) => (
                    <li key={i} className="flex gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                      <span>{weak}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-white border border-[#ECECEC] rounded-lg p-6">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 mb-4 flex items-center gap-1.5">
                <Award className="w-4 h-4" /> Recommendations
              </h3>
              <ul className="space-y-3 text-xs text-slate-600">
                {(session.report?.recommendations || []).map((rec: string, i: number) => (
                  <li key={i} className="flex gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Round summaries */}
            {(session.report?.roundSummaries || []).length > 0 && (
              <div className="bg-white border border-[#ECECEC] rounded-lg p-6">
                <h3 className="text-sm font-bold text-[#111111] mb-4 border-b border-slate-100 pb-3">
                  Round Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {session.report.roundSummaries.map((r: any, i: number) => (
                    <div key={i} className="border border-[#ECECEC] rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#111111]">{r.name}</h4>
                        <span className="text-sm font-extrabold text-blue-600">{r.score}%</span>
                      </div>
                      <p className="text-[11px] text-[#6B7280]">
                        Attempted {r.attempted} · Correct {r.correct} · Wrong {r.wrong} · Skipped{" "}
                        {r.skipped}
                      </p>
                      <ul className="space-y-1">
                        {(r.improvements || []).map((imp: string, j: number) => (
                          <li key={j} className="text-[11px] text-[#6B7280] flex gap-1.5">
                            <span className="text-amber-500">→</span> {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per-question / per-section detail */}
            {(session.report?.sections || []).map((sec: any) => (
              <div key={sec.id} className="bg-white border border-[#ECECEC] rounded-lg p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#111111]">{sec.title}</h3>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">{sec.summary}</p>
                  </div>
                  <span className="text-lg font-extrabold text-blue-600">{sec.score}%</span>
                </div>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {(sec.items || []).map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="border border-[#ECECEC] rounded-lg p-3 space-y-1.5 text-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-[#111111] leading-relaxed">
                          {idx + 1}. {item.question}
                        </p>
                        <span
                          className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            item.status === "correct" || item.status === "strong"
                              ? "bg-green-50 text-green-700"
                              : item.status === "partial" || item.status === "average"
                                ? "bg-amber-50 text-amber-700"
                                : item.status === "skipped"
                                  ? "bg-gray-50 text-gray-500"
                                  : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {item.status || `${item.score ?? 0}%`}
                        </span>
                      </div>
                      {item.answer && (
                        <p className="text-[#6B7280]">
                          <span className="font-semibold text-[#111111]">Your answer: </span>
                          {item.answer}
                        </p>
                      )}
                      {item.correctAnswer && item.status !== "correct" && (
                        <p className="text-green-700">
                          <span className="font-semibold">Correct: </span>
                          {item.correctAnswer}
                        </p>
                      )}
                      {item.testCasesPassed != null && (
                        <p className="text-[#6B7280]">
                          Test cases: {item.testCasesPassed}/{item.totalTestCases}
                          {item.language ? ` · ${item.language}` : ""}
                        </p>
                      )}
                      {item.feedback && (
                        <p className="text-[#6B7280] bg-[#F9FAFB] rounded-md p-2 leading-relaxed">
                          {item.feedback}
                        </p>
                      )}
                      {item.explanation && item.status === "wrong" && (
                        <p className="text-[11px] text-[#9CA3AF]">{item.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
