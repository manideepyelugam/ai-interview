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
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all duration-300 group">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
          <p className={cn("text-xs mt-1 font-medium", subtitleColor)}>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
