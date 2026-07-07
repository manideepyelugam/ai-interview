"use client";

import { InterviewConfiguration } from "@/src/components/Dashboard/InterviewConfiguration";

export default function AIInterviewPage() {
  return (
    <div className="max-w-full mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#111111] tracking-tight">
          AI Interview Round
        </h1>
        <p className="text-[#9CA3AF] mt-1 text-[13px]">
          AI-powered mock interviews with real-time feedback.
        </p>
      </div>

      <InterviewConfiguration interviewType="ai" />
    </div>
  );
}
