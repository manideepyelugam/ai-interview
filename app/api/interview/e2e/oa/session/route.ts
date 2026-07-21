import { NextResponse } from "next/server";
import { e2eOAService } from "@/src/services/e2e-oa.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    const session = await e2eOAService.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const questions = e2eOAService.getClientQuestions(session);
    return NextResponse.json({
      session: {
        ...session,
        mcqQuestions: questions.mcqQuestions,
        aptitudeQuestions: questions.aptitudeQuestions,
      },
      ...questions,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load session." },
      { status: 500 }
    );
  }
}
