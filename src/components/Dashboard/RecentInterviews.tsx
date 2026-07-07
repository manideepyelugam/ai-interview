import { ChevronRight, Briefcase, Code2, Bot } from "lucide-react";

const recentInterviews = [
  {
    title: "Frontend Developer Interview",
    date: "May 20, 2024",
    duration: "45 mins",
    status: "Completed",
    score: "82%",
    icon: Briefcase,
  },
  {
    title: "Backend Developer Interview",
    date: "May 18, 2024",
    duration: "60 mins",
    status: "Completed",
    score: "76%",
    icon: Code2,
  },
  {
    title: "AI/ML Engineer Interview",
    date: "May 15, 2024",
    duration: "50 mins",
    status: "Completed",
    score: "88%",
    icon: Bot,
  },
  {
    title: "OA Round - Amazon",
    date: "May 12, 2024",
    duration: "90 mins",
    status: "In Progress",
    score: "60%",
    icon: Code2,
  },
  {
    title: "OA Round - Amazon",
    date: "May 12, 2024",
    duration: "90 mins",
    status: "In Progress",
    score: "60%",
    icon: Code2,
  },
];

export function RecentInterviews() {
  return (
    <div className="bg-white rounded-lg border border-[#ECECEC] p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[16px] font-medium text-[#111111]">Recent Interviews</h3>
        <button className="text-xs font-medium text-[#6B7280] hover:text-[#111111] px-3 py-1.5 rounded-lg border border-[#ECECEC] hover:border-[#D4D4D4] transition-all duration-150">
          View all
        </button>
      </div>

      <div className="space-y-0.5">
        {recentInterviews.map((interview, index) => {
          const Icon = interview.icon;
          const isInProgress = interview.status === "In Progress";

          return (
            <div
              key={index}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#F7F7F7] transition-colors duration-150 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50/80 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#111111] truncate">
                  {interview.title}
                </p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  {interview.date} · {interview.duration}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${isInProgress
                    ? "bg-amber-50 text-amber-600"
                    : "bg-green-50 text-green-600"
                    }`}
                >
                  {interview.status}
                </span>
                <span className="text-[13px] font-semibold text-[#111111]">
                  {interview.score}
                </span>
                <ChevronRight className="w-4 h-4 text-[#D4D4D4] group-hover:text-[#9CA3AF] transition-colors duration-150" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
