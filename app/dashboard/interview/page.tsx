"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { InterviewConfiguration } from "@/src/components/Dashboard/InterviewConfiguration";
import {
  Briefcase,
  Bot,
  Code2,
  Volume2,
  CheckCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  LogOut,
  TrendingUp,
  Award,
  AlertTriangle,
  Download,
  ExternalLink,
  ChevronRight,
  Loader2,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

export default function FullInterviewPage() {
  const { user, loading: authLoading } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  // Load parent session details on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
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
        setLoading(false);
      }
    }
  }, []);

  const fetchSession = async (id: string) => {
    try {
      const res = await fetch(`/api/interview/session?sessionId=${id}`);
      if (!res.ok) throw new Error("Failed to load Full Interview session.");
      const data = await res.json();
      setSession(data.session);
    } catch (err: any) {
      toast.error(err.message || "Failed to load session.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartRound = (roundType: "oa" | "ai" | "audio") => {
    if (!sessionId) return;
    toast.success(`Opening ${roundType.toUpperCase()} assessment round...`);
    setTimeout(() => {
      window.location.href = `/dashboard/${roundType}?fullSessionId=${sessionId}`;
    }, 800);
  };

  const handleStartFullInterview = async () => {
    const savedContext = localStorage.getItem("interview_context_full");
    if (!savedContext || !user) return;
    setStarting(true);
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.$id,
          context: JSON.parse(savedContext)
        })
      });
      if (!res.ok) throw new Error("Failed to start Full E2E Interview.");
      const data = await res.json();
      localStorage.removeItem("interview_context_full");
      toast.success("Full End-to-End Interview session started!");
      setTimeout(() => {
        window.location.href = `/dashboard/interview?sessionId=${data.sessionId}`;
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "Failed to start interview.");
    } finally {
      setStarting(false);
    }
  };

  const handleResetAll = () => {
    localStorage.removeItem("interview_context_full");
    setSessionId(null);
    setSession(null);
    setContext(null);
    window.location.href = "/dashboard/interview";
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-xs">Loading Full Interview Session...</span>
      </div>
    );
  }

  // ─── CONFIGURATION VIEW ───
  if (!sessionId && !context) {
    return (
      <div className="max-w-8xl mx-auto pb-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Setup Full E2E Assessment</h1>
            <p className="text-[#6B7280] mt-1 text-[13px]">
              Provide a JD, Resume, or select a role to configure your comprehensive multi-round practice loop.
            </p>
          </div>
       
        </div>
        <InterviewConfiguration
          interviewType="full"
          onConfigurationComplete={() => {
            const savedContext = localStorage.getItem("interview_context_full");
            if (savedContext) {
              setContext(JSON.parse(savedContext));
            }
          }}
        />
      </div>
    );
  }

  // ─── SETUP / START LAUNCHER VIEW ───
  if (!sessionId && context) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-2">Ready to Start Interview</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            You are about to start a Full End-to-End mock interview for the role of <span className="font-semibold text-slate-800">{context.role || "Software Developer"}</span>.
            This assessment will guide you sequentially through an Online Coding Assessment, a proctored AI round, and an Audio behavioral round.
          </p>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 mb-8 space-y-3.5 text-xs text-slate-700">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Target Position</span>
              <span className="font-semibold text-slate-800">{context.role || "Software Developer"}</span>
            </div>
            {context.jd?.requiredSkills && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Required Skills</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {context.jd.requiredSkills.map((sk: string, i: number) => (
                    <span key={i} className="bg-white px-2 py-0.5 border border-slate-200 rounded-md text-[10px]">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => window.location.href = "/dashboard"}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Exit to Dashboard
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={handleResetAll}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
              >
                Reconfigure
              </button>
              <button
                onClick={handleStartFullInterview}
                disabled={starting}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-md transition flex items-center gap-2"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting...
                  </>
                ) : (
                  <>
                    Start E2E Interview <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── MASTER SESSION DASHBOARD VIEW ───
  const isCompleted = session.status === "completed";
  const summary = session.report?.candidateSummary || {
    overallScore: 0,
    technicalScore: 0,
    communicationScore: 0,
    problemSolvingScore: 0,
    confidenceScore: 0,
    duration: "45 Mins"
  };

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-[#ECECEC] pb-6">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full mb-2 inline-block">
            Full End-to-End Interview
          </span>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight mt-1">
            {session.blueprint.role}
          </h1>
          <p className="text-[#6B7280] text-xs mt-1">
            Candidate: <span className="font-semibold text-slate-800">{session.blueprint.candidateName}</span> · Created {new Date(session.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl transition"
            >
              <Download className="w-4 h-4 text-slate-500" /> Export PDF
            </button>
          ) : (
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-100 animate-pulse">
              Interview In Progress
            </span>
          )}
          <button
            onClick={() => window.location.href = "/dashboard"}
            className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl transition shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" /> Exit
          </button>
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Start New Assessment
          </button>
        </div>
      </div>

      {/* VIEW: IN PROGRESS STEPPER */}
      {!isCompleted && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-[#111111] mb-2">Your Assessment Rounds</h2>
              <p className="text-xs text-slate-500 mb-6">
                You must complete all three sequential interview rounds to receive your consolidated evaluation and master report.
              </p>

              {/* Step 1: OA */}
              <div className="relative flex gap-5 border-l-2 border-slate-100 pb-8 pl-6 ml-4">
                <div className={`absolute -left-[13px] top-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${session.oaSessionId ? "bg-green-500 text-white" : "bg-blue-600 text-white"}`}>
                  {session.oaSessionId ? <CheckCircle className="w-4 h-4" /> : "1"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800">Round 1: Online Assessment (OA)</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${session.oaSessionId ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"}`}>
                      {session.oaSessionId ? "Completed" : "Ready"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-md">
                    20-minute round containing MCQs, dynamic coding questions, and aptitude quizzes tailored to {session.blueprint.role}.
                  </p>
                  {!session.oaSessionId && (
                    <button
                      onClick={() => handleStartRound("oa")}
                      className="mt-3.5 flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg transition"
                    >
                      Start OA Round <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Step 2: AI Tech */}
              <div className="relative flex gap-5 border-l-2 border-slate-100 pb-8 pl-6 ml-4">
                <div className={`absolute -left-[13px] top-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${session.aiSessionId ? "bg-green-500 text-white" : !session.oaSessionId ? "bg-slate-100 text-slate-400" : "bg-blue-600 text-white"}`}>
                  {session.aiSessionId ? <CheckCircle className="w-4 h-4" /> : "2"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800">Round 2: AI Proctoring Technical Round</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${session.aiSessionId ? "bg-green-50 text-green-600" : !session.oaSessionId ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600"}`}>
                      {session.aiSessionId ? "Completed" : !session.oaSessionId ? "Locked" : "Ready"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-md">
                    Interactive technical mock round. Proctored via screen, mic and web camera monitoring to review real-time speech responses.
                  </p>
                  {session.oaSessionId && !session.aiSessionId && (
                    <button
                      onClick={() => handleStartRound("ai")}
                      className="mt-3.5 flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg transition"
                    >
                      Start AI Round <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Step 3: Audio Mock */}
              <div className="relative flex gap-5 pl-6 ml-4">
                <div className={`absolute -left-[13px] top-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${session.audioSessionId ? "bg-green-500 text-white" : !session.aiSessionId ? "bg-slate-100 text-slate-400" : "bg-blue-600 text-white"}`}>
                  {session.audioSessionId ? <CheckCircle className="w-4 h-4" /> : "3"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800">Round 3: Audio/Behavioral Round</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${session.audioSessionId ? "bg-green-50 text-green-600" : !session.aiSessionId ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600"}`}>
                      {session.audioSessionId ? "Completed" : !session.aiSessionId ? "Locked" : "Ready"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-md">
                    Conversational audio round focusing on design principles, behavioral situational questions, and overall speaking patterns.
                  </p>
                  {session.aiSessionId && !session.audioSessionId && (
                    <button
                      onClick={() => handleStartRound("audio")}
                      className="mt-3.5 flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg transition"
                    >
                      Start Audio Round <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 text-center">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Interview Status</span>
              <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mx-auto my-5 border-4 border-white shadow-sm">
                <Clock className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xs font-bold text-slate-800">Awaiting Submissions</h3>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Once you complete the Audio mock interview, your master report will synthesize results instantly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: COMPLETED MASTER REPORT */}
      {isCompleted && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-300">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm text-center">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Overall score</span>
              <div className="relative w-28 h-28 flex items-center justify-center bg-blue-50 border-4 border-white shadow-md rounded-full mx-auto my-5">
                <span className="text-2xl font-extrabold text-blue-600">{summary.overallScore}%</span>
              </div>
              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase border ${session.evaluation?.passed ? "bg-green-50 text-green-600 border-green-200" : "bg-rose-50 text-rose-600 border-rose-200"}`}>
                {session.evaluation?.passed ? "Passed" : "Needs Review"}
              </span>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">Completed Rounds</h3>

              {session.oaSessionId && (
                <a
                  href={`/dashboard/oa?sessionId=${session.oaSessionId}&fullSessionId=${sessionId}`}
                  className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg transition group"
                >
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold text-slate-700">Online Assessment</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </a>
              )}

              {session.aiSessionId && (
                <a
                  href={`/dashboard/ai?sessionId=${session.aiSessionId}&fullSessionId=${sessionId}`}
                  className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg transition group"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold text-slate-700">AI Technical Round</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </a>
              )}

              {session.audioSessionId && (
                <a
                  href={`/dashboard/audio?sessionId=${session.audioSessionId}&fullSessionId=${sessionId}`}
                  className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg transition group"
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold text-slate-700">Audio/Behavioral Round</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </a>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#111111] mb-5 border-b border-slate-100 pb-3">Performance Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Technical skills</span>
                  <span className="text-xl font-extrabold text-slate-800 mt-1 block">{summary.technicalScore}%</span>
                </div>
                <div className="border-l border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Problem solving</span>
                  <span className="text-xl font-extrabold text-slate-800 mt-1 block">{summary.problemSolvingScore}%</span>
                </div>
                <div className="border-l border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Communication</span>
                  <span className="text-xl font-extrabold text-slate-800 mt-1 block">{summary.communicationScore}%</span>
                </div>
                <div className="border-l border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Confidence index</span>
                  <span className="text-xl font-extrabold text-slate-800 mt-1 block">{summary.confidenceScore}%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-green-600 mb-4 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Synthesized Strengths
                </h3>
                <ul className="space-y-3.5 text-xs text-slate-600">
                  {session.report?.strengths?.map((str: string, i: number) => (
                    <li key={i} className="flex gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      <span>{str}</span>
                    </li>
                  )) || <li>No strengths recorded.</li>}
                </ul>
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-rose-600 mb-4 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Growth Areas
                </h3>
                <ul className="space-y-3.5 text-xs text-slate-600">
                  {session.report?.weaknesses?.map((weak: string, i: number) => (
                    <li key={i} className="flex gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                      <span>{weak}</span>
                    </li>
                  )) || <li>No growth areas identified.</li>}
                </ul>
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 mb-4 flex items-center gap-1.5">
                <Award className="w-4 h-4" /> Strategic Recommendations
              </h3>
              <ul className="space-y-3.5 text-xs text-slate-600">
                {session.report?.recommendations?.map((rec: string, i: number) => (
                  <li key={i} className="flex gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                )) || <li>No recommendations generated.</li>}
              </ul>
            </div>

            {session.report?.proctoringSummary && (
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${session.report.proctoringSummary.status === "Clean" ? "bg-green-50 text-green-600" : "bg-rose-50 text-rose-600"}`}>
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Security & Proctoring Audit</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Flagged tab switches during the test session: <span className="font-semibold text-slate-700">{session.report.proctoringSummary.tabSwitches}</span>
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${session.report.proctoringSummary.status === "Clean" ? "bg-green-50 text-green-600 border-green-200" : "bg-rose-50 text-rose-600 border-rose-200"}`}>
                  {session.report.proctoringSummary.status}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
