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
    <div className="mt-22">
      <div className="mb-4">
        <h3 className="text-[16px] font-medium text-[#111111]">
          Start a New Interview
        </h3>
        <p className="text-[13px] text-[#9CA3AF] mt-0.5">
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
              className="group bg-white rounded-lg border border-[#ECECEC] p-5  transition-all duration-150"
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-blue-50/80 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 transition-colors duration-150">
                  <Icon className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-medium text-[#111111]">
                      {type.title}
                    </h4>
                    <ChevronRight className="w-4 h-4 text-[#D4D4D4] group-hover:text-[#9CA3AF] group-hover:translate-x-0.5 transition-all duration-150" />
                  </div>
                  <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
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
