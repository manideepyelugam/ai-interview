import { NextResponse } from "next/server";
import { e2eOAService } from "@/src/services/e2e-oa.service";
import { judgeService } from "@/src/services/judge.service";
import type { CodingQuestion } from "@/src/types";

export async function POST(req: Request) {
  try {
    const { sessionId, questionId, code, language, customInput } = await req.json();
    if (!sessionId || !questionId || code == null || !language) {
      return NextResponse.json(
        { error: "sessionId, questionId, code, and language are required." },
        { status: 400 }
      );
    }

    const session = await e2eOAService.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const question = session.codingQuestions.find((q) => q.id === questionId);
    if (!question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    let target: CodingQuestion = question;
    if (typeof customInput === "string" && customInput.trim()) {
      target = {
        ...question,
        testCases: [
          {
            input: customInput,
            output: question.testCases.find((t) => !t.isHidden)?.output || "",
            isHidden: false,
          },
        ],
      };
    }

    const runResult = await judgeService.executeCode(code, language, target);

    return NextResponse.json({
      compilerStatus: runResult.status,
      passed: runResult.passed,
      total: runResult.total,
      results: runResult.results,
      runtime: runResult.runtime,
      memory: runResult.memory,
      compilerOutput: runResult.compilerOutput,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Run failed." },
      { status: 500 }
    );
  }
}
