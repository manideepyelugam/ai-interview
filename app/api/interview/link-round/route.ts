import { NextResponse } from "next/server";
import { dbService } from "@/src/services/db.service";

export async function POST(req: Request) {
  try {
    const { fullSessionId, roundType, roundSessionId } = await req.json();

    if (!fullSessionId || !roundType || !roundSessionId) {
      return NextResponse.json(
        { error: "fullSessionId, roundType, and roundSessionId are required fields." },
        { status: 400 }
      );
    }

    const session = await dbService.getFullSession(fullSessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Full Interview Session not found." },
        { status: 404 }
      );
    }

    // E2E is OA → AI only (audio removed)
    if (roundType === "oa") {
      session.oaSessionId = roundSessionId;
      session.currentRound = "ai";
    } else if (roundType === "ai") {
      session.aiSessionId = roundSessionId;
      session.currentRound = "completed";
    }

    session.updatedAt = new Date().toISOString();
    await dbService.saveFullSession(session);

    return NextResponse.json({
      session,
    });
  } catch (err: any) {
    console.error("Error linking round session:", err);
    return NextResponse.json(
      { error: err.message || "Failed to link round session." },
      { status: 500 }
    );
  }
}
