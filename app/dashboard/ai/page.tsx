"use client";

import { JDUploadCard } from "@/src/components/JDUpload/JDUploadCard";

export default function AIInterviewPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#111111] tracking-tight">
          AI Interview Round
        </h1>
        <p className="text-[#9CA3AF] mt-1 text-[13px]">
          AI-powered mock interviews with real-time feedback.
        </p>
      </div>

      <JDUploadCard interviewType="ai" />
    </div>
  );
}
