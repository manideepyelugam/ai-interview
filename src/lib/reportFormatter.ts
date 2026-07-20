import type {
  InterviewSession,
  AIInterviewSession,
  AudioInterviewSession,
  FullInterviewSession,
  UnifiedAssignmentReport,
  UnifiedReportSection
} from "@/src/types";

export function formatToUnifiedReport(
  session: any,
  type?: "oa" | "ai" | "audio" | "full"
): UnifiedAssignmentReport {
  const interviewType = (type || session.interviewType || "oa") as "oa" | "ai" | "audio" | "full";
  const id = session.id || "session_id";
  const userId = session.userId || "user";
  const candidateName = session.blueprint?.candidateName || "Candidate";
  const role = session.blueprint?.role || "Software Engineer";
  const createdAt = session.createdAt || new Date().toISOString();
  const updatedAt = session.updatedAt || new Date().toISOString();
  const status = session.status === "completed" || session.aptitudeStatus === "completed" ? "completed" : "in_progress";

  let overallScore = 0;
  let passed = false;
  let durationMinutes = 15;

  let metrics = {
    technicalScore: 0,
    communicationScore: 0,
    problemSolvingScore: 0,
    confidenceScore: 0,
    aptitudeScore: 0,
  };

  let strengths: string[] = [];
  let weaknesses: string[] = [];
  let recommendations: string[] = [];
  let finalVerdict = "Under Evaluation";
  let sections: UnifiedReportSection[] = [];
  let transcript: { speaker: "AI" | "Candidate"; text: string; timestamp: string }[] | undefined;

  // Calculate proctoring summary from violations array if available
  const violations = session.violations || [];
  const tabSwitches = violations.filter((v: any) => v.type === "tab_switch" || v.type === "visibility_change").length;
  const fullscreenExits = violations.filter((v: any) => v.type === "fullscreen_exit").length;
  const violationsCount = violations.length;
  const proctoringStatus: "Clean" | "Flagged" | "Suspicious" =
    violationsCount === 0 ? "Clean" : violationsCount < 4 ? "Flagged" : "Suspicious";

  const proctoring = {
    tabSwitches,
    fullscreenExits,
    violationsCount,
    status: proctoringStatus,
  };

  if (interviewType === "oa") {
    const oaSession = session as InterviewSession;
    durationMinutes = 20;
    overallScore = oaSession.evaluation?.overallScore ?? 0;
    passed = oaSession.evaluation?.passed ?? (overallScore >= 50);

    metrics = {
      technicalScore: oaSession.evaluation?.mcqScore ?? 0,
      communicationScore: 75,
      problemSolvingScore: oaSession.evaluation?.codingScore ?? 0,
      confidenceScore: 80,
      aptitudeScore: oaSession.evaluation?.aptitudeScore ?? 0,
    };

    strengths = oaSession.report?.strongAreas || [
      "Technical concepts and syntax knowledge",
      "Problem logic formulation",
    ];

    weaknesses = oaSession.report?.weakAreas || [
      "Time complexity optimization",
      "Edge-case handling in coding tasks",
    ];

    recommendations = oaSession.report?.personalizedLearningPath || [
      "Practice medium-difficulty algorithmic problems",
      "Review spatial and temporal code optimization techniques",
    ];

    finalVerdict = oaSession.report?.finalRecommendation || (passed ? "Proceed to AI Interview Round" : "Retry OA Assessment");

    // Sections for OA
    if (oaSession.mcqQuestions && oaSession.mcqQuestions.length > 0) {
      sections.push({
        id: "mcq-section",
        title: "Technical MCQ Round",
        type: "mcq",
        score: oaSession.evaluation?.mcqScore ?? 0,
        maxScore: 100,
        summary: `Scored ${oaSession.evaluation?.mcqScore ?? 0}% in core technical concepts.`,
        items: oaSession.mcqQuestions.map((q) => {
          const userAnswer = oaSession.mcqAnswers?.[q.id] || "Skipped";
          const isCorrect = userAnswer === q.correctAnswer;
          return {
            question: q.question,
            answer: userAnswer,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            status: isCorrect ? "Correct" : userAnswer === "Skipped" ? "Skipped" : "Incorrect",
            score: isCorrect ? 100 : 0,
          };
        }),
      });
    }

    if (oaSession.codingQuestions && oaSession.codingQuestions.length > 0) {
      sections.push({
        id: "coding-section",
        title: "Hands-on Coding Round",
        type: "coding",
        score: oaSession.evaluation?.codingScore ?? 0,
        maxScore: 100,
        summary: `Scored ${oaSession.evaluation?.codingScore ?? 0}% on algorithmic problem solving.`,
        items: oaSession.codingQuestions.map((q) => {
          const ans = oaSession.codingAnswers?.[q.id] || { code: "// No code submitted", language: "javascript" };
          return {
            question: q.title + ": " + q.problemStatement,
            userCode: ans.code,
            language: ans.language || "javascript",
            testCasesPassed: ans.passedCount || 0,
            totalTestCases: ans.totalCount || q.testCases?.length || 2,
            status: ans.status || (ans.passedCount ? "Passed" : "Attempted"),
            score: ans.totalCount ? Math.round(((ans.passedCount || 0) / ans.totalCount) * 100) : 0,
            feedback: ans.feedback ? JSON.stringify(ans.feedback) : undefined,
          };
        }),
      });
    }

    if (oaSession.aptitudeQuestions && oaSession.aptitudeQuestions.length > 0) {
      sections.push({
        id: "aptitude-section",
        title: "Logical & Quantitative Aptitude",
        type: "aptitude",
        score: oaSession.evaluation?.aptitudeScore ?? 0,
        maxScore: 100,
        summary: `Scored ${oaSession.evaluation?.aptitudeScore ?? 0}% in reasoning and analytical skills.`,
        items: oaSession.aptitudeQuestions.map((q) => {
          const userAnswer = oaSession.aptitudeAnswers?.[q.id] || "Skipped";
          const isCorrect = userAnswer === q.correctAnswer;
          return {
            question: q.question,
            answer: userAnswer,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            status: isCorrect ? "Correct" : userAnswer === "Skipped" ? "Skipped" : "Incorrect",
            score: isCorrect ? 100 : 0,
          };
        }),
      });
    }
  } else if (interviewType === "ai" || interviewType === "audio") {
    const aiSession = session as AIInterviewSession | AudioInterviewSession;
    durationMinutes = interviewType === "audio" ? 10 : 15;
    overallScore = aiSession.evaluation?.overallScore ?? 0;
    passed = aiSession.evaluation?.passed ?? (overallScore >= 50);

    metrics = {
      technicalScore: aiSession.evaluation?.technicalScore ?? Math.round(overallScore * 0.95),
      communicationScore: aiSession.evaluation?.communicationScore ?? Math.round(overallScore * 1.05),
      problemSolvingScore: aiSession.evaluation?.problemSolvingScore ?? Math.round(overallScore * 0.9),
      confidenceScore: aiSession.evaluation?.confidenceScore ?? Math.round(overallScore * 1.0),
      aptitudeScore: 75,
    };

    // Ensure metric values don't exceed 100
    metrics.technicalScore = Math.min(100, Math.max(0, metrics.technicalScore));
    metrics.communicationScore = Math.min(100, Math.max(0, metrics.communicationScore));
    metrics.problemSolvingScore = Math.min(100, Math.max(0, metrics.problemSolvingScore));
    metrics.confidenceScore = Math.min(100, Math.max(0, metrics.confidenceScore));

    strengths = aiSession.report?.strengths || [
      "Clear articulation of technical concepts",
      "Confident delivery during live Q&A",
    ];

    weaknesses = aiSession.report?.weaknesses || [
      "Could elaborate more on architectural tradeoffs",
      "Elaborate on edge cases in complex scenarios",
    ];

    recommendations = aiSession.report?.recommendations || [
      "Practice structured STAR method for technical responses",
      "Focus on explaining real-world system architecture examples",
    ];

    finalVerdict = passed ? "Recommended for Hire / Next Round" : "Requires Practice";

    transcript = aiSession.report?.transcript;

    if (aiSession.questions && aiSession.questions.length > 0) {
      sections.push({
        id: "qa-section",
        title: interviewType === "audio" ? "Audio Voice Technical Q&A" : "AI Interactive Technical Q&A",
        type: "qa",
        score: overallScore,
        maxScore: 100,
        summary: `Evaluated across ${aiSession.questions.length} dynamic interview questions.`,
        items: aiSession.questions.map((q) => {
          const evalData = q.evaluation;
          return {
            question: q.questionText,
            answer: q.answerText || "No response recorded",
            score: evalData?.score || 0,
            feedback: evalData?.feedback || "Evaluation pending or completed.",
            metrics: {
              accuracy: evalData?.technicalAccuracy ? evalData.technicalAccuracy * 10 : undefined,
              communication: evalData?.communication ? evalData.communication * 10 : undefined,
              problemSolving: evalData?.problemSolving ? evalData.problemSolving * 10 : undefined,
              confidence: evalData?.confidence ? evalData.confidence * 10 : undefined,
            },
          };
        }),
      });
    }
  } else if (interviewType === "full") {
    const fullSession = session as FullInterviewSession;
    durationMinutes = 45;
    overallScore = fullSession.evaluation?.overallScore ?? 0;
    passed = fullSession.evaluation?.passed ?? (overallScore >= 50);

    metrics = {
      technicalScore: Math.round(overallScore * 0.95),
      communicationScore: Math.round(overallScore * 1.05),
      problemSolvingScore: Math.round(overallScore * 0.9),
      confidenceScore: Math.round(overallScore * 1.0),
      aptitudeScore: Math.round(overallScore * 0.88),
    };

    metrics.technicalScore = Math.min(100, Math.max(0, metrics.technicalScore));
    metrics.communicationScore = Math.min(100, Math.max(0, metrics.communicationScore));
    metrics.problemSolvingScore = Math.min(100, Math.max(0, metrics.problemSolvingScore));
    metrics.confidenceScore = Math.min(100, Math.max(0, metrics.confidenceScore));
    metrics.aptitudeScore = Math.min(100, Math.max(0, metrics.aptitudeScore));

    strengths = [
      "Comprehensive performance across OA, AI, and Audio rounds",
      "Consistent problem-solving capability under pressure",
    ];

    weaknesses = [
      "Continuous optimization of time management across rounds",
    ];

    recommendations = [
      "Ready for production-level engineering role technical screens",
    ];

    finalVerdict = passed ? "Strong Pass / Ready for Team Matching" : "Further Practice Recommended";

    sections.push({
      id: "full-summary-section",
      title: "Full End-to-End Multi-Round Summary",
      type: "round_summary",
      score: overallScore,
      maxScore: 100,
      summary: "Combined evaluation from Online Assessment, AI Technical Round, and Audio Mock Interview.",
      items: [
        {
          question: "Round 1: Online Coding Assessment (OA)",
          status: fullSession.oaSessionId ? "Completed" : "Not Started",
          score: Math.round(overallScore * 0.9),
          feedback: "Coding and technical aptitude evaluated.",
        },
        {
          question: "Round 2: AI Technical Deep Dive",
          status: fullSession.aiSessionId ? "Completed" : "Not Started",
          score: Math.round(overallScore * 1.0),
          feedback: "Live conceptual and scenario-based Q&A.",
        },
        {
          question: "Round 3: Audio Voice Communication Round",
          status: fullSession.audioSessionId ? "Completed" : "Not Started",
          score: Math.round(overallScore * 0.95),
          feedback: "Voice fluency, confidence, and system design discussion.",
        },
      ],
    });
  }

  return {
    id: `report_${id}`,
    sessionId: id,
    userId,
    interviewType,
    role,
    candidateName,
    status,
    createdAt,
    updatedAt,
    durationMinutes,
    overallScore,
    passed,
    metrics,
    strengths,
    weaknesses,
    recommendations,
    finalVerdict,
    proctoring,
    sections,
    transcript,
  };
}
