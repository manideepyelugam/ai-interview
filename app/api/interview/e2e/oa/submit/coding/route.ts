import { NextResponse } from "next/server";
import { e2eOAService } from "@/src/services/e2e-oa.service";

export async function POST(req: Request) {
  try {
    const { sessionId, questionId, code, language, submitAll, violations } =
      await req.json();
    if (!sessionId || !questionId || code == null) {
      return NextResponse.json(
        { error: "sessionId, questionId, and code are required." },
        { status: 400 }
      );
    }
    const result = await e2eOAService.submitCoding(
      sessionId,
      questionId,
      code,
      language || "javascript",
      Boolean(submitAll),
      violations || []
    );
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Coding submit failed." },
      { status: 500 }
    );
  }
}
