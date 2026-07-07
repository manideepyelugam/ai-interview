"use client";

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
} from "lucide-react";


export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
          title="Total Interviews"
          value="12"
          subtitle="↑ 20% from last month"
          subtitleColor="text-green-600"
          icon={<Briefcase className="w-4 h-4 text-blue-400" />}
        />
        <StatCard
          title="Success Rate"
          value="68%"
          subtitle="↑ 8% from last month"
          subtitleColor="text-green-600"
          icon={<TrendingUp className="w-4 h-4 text-blue-400" />}
        />
        <StatCard
          title="Total Practice Time"
          value="14h 32m"
          subtitle="↑ 15% from last month"
          subtitleColor="text-green-600"
          icon={<Clock className="w-4 h-4 text-blue-400" />}
        />
        <StatCard
          title="Interviews This Week"
          value="3"
          subtitle="2 upcoming"
          subtitleColor="text-blue-600"
          icon={<Calendar className="w-4 h-4 text-blue-400" />}
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
