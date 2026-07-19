import type {
  InterviewContext,
  InterviewBlueprint,
  MCQQuestion,
  CodingQuestion,
  AptitudeQuestion,
  InterviewSession,
  OAReport
} from "@/src/types";

export interface AIProvider {
  generateBlueprint(context: InterviewContext): Promise<InterviewBlueprint>;
  generateMCQs(blueprint: InterviewBlueprint): Promise<MCQQuestion[]>;
  generateCodingQuestions(blueprint: InterviewBlueprint): Promise<CodingQuestion[]>;
  generateAptitudeQuestions(blueprint: InterviewBlueprint): Promise<AptitudeQuestion[]>;
  evaluateCodeSubmission(
    question: CodingQuestion,
    code: string,
    language: string,
    testRunResults: { passed: number; total: number; compilerOutput?: string }
  ): Promise<{ complexity: string; codeQuality: string; optimization: string; suggestions: string }>;
  generateReport(session: InterviewSession): Promise<OAReport>;
  generateJSON<T>(prompt: string, fallbackGenerator: () => T): Promise<T>;
}
