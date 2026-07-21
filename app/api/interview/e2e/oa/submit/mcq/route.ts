import { NextResponse } from "next/server";
import { e2eOAService } from "@/src/services/e2e-oa.service";

export async function POST(req: Request) {
  try {
    const { sessionId, answers, violations } = await req.json();
    if (!sessionId || !answers) {
      return NextResponse.json(
        { error: "sessionId and answers are required." },
        { status: 400 }
      );
    }
    const session = await e2eOAService.submitMCQ(sessionId, answers, violations || []);
    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "MCQ submit failed." },
      { status: 500 }
    );
  }
}
