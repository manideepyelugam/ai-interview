import { NextResponse } from "next/server";
import { dbService } from "@/src/services/db.service";
import { aiService } from "@/src/services/ai.service";
import type { FullInterviewSession, AIInterviewReport } from "@/src/types";

export async function POST(req: Request) {
  try {
    const { fullSessionId } = await req.json();

    if (!fullSessionId) {
      return NextResponse.json(
        { error: "fullSessionId is required." },
        { status: 400 }
      );
    }

    const session = await dbService.getFullSession(fullSessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Full Session not found." },
        { status: 404 }
      );
    }

    // Load child sessions
    const oaSess = session.oaSessionId ? await dbService.getSession(session.oaSessionId) : null;
    const aiSess = session.aiSessionId ? await dbService.getAISession(session.aiSessionId) : null;
    const audioSess = session.audioSessionId ? await dbService.getAudioSession(session.audioSessionId) : null;

    // Calculate aggregated scores
    const oaScore = oaSess?.evaluation?.overallScore || 0;
    const aiScore = aiSess?.evaluation?.overallScore || 0;
    const audioScore = audioSess?.evaluation?.overallScore || 0;
    const overallScore = Math.round((oaScore + aiScore + audioScore) / 3) || 50;

    const oaTech = oaSess?.evaluation?.codingScore || 0;
    const aiTech = aiSess?.evaluation?.technicalScore || 0;
    const audioTech = audioSess?.evaluation?.technicalScore || 0;
    const technicalScore = Math.round((oaTech + aiTech + audioTech) / 3) || overallScore;

    const aiComm = aiSess?.evaluation?.communicationScore || 0;
    const audioComm = audioSess?.evaluation?.communicationScore || 0;
    const communicationScore = Math.round((aiComm + audioComm) / 2) || overallScore;

    const oaSolve = oaSess?.evaluation?.codingScore || 0;
    const aiSolve = aiSess?.evaluation?.problemSolvingScore || 0;
    const problemSolvingScore = Math.round((oaSolve + aiSolve) / 2) || overallScore;

    const aiConf = aiSess?.evaluation?.confidenceScore || 0;
    const audioConf = audioSess?.evaluation?.confidenceScore || 0;
    const confidenceScore = Math.round((aiConf + audioConf) / 2) || overallScore;

    // Define prompt for Gemini to synthesize strengths, weaknesses, and recommendations
    const synthesisPrompt = `
You are an executive interviewer consolidating feedback for a candidate who completed a multi-round technical assessment:
- Candidate Name: ${session.blueprint.candidateName}
- Target Role: ${session.blueprint.role}
- OA Round Score: ${oaScore}%
- AI Proctor Technical Round Score: ${aiScore}%
- Audio/Behavioral Round Score: ${audioScore}%

Here is the feedback summary from the rounds:
- OA Round details: Coding problems attempted = ${oaSess?.evaluation?.codingStats?.problemsAttempted || 0}, accuracy = ${oaSess?.evaluation?.accuracy || 0}%
- AI Proctor Round strengths: ${JSON.stringify(aiSess?.report?.strengths || [])}
- AI Proctor Round weaknesses: ${JSON.stringify(aiSess?.report?.weaknesses || [])}
- Audio Round strengths: ${JSON.stringify(audioSess?.report?.strengths || [])}
- Audio Round weaknesses: ${JSON.stringify(audioSess?.report?.weaknesses || [])}

Analyze the candidate's performance across all stages and write a consolidated report. Return a JSON object with the following fields:
{
  "strengths": ["string detailing specific strength 1", "strength 2", ...],
  "weaknesses": ["string detailing specific weakness 1", "weakness 2", ...],
  "recommendations": ["personalized action step 1", "personalized action step 2", ...]
}
Ensure your output is strictly valid JSON. Do not include markdown code block formatting (e.g. \`\`\`json) in the response text itself, just return the JSON.
`;

    const fallbackSynthesis = () => ({
      strengths: [
        `Competent technical capabilities shown across all formats (OA score: ${oaScore}%, AI proctor: ${aiScore}%, Audio: ${audioScore}%).`,
        "Demonstrated resilience and focus across a lengthy multi-stage interview.",
        "Clear verbal articulation during coding explanations and situational responses."
      ],
      weaknesses: [
        "Needs practice with edge-case validation in automated code submissions.",
        "Logical justifications could be more structured when analyzing system scale."
      ],
      recommendations: [
        "Focus on microservice patterns and data modeling best practices.",
        "Practice whiteboard mock interviews while talking aloud to maintain conversational pacing."
      ]
    });

    const synthesis = await aiService.generateJSON<{
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
    }>(synthesisPrompt, fallbackSynthesis);

    const masterReport: AIInterviewReport = {
      candidateSummary: {
        overallScore,
        technicalScore,
        communicationScore,
        problemSolvingScore,
        confidenceScore,
        duration: "45 Mins"
      },
      questionFeedback: [],
      strengths: synthesis.strengths || fallbackSynthesis().strengths,
      weaknesses: synthesis.weaknesses || fallbackSynthesis().weaknesses,
      recommendations: synthesis.recommendations || fallbackSynthesis().recommendations,
      transcript: [],
      timeline: [
        { timestamp: "00:00", label: "Full Interview Initialized" },
        { timestamp: "15:00", label: "Online Assessment Completed" },
        { timestamp: "30:00", label: "AI Technical Round Completed" },
        { timestamp: "45:00", label: "Audio Interview Completed" }
      ],
      proctoringSummary: {
        tabSwitches: (oaSess?.violations?.length || 0) + (aiSess?.violations?.length || 0),
        fullscreenExits: 0,
        screenShareInterruptions: 0,
        status: (oaSess?.violations?.length || 0) > 3 ? "Suspicious" : "Clean"
      }
    };

    // Update session status
    session.status = "completed";
    session.evaluation = {
      overallScore,
      passed: overallScore >= 50
    };
    session.report = masterReport;
    session.updatedAt = new Date().toISOString();

    await dbService.saveFullSession(session);

    return NextResponse.json({
      session,
    });
  } catch (err: any) {
    console.error("Error finalizing Full Session:", err);
    return NextResponse.json(
      { error: err.message || "Failed to finalize session." },
      { status: 500 }
    );
  }
}
