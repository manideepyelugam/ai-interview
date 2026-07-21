import { dbService } from "./db.service";
import { evaluationService } from "./evaluation.service";
import { judgeService } from "./judge.service";
import {
  getBuiltinAptitudeQuestions,
  getBuiltinCodingQuestions,
  getBuiltinMCQs,
} from "@/src/data/e2e-builtin-questions";
import type {
  InterviewBlueprint,
  InterviewContext,
  InterviewSession,
  OAReport,
  Project,
} from "@/src/types";

function buildBlueprint(context: InterviewContext): InterviewBlueprint {
  const candidateName = context.resume?.name || "Candidate";
  const role = context.role || "Full Stack Developer";
  const skills =
    context.resume?.skills ||
    context.jd?.requiredSkills ||
    ["JavaScript", "TypeScript", "React", "Node.js"];
  const experienceLevel: InterviewBlueprint["experienceLevel"] =
    context.jd?.experience?.includes("5") || (context.resume?.skills?.length ?? 0) > 8
      ? "Mid"
      : "Junior";

  const projects: Project[] =
    context.resume?.projects?.map((p) => ({
      title: p.split("(")[0].trim(),
      description: p,
      technologies: skills.slice(0, 3),
    })) || [
      {
        title: "E-Commerce System",
        description: "A scalable shopping platform built with React and Node.",
        technologies: ["React", "Node.js", "MongoDB"],
      },
    ];

  return {
    candidateName,
    source: context.source,
    role,
    experienceLevel,
    yearsOfExperience: experienceLevel === "Mid" ? 4 : 2,
    skills,
    frameworks: context.jd?.preferredSkills || ["React", "Express", "Next.js"],
    databases: ["MongoDB", "PostgreSQL"],
    projects,
    confidenceScore: 85,
    suggestedDifficulty: "Medium",
    estimatedCompanyLevel: "Product",
  };
}

function sanitizeQuestions(session: InterviewSession) {
  return {
    mcqQuestions: session.mcqQuestions.map(
      ({ correctAnswer, explanation, ...rest }) => rest
    ),
    codingQuestions: session.codingQuestions,
    aptitudeQuestions: session.aptitudeQuestions.map(
      ({ correctAnswer, explanation, ...rest }) => rest
    ),
  };
}

