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

export type InterviewType = "full" | "oa" | "ai";

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

