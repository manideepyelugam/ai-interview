import { NextResponse } from "next/server";
import { dbService } from "@/src/services/db.service";
import type { FullInterviewSession, InterviewBlueprint, InterviewContext, Project } from "@/src/types";

function buildFallbackBlueprint(context: InterviewContext): InterviewBlueprint {
  const candidateName = context.resume?.name || "Candidate";
  const role = context.role || "Full Stack Developer";
  const skills =
    context.resume?.skills ||
    context.jd?.requiredSkills ||
    ["JavaScript", "TypeScript", "React", "Node.js"];
  const frameworks = context.jd?.preferredSkills || ["React", "Express", "Next.js"];
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
    frameworks,
    databases: ["MongoDB", "PostgreSQL"],
    projects,
    confidenceScore: 85,
    suggestedDifficulty: "Medium",
    estimatedCompanyLevel: "Product",
  };
}

export async function POST(req: Request) {
  try {
    const { context, userId } = await req.json();

    if (!context || !userId) {
      return NextResponse.json(
        { error: "Context and userId are required fields." },
        { status: 400 }
      );
    }

    // Testing-friendly: local blueprint (no Gemini)
    const blueprint = buildFallbackBlueprint(context as InterviewContext);

    const sessionId = `full-session-${Math.random().toString(36).substr(2, 9)}`;
    const session: FullInterviewSession = {
      id: sessionId,
      userId,
      blueprint,
      status: "in_progress",
      oaSessionId: null,
      aiSessionId: null,
      audioSessionId: null,
      currentRound: "oa",
      evaluation: null,
      report: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dbService.saveFullSession(session);

    return NextResponse.json({
      sessionId,
      session,
    });
  } catch (err: any) {
    console.error("Error starting Full Interview:", err);
    return NextResponse.json(
      { error: err.message || "Failed to start full interview." },
      { status: 500 }
    );
  }
}
