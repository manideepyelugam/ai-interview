import { useState, useEffect } from "react";
import { ChevronRight, Briefcase, Code2, Bot, Volume2, Loader2 } from "lucide-react";
import { useAuth } from "@/src/components/providers/AuthProvider";

export function RecentInterviews() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const userId = user.$id;

    async function fetchInterviews() {
      try {
        const res = await fetch(`/api/interviews?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setInterviews(data.interviews || []);
        }
      } catch (err) {
        console.error("Error fetching recent interviews:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchInterviews();
  }, [user]);

  const handleItemClick = (interview: any) => {
    if (interview.interviewType === "oa") {
      window.location.href = `/dashboard/oa?sessionId=${interview.id}`;
    } else if (interview.interviewType === "ai") {
      window.location.href = `/dashboard/ai?sessionId=${interview.id}`;
    } else if (interview.interviewType === "audio") {
      window.location.href = `/dashboard/audio?sessionId=${interview.id}`;
    } else if (interview.interviewType === "full") {
      window.location.href = `/dashboard/interview?sessionId=${interview.id}`;
    }
  };

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

  return (
    <div className="bg-white rounded-lg border border-[#ECECEC] p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-medium text-[#111111]">Recent Assessments</h3>
          <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
            {interviews.length} Total
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-xs">Loading history...</span>
          </div>
        ) : interviews.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No assessments attempted yet. Start your first round above!
          </div>
        ) : (
          <div className="space-y-0.5 max-h-[320px] overflow-y-auto pr-1">
            {interviews.slice(0, 5).map((interview) => {
              const Icon = getIcon(interview.interviewType);
              const isInProgress = interview.status === "in_progress";
              const formattedDate = new Date(interview.updatedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric"
              });

              return (
                <div
                  key={interview.id}
                  onClick={() => handleItemClick(interview)}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#F7F7F7] transition-colors duration-150 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50/80 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#111111] truncate group-hover:text-blue-600 transition-colors">
                      {interview.role}
                    </p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      {getFriendlyName(interview.interviewType)} · {formattedDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${isInProgress
                        ? "bg-amber-50 text-amber-600"
                        : "bg-green-50 text-green-600"
                        }`}
                    >
                      {isInProgress ? "In Progress" : "Completed"}
                    </span>
                    <span className="text-[13px] font-semibold text-[#111111]">
                      {isInProgress ? "—" : `${interview.score}%`}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#D4D4D4] group-hover:text-[#9CA3AF] transition-colors duration-150" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
