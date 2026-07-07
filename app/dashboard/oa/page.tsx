"use client";

import { JDUploadCard } from "@/src/components/JDUpload/JDUploadCard";

export default function OARoundPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#111111] tracking-tight">OA Round</h1>
        <p className="text-[#9CA3AF] mt-1 text-[13px]">
          Practice online assessments and coding challenges.
        </p>
      </div>

      <JDUploadCard interviewType="oa" />
    </div>
  );
}
