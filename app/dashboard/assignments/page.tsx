"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { StatCard } from "@/src/components/Dashboard/StatCard";
import {
  Briefcase,
  Code2,
  Bot,
  Volume2,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  Sparkles,
  BarChart3,
  Award,
  PlayCircle
} from "lucide-react";

interface InterviewAssignment {
  id: string;
  interviewType: "oa" | "ai" | "audio" | "full";
  role: string;
  status: "completed" | "in_progress";
  score: number;
  updatedAt: string;
  createdAt: string;
}

export default function PastAssignmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [interviews, setInterviews] = useState<InterviewAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters and Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "score-desc" | "score-asc">("newest");

  useEffect(() => {
    if (!user) return;
    const userId = user.$id;

    async function fetchAssignments() {
      try {
        const res = await fetch(`/api/interviews?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setInterviews(data.interviews || []);
        }
      } catch (err) {
        console.error("Error fetching past assignments:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAssignments();
  }, [user]);

  // Derived Statistics
  const stats = useMemo(() => {
    const total = interviews.length;
    const completed = interviews.filter((i) => i.status === "completed");
    const inProgress = interviews.filter((i) => i.status === "in_progress");
    const avgScore =
      completed.length > 0
        ? Math.round(
          completed.reduce((acc, curr) => acc + (curr.score || 0), 0) / completed.length
        )
        : 0;

    return { total, completedCount: completed.length, inProgressCount: inProgress.length, avgScore };
  }, [interviews]);

  // Filtered and Sorted Assignments
  const filteredInterviews = useMemo(() => {
    return interviews
      .filter((item) => {
        // Search filter
        const matchesSearch = item.role.toLowerCase().includes(searchQuery.toLowerCase());

        // Type filter
        const matchesType = selectedType === "all" || item.interviewType === selectedType;

        // Status filter
        const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;

        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        }
        if (sortBy === "score-desc") {
          return (b.score || 0) - (a.score || 0);
        }
        if (sortBy === "score-asc") {
          return (a.score || 0) - (b.score || 0);
        }
        return 0;
      });
  }, [interviews, searchQuery, selectedType, selectedStatus, sortBy]);

  const getIcon = (type: string) => {
    switch (type) {
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

  const getFriendlyName = (type: string) => {
    switch (type) {
      case "oa":
        return "Online Assessment";
      case "ai":
        return "AI Technical Round";
      case "audio":
        return "Audio Mock Round";
      case "full":
        return "Full E2E Interview";
      default:
        return "Assessment";
    }
  };

  const getItemRoute = (item: InterviewAssignment) => {
    if (item.status === "completed") {
      return `/dashboard/report?sessionId=${item.id}&type=${item.interviewType}`;
    }
    switch (item.interviewType) {
      case "oa":
        return `/dashboard/oa?sessionId=${item.id}`;
      case "ai":
        return `/dashboard/ai?sessionId=${item.id}`;
      case "audio":
        return `/dashboard/audio?sessionId=${item.id}`;
      case "full":
        return `/dashboard/interview?sessionId=${item.id}`;
      default:
        return "/dashboard";
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111111] tracking-tight">
            All Past Assignments
          </h1>
          <p className="text-[#9CA3AF] mt-1 text-[13px]">
            Review your historical assessment performances, completed rounds, and in-progress sessions.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors shadow-sm self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Start New Assignment
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Assignments"
          value={loading ? "..." : String(stats.total)}
          subtitle="All created assessments"
          subtitleColor="text-slate-500"
          icon={<Briefcase className="w-4 h-4 text-blue-500" />}
        />
        <StatCard
          title="Completed Rounds"
          value={loading ? "..." : String(stats.completedCount)}
          subtitle="Finished evaluations"
          subtitleColor="text-emerald-600"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        />
        <StatCard
          title="In Progress"
          value={loading ? "..." : String(stats.inProgressCount)}
          subtitle="Awaiting completion"
          subtitleColor="text-amber-600"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
        />
        <StatCard
          title="Average Score"
          value={loading ? "..." : `${stats.avgScore}%`}
          subtitle="Across finished rounds"
          subtitleColor="text-indigo-600"
          icon={<Award className="w-4 h-4 text-indigo-500" />}
        />
      </div>

      {/* Filter & Search Controls Bar */}
      <div className="bg-white rounded-lg border border-[#ECECEC] p-4 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by role or target position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[#111111] placeholder:text-gray-400 transition-all"
          />
        </div>

        {/* Filters and Sorting */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Type Filter */}
          <div className="flex items-center gap-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs text-[#6B7280]">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label="Filter by type"
              className="bg-transparent border-none text-xs font-medium text-[#111111] focus:outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="oa">OA Round</option>
              <option value="ai">AI Technical</option>
              <option value="audio">Audio Mock</option>
              <option value="full">Full E2E</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs text-[#6B7280]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter by status"
              className="bg-transparent border-none text-xs font-medium text-[#111111] focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs text-[#6B7280]">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort assignments"
              className="bg-transparent border-none text-xs font-medium text-[#111111] focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="score-desc">Highest Score</option>
              <option value="score-asc">Lowest Score</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignment Grid / List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-[#ECECEC] gap-3 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          <span className="text-xs font-medium">Loading past assignments...</span>
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-lg border border-[#ECECEC] text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#111111]">No assignments found</h3>
          <p className="text-xs text-[#9CA3AF] max-w-sm mt-1 mb-5">
            {searchQuery || selectedType !== "all" || selectedStatus !== "all"
              ? "No past assignments match your current filter criteria. Try adjusting your search or filters."
              : "You haven't attempted any assignments yet. Start your first practice round now!"}
          </p>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Start New Assignment
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF] px-1">
            <span>
              Showing <strong className="text-[#111111]">{filteredInterviews.length}</strong> of{" "}
              <strong className="text-[#111111]">{interviews.length}</strong> assignments
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInterviews.map((item) => {
              const Icon = getIcon(item.interviewType);
              const isInProgress = item.status === "in_progress";
              const formattedDate = new Date(item.updatedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-lg border border-[#ECECEC] p-5 flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all group"
                >
                  <div className="space-y-4">
                    {/* Top Row: Icon + Type Badge + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50/80 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100/80 transition-colors">
                          <Icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                            {getFriendlyName(item.interviewType)}
                          </span>
                          <h3 className="text-sm font-semibold text-[#111111] line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {item.role}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Metadata & Score */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-[#6B7280]">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {formattedDate}
                        </span>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${isInProgress
                              ? "bg-amber-50 text-amber-600 border border-amber-200/60"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                            }`}
                        >
                          {isInProgress ? "In Progress" : "Completed"}
                        </span>
                      </div>

                      {/* Score Indicator */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500 font-medium">Performance Score</span>
                          <span className="font-semibold text-[#111111]">
                            {isInProgress ? "Pending" : `${item.score}%`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${isInProgress
                                ? "bg-amber-400 w-1/3"
                                : item.score >= 75
                                  ? "bg-emerald-500"
                                  : item.score >= 50
                                    ? "bg-blue-500"
                                    : "bg-rose-500"
                              }`}
                            style={{ width: isInProgress ? "35%" : `${Math.max(item.score, 5)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-4 mt-4 border-t border-[#ECECEC]">
                    <Link
                      href={getItemRoute(item)}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-[#F9FAFB] hover:bg-blue-50 text-[#111111] hover:text-blue-600 border border-[#E5E7EB] hover:border-blue-200 text-xs font-medium rounded-lg transition-all"
                    >
                      {isInProgress ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5 text-amber-500" />
                          Resume Assessment
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                          View Results & Feedback
                        </>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