export const e2eOAService = {
  async startSession(userId: string, context: InterviewContext): Promise<InterviewSession> {
    const blueprint = buildBlueprint(context);
    const sessionId = `e2e-oa-${Math.random().toString(36).slice(2, 11)}`;

    const session: InterviewSession = {
      id: sessionId,
      userId,
      blueprint,
      mcqStatus: "not_started",
      codingStatus: "not_started",
      aptitudeStatus: "not_started",
      mcqQuestions: getBuiltinMCQs(blueprint.skills),
      codingQuestions: getBuiltinCodingQuestions(),
      aptitudeQuestions: getBuiltinAptitudeQuestions(),
      mcqAnswers: {},
      codingAnswers: {},
      aptitudeAnswers: {},
      violations: [],
      evaluation: null,
      report: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dbService.createSession(session);
    return session;
  },

  async getSession(sessionId: string) {
    return dbService.getSession(sessionId);
  },

  getClientQuestions(session: InterviewSession) {
    return sanitizeQuestions(session);
  },

  async submitMCQ(
    sessionId: string,
    answers: Record<string, string>,
    violations: { type: string; timestamp: string }[] = []
  ) {
    const session = await dbService.getSession(sessionId);
    if (!session) throw new Error("OA session not found.");

    session.mcqAnswers = answers;
    session.mcqStatus = "completed";
    session.codingStatus = "in_progress";
    session.violations = [...(session.violations || []), ...violations];
    session.updatedAt = new Date().toISOString();
    await dbService.saveSession(session);
    return session;
  },

  async submitCoding(
    sessionId: string,
    questionId: string,
    code: string,
    language: string,
    submitAll = false,
    violations: { type: string; timestamp: string }[] = []
  ) {
    const session = await dbService.getSession(sessionId);
    if (!session) throw new Error("OA session not found.");

    const question = session.codingQuestions.find((q) => q.id === questionId);
    if (!question) throw new Error("Coding question not found.");

    const runResult = await judgeService.executeCode(code, language, question);
    const feedback = {
      complexity: "Offline analysis (no Gemini)",
      codeQuality:
        runResult.passed === runResult.total
          ? "All visible cases passed — solid attempt."
          : "Some cases failed — review edge cases and I/O format.",
      optimization: "Aim for linear time where possible.",
      suggestions: "Re-run with custom inputs, then submit when green.",
    };

    session.codingAnswers[questionId] = {
      code,
      language,
      passedCount: runResult.passed,
      totalCount: runResult.total,
      status: runResult.status,
      feedback,
    };
    session.violations = [...(session.violations || []), ...violations];

    if (submitAll) {
      session.codingStatus = "completed";
      session.aptitudeStatus = "in_progress";
    }

    session.updatedAt = new Date().toISOString();
    await dbService.saveSession(session);

    return {
      session,
      compilerStatus: runResult.status,
      passed: runResult.passed,
      total: runResult.total,
      results: runResult.results,
      runtime: runResult.runtime,
      memory: runResult.memory,
      feedback,
    };
  },

  async submitAptitude(
    sessionId: string,
    answers: Record<string, string>,
    violations: { type: string; timestamp: string }[] = []
  ) {
    const session = await dbService.getSession(sessionId);
    if (!session) throw new Error("OA session not found.");

    const intermediate: InterviewSession = {
      ...session,
      aptitudeAnswers: answers,
      aptitudeStatus: "completed",
      violations: [...(session.violations || []), ...violations],
      updatedAt: new Date().toISOString(),
    };

    const evaluation = await evaluationService.evaluateSession(intermediate);
    intermediate.evaluation = evaluation;

    // Local report only — never call Gemini during E2E testing
    const report: OAReport = {
      candidateSummary: {
        name: intermediate.blueprint.candidateName,
        role: intermediate.blueprint.role,
        experience: `${intermediate.blueprint.yearsOfExperience} Years (${intermediate.blueprint.experienceLevel})`,
        difficulty: intermediate.blueprint.suggestedDifficulty,
        duration: `${evaluation.timeTaken} Mins`,
        overallScore: evaluation.overallScore,
      },
      technicalPerformance: {
        "Problem Solving": evaluation.codingScore,
        "Logical Aptitude": evaluation.aptitudeScore,
        "Core Technical MCQs": evaluation.mcqScore,
      },
      codingPerformance: {
        problemsAttempted: evaluation.codingStats.problemsAttempted,
        passed: evaluation.codingStats.passed,
        failed: evaluation.codingStats.failed,
        codeQuality: "Offline evaluation based on submission completeness.",
        optimization: "Review Big-O and edge cases for stronger scores.",
        suggestions: "Practice Two Sum, stacks, and sliding window patterns.",
      },
      aptitudePerformance: {
        logical: Math.round(evaluation.aptitudeScore * 1.0),
        numerical: Math.round(evaluation.aptitudeScore * 0.9),
        verbal: Math.round(evaluation.aptitudeScore * 1.05),
        analytical: Math.round(evaluation.aptitudeScore * 0.95),
      },
      strongAreas: intermediate.blueprint.skills.slice(0, 3),
      weakAreas: evaluation.passed ? ["System design depth"] : ["Core fundamentals", "Timed problem solving"],
      personalizedLearningPath: [
        "Revise JS/React fundamentals with timed quizzes.",
        "Practice 2–3 coding problems daily (arrays, strings, stacks).",
        "Work through aptitude mixed sets under a 15-minute timer.",
      ],
      interviewReadiness: evaluation.overallScore >= 70
        ? "Ready for Mid-Level Roles"
        : evaluation.overallScore >= 50
          ? "Ready for Junior Roles"
          : "Needs More Practice",
      finalRecommendation: evaluation.passed
        ? "Proceed to AI Interview"
        : "Retry OA Assessment",
    };

    intermediate.report = report;
    await dbService.saveSession(intermediate);

    return {
      session: intermediate,
      passed: evaluation.passed,
      overallScore: evaluation.overallScore,
      report,
    };
  },
};
