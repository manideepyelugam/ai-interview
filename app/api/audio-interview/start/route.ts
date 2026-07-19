import { NextResponse } from "next/server";
import { audioInterviewService } from "@/src/services/audio-interview.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { context, userId, settings } = body;

    if (!context || !userId || !settings) {
      return NextResponse.json(
        { error: "Missing required parameters: context, userId, and settings are required." },
        { status: 400 }
      );
    }

    const session = await audioInterviewService.startSession(userId, context, settings);

    return NextResponse.json({
      sessionId: session.id,
      session,
    });
  } catch (err: any) {
    console.error("Error in Audio Interview Start API Route:", err);
    return NextResponse.json(
      { error: err.message || "Failed to initialize Audio Interview session." },
      { status: 500 }
    );
  }
}
