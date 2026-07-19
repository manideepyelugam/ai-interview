"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { StatCard } from "@/src/components/Dashboard/StatCard";
import { RecentInterviews } from "@/src/components/Dashboard/RecentInterviews";
import { UpcomingInterviews } from "@/src/components/Dashboard/UpcomingInterviews";
import { StartNewInterview } from "@/src/components/Dashboard/StartNewInterview";
import {
  Briefcase,
  TrendingUp,
  Clock,
  Calendar,
  Loader2
} from "lucide-react";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const userId = user.$id;
    async function fetchStats() {
      try {
        const res = await fetch(`/api/interviews?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setInterviews(data.interviews || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setStatsLoading(false);
      }
    }
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Calculations
  const total = interviews.length;
  const completed = interviews.filter(i => i.status === "completed");
  const passed = completed.filter(i => i.score >= 50);
  const successRate = completed.length > 0 ? Math.round((passed.length / completed.length) * 100) : 0;

  const durationMap: Record<string, number> = { oa: 20, ai: 15, audio: 10, full: 45 };
  const totalMinutes = completed.reduce((acc, curr) => acc + (durationMap[curr.interviewType] || 15), 0);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const practiceTime = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeek = interviews.filter(i => new Date(i.updatedAt) >= oneWeekAgo).length;
  const inProgress = interviews.filter(i => i.status === "in_progress").length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#111111] tracking-tight">
          Welcome back, {user?.name?.split(" ")[0] || "User"}! 👋
        </h1>
        <p className="text-[#9CA3AF] mt-1 text-[13px]">
          Let&apos;s improve your skills and crack your dream role.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          title="Total Assessments"
          value={statsLoading ? "..." : String(total)}
          subtitle={total > 0 ? "Started from dashboard" : "No assessments yet"}
          subtitleColor="text-slate-500"
          icon={<Briefcase className="w-4 h-4 text-blue-500" />}
        />
        <StatCard
          title="Success Rate"
          value={statsLoading ? "..." : `${successRate}%`}
          subtitle={completed.length > 0 ? `${passed.length} of ${completed.length} passed` : "No completed rounds"}
          subtitleColor="text-slate-500"
          icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
        />
        <StatCard
          title="Total Practice Time"
          value={statsLoading ? "..." : practiceTime}
          subtitle="Mock session duration sum"
          subtitleColor="text-slate-500"
          icon={<Clock className="w-4 h-4 text-indigo-500" />}
        />
        <StatCard
          title="Updated This Week"
          value={statsLoading ? "..." : String(thisWeek)}
          subtitle={`${inProgress} in progress`}
          subtitleColor="text-blue-500 font-medium"
          icon={<Calendar className="w-4 h-4 text-orange-500" />}
        />
      </div>

      {/* Recent + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-5 lg:h-[410px] h-auto gap-6">
        <div className="lg:col-span-3">
          <RecentInterviews />
        </div>
        <div className="lg:col-span-2">
          <UpcomingInterviews />
        </div>
      </div>

      {/* Start New Interview */}
      <StartNewInterview />
    </div>
  );
}
