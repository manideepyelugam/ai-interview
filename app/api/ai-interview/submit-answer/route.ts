import { NextResponse } from "next/server";
import { aiInterviewService } from "@/src/services/ai-interview.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, questionId, answerText, violations } = body;

    if (!sessionId || !questionId) {
      return NextResponse.json(
        { error: "Missing required parameters: sessionId and questionId are required." },
        { status: 400 }
      );
    }

    const session = await aiInterviewService.submitAnswer(
      sessionId,
      questionId,
      answerText,
      violations
    );

    return NextResponse.json({
      session,
    });
  } catch (err: any) {
    console.error("Error in AI Interview Submit Answer API Route:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit candidate response." },
      { status: 500 }
    );
  }
}
