import { NextResponse } from "next/server";
import { aiInterviewService } from "@/src/services/ai-interview.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { context, userId } = body;

    if (!context || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters: context and userId are required." },
        { status: 400 }
      );
    }

    const session = await aiInterviewService.startSession(userId, context);

    return NextResponse.json({
      sessionId: session.id,
      session,
    });
  } catch (err: any) {
    console.error("Error in AI Interview Start API Route:", err);
    return NextResponse.json(
      { error: err.message || "Failed to initialize AI Interview session." },
      { status: 500 }
    );
  }
}
