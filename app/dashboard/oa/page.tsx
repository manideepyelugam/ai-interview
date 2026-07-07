"use client";

import { JDUploadCard } from "@/src/components/JDUpload/JDUploadCard";

export default function OARoundPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">OA Round</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Practice online assessments and coding challenges.
        </p>
      </div>

      <JDUploadCard interviewType="oa" />
    </div>
  );
}
