import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "size-4 border-[1.5px]",
  md: "size-6 border-2",
  lg: "size-8 border-2",
} as const;

export function Spinner({ className, size = "md" }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-spin rounded-full border-primary/30 border-t-primary",
        sizeMap[size],
        className
      )}
    />
  );
}
