"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/src/components/providers/AuthProvider";
import type { UnifiedAssignmentReport, UnifiedReportSection } from "@/src/types";
import {
  Briefcase,
  Code2,
  Bot,
  Volume2,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Printer,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  BarChart3,
  TrendingUp,
  FileText,
  User,
  ExternalLink
} from "lucide-react";

function ReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const sessionId = searchParams.get("sessionId");
  const type = searchParams.get("type");

  const [report, setReport] = useState<UnifiedAssignmentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided in request.");
      setLoading(false);
      return;
    }

    async function fetchReport() {
      try {
        const url = `/api/report?sessionId=${sessionId}${type ? `&type=${type}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to load detailed report.");
        }
        const data = await res.json();
        setReport(data.report);
        if (data.report?.sections?.length > 0) {
          setExpandedSection(data.report.sections[0].id);
        }
      } catch (err: any) {
        console.error("Error loading report:", err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [sessionId, type]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs font-medium">Generating detailed assignment report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-[#111111]">Report Not Available</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">{error || "Could not find session data."}</p>
        <Link
          href="/dashboard/assignments"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Past Assignments
        </Link>
      </div>
    );
  }

  const getTypeIcon = (t: string) => {
    switch (t) {
      case "oa":
        return Code2;
      case "ai":
        return Bot;
      case "audio":
        return Volume2;
      default:
        return Briefcase;
    }
  };

  const getFriendlyType = (t: string) => {
    switch (t) {
      case "oa":
        return "Online Assessment";
      case "ai":
        return "AI Technical Interview";
      case "audio":
        return "Audio Mock Interview";
      case "full":
        return "Full E2E Interview";
      default:
        return "Assessment";
    }
  };

  const TypeIcon = getTypeIcon(report.interviewType);
  const formattedDate = new Date(report.createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 print:p-0">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#ECECEC] hover:bg-[#F9FAFB] text-[#111111] text-xs font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <Link
            href="/dashboard/assignments"
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            All Past Assignments
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-[#ECECEC] hover:bg-[#F9FAFB] text-[#111111] text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            Print / Save PDF
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            New Assessment
          </Link>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white rounded-lg border border-[#ECECEC] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <TypeIcon className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                {getFriendlyType(report.interviewType)}
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {formattedDate}
              </span>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#111111] tracking-tight">{report.role}</h1>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                Candidate: <strong className="text-[#111111] font-medium">{report.candidateName || user?.name}</strong>
              </p>
            </div>
          </div>

          {/* Executive Score Box */}
          <div className="flex items-center gap-4 bg-[#F9FAFB] border border-[#ECECEC] p-4 rounded-xl flex-shrink-0">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-4 border-blue-100 flex items-center justify-center bg-white shadow-inner">
                <div className="text-center">
                  <span className="text-2xl font-bold text-[#111111] leading-none">
                    {report.overallScore}%
                  </span>
                  <span className="block text-[10px] text-gray-400 uppercase tracking-wider mt-0.5 font-semibold">
                    Score
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${report.passed
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-rose-50 text-rose-600 border border-rose-200"
                  }`}
              >
                {report.passed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Passed Evaluation
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" /> Needs Practice
                  </>
                )}
              </span>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                Duration: {report.durationMinutes} minutes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Competency & Skill Radar Breakdown */}
      <div className="bg-white rounded-lg border border-[#ECECEC] p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-[#111111] mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          Competency & Skill Performance Breakdown
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: "Technical Accuracy", score: report.metrics.technicalScore, color: "bg-blue-500" },
            { label: "Communication", score: report.metrics.communicationScore, color: "bg-emerald-500" },
            { label: "Problem Solving", score: report.metrics.problemSolvingScore, color: "bg-indigo-500" },
            { label: "Confidence", score: report.metrics.confidenceScore, color: "bg-amber-500" },
            { label: "Aptitude & Logic", score: report.metrics.aptitudeScore, color: "bg-purple-500" },
          ].map((item) => (
            <div key={item.label} className="bg-[#F9FAFB] border border-[#ECECEC] p-3.5 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">{item.label}</span>
                <span className="font-bold text-[#111111]">{item.score}%</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color} transition-all duration-500`}
                  style={{ width: `${Math.max(item.score, 5)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Qualitative Insights (Strengths, Weaknesses, Recommendations, Verdict) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Strengths */}
        <div className="bg-white rounded-lg border border-[#ECECEC] p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Key Demonstrated Strengths
          </div>
          <ul className="space-y-2">
            {report.strengths.map((str, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-[#111111] bg-emerald-50/50 p-2.5 rounded-md border border-emerald-100">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-white rounded-lg border border-[#ECECEC] p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            Areas for Growth & Improvement
          </div>
          <ul className="space-y-2">
            {report.weaknesses.map((weak, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-[#111111] bg-amber-50/50 p-2.5 rounded-md border border-amber-100">
                <span className="text-amber-500 font-bold">•</span>
                <span>{weak}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI Recommendations & Verdict Banner */}
      <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-100 rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Personalized AI Action Plan & Verdict
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            Final Recommendation: <strong className="text-blue-900 font-semibold">{report.finalVerdict}</strong>
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {report.recommendations.map((rec, i) => (
              <span key={i} className="text-xs bg-white text-blue-700 px-3 py-1 rounded-md border border-blue-200 shadow-2xs font-medium">
                {rec}
              </span>
            ))}
          </div>
        </div>

        {/* Proctoring Badge */}
        <div className="bg-white p-4 rounded-xl border border-blue-100 flex items-center gap-3 flex-shrink-0">
          {report.proctoring.status === "Clean" ? (
            <ShieldCheck className="w-7 h-7 text-emerald-500" />
          ) : (
            <ShieldAlert className="w-7 h-7 text-amber-500" />
          )}
          <div>
            <div className="text-xs font-semibold text-[#111111]">
              Proctoring Audit: {report.proctoring.status}
            </div>
            <p className="text-[11px] text-gray-400">
              {report.proctoring.tabSwitches} tab switches · {report.proctoring.fullscreenExits} exits
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Section & Question Accordion Breakdown */}
      <div className="bg-white rounded-lg border border-[#ECECEC] p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-[#111111] flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          Detailed Round & Question Analysis
        </h3>

        {report.sections.map((sec) => {
          const isExpanded = expandedSection === sec.id;

          return (
            <div key={sec.id} className="border border-[#ECECEC] rounded-lg overflow-hidden transition-all">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : sec.id)}
                className="w-full bg-[#F9FAFB] hover:bg-[#F3F4F6] p-4 flex items-center justify-between text-left transition-colors"
              >
                <div>
                  <h4 className="text-xs font-semibold text-[#111111] flex items-center gap-2">
                    {sec.title}
                    <span className="text-[11px] font-normal text-gray-500">
                      ({sec.score} / {sec.maxScore} pts)
                    </span>
                  </h4>
                  {sec.summary && <p className="text-[11px] text-gray-400 mt-0.5">{sec.summary}</p>}
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {isExpanded && sec.items && (
                <div className="p-4 space-y-4 bg-white divide-y divide-gray-100">
                  {sec.items.map((item, idx) => (
                    <div key={idx} className="pt-3 first:pt-0 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-semibold text-[#111111] flex-1">
                          Q{idx + 1}. {item.question}
                        </span>
                        {item.status && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${item.status === "Correct" || item.status === "Passed"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : item.status === "Skipped"
                                  ? "bg-gray-50 text-gray-500 border border-gray-200"
                                  : "bg-rose-50 text-rose-600 border border-rose-200"
                              }`}
                          >
                            {item.status}
                          </span>
                        )}
                      </div>

                      {/* Answer or Submitted Code */}
                      {item.answer && (
                        <div className="bg-[#F9FAFB] p-2.5 rounded border border-gray-200 text-slate-700">
                          <strong>Response:</strong> {item.answer}
                        </div>
                      )}

                      {item.userCode && (
                        <div className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-[11px] overflow-x-auto">
                          <pre>{item.userCode}</pre>
                        </div>
                      )}

                      {/* Test Cases / Feedback */}
                      {item.testCasesPassed !== undefined && item.totalTestCases !== undefined && (
                        <div className="text-[11px] text-gray-500 font-medium">
                          Test Cases Passed: {item.testCasesPassed} / {item.totalTestCases}
                        </div>
                      )}

                      {item.correctAnswer && item.status !== "Correct" && (
                        <div className="text-[11px] text-emerald-600 bg-emerald-50 p-2 rounded">
                          <strong>Correct Answer:</strong> {item.correctAnswer}
                        </div>
                      )}

                      {item.explanation && (
                        <p className="text-[11px] text-gray-500 italic bg-gray-50 p-2 rounded">
                          <strong>Explanation:</strong> {item.explanation}
                        </p>
                      )}

                      {item.feedback && (
                        <p className="text-[11px] text-blue-600 bg-blue-50 p-2 rounded">
                          <strong>AI Feedback:</strong> {item.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DetailedReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  );
}
