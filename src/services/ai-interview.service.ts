import { dbService } from "./db.service";
import { aiService } from "./ai.service";
import { aiInterviewPrompts } from "../prompts/ai-interview.prompt";
import type { InterviewContext, AIInterviewSession, AIQuestion, AIInterviewReport } from "../types";

export const aiInterviewService = {
  /**
   * Start a new AI Interview session
   */
  async startSession(userId: string, context: InterviewContext): Promise<AIInterviewSession> {
    const sessionId = "ai-session-" + Math.random().toString(36).substring(2, 11);

    // 1. Generate candidate profile blueprint
    const blueprint = await aiService.generateBlueprint(context);

    // 2. Generate the first question
    const prompt = aiInterviewPrompts.getAIQuestionPrompt(blueprint, []);

    // Fallback generator for the first question
    const fallbackQuestion = () => {
      const role = blueprint.role || "Software Engineer";
      const skill = blueprint.skills[0] || "React";
      return {
        questionText: `Hello! Welcome to your technical interview for the ${role} position. Let's start with a foundational concept. Can you explain your understanding of ${skill} and describe a scenario where you implemented it in a production application?`
      };
    };

    const firstQuestionObj = await aiService.generateJSON<{ questionText: string }>(
      prompt,
      fallbackQuestion
    );

    const firstQuestion: AIQuestion = {
      id: "q-1",
      questionText: firstQuestionObj.questionText,
      evaluation: null
    };

    // 3. Initialize the AI Interview Session
    const session: AIInterviewSession = {
      id: sessionId,
      userId,
      blueprint,
      status: "not_started",
      currentQuestionIndex: 0,
      questions: [firstQuestion],
      violations: [],
      timeline: [
        { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), label: "Introduction" }
      ],
      evaluation: null,
      report: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbService.saveAISession(session);
    return session;
  },

  /**
   * Submit candidate answer, evaluate, and get next question or final report
   */
  async submitAnswer(
    sessionId: string,
    questionId: string,
    answerText: string,
    violations: { type: string; timestamp: string }[] = []
  ): Promise<AIInterviewSession> {
    const session = await dbService.getAISession(sessionId);
    if (!session) {
      throw new Error("AI Interview Session not found.");
    }

    // Locate the current question and store answer
    const currentQuestionIndex = session.questions.findIndex(q => q.id === questionId);
    if (currentQuestionIndex === -1) {
      throw new Error("Question not found in this session.");
    }

    session.questions[currentQuestionIndex].answerText = answerText || "(Skipped)";

    // Update session violations
    if (violations && violations.length > 0) {
      session.violations = [...session.violations, ...violations];
    }

    // 1. Evaluate the answer
    const questionText = session.questions[currentQuestionIndex].questionText;
    const evalPrompt = aiInterviewPrompts.getAIAnswerEvaluationPrompt(questionText, answerText);

    // Fallback generator for answer evaluation
    const fallbackEvaluation = () => {
      const length = answerText.trim().length;
      let score = 50;
      let rating = 5;
      let feedback = "The answer was brief and lacked specific technical details.";

      if (length > 100) {
        score = 80;
        rating = 8;
        feedback = "Good response with relevant terminology, demonstrating clear conceptual knowledge.";
      } else if (length > 40) {
        score = 70;
        rating = 7;
        feedback = "Clear communication, though further depth in real-world optimizations would be beneficial.";
      }

      return {
        technicalAccuracy: rating,
        communication: Math.min(10, rating + 1),
        problemSolving: rating,
        confidence: Math.min(10, rating + 1),
        completeness: rating,
        practicalKnowledge: rating,
        feedback,
        score
      };
    };

    const evaluationObj = await aiService.generateJSON<{
      technicalAccuracy: number;
      communication: number;
      problemSolving: number;
      confidence: number;
      completeness: number;
      practicalKnowledge: number;
      feedback: string;
      score: number;
    }>(evalPrompt, fallbackEvaluation);

    session.questions[currentQuestionIndex].evaluation = evaluationObj;

    const totalQuestionsAsked = session.questions.length;

    // Check if we have completed 10 questions
    if (totalQuestionsAsked >= 10) {
      session.status = "completed";

      // Calculate aggregate evaluation scores
      let sumOverall = 0;
      let sumTech = 0;
      let sumComm = 0;
      let sumSolve = 0;
      let sumConf = 0;

      session.questions.forEach(q => {
        if (q.evaluation) {
          sumOverall += q.evaluation.score;
          sumTech += q.evaluation.technicalAccuracy;
          sumComm += q.evaluation.communication;
          sumSolve += q.evaluation.problemSolving;
          sumConf += q.evaluation.confidence;
        }
      });

      const count = session.questions.length;
      session.evaluation = {
        overallScore: Math.round(sumOverall / count),
        technicalScore: Math.round((sumTech / count) * 10),
        communicationScore: Math.round((sumComm / count) * 10),
        problemSolvingScore: Math.round((sumSolve / count) * 10),
        confidenceScore: Math.round((sumConf / count) * 10),
        passed: (sumOverall / count) >= 50
      };

      // Generate final report using Gemini
      const reportPrompt = aiInterviewPrompts.getAIReportPrompt(session);

      // Fallback report generator
      const fallbackReport = (): AIInterviewReport => {
        const evalData = session.evaluation!;
        const durationMins = Math.round((Date.now() - new Date(session.createdAt).getTime()) / 60000);

        const qFeedback = session.questions.map(q => ({
          question: q.questionText,
          answer: q.answerText || "(Skipped)",
          score: q.evaluation?.score || 0,
          feedback: q.evaluation?.feedback || "",
          metrics: {
            accuracy: q.evaluation?.technicalAccuracy || 0,
            communication: q.evaluation?.communication || 0,
            problemSolving: q.evaluation?.problemSolving || 0,
            confidence: q.evaluation?.confidence || 0
          }
        }));

        const tabSwitches = session.violations.filter(v => v.type === "tab_switch").length;
        const fullscreenExits = session.violations.filter(v => v.type === "fullscreen_exit").length;
        const screenShareInterruptions = session.violations.filter(v => v.type === "screen_share_interrupted").length;

        const transcriptLogs = session.questions.flatMap((q, idx) => [
          { speaker: "AI" as const, text: q.questionText, timestamp: `${idx * 2}:00` },
          { speaker: "Candidate" as const, text: q.answerText || "(Skipped)", timestamp: `${idx * 2 + 1}:15` }
        ]);

        return {
          candidateSummary: {
            overallScore: evalData.overallScore,
            technicalScore: evalData.technicalScore,
            communicationScore: evalData.communicationScore,
            problemSolvingScore: evalData.problemSolvingScore,
            confidenceScore: evalData.confidenceScore,
            duration: `${durationMins}:15`
          },
          questionFeedback: qFeedback,
          strengths: [
            "Demonstrated strong conceptual knowledge in key software engineering practices.",
            "Structured coding and project descriptions with logical architectures.",
            "Kept a steady tone and clear articulation during problem explanation."
          ],
          weaknesses: [
            "Could elaborate further on complex runtime optimizations.",
            "Some brief answers omitted standard error boundaries and edge-case details."
          ],
          recommendations: [
            "Practice system design for large-scale microservices databases.",
            "Elaborate more on trade-offs when choosing frameworks over standard libraries.",
            "Focus on detailed performance profiling."
          ],
          transcript: transcriptLogs,
          timeline: [
            { timestamp: "00:00", label: "Introduction" },
            { timestamp: "02:00", label: "Core Technical Concepts" },
            { timestamp: "06:00", label: "Project Architecture" },
            { timestamp: "12:00", label: "Behavioral & Scenarios" },
            { timestamp: "15:00", label: "Interview Completed" }
          ],
          proctoringSummary: {
            tabSwitches,
            fullscreenExits,
            screenShareInterruptions,
            status: tabSwitches > 3 ? "Suspicious" : tabSwitches > 0 ? "Flagged" : "Clean"
          }
        };
      };

      const finalReport = await aiService.generateJSON<AIInterviewReport>(
        reportPrompt,
        fallbackReport
      );

      session.report = finalReport;
      session.timeline = finalReport.timeline || session.timeline;

    } else {
      // 2. Generate the next question
      const nextPrompt = aiInterviewPrompts.getAIQuestionPrompt(session.blueprint, session.questions);

      const fallbackNextQuestion = () => {
        const nextIdx = totalQuestionsAsked + 1;
        const skill = session.blueprint.skills[nextIdx % session.blueprint.skills.length] || "Design Patterns";
        return {
          questionText: `That makes sense. Moving on to another key area: ${skill}. Can you tell me about a time you encountered a major challenge with ${skill} and how you debugged or optimized it?`
        };
      };

      const nextQuestionObj = await aiService.generateJSON<{ questionText: string }>(
        nextPrompt,
        fallbackNextQuestion
      );

      const nextQuestion: AIQuestion = {
        id: `q-${totalQuestionsAsked + 1}`,
        questionText: nextQuestionObj.questionText,
        evaluation: null
      };

      session.questions.push(nextQuestion);
      session.currentQuestionIndex = totalQuestionsAsked;

      // Add a timeline checkpoint at major transitions
      if (totalQuestionsAsked === 3) {
        session.timeline.push({
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          label: "Core Technical Concepts"
        });
      } else if (totalQuestionsAsked === 6) {
        session.timeline.push({
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          label: "Project Architecture"
        });
      } else if (totalQuestionsAsked === 8) {
        session.timeline.push({
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          label: "Behavioral & Scenarios"
        });
      }
    }

    session.updatedAt = new Date().toISOString();
    await dbService.saveAISession(session);
    return session;
  }
};
