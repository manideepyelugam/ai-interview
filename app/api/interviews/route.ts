import { NextResponse } from "next/server";
import { dbService } from "@/src/services/db.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required." },
        { status: 400 }
      );
    }

    const [oaSessions, aiSessions, audioSessions, fullSessions] = await Promise.all([
      dbService.listSessions(userId),
      dbService.listAISessions(userId),
      dbService.listAudioSessions(userId),
      dbService.listFullSessions(userId),
    ]);

    // Format all items to a common shape for the dashboard list
    const formattedOA = oaSessions.map(s => ({
      id: s.id,
      interviewType: "oa",
      role: s.blueprint?.role || "OA Round Assessment",
      status: s.aptitudeStatus === "completed" ? "completed" : "in_progress",
      score: s.evaluation?.overallScore || 0,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    }));

    const formattedAI = aiSessions.map(s => ({
      id: s.id,
      interviewType: "ai",
      role: s.blueprint?.role || "AI Technical Interview",
      status: s.status === "completed" ? "completed" : "in_progress",
      score: s.evaluation?.overallScore || 0,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    }));

    const formattedAudio = audioSessions.map(s => ({
      id: s.id,
      interviewType: "audio",
      role: s.blueprint?.role || "Audio Mock Interview",
      status: s.status === "completed" ? "completed" : "in_progress",
      score: s.evaluation?.overallScore || 0,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    }));

    const formattedFull = fullSessions.map(s => ({
      id: s.id,
      interviewType: "full",
      role: s.blueprint?.role || "Full End-to-End Interview",
      status: s.status,
      score: s.evaluation?.overallScore || 0,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    }));

    // Merge and sort by updatedAt desc
    const allInterviews = [
      ...formattedOA,
      ...formattedAI,
      ...formattedAudio,
      ...formattedFull,
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return NextResponse.json({
      interviews: allInterviews,
    });
  } catch (err: any) {
    console.error("Error listing all interviews:", err);
    return NextResponse.json(
      { error: err.message || "Failed to list interviews." },
      { status: 500 }
    );
  }
}
