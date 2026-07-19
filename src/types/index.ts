// ─── User ───────────────────────────────────────────────────────
export interface UserDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  name: string;
  email: string;
  avatar: string;
  provider: OAuthProvider;
  createdAt: string;
  updatedAt: string;
}

export type OAuthProvider = "google" | "github";

// ─── JD Upload ──────────────────────────────────────────────────
export interface JDDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  interviewType: InterviewType;
  storageFileId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  status: JDStatus;
}

export type InterviewType = "full" | "oa" | "ai" | "audio";

export type JDStatus = "uploaded";

// ─── Upload State ───────────────────────────────────────────────
export interface UploadedFileInfo {
  fileId: string;
  documentId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

export type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

// ─── Navigation ─────────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

// ─── Auth ────────────────────────────────────────────────────────
export interface AuthUser {
  $id: string;
  name: string;
  email: string;
  avatar: string;
  provider: OAuthProvider;
}

// ─── Interview Context ───────────────────────────────────────────
export interface InterviewContext {
  source: "jd" | "resume" | "role";
  role?: string;
  jd?: {
    company?: string;
    experience?: string;
    requiredSkills: string[];
    preferredSkills: string[];
  };
  resume?: {
    name?: string;
    skills: string[];
    projects: string[];
    education?: string;
  };
}

// ─── Interview Blueprint ─────────────────────────────────────────
export interface Project {
  title: string;
  description: string;
  technologies: string[];
}

export interface InterviewBlueprint {
  candidateName: string;
  source: "resume" | "jd" | "role";
  role: string;
  experienceLevel: "Fresher" | "Junior" | "Mid" | "Senior";
  yearsOfExperience: number;
  skills: string[];
  frameworks: string[];
  databases: string[];
  projects: Project[];
  confidenceScore: number;
  suggestedDifficulty: "Easy" | "Medium" | "Hard";
  estimatedCompanyLevel: "Startup" | "Product" | "FAANG";
}

// ─── Assessment Questions ────────────────────────────────────────
export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  skill: string;
  difficulty: "Easy" | "Medium" | "Hard";
  expectedTime: number; // in seconds
}

export interface CodingTestCase {
  input: string;
  output: string;
  isHidden: boolean;
}

export interface CodingQuestion {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  problemStatement: string;
  constraints: string[];
  inputFormat: string;
  outputFormat: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  testCases: CodingTestCase[];
  hints: string[];
}

export interface AptitudeQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  category: "Logical Reasoning" | "Numerical Ability" | "Verbal Ability" | "Analytical Reasoning";
  difficulty: "Easy" | "Medium" | "Hard";
}

// ─── Assessment State and Session ────────────────────────────────
export type OARoundStatus = "not_started" | "in_progress" | "completed";

export interface OAEvaluation {
  mcqScore: number;       // score out of 100
  codingScore: number;    // score out of 100
  aptitudeScore: number;  // score out of 100
  overallScore: number;   // weighted score out of 100
  percentage: number;
  passed: boolean;
  timeTaken: number;      // in minutes
  accuracy: number;       // percentage
  mcqStats: {
    correct: number;
    wrong: number;
    skipped: number;
    accuracy: number;
  };
  codingStats: {
    problemsAttempted: number;
    passed: number;
    failed: number;
    compilationStatus: string;
    complexityAnalysis?: string;
  };
  aptitudeStats: {
    correct: number;
    wrong: number;
    skipped: number;
    accuracy: number;
  };
}

export interface OAReport {
  candidateSummary: {
    name: string;
    role: string;
    experience: string;
    difficulty: string;
    duration: string;
    overallScore: number;
  };
  technicalPerformance: Record<string, number>; // skill -> score%
  codingPerformance: {
    problemsAttempted: number;
    passed: number;
    failed: number;
    codeQuality: string;
    optimization: string;
    suggestions: string;
  };
  aptitudePerformance: {
    logical: number;
    numerical: number;
    verbal: number;
    analytical: number;
  };
  strongAreas: string[];
  weakAreas: string[];
  personalizedLearningPath: string[];
  interviewReadiness: "Ready for Junior Roles" | "Ready for Mid-Level Roles" | "Needs More Practice";
  finalRecommendation: "Proceed to AI Interview" | "Retry OA Assessment";
}

