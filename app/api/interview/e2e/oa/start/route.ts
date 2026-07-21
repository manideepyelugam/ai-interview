import { NextResponse } from "next/server";
import { e2eOAService } from "@/src/services/e2e-oa.service";

export async function POST(req: Request) {
  try {
    const { context, userId } = await req.json();
    if (!context || !userId) {
      return NextResponse.json(
        { error: "context and userId are required." },
        { status: 400 }
      );
    }

    const session = await e2eOAService.startSession(userId, context);
    const questions = e2eOAService.getClientQuestions(session);

    return NextResponse.json({
      sessionId: session.id,
      blueprint: session.blueprint,
      ...questions,
    });
  } catch (err: any) {
    console.error("E2E OA start error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to start E2E OA." },
      { status: 500 }
    );
  }
}
