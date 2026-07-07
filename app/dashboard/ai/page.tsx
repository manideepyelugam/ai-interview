"use client";

import { JDUploadCard } from "@/src/components/JDUpload/JDUploadCard";

export default function AIInterviewPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          AI Interview Round
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          AI-powered mock interviews with real-time feedback.
        </p>
      </div>

      <JDUploadCard interviewType="ai" />
    </div>
  );
}
