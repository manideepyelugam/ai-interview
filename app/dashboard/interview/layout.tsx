"use client";

import { ProctoringProvider } from "@/src/components/Interview/ProctoringProvider";

export default function InterviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProctoringProvider>{children}</ProctoringProvider>;
}
