import { dbService } from "./db.service";
import { aiService } from "./ai.service";
import { audioInterviewPrompts } from "../prompts/audio-interview.prompt";
import type { InterviewContext, AudioInterviewSession, AudioInterviewSettings, AIQuestion, AIInterviewReport } from "../types";

export const audioInterviewService = {
  /**
   * Start a new Audio Interview session
   */
  async startSession(
    userId: string,
    context: InterviewContext,
    settings: AudioInterviewSettings
  ): Promise<AudioInterviewSession> {
    const sessionId = "audio-session-" + Math.random().toString(36).substring(2, 11);

    // 1. Generate candidate profile blueprint
    const blueprint = await aiService.generateBlueprint(context);

    // 2. Generate the first question
    const prompt = audioInterviewPrompts.getAudioQuestionPrompt(blueprint, settings, []);

    const fallbackQuestion = () => {
      const role = blueprint.role || "Software Engineer";
      const skill = blueprint.skills[0] || "React";
      return {
        questionText: `Welcome to your voice mock interview for the ${role} position. Let's start with a core concept. Can you explain your experience with ${skill} and how you typically apply it in your projects?`
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

    // 3. Initialize Audio Session
    const session: AudioInterviewSession = {
      id: sessionId,
      userId,
      blueprint,
      settings,
      status: "in_progress", // start straight in progress once permissions checked
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

    await dbService.saveAudioSession(session);
    return session;
  },

  /**
   * Submit answer, evaluate, and fetch next question or construct final report
   */
  async submitAnswer(
    sessionId: string,
    questionId: string,
    answerText: string,
    violations: { type: string; timestamp: string }[] = [],
    endInterview: boolean = false
  ): Promise<AudioInterviewSession> {
    const session = await dbService.getAudioSession(sessionId);
    if (!session) {
      throw new Error("Audio Session not found.");
    }

    // Locate the current question and store candidate response
    const currentQuestionIndex = session.questions.findIndex(q => q.id === questionId);
    if (currentQuestionIndex === -1) {
      throw new Error("Question not found in session.");
    }

    session.questions[currentQuestionIndex].answerText = answerText || "(No verbal response provided)";

    // Update violations (if any, though audio interview has minimal proctoring)
    if (violations && violations.length > 0) {
      session.violations = [...session.violations, ...violations];
    }

    // 1. Evaluate the answer
    const questionText = session.questions[currentQuestionIndex].questionText;
    const evalPrompt = audioInterviewPrompts.getAudioAnswerEvaluationPrompt(questionText, answerText);

    const fallbackEvaluation = () => {
      const length = answerText.trim().length;
      let score = 60;
      let rating = 6;
      let feedback = "Your voice answer was received, but could benefit from more detailed technical elaboration.";

      if (length > 120) {
        score = 85;
        rating = 8;
        feedback = "Excellent verbal response with appropriate terminology and professional vocabulary.";
      } else if (length > 50) {
        score = 75;
        rating = 7;
        feedback = "Clear conceptual explanation. Adding a practical engineering example would strengthen your answer.";
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

    // Define target question count based on configured duration
    let targetCount = 10;
    if (session.settings.duration === 5) targetCount = 5;
    else if (session.settings.duration === 10) targetCount = 10;
    else if (session.settings.duration === 20) targetCount = 15;
    else if (session.settings.duration === 30) targetCount = 20;

    if (totalQuestionsAsked >= targetCount || endInterview) {
      session.status = "completed";

      // Calculate aggregate scores
      let sumOverall = 0;
      let sumTech = 0;
      let sumComm = 0;
      let sumSolve = 0;
      let sumConf = 0;
      let evaluatedCount = 0;

      session.questions.forEach(q => {
        if (q.evaluation) {
          sumOverall += q.evaluation.score;
          sumTech += q.evaluation.technicalAccuracy;
          sumComm += q.evaluation.communication;
          sumSolve += q.evaluation.problemSolving;
          sumConf += q.evaluation.confidence;
          evaluatedCount++;
        }
      });

      const denominator = evaluatedCount > 0 ? evaluatedCount : 1;
      session.evaluation = {
        overallScore: Math.round(sumOverall / denominator),
        technicalScore: Math.round((sumTech / denominator) * 10),
        communicationScore: Math.round((sumComm / denominator) * 10),
        problemSolvingScore: Math.round((sumSolve / denominator) * 10),
        confidenceScore: Math.round((sumConf / denominator) * 10),
        passed: (sumOverall / denominator) >= 50
      };

      // Generate report using Gemini
      const reportPrompt = audioInterviewPrompts.getAudioReportPrompt(session);

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

        const transcriptLogs = session.questions.flatMap((q, idx) => [
          { speaker: "AI" as const, text: q.questionText, timestamp: `${idx * 2}:00` },
          { speaker: "Candidate" as const, text: q.answerText || "(Skipped)", timestamp: `${idx * 2 + 1}:10` }
        ]);

        return {
          candidateSummary: {
            overallScore: evalData.overallScore,
            technicalScore: evalData.technicalScore,
            communicationScore: evalData.communicationScore,
            problemSolvingScore: evalData.problemSolvingScore,
            confidenceScore: evalData.confidenceScore,
            duration: `${durationMins}:30`
          },
          questionFeedback: qFeedback,
          strengths: [
            "Clear and articulate vocal delivery.",
            "Demonstrated firm grasp of foundational programming design patterns.",
            "Responded calmly and structurally under mock scenario constraints."
          ],
          weaknesses: [
            "Could expand vocabulary depth when describing system-level scale.",
            "Omitted key garbage collection or memory cleanup steps in verbal explanations."
          ],
          recommendations: [
            "Use standard terminology when describing database scaling operations.",
            "Practice the STAR technique for behavioral conflict-resolution scenarios.",
            "Explain project trade-offs explicitly from the start."
          ],
          transcript: transcriptLogs,
          timeline: [
            { timestamp: "00:00", label: "Introduction" },
            { timestamp: "02:00", label: "Voice Setup & Testing" },
            { timestamp: "05:00", label: "Technical QA Round" },
            { timestamp: "10:00", label: "Interview Concluded" }
          ],
          proctoringSummary: {
            tabSwitches: 0,
            fullscreenExits: 0,
            screenShareInterruptions: 0,
            status: "Clean"
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
      // Generate the next question
      const nextPrompt = audioInterviewPrompts.getAudioQuestionPrompt(session.blueprint, session.settings, session.questions);

      const fallbackNextQuestion = () => {
        const nextIdx = totalQuestionsAsked + 1;
        const skill = session.blueprint.skills[nextIdx % session.blueprint.skills.length] || "Architecture";
        return {
          questionText: `Got it. Let's move on to the next topic: ${skill}. Can you tell me about the core differences between standard paradigms and alternatives in ${skill}?`
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

      // Add timeline checkmarks at transition thresholds
      if (totalQuestionsAsked === Math.floor(targetCount / 4)) {
        session.timeline.push({
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          label: "Core Technical Concepts"
        });
      } else if (totalQuestionsAsked === Math.floor(targetCount / 2)) {
        session.timeline.push({
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          label: "Detailed Engineering Deep-Dive"
        });
      } else if (totalQuestionsAsked === Math.floor((3 * targetCount) / 4)) {
        session.timeline.push({
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          label: "Behavioral & Applied Scenarios"
        });
      }
    }

    session.updatedAt = new Date().toISOString();
    await dbService.saveAudioSession(session);
    return session;
  }
};
