import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/src/constants";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  showExit?: boolean;
  exitHref?: string;
  exitLabel?: string;
  onExit?: () => void;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  showExit = false,
  exitHref = ROUTES.DASHBOARD,
  exitLabel = "Exit to Dashboard",
  onExit,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-page-title">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {showExit ? (
          onExit ? (
            <Button variant="outline" size="sm" onClick={onExit} className="gap-1.5">
              <LogOut className="size-3.5" />
              {exitLabel}
            </Button>
          ) : (
            <Link
              href={exitHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <LogOut className="size-3.5" />
              {exitLabel}
            </Link>
          )
        ) : null}
      </div>
    </div>
  );
}