export interface InterviewSession {
  id: string;
  userId: string;
  blueprint: InterviewBlueprint;
  mcqStatus: OARoundStatus;
  codingStatus: OARoundStatus;
  aptitudeStatus: OARoundStatus;
  mcqQuestions: MCQQuestion[];
  codingQuestions: CodingQuestion[];
  aptitudeQuestions: AptitudeQuestion[];
  mcqAnswers: Record<string, string>; // questionId -> optionText or index
  codingAnswers: Record<string, { code: string; language: string; passedCount?: number; totalCount?: number; status?: string; feedback?: any }>;
  aptitudeAnswers: Record<string, string>;
  violations: { type: string; timestamp: string }[];
  evaluation: OAEvaluation | null;
  report: OAReport | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIQuestion {
  id: string;
  questionText: string;
  answerText?: string;
  evaluation?: {
    technicalAccuracy: number; // 0-10
    communication: number; // 0-10
    problemSolving: number; // 0-10
    confidence: number; // 0-10
    completeness: number; // 0-10
    practicalKnowledge: number; // 0-10
    feedback: string;
    score: number; // 0-100 overall
  } | null;
}

export interface AIInterviewReport {
  candidateSummary: {
    overallScore: number;
    technicalScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    confidenceScore: number;
    duration: string;
  };
  questionFeedback: {
    question: string;
    answer: string;
    score: number;
    feedback: string;
    metrics: {
      accuracy: number;
      communication: number;
      problemSolving: number;
      confidence: number;
    };
  }[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  transcript: { speaker: "AI" | "Candidate"; text: string; timestamp: string }[];
  timeline: { timestamp: string; label: string }[];
  proctoringSummary: {
    tabSwitches: number;
    fullscreenExits: number;
    screenShareInterruptions: number;
    status: "Clean" | "Flagged" | "Suspicious";
  };
}

export interface AIInterviewSession {
  id: string;
  userId: string;
  blueprint: InterviewBlueprint;
  status: "not_started" | "setup" | "permissions" | "lobby" | "in_progress" | "completed";
  currentQuestionIndex: number;
  questions: AIQuestion[];
  violations: { type: string; timestamp: string }[];
  timeline: { timestamp: string; label: string }[];
  evaluation: {
    overallScore: number;
    technicalScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    confidenceScore: number;
    passed: boolean;
  } | null;
  report: AIInterviewReport | null;
  createdAt: string;
  updatedAt: string;
}

export interface AudioInterviewSettings {
  duration: number; // in minutes: 5 | 10 | 20 | 30
  difficulty: "Easy" | "Medium" | "Hard" | "Adaptive";
  interviewType: "Technical" | "Behavioral" | "HR" | "Mixed" | "Project Discussion" | "System Design";
  voice: "Male" | "Female";
  accent: "American" | "Indian" | "British";
  practiceMode: "Rapid Fire" | "Deep Technical" | "Behavioral Practice" | "Project Discussion" | "HR Round" | "System Design";
}

export interface AudioInterviewSession {
  id: string;
  userId: string;
  blueprint: InterviewBlueprint;
  settings: AudioInterviewSettings;
  status: "not_started" | "in_progress" | "completed";
  currentQuestionIndex: number;
  questions: AIQuestion[];
  violations: { type: string; timestamp: string }[];
  timeline: { timestamp: string; label: string }[];
  evaluation: {
    overallScore: number;
    technicalScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    confidenceScore: number;
    passed: boolean;
  } | null;
  report: AIInterviewReport | null;
  createdAt: string;
  updatedAt: string;
}

export interface FullInterviewSession {
  id: string;
  userId: string;
  blueprint: InterviewBlueprint;
  status: "not_started" | "in_progress" | "completed";
  oaSessionId: string | null;
  aiSessionId: string | null;
  audioSessionId: string | null;
  currentRound: "oa" | "ai" | "audio" | "completed";
  evaluation: {
    overallScore: number;
    passed: boolean;
  } | null;
  report: AIInterviewReport | null; // Unified report structure or custom
  createdAt: string;
  updatedAt: string;
}



