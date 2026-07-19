import fs from "fs";
import path from "path";
import type { InterviewSession, AIInterviewSession, AudioInterviewSession, FullInterviewSession } from "@/src/types";
import { Client, Databases, Query } from "appwrite";
import { APPWRITE_CONFIG } from "@/src/constants";

// Setup storage path inside project
const DB_DIR = path.join(process.cwd(), "src", "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Initialize Appwrite client
const appwriteClient = new Client()
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId);

const databases = new Databases(appwriteClient);
const databaseId = APPWRITE_CONFIG.databaseId;

const oaCollectionId = APPWRITE_CONFIG.oaCollectionId;
const aiCollectionId = APPWRITE_CONFIG.aiCollectionId;
const audioCollectionId = APPWRITE_CONFIG.audioCollectionId;
const fullCollectionId = APPWRITE_CONFIG.fullCollectionId;

// In-memory fallback if file system fails
const memoryDb = new Map<string, InterviewSession>();
const aiMemoryDb = new Map<string, AIInterviewSession>();
const audioMemoryDb = new Map<string, AudioInterviewSession>();
const fullMemoryDb = new Map<string, FullInterviewSession>();

interface Schema {
  sessions: Record<string, InterviewSession>;
  aiSessions?: Record<string, AIInterviewSession>;
  audioSessions?: Record<string, AudioInterviewSession>;
  fullSessions?: Record<string, FullInterviewSession>;
}

function initializeDb() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(
        DB_FILE,
        JSON.stringify({ sessions: {}, aiSessions: {}, audioSessions: {}, fullSessions: {} }, null, 2),
        "utf8"
      );
    }
  } catch (err) {
    console.warn("DB initialization warning, falling back to memory database:", err);
  }
}

function readData(): Schema {
  initializeDb();
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf8");
      const parsed = JSON.parse(content) as Schema;
      if (!parsed.aiSessions) parsed.aiSessions = {};
      if (!parsed.audioSessions) parsed.audioSessions = {};
      if (!parsed.fullSessions) parsed.fullSessions = {};
      return parsed;
    }
  } catch (err) {
    console.error("Error reading from db file:", err);
  }

  // Return in-memory reconstruction
  const sessionsObj: Record<string, InterviewSession> = {};
  memoryDb.forEach((val, key) => {
    sessionsObj[key] = val;
  });
  const aiSessionsObj: Record<string, AIInterviewSession> = {};
  aiMemoryDb.forEach((val, key) => {
    aiSessionsObj[key] = val;
  });
  const audioSessionsObj: Record<string, AudioInterviewSession> = {};
  audioMemoryDb.forEach((val, key) => {
    audioSessionsObj[key] = val;
  });
  const fullSessionsObj: Record<string, FullInterviewSession> = {};
  fullMemoryDb.forEach((val, key) => {
    fullSessionsObj[key] = val;
  });
  return {
    sessions: sessionsObj,
    aiSessions: aiSessionsObj,
    audioSessions: audioSessionsObj,
    fullSessions: fullSessionsObj
  };
}

function writeData(data: Schema) {
  initializeDb();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing to db file, syncing to memory instead:", err);
    // Sync to memory
    Object.entries(data.sessions).forEach(([key, val]) => {
      memoryDb.set(key, val);
    });
    if (data.aiSessions) {
      Object.entries(data.aiSessions).forEach(([key, val]) => {
        aiMemoryDb.set(key, val);
      });
    }
    if (data.audioSessions) {
      Object.entries(data.audioSessions).forEach(([key, val]) => {
        audioMemoryDb.set(key, val);
      });
    }
    if (data.fullSessions) {
      Object.entries(data.fullSessions).forEach(([key, val]) => {
        fullMemoryDb.set(key, val);
      });
    }
  }
}

