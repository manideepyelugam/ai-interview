import { NextResponse } from "next/server";
import { dbService } from "@/src/services/db.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required." },
        { status: 400 }
      );
    }

    const session = await dbService.getFullSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      session,
    });
  } catch (err: any) {
    console.error("Error loading Full Session:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load session." },
      { status: 500 }
    );
  }
}
