"use client";

import { InterviewConfiguration } from "@/src/components/Dashboard/InterviewConfiguration";

export default function FullInterviewPage() {
  return (
    <div className="max-w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#111111] tracking-tight">
          Full End-to-End Interview
        </h1>
        <p className="text-[#9CA3AF] mt-1 text-[13px]">
          Complete interview experience with technical, behavioral and HR rounds.
        </p>
      </div>

      <InterviewConfiguration interviewType="full" />
    </div>
  );
}
