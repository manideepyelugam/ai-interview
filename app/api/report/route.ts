import { NextResponse } from "next/server";
import { dbService } from "@/src/services/db.service";
import { formatToUnifiedReport } from "@/src/lib/reportFormatter";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const type = searchParams.get("type") as "oa" | "ai" | "audio" | "full" | null;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId query parameter is required." },
        { status: 400 }
      );
    }

    let session: any = null;
    let resolvedType: "oa" | "ai" | "audio" | "full" | undefined = type || undefined;

    if (resolvedType === "oa") {
      session = await dbService.getSession(sessionId);
    } else if (resolvedType === "ai") {
      session = await dbService.getAISession(sessionId);
    } else if (resolvedType === "audio") {
      session = await dbService.getAudioSession(sessionId);
    } else if (resolvedType === "full") {
      session = await dbService.getFullSession(sessionId);
    } else {
      // Auto-detect by searching across collections
      session = await dbService.getAISession(sessionId);
      if (session) {
        resolvedType = "ai";
      } else {
        session = await dbService.getAudioSession(sessionId);
        if (session) {
          resolvedType = "audio";
        } else {
          session = await dbService.getSession(sessionId);
          if (session) {
            resolvedType = "oa";
          } else {
            session = await dbService.getFullSession(sessionId);
            if (session) {
              resolvedType = "full";
            }
          }
        }
      }
    }

    if (!session) {
      return NextResponse.json(
        { error: `Session '${sessionId}' not found.` },
        { status: 404 }
      );
    }

    const report = formatToUnifiedReport(session, resolvedType);

    return NextResponse.json({ report });
  } catch (err: any) {
    console.error("Error generating unified report:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch unified report." },
      { status: 500 }
    );
  }
}
