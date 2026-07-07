import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  subtitleColor?: string;
  icon: ReactNode;
}

export function StatCard({
  title,
  value,
  subtitle,
  subtitleColor = "text-green-600",
  icon,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-[#ECECEC] p-5 transition-all duration-150 group">
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-md bg-blue-50/80 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0 gap-0.5 flex flex-col flex-1">
          <p className="text-[13px] text-[#6B7280] font-medium">{title}</p>
          <p className="text-xl font-semibold text-[#111111] mt-0.5 tracking-tight">{value}</p>
          <p className={cn("text-xs mt-1 font-normal", subtitleColor)}>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
