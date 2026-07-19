import { NextResponse } from "next/server";
import { dbService } from "@/src/services/db.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId query parameter is required." },
        { status: 400 }
      );
    }

    const session = await dbService.getAISession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "AI Interview Session not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      session,
    });
  } catch (err: any) {
    console.error("Error in AI Interview Get Session API Route:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve session." },
      { status: 500 }
    );
  }
}