async function saveAppwriteDocument(collectionId: string, documentId: string, data: any) {
  let attemptData = { ...data };
  while (true) {
    try {
      try {
        await databases.getDocument(databaseId, collectionId, documentId);
        await databases.updateDocument(databaseId, collectionId, documentId, attemptData);
      } catch (e: any) {
        if (e.code === 404) {
          await databases.createDocument(databaseId, collectionId, documentId, attemptData);
        } else {
          throw e;
        }
      }
      break;
    } catch (err: any) {
      const match = err.message && err.message.match(/Unknown attribute:\s*"([^"]+)"/i);
      if (match && match[1]) {
        const attribute = match[1];
        if (attribute in attemptData) {
          delete attemptData[attribute];
          continue;
        }
      }
      throw err;
    }
  }
}

export const dbService = {
  // ─── OA Sessions ──────────────────────────────────────────────────
  async getSession(sessionId: string): Promise<InterviewSession | null> {
    if (databaseId && oaCollectionId) {
      try {
        const doc = await databases.getDocument(databaseId, oaCollectionId, sessionId);
        if (doc && doc.sessionData) {
          return JSON.parse(doc.sessionData) as InterviewSession;
        }
      } catch (err: any) {
        console.warn("Appwrite getSession failed, falling back to local DB:", err.message);
      }
    }
    const data = readData();
    const session = data.sessions[sessionId];
    if (session) return session;
    return memoryDb.get(sessionId) || null;
  },

  async saveSession(session: InterviewSession): Promise<void> {
    const updatedAt = new Date().toISOString();
    const updatedSession = {
      ...session,
      updatedAt
    };

    if (databaseId && oaCollectionId) {
      try {
        const data = {
          userId: session.userId,
          interviewType: "oa",
          status: session.aptitudeStatus === "completed" ? "completed" : "in_progress",
          role: session.blueprint.role || "Developer",
          score: session.evaluation?.overallScore || 0,
          sessionData: JSON.stringify(updatedSession),
          createdAt: session.createdAt,
          updatedAt
        };

        await saveAppwriteDocument(oaCollectionId, session.id, data);
      } catch (err: any) {
        console.warn("Appwrite saveSession failed, using local DB:", err.message);
      }
    }

    const data = readData();
    data.sessions[session.id] = updatedSession;
    writeData(data);
    memoryDb.set(session.id, updatedSession);
  },

  async createSession(session: InterviewSession): Promise<void> {
    await this.saveSession(session);
  },

  async deleteSession(sessionId: string): Promise<void> {
    if (databaseId && oaCollectionId) {
      try {
        await databases.deleteDocument(databaseId, oaCollectionId, sessionId);
      } catch (err: any) {
        console.warn("Appwrite deleteSession failed, using local DB:", err.message);
      }
    }
    const data = readData();
    delete data.sessions[sessionId];
    writeData(data);
    memoryDb.delete(sessionId);
  },

  async listSessions(userId: string): Promise<InterviewSession[]> {
    if (databaseId && oaCollectionId) {
      try {
        const response = await databases.listDocuments(
          databaseId,
          oaCollectionId,
          [
            Query.equal("userId", userId),
            Query.equal("interviewType", "oa")
          ]
        );
        const list = response.documents.map((doc) => JSON.parse(doc.sessionData) as InterviewSession);
        return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      } catch (err: any) {
        console.warn("Appwrite listSessions failed, falling back to local DB:", err.message);
      }
    }

    const data = readData();
    const dbSessions = Object.values(data.sessions).filter(
      (s) => s.userId === userId
    );
    const memorySessions = Array.from(memoryDb.values()).filter(
      (s) => s.userId === userId
    );
    const combined = [...dbSessions];
    memorySessions.forEach((m) => {
      if (!combined.some((c) => c.id === m.id)) {
        combined.push(m);
      }
    });
    return combined.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  // ─── AI Sessions ──────────────────────────────────────────────────
  async getAISession(sessionId: string): Promise<AIInterviewSession | null> {
    if (databaseId && aiCollectionId) {
      try {
        const doc = await databases.getDocument(databaseId, aiCollectionId, sessionId);
        if (doc && doc.sessionData) {
          return JSON.parse(doc.sessionData) as AIInterviewSession;
        }
      } catch (err: any) {
        console.warn("Appwrite getAISession failed, falling back to local DB:", err.message);
      }
    }
    const data = readData();
    const session = data.aiSessions?.[sessionId];
    if (session) return session;
    return aiMemoryDb.get(sessionId) || null;
  },

  async saveAISession(session: AIInterviewSession): Promise<void> {
    const updatedAt = new Date().toISOString();
    const updatedSession = {
      ...session,
      updatedAt
    };

    if (databaseId && aiCollectionId) {
      try {
        const data = {
          userId: session.userId,
          interviewType: "ai",
          status: session.status,
          role: session.blueprint.role || "MERN Stack Developer",
          score: session.evaluation?.overallScore || 0,
          sessionData: JSON.stringify(updatedSession),
          createdAt: session.createdAt,
          updatedAt
        };

        await saveAppwriteDocument(aiCollectionId, session.id, data);
      } catch (err: any) {
        console.warn("Appwrite saveAISession failed, using local DB:", err.message);
      }
    }

    const data = readData();
    if (!data.aiSessions) data.aiSessions = {};
    data.aiSessions[session.id] = updatedSession;
    writeData(data);
    aiMemoryDb.set(session.id, updatedSession);
  },

  async listAISessions(userId: string): Promise<AIInterviewSession[]> {
    if (databaseId && aiCollectionId) {
      try {
        const response = await databases.listDocuments(
          databaseId,
          aiCollectionId,
          [
            Query.equal("userId", userId),
            Query.equal("interviewType", "ai")
          ]
        );
        const list = response.documents.map((doc) => JSON.parse(doc.sessionData) as AIInterviewSession);
        return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      } catch (err: any) {
        console.warn("Appwrite listAISessions failed, falling back to local DB:", err.message);
      }
    }

    const data = readData();
    const dbSessions = Object.values(data.aiSessions || {}).filter(
      (s) => s.userId === userId
    );
    const memorySessions = Array.from(aiMemoryDb.values()).filter(
      (s) => s.userId === userId
    );
    const combined = [...dbSessions];
    memorySessions.forEach((m) => {
      if (!combined.some((c) => c.id === m.id)) {
        combined.push(m);
      }
    });
    return combined.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  // ─── Audio Sessions ───────────────────────────────────────────────
  async getAudioSession(sessionId: string): Promise<AudioInterviewSession | null> {
    if (databaseId && audioCollectionId) {
      try {
        const doc = await databases.getDocument(databaseId, audioCollectionId, sessionId);
        if (doc && doc.sessionData) {
          return JSON.parse(doc.sessionData) as AudioInterviewSession;
        }
      } catch (err: any) {
        console.warn("Appwrite getAudioSession failed, falling back to local DB:", err.message);
      }
    }
    const data = readData();
    const session = data.audioSessions?.[sessionId];
    if (session) return session;
    return audioMemoryDb.get(sessionId) || null;
  },

  async saveAudioSession(session: AudioInterviewSession): Promise<void> {
    const updatedAt = new Date().toISOString();
    const updatedSession = {
      ...session,
      updatedAt
    };

    if (databaseId && audioCollectionId) {
      try {
        const data = {
          userId: session.userId,
          interviewType: "audio",
          status: session.status,
          role: session.blueprint.role || "Voice Mock Interview",
          score: session.evaluation?.overallScore || 0,
          sessionData: JSON.stringify(updatedSession),
          createdAt: session.createdAt,
          updatedAt
        };

        await saveAppwriteDocument(audioCollectionId, session.id, data);
      } catch (err: any) {
        console.warn("Appwrite saveAudioSession failed, using local DB:", err.message);
      }
    }

    const data = readData();
    if (!data.audioSessions) data.audioSessions = {};
    data.audioSessions[session.id] = updatedSession;
    writeData(data);
    audioMemoryDb.set(session.id, updatedSession);
  },

  async listAudioSessions(userId: string): Promise<AudioInterviewSession[]> {
    if (databaseId && audioCollectionId) {
      try {
        const response = await databases.listDocuments(
          databaseId,
          audioCollectionId,
          [
            Query.equal("userId", userId),
            Query.equal("interviewType", "audio")
          ]
        );
        const list = response.documents.map((doc) => JSON.parse(doc.sessionData) as AudioInterviewSession);
        return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      } catch (err: any) {
        console.warn("Appwrite listAudioSessions failed, falling back to local DB:", err.message);
      }
    }

    const data = readData();
    const dbSessions = Object.values(data.audioSessions || {}).filter(
      (s) => s.userId === userId
    );
    const memorySessions = Array.from(audioMemoryDb.values()).filter(
      (s) => s.userId === userId
    );
    const combined = [...dbSessions];
    memorySessions.forEach((m) => {
      if (!combined.some((c) => c.id === m.id)) {
        combined.push(m);
      }
    });
    return combined.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  // ─── Full E2E Sessions ────────────────────────────────────────────
  async getFullSession(sessionId: string): Promise<FullInterviewSession | null> {
    if (databaseId && fullCollectionId) {
      try {
        const doc = await databases.getDocument(databaseId, fullCollectionId, sessionId);
        if (doc && doc.sessionData) {
          return JSON.parse(doc.sessionData) as FullInterviewSession;
        }
      } catch (err: any) {
        console.warn("Appwrite getFullSession failed, falling back to local DB:", err.message);
      }
    }
    const data = readData();
    const session = data.fullSessions?.[sessionId];
    if (session) return session;
    return fullMemoryDb.get(sessionId) || null;
  },

  async saveFullSession(session: FullInterviewSession): Promise<void> {
    const updatedAt = new Date().toISOString();
    const updatedSession = {
      ...session,
      updatedAt
    };

    if (databaseId && fullCollectionId) {
      try {
        const data = {
          userId: session.userId,
          interviewType: "full",
          status: session.status,
          role: session.blueprint.role || "Full End-to-End Interview",
          score: session.evaluation?.overallScore || 0,
          sessionData: JSON.stringify(updatedSession),
          createdAt: session.createdAt,
          updatedAt
        };

        await saveAppwriteDocument(fullCollectionId, session.id, data);
      } catch (err: any) {
        console.warn("Appwrite saveFullSession failed, using local DB:", err.message);
      }
    }

    const data = readData();
    if (!data.fullSessions) data.fullSessions = {};
    data.fullSessions[session.id] = updatedSession;
    writeData(data);
    fullMemoryDb.set(session.id, updatedSession);
  },

  async deleteFullSession(sessionId: string): Promise<void> {
    if (databaseId && fullCollectionId) {
      try {
        await databases.deleteDocument(databaseId, fullCollectionId, sessionId);
      } catch (err: any) {
        console.warn("Appwrite deleteFullSession failed, using local DB:", err.message);
      }
    }
    const data = readData();
    if (data.fullSessions) {
      delete data.fullSessions[sessionId];
    }
    writeData(data);
    fullMemoryDb.delete(sessionId);
  },

  async listFullSessions(userId: string): Promise<FullInterviewSession[]> {
    if (databaseId && fullCollectionId) {
      try {
        const response = await databases.listDocuments(
          databaseId,
          fullCollectionId,
          [
            Query.equal("userId", userId),
            Query.equal("interviewType", "full")
          ]
        );
        const list = response.documents.map((doc) => JSON.parse(doc.sessionData) as FullInterviewSession);
        return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      } catch (err: any) {
        console.warn("Appwrite listFullSessions failed, falling back to local DB:", err.message);
      }
    }

    const data = readData();
    const dbSessions = Object.values(data.fullSessions || {}).filter(
      (s) => s.userId === userId
    );
    const memorySessions = Array.from(fullMemoryDb.values()).filter(
      (s) => s.userId === userId
    );
    const combined = [...dbSessions];
    memorySessions.forEach((m) => {
      if (!combined.some((c) => c.id === m.id)) {
        combined.push(m);
      }
    });
    return combined.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
};
