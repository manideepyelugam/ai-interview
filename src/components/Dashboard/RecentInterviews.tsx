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
];

export function RecentInterviews() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-gray-900">Recent Interviews</h3>
        <button className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
          View all
        </button>
      </div>

      <div className="space-y-1">
        {recentInterviews.map((interview, index) => {
          const Icon = interview.icon;
          const isInProgress = interview.status === "In Progress";

          return (
            <div
              key={index}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {interview.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {interview.date} • {interview.duration}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isInProgress
                      ? "bg-amber-50 text-amber-600"
                      : "bg-green-50 text-green-600"
                  }`}
                >
                  {interview.status}
                </span>
                <span className="text-sm font-bold text-gray-700">
                  {interview.score}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
