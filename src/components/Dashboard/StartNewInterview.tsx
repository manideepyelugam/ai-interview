import Link from "next/link";
import { Mic, Code2, Bot, ChevronRight } from "lucide-react";
import { ROUTES } from "@/src/constants";

const interviewTypes = [
  {
    title: "Full End-to-End Interview",
    description:
      "Complete interview experience with technical, behavioral and HR rounds.",
    icon: Mic,
    href: ROUTES.INTERVIEW,
  },
  {
    title: "OA Round",
    description:
      "Practice online assessments and coding challenges.",
    icon: Code2,
    href: ROUTES.OA,
  },
  {
    title: "AI Interview Round",
    description:
      "AI-powered mock interviews with real-time feedback.",
    icon: Bot,
    href: ROUTES.AI,
  },
];

export function StartNewInterview() {
  return (
    <div className="mt-8">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Start a New Interview
        </h3>
        <p className="text-sm text-gray-400 mt-0.5">
          Choose the type of interview you want to practice.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {interviewTypes.map((type) => {
          const Icon = type.icon;

          return (
            <Link
              key={type.href}
              href={type.href}
              className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-blue-100 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900">
                      {type.title}
                    </h4>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {type.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
