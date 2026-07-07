"use client";

import { JDUploadCard } from "@/src/components/JDUpload/JDUploadCard";

export default function FullInterviewPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#111111] tracking-tight">
          Full End-to-End Interview
        </h1>
        <p className="text-[#9CA3AF] mt-1 text-[13px]">
          Complete interview experience with technical, behavioral and HR rounds.
        </p>
      </div>

      <JDUploadCard interviewType="full" />
    </div>
  );
}
