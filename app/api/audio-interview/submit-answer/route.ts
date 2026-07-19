import { NextResponse } from "next/server";
import { audioInterviewService } from "@/src/services/audio-interview.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, questionId, answerText, violations, endInterview } = body;

    if (!sessionId || !questionId) {
      return NextResponse.json(
        { error: "Missing required parameters: sessionId and questionId are required." },
        { status: 400 }
      );
    }

    const session = await audioInterviewService.submitAnswer(
      sessionId,
      questionId,
      answerText,
      violations,
      endInterview
    );

    return NextResponse.json({
      session,
    });
  } catch (err: any) {
    console.error("Error in Audio Interview Submit Answer API Route:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit candidate response." },
      { status: 500 }
    );
  }
}
