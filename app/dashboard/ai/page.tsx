"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Camera, CameraOff, Mic, MicOff, Monitor, CheckCircle2,
  AlertTriangle, ArrowRight, ChevronDown, ChevronRight,
  Download, RefreshCw, Clock, Volume2, Shield, Video,
  AlertOctagon, Activity, Play, Check, X, LogOut, FileText
} from "lucide-react";
import { toast } from "sonner";
import { InterviewConfiguration } from "@/src/components/Dashboard/InterviewConfiguration";
import { useAuth } from "@/src/components/providers/AuthProvider";
import type { InterviewContext, AIInterviewSession, AIQuestion, AIInterviewReport } from "@/src/types";

type ViewType = "config" | "setup" | "permissions" | "lobby" | "in_progress" | "completed" | "report";
type AvatarState = "idle" | "speaking" | "listening" | "thinking";

export default function AIInterviewPage() {
  const { user: authUser } = useAuth();
  const [view, setView] = useState<ViewType>("config");
  const [user, setUser] = useState<any>(null);
  const [context, setContext] = useState<InterviewContext | null>(null);

  // Session States
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<AIInterviewSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<AIQuestion | null>(null);
  const [violations, setViolations] = useState<{ type: string; timestamp: string }[]>([]);
  const [warningModal, setWarningModal] = useState<{ type: "tab" | "fullscreen" | "screenshare"; count?: number } | null>(null);

  // Device & Stream States
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Permission Checklists
  const [perms, setPerms] = useState({
    camera: false,
    mic: false,
    screen: false
  });
  const [systemChecked, setSystemChecked] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  // Speech & Avatar States
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);

  // Live Timer
  const [interviewTime, setInterviewTime] = useState(0);

  // Report Navigation
  const [reportTab, setReportTab] = useState<"overview" | "questions" | "skills" | "transcript" | "proctor">("overview");
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  // Refs for Video Elements, Web Speech API & Deepgram
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const speechRecognitionRef = useRef<any>(null);
  const deepgramSocketRef = useRef<WebSocket | null>(null);
  const deepgramRecorderRef = useRef<MediaRecorder | null>(null);
  const finalizedTranscriptRef = useRef<string>("");
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const screenGraceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const screenGraceCountdownRef = useRef<number>(30);
  const [screenGraceSeconds, setScreenGraceSeconds] = useState(30);

  // Initialize and load context
  useEffect(() => {
    if (authUser) {
      setUser({ $id: authUser.$id, name: authUser.name, email: authUser.email });
    }
  }, [authUser]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const querySessionId = params.get("sessionId");
      if (querySessionId) {
        setSessionId(querySessionId);
        recoverSession(querySessionId);
        return;
      }

      const queryFullId = params.get("fullSessionId");
      if (queryFullId) {
        fetch(`/api/interview/session?sessionId=${queryFullId}`)
          .then(res => res.json())
          .then(data => {
            if (data.session) {
              const fullSess = data.session;
              if (fullSess.aiSessionId) {
                window.location.href = `/dashboard/ai?sessionId=${fullSess.aiSessionId}&fullSessionId=${queryFullId}`;
              } else {
                const ctx: InterviewContext = {
                  source: "role",
                  role: fullSess.blueprint.role,
                  jd: {
                    experience: "Mid level",
                    requiredSkills: fullSess.blueprint.skills || [],
                    preferredSkills: []
                  }
                };
                localStorage.setItem("interview_context_ai", JSON.stringify(ctx));
                setContext(ctx);
                setView("setup");
              }
            }
          })
          .catch(err => console.error(err));
        return;
      }
    }

    // Direct access without sessionId or fullSessionId: start fresh interview configuration
    localStorage.removeItem("active_ai_interview_id");
    localStorage.removeItem("interview_context_ai");
    setSessionId(null);
    setSession(null);
    setContext(null);
    setView("config");
  }, []);

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      stopStreams();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const stopStreams = () => {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    if (micStream) micStream.getTracks().forEach(t => t.stop());
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setMicStream(null);
    setScreenStream(null);

    // Stop Deepgram & TTS
    if (deepgramSocketRef.current) {
      try {
        deepgramSocketRef.current.onclose = null;
        deepgramSocketRef.current.close();
      } catch (e) { }
      deepgramSocketRef.current = null;
    }
    if (deepgramRecorderRef.current) {
      try {
        deepgramRecorderRef.current.stop();
      } catch (e) { }
      deepgramRecorderRef.current = null;
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
  };

  const handleExit = () => {
    const activeViews = ["permissions", "lobby", "in_progress"];
    if (activeViews.includes(view)) {
      const confirmExit = window.confirm(
        "Are you sure you want to exit the interview? Your current session progress will be cleared and reset."
      );
      if (!confirmExit) return;
    }

    try {
      if (recorder) recorder.stop();
    } catch (e) { }
    try {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
    } catch (e) { }

    try {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
      if (micStream) micStream.getTracks().forEach(t => t.stop());
      if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    } catch (e) { }
    stopStreams();

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => {
        console.error("Error exiting fullscreen:", err);
      });
    }

    localStorage.removeItem("active_ai_interview_id");
    localStorage.removeItem("interview_context_ai");
    setSessionId(null);
    setSession(null);
    setContext(null);
    setView("config");

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const fId = params.get("fullSessionId");
      if (fId) {
        window.location.href = `/dashboard/interview?sessionId=${fId}`;
        return;
      }
    }
    window.location.href = "/dashboard";
  };

  // Recover active session
  const recoverSession = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-interview/session?sessionId=${id}`);
      if (res.ok) {
        const data = await res.json();
        const activeSession = data.session as AIInterviewSession;
        if (activeSession) {
          setSession(activeSession);
          setSessionId(activeSession.id);
          if (activeSession.status === "completed") {
            setView("completed");
          } else if (activeSession.status === "in_progress") {
            // Restore question
            const lastQuestion = activeSession.questions[activeSession.questions.length - 1];
            setCurrentQuestion(lastQuestion);
            setView("permissions"); // Start with permissions checks again to ensure tracks
          }
        }
      }
    } catch (err) {
      console.error("Failed to recover session:", err);
    }
  };

  // Permissions requesting
  const requestDevices = async () => {
    try {
      // 1. Camera & Mic request
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });

      setCameraStream(new MediaStream([stream.getVideoTracks()[0]]));
      setMicStream(new MediaStream([stream.getAudioTracks()[0]]));

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = new MediaStream([stream.getVideoTracks()[0]]);
      }

      setPerms(prev => ({ ...prev, camera: true, mic: true }));
      toast.success("Camera and Microphone connected.");
    } catch (err) {
      console.error("Device permission error:", err);
      toast.error("Failed to access camera/microphone. Please allow browser permissions.");
    }
  };

  const requestScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      setScreenStream(stream);
      setPerms(prev => ({ ...prev, screen: true }));
      toast.success("Screen sharing enabled.");

      // Bind track ended event (Proctoring)
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.onended = () => {
        handleScreenShareInterrupted();
      };
    } catch (err) {
      console.error("Screen share permission error:", err);
      toast.error("Screen share is required to proceed with the interview.");
    }
  };

  const triggerDiagnosticCheck = () => {
    if (!perms.camera || !perms.mic || !perms.screen) {
      toast.error("Please grant all permissions first.");
      return;
    }
    setSystemChecked(true);
    toast.success("All systems diagnostics are stable.");
  };

  const startCountdown = () => {
    setView("lobby");
    setCountdown(5);

    // Bind webcam preview to lobby preview
    setTimeout(() => {
      if (lobbyVideoRef.current && cameraStream) {
        lobbyVideoRef.current.srcObject = cameraStream;
      }
    }, 100);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          enterFullscreenAndStart();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Fullscreen implementation
  const enterFullscreenAndStart = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request rejected:", err);
    }

    // Initialize speech synthesis and recognition
    initSpeechRecognition();

    // Start session recording
    startRecording();

    // Start timer
    setInterviewTime(0);
    timerIntervalRef.current = setInterval(() => {
      setInterviewTime(prev => prev + 1);
    }, 1000);

    // Initialize or start the actual interview flow
    if (sessionId) {
      setView("in_progress");
      // Load current question
      if (session) {
        const lastQ = session.questions[session.questions.length - 1];
        setCurrentQuestion(lastQ);
        setTimeout(() => triggerAIVoice(lastQ.questionText), 1000);
      }
    } else {
      initializeSessionAPI();
    }
  };

  const initializeSessionAPI = async () => {
    if (!context || !user) return;
    try {
      setAvatarState("thinking");
      const res = await fetch("/api/ai-interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          userId: user.$id
        })
      });

      if (!res.ok) throw new Error("Failed to start session.");
      const data = await res.json();

      setSession(data.session);
      setSessionId(data.sessionId);
      localStorage.setItem("active_ai_interview_id", data.sessionId);

      const firstQ = data.session.questions[0];
      setCurrentQuestion(firstQ);
      setView("in_progress");

      // Trigger voice
      setTimeout(() => triggerAIVoice(firstQ.questionText), 1000);
    } catch (err) {
      toast.error("Failed to start AI interview.");
      setView("setup");
    }
  };

  // Web Recording
  const startRecording = () => {
    if (!cameraStream || !screenStream) return;
    try {
      const combinedTracks = [
        ...cameraStream.getVideoTracks(),
        ...screenStream.getVideoTracks()
      ];
      // Try to append audio if available
      if (micStream && micStream.getAudioTracks().length > 0) {
        combinedTracks.push(micStream.getAudioTracks()[0]);
      }

      const combinedStream = new MediaStream(combinedTracks);
      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType: "video/webm;codecs=vp9,opus" });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
      };

      mediaRecorder.start(1000);
      setRecorder(mediaRecorder);
    } catch (e) {
      console.warn("MediaRecorder creation error, trying simple webcam recorder:", e);
      // Fallback: record just the webcam
      try {
        const tracks = [...cameraStream.getVideoTracks()];
        if (micStream) tracks.push(micStream.getAudioTracks()[0]);
        const stream = new MediaStream(tracks);
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          setVideoUrl(URL.createObjectURL(blob));
        };
        mediaRecorder.start(1000);
        setRecorder(mediaRecorder);
      } catch (err) {
        console.error("Failed to start recording:", err);
      }
    }
  };

  // Start Deepgram WebSocket Recognition
  const startDeepgramRecognition = async (): Promise<boolean> => {
    try {
      const tokenRes = await fetch("/api/deepgram/token");
      if (tokenRes.ok) {
        const { token } = await tokenRes.json();
        const ws = new WebSocket("wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", ["token", token]);
        deepgramSocketRef.current = ws;

        ws.onopen = async () => {
          try {
            const stream = micStream || await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            deepgramRecorderRef.current = recorder;
            recorder.ondataavailable = (e) => {
              if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                ws.send(e.data);
              }
            };
            recorder.start(250);
          } catch (err) {
            console.error("Deepgram MediaRecorder start error:", err);
          }
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          const transcript = data.channel?.alternatives?.[0]?.transcript;
          if (!transcript) return;

          if (data.is_final) {
            finalizedTranscriptRef.current = (finalizedTranscriptRef.current + " " + transcript).trim();
            setLiveTranscript(finalizedTranscriptRef.current);
          } else {
            setLiveTranscript((finalizedTranscriptRef.current + " " + transcript).trim());
          }
        };

        ws.onerror = (err) => {
          console.error("Deepgram WebSocket error:", err);
        };

        ws.onclose = () => {
          console.log("Deepgram WebSocket closed");
        };
        return true;
      }
    } catch (err) {
      console.warn("Deepgram token fetch failed, falling back to Web Speech:", err);
    }
    return false;
  };

  const stopDeepgramRecognition = () => {
    if (deepgramSocketRef.current) {
      try {
        deepgramSocketRef.current.onclose = null;
        deepgramSocketRef.current.close();
      } catch (e) { }
      deepgramSocketRef.current = null;
    }
    if (deepgramRecorderRef.current) {
      try {
        deepgramRecorderRef.current.stop();
      } catch (e) { }
      deepgramRecorderRef.current = null;
    }
  };

  // Web Speech synthesis
  const triggerAIVoice = async (text: string) => {
    setAvatarState("speaking");
    setIsListening(false);

    stopListening();

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }

    try {
      const res = await fetch("/api/deepgram/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "aura-asteria-en" })
      });
      if (res.ok) {
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        ttsAudioRef.current = audio;

        audio.onended = () => {
          setAvatarState("listening");
          startListening();
        };
        audio.onerror = () => {
          setAvatarState("listening");
          startListening();
        };

        await audio.play();
        return;
      }
    } catch (err) {
      console.warn("Deepgram TTS failed, falling back to Web Speech:", err);
    }

    // Fallback to Browser Web Speech API
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const cleanVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural")));
    if (cleanVoice) utterance.voice = cleanVoice;

    utterance.onend = () => {
      setAvatarState("listening");
      startListening();
    };
    utterance.onerror = () => {
      setAvatarState("listening");
      startListening();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Web Speech recognition
  const initSpeechRecognition = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.warn("Web Speech Recognition not supported in this browser.");
      return;
    }

    const recObj = new SpeechRecognitionAPI();
    recObj.continuous = true;
    recObj.interimResults = true;
    recObj.lang = "en-US";

    recObj.onresult = (e: any) => {
      let speech = "";
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        speech += e.results[i][0].transcript;
      }
      setLiveTranscript(speech);
    };

    recObj.onerror = (e: any) => {
      console.error("Speech Recognition error:", e);
    };

    recObj.onend = () => {
      if (isListening) {
        try { recObj.start(); } catch (err) { }
      }
    };

    speechRecognitionRef.current = recObj;
  };

  const startListening = () => {
    setIsListening(true);
    finalizedTranscriptRef.current = "";
    setLiveTranscript("");

    // First try Deepgram
    startDeepgramRecognition().then(success => {
      if (success) return;

      // Fallback to Web Speech API
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const stopListening = () => {
    setIsListening(false);

    stopDeepgramRecognition();

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (err) { }
    }
  };

  // Submit Answer & Dynamic Question generation
  const handleAnswerSubmit = async () => {
    if (!sessionId || !currentQuestion) return;

    stopListening();
    setAvatarState("thinking");

    const finalAnswer = liveTranscript.trim() || "(No verbal answer provided)";
    finalizedTranscriptRef.current = "";
    setLiveTranscript("");

    try {
      const res = await fetch("/api/ai-interview/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          answerText: finalAnswer,
          violations
        })
      });

      if (!res.ok) throw new Error("Failed to submit response.");
      const data = await res.json();

      setSession(data.session);
      setViolations([]); // clear local sync cache

      const updatedSession = data.session as AIInterviewSession;
      if (updatedSession.status === "completed") {
        handleEndInterview(false);
      } else {
        const nextQ = updatedSession.questions[updatedSession.questions.length - 1];
        setCurrentQuestion(nextQ);
        setTimeout(() => triggerAIVoice(nextQ.questionText), 1000);
      }
    } catch (err) {
      toast.error("Failed to submit answer. Retrying speech...");
      setAvatarState("listening");
      startListening();
    }
  };

  // Proctoring Event Binding
  useEffect(() => {
    if (view !== "in_progress") return;

    // 1. Tab switches (Visibility API & Window Focus/Blur)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        logViolation("tab_switch");
      }
    };

    const handleWindowBlur = () => {
      logViolation("tab_switch");
    };

    // 2. Fullscreen Exit Detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && view === "in_progress") {
        logViolation("fullscreen_exit");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [view, violations, session]);

  const logViolation = (type: "tab_switch" | "fullscreen_exit" | "screen_share_interrupted") => {
    const newViolation = {
      type,
      timestamp: new Date().toLocaleTimeString()
    };

    setViolations(prev => {
      const next = [...prev, newViolation];

      // Calculate total warning indexes
      const allPrevViolations = session?.violations || [];
      const totalViolationsOfType = allPrevViolations.filter(v => v.type === type).length + next.filter(v => v.type === type).length;

      if (type === "tab_switch") {
        if (totalViolationsOfType >= 5) {
          // Terminate
          toast.error("Interview terminated due to excessive tab-switch violations.");
          handleEndInterview(true);
        } else {
          setWarningModal({ type: "tab", count: totalViolationsOfType });
        }
      } else if (type === "fullscreen_exit") {
        setWarningModal({ type: "fullscreen" });
      }

      return next;
    });
  };

  const handleScreenShareInterrupted = () => {
    setWarningModal({ type: "screenshare" });
    screenGraceCountdownRef.current = 30;
    setScreenGraceSeconds(30);

    screenGraceTimeoutRef.current = setInterval(() => {
      screenGraceCountdownRef.current -= 1;
      setScreenGraceSeconds(screenGraceCountdownRef.current);
      if (screenGraceCountdownRef.current <= 0) {
        clearInterval(screenGraceTimeoutRef.current!);
        toast.error("Screen sharing was not restored. Ending interview.");
        handleEndInterview(true);
      }
    }, 1000);
  };

  const resumeScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      if (screenGraceTimeoutRef.current) clearInterval(screenGraceTimeoutRef.current);
      setScreenStream(stream);
      setWarningModal(null);
      toast.success("Screen sharing restored successfully.");

      // Re-bind track onended
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.onended = () => {
        handleScreenShareInterrupted();
      };
    } catch (err) {
      toast.error("Failed to re-share screen. Please try again.");
    }
  };

  const requestReFullscreen = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      }
      setWarningModal(null);
    } catch (err) {
      toast.error("Failed to enter fullscreen. Please double click page.");
    }
  };

  // Ending the interview
  const handleEndInterview = async (blocked = false) => {
    // Stop recording and speech
    if (recorder) {
      try { recorder.stop(); } catch (e) { }
    }
    stopListening();
    window.speechSynthesis.cancel();
    stopStreams();

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (screenGraceTimeoutRef.current) clearInterval(screenGraceTimeoutRef.current);

    // Exit fullscreen
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch (e) { }
    }

    localStorage.removeItem("active_ai_interview_id");

    if (blocked) {
      // Force status update on API
      try {
        await fetch("/api/ai-interview/submit-answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            questionId: currentQuestion?.id || "q-1",
            answerText: "(Forcefully Terminated - Violation Limit Exceeded)",
            violations
          })
        });
      } catch (err) { }

      toast.error("Interview completed with violations.");
    } else {
      toast.success("Interview completed successfully!");
    }

    // Refresh final report status
    if (sessionId) {
      try {
        const res = await fetch(`/api/ai-interview/session?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
        }
      } catch (err) { }
    }

    // If full interview, link and redirect
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const fId = params.get("fullSessionId");
      if (fId && sessionId) {
        toast.info("Saving results to Full End-to-End Interview...");
        try {
          await fetch("/api/interview/link-round", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullSessionId: fId,
              roundType: "ai",
              roundSessionId: sessionId
            })
          });
        } catch (e) { }
        localStorage.removeItem("active_ai_interview_id");
        localStorage.removeItem("interview_context_ai");
        localStorage.removeItem("interview_context_oa");
        setTimeout(() => {
          window.location.href = `/dashboard/interview?sessionId=${fId}`;
        }, 1500);
        return;
      }
    }

    setView("completed");
  };

  const handleResetAll = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const fId = params.get("fullSessionId");
      if (fId) {
        window.location.href = `/dashboard/interview?sessionId=${fId}`;
        return;
      }
    }
    localStorage.removeItem("active_ai_interview_id");
    localStorage.removeItem("interview_context_ai");
    localStorage.removeItem("interview_context_oa");
    setSessionId(null);
    setSession(null);
    setCurrentQuestion(null);
    setViolations([]);
    setWarningModal(null);
    setView("config");
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rs.toString().padStart(2, "0")}`;
  };

  // SVG Animated Avatar component
  const SVGAvatar = ({ state }: { state: AvatarState }) => {
    const isSpeaking = state === "speaking";
    const isListening = state === "listening";
    const isThinking = state === "thinking";

    return (
      <div className="relative w-64 h-64 mx-auto flex items-center justify-center bg-slate-900/40 rounded-full border border-slate-700/50 shadow-xl overflow-hidden glassmorphism">
        <svg viewBox="0 0 100 100" className="w-48 h-48 drop-shadow-2xl">
          {/* Collar & Neck */}
          <path d="M40 75 L35 88 L65 88 L60 75 Z" fill="#1E293B" />
          <path d="M43 72 L43 78 L57 78 L57 72 Z" fill="#FDA4AF" />

          {/* Suit/Jacket */}
          <path d="M22 88 L35 77 L44 88 Z" fill="#0F172A" />
          <path d="M78 88 L65 77 L56 88 Z" fill="#0F172A" />
          <path d="M35 77 L50 88 L65 77 Z" fill="#334155" />
          <path d="M44 88 L50 82 L56 88 Z" fill="#FFFFFF" />

          {/* Ears */}
          <circle cx="28" cy="50" r="5" fill="#FCA5A5" />
          <circle cx="72" cy="50" r="5" fill="#FCA5A5" />

          {/* Face */}
          <rect x="30" y="32" width="40" height="42" rx="20" fill="#FEE2E2" />

          {/* Hair */}
          <path d="M30 38 Q50 18 70 38 Q50 25 30 38" fill="#1E1B4B" />
          <path d="M30 38 C28 32 35 28 40 28 C45 28 45 22 55 22 C65 22 68 28 70 38 Z" fill="#0F172A" />

          {/* Eyebrows */}
          <path
            d="M36 41 Q41 39 45 42"
            stroke="#1E1B4B"
            strokeWidth="1.5"
            fill="none"
            className={isThinking ? "animate-pulse" : ""}
          />
          <path
            d="M64 41 Q59 39 55 42"
            stroke="#1E1B4B"
            strokeWidth="1.5"
            fill="none"
            className={isThinking ? "animate-pulse" : ""}
          />

          {/* Eyes & Blinking */}
          <g className="animate-[blink_4s_infinite_alternate]">
            {/* Left Pupil */}
            <circle
              cx={isThinking ? 41 : 42}
              cy="47"
              r="2.5"
              fill="#0F172A"
              className={isThinking ? "transition-all duration-700" : ""}
            />
            {/* Right Pupil */}
            <circle
              cx={isThinking ? 59 : 58}
              cy="47"
              r="2.5"
              fill="#0F172A"
              className={isThinking ? "transition-all duration-700" : ""}
            />
          </g>

          {/* Mouth */}
          {isSpeaking ? (
            // Speaking mouth
            <path
              d="M44 62 Q50 67 56 62 Q50 55 44 62"
              fill="#E11D48"
              className="origin-center animate-[talk_0.2s_infinite]"
            />
          ) : isListening ? (
            // Listening (open slightly)
            <ellipse cx="50" cy="62" rx="3" ry="1.5" fill="#9F1239" className="animate-pulse" />
          ) : isThinking ? (
            // Thinking (puckered/straight line)
            <line x1="46" y1="62" x2="54" y2="62" stroke="#9F1239" strokeWidth="1.5" strokeLinecap="round" />
          ) : (
            // Idle smile
            <path d="M44 60 Q50 64 56 60" stroke="#9F1239" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          )}

          {/* Glasses */}
          <circle cx="42" cy="47" r="6" stroke="#475569" strokeWidth="1" fill="none" />
          <circle cx="58" cy="47" r="6" stroke="#475569" strokeWidth="1" fill="none" />
          <line x1="48" y1="47" x2="52" y2="47" stroke="#475569" strokeWidth="1" />
        </svg>

        {/* Thinking Overlay Dots */}
        {isThinking && (
          <div className="absolute bottom-6 flex items-center justify-center gap-1 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700 text-xs text-rose-400 font-semibold tracking-wider">
            <span>Thinking</span>
            <span className="flex gap-0.5 mt-0.5">
              <span className="w-1 h-1 bg-rose-400 rounded-full animate-bounce delay-100"></span>
              <span className="w-1 h-1 bg-rose-400 rounded-full animate-bounce delay-200"></span>
              <span className="w-1 h-1 bg-rose-400 rounded-full animate-bounce delay-300"></span>
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-full mx-auto pb-12">
      {/* HEADER SECTION */}
      {view !== "in_progress" && view !== "lobby" && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#111111] tracking-tight">AI Interview Round</h1>
            <p className="text-[#6B7280] mt-1 text-[13px]">
              Conduct an automated, proctored mock interview driven by dynamic Gemini AI feedback.
            </p>
          </div>
          <div className="flex items-center gap-2">

            {view !== "config" && (
              <button
                onClick={handleResetAll}
                className="flex items-center gap-1.5 text-xs text-[#2563EB] bg-blue-50 hover:bg-blue-100/80 px-3 py-2 rounded-lg font-medium transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("fullSessionId") ? "Return to Full Interview" : "Configure New Interview"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW: CONFIGURATION STEPPER */}
      {view === "config" && (
        <InterviewConfiguration
          interviewType="ai"
          onConfigurationComplete={() => {
            const savedContext = localStorage.getItem("interview_context_ai");
            if (savedContext) {
              setContext(JSON.parse(savedContext) as InterviewContext);
              setView("setup");
            }
          }}
        />
      )}

      {/* VIEW: SETUP & CONTEXT REVIEW */}
      {view === "setup" && context && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 max-w-3xl mx-auto shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111111]">Review Interview Context</h2>
              <p className="text-xs text-[#6B7280]">Confirm candidate details before starting the AI session.</p>
            </div>
          </div>

          <div className="space-y-6 border border-[#F3F4F6] bg-[#FAFAFA] rounded-xl p-6 mb-8 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <span className="text-xs font-semibold text-[#9CA3AF] block uppercase tracking-wider">Source</span>
                <span className="text-[#111111] font-medium mt-1 block">
                  {context.source === "resume" ? "Resume Upload" : context.source === "jd" ? "Job Description" : "Custom Configuration"}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-[#9CA3AF] block uppercase tracking-wider">Target Role</span>
                <span className="text-[#111111] font-medium mt-1 block">{context.role || "MERN Stack Developer"}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-[#9CA3AF] block uppercase tracking-wider">Experience Level</span>
                <span className="text-[#111111] font-medium mt-1 block">
                  {context.jd?.experience || "2+ Years"}
                </span>
              </div>
            </div>

            {/* Extracted Skills */}
            <div>
              <span className="text-xs font-semibold text-[#9CA3AF] block uppercase tracking-wider mb-2">Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {(context.resume?.skills || context.jd?.requiredSkills || ["React", "TypeScript", "Node.js", "Express", "MongoDB"]).map((sk, idx) => (
                  <span key={idx} className="bg-white border border-[#E5E7EB] text-[#374151] px-2.5 py-1 rounded-md text-xs font-medium">
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            {/* Extracted Projects */}
            {context.resume?.projects && context.resume.projects.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-[#9CA3AF] block uppercase tracking-wider mb-2">Projects</span>
                <ul className="space-y-2">
                  {context.resume.projects.map((p, idx) => (
                    <li key={idx} className="flex gap-2 text-xs text-[#374151] items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setView("permissions")}
              className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition shadow-sm text-sm"
            >
              Confirm & Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW: PERMISSIONS & SYSTEM DIAGNOSTICS */}
      {view === "permissions" && (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Permission Checklist */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#111111] mb-2">Allow Required Permissions</h2>
            <p className="text-xs text-[#6B7280] mb-6">
              To guarantee a fair mock evaluation, we require active hardware streams.
            </p>

            <div className="space-y-4 mb-8">
              {/* Camera */}
              <div className="flex items-start justify-between border border-[#F3F4F6] p-4 rounded-xl">
                <div className="flex gap-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#111111]">Camera Access</h3>
                    <p className="text-[11px] text-[#6B7280]">Required for verification and live preview.</p>
                  </div>
                </div>
                {perms.camera ? (
                  <span className="flex items-center gap-1 text-[11px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Granted
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-[#E11D48] font-bold bg-rose-50 px-2 py-0.5 rounded-full">
                    Not Granted
                  </span>
                )}
              </div>

              {/* Microphone */}
              <div className="flex items-start justify-between border border-[#F3F4F6] p-4 rounded-xl">
                <div className="flex gap-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#111111]">Microphone Access</h3>
                    <p className="text-[11px] text-[#6B7280]">Required for speech-to-text voice interaction.</p>
                  </div>
                </div>
                {perms.mic ? (
                  <span className="flex items-center gap-1 text-[11px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Granted
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-[#E11D48] font-bold bg-rose-50 px-2 py-0.5 rounded-full">
                    Not Granted
                  </span>
                )}
              </div>

              {/* Screen Share */}
              <div className="flex items-start justify-between border border-[#F3F4F6] p-4 rounded-xl">
                <div className="flex gap-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#111111]">Screen Share</h3>
                    <p className="text-[11px] text-[#6B7280]">Required to verify active browser tab limits.</p>
                  </div>
                </div>
                {perms.screen ? (
                  <span className="flex items-center gap-1 text-[11px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Granted
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-[#E11D48] font-bold bg-rose-50 px-2 py-0.5 rounded-full">
                    Not Granted
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={requestDevices}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                Request Device Permissions
              </button>
              <button
                onClick={requestScreenShare}
                disabled={!perms.camera}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                Enable Screen Sharing
              </button>
            </div>
          </div>

          {/* System diagnostics & Video Feed */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col">
            <h2 className="text-lg font-bold text-[#111111] mb-2">System Diagnostic</h2>
            <p className="text-xs text-[#6B7280] mb-6">Verify hardware preview streams before entering lobby.</p>

            {/* Video preview or placeholder */}
            <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden mb-6 flex items-center justify-center group shadow-inner">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {!perms.camera && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900 gap-2">
                  <CameraOff className="w-8 h-8 text-slate-600 animate-pulse" />
                  <span className="text-xs">Camera preview stream offline</span>
                </div>
              )}
            </div>

            {/* Checklist items */}
            <div className="space-y-3 mb-6 flex-grow">
              <div className="flex justify-between items-center text-xs border-b border-[#F3F4F6] pb-2">
                <span className="text-[#6B7280]">Internet Connection</span>
                <span className="text-green-600 font-bold">Stable</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-[#F3F4F6] pb-2">
                <span className="text-[#6B7280]">Fullscreen Compatibility</span>
                <span className="text-green-600 font-bold">Supported</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2">
                <span className="text-[#6B7280]">Browser Speech Engine</span>
                <span className="text-green-600 font-bold">Supported</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={triggerDiagnosticCheck}
                className="flex-1 border border-[#D1D5DB] hover:bg-slate-50 text-slate-700 font-medium py-3 rounded-xl transition text-sm"
              >
                Run Diagnostics
              </button>
              <button
                onClick={startCountdown}
                disabled={!perms.camera || !perms.mic || !perms.screen || !systemChecked}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition text-sm flex items-center justify-center gap-1.5 shadow-sm"
              >
                Start Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: LOBBY COUNTDOWN */}
      {view === "lobby" && (
        <div className="max-w-4xl mx-auto space-y-6 pt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Interview Room Initializing</h2>
            <button
              onClick={handleExit}
              className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 px-3.5 py-1.5 rounded-lg transition font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" /> Exit Setup
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Lobby Preview Feed */}
            <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex items-center justify-center">
              <video
                ref={lobbyVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Guide Guidelines Cards */}
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col justify-end p-6 text-white">
                <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Proctoring Guidelines
                </h3>
                <ul className="space-y-2 text-xs text-slate-200">
                  <li className="flex gap-2 items-center">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    Ensure you are in a quiet, well-lit environment.
                  </li>
                  <li className="flex gap-2 items-center">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    Keep your face clearly aligned within the camera feed.
                  </li>
                  <li className="flex gap-2 items-center">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    Tab-switching or exiting fullscreen mode is strictly monitored.
                  </li>
                  <li className="flex gap-2 items-center">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    Ensure screen sharing remains active for your entire display.
                  </li>
                </ul>
              </div>
            </div>

            {/* Large Countdown */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 shadow-sm text-center flex flex-col items-center justify-center">
              <span className="text-xs uppercase font-bold tracking-wider text-rose-500 mb-2">AI Interview Starting Soon</span>
              <h2 className="text-xl font-bold text-[#111111] mb-6">Prepare to engage with the AI Panel</h2>

              {/* Circular Countdown Ring */}
              <div className="relative w-36 h-36 flex items-center justify-center border-4 border-slate-100 rounded-full mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                <span className="text-5xl font-black text-slate-800">{countdown}</span>
              </div>

              <p className="text-xs text-[#6B7280] leading-relaxed">
                We are initializing the interview room. This workspace will lock into fullscreen mode automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: LIVE AI INTERVIEW ROOM */}
      {view === "in_progress" && currentQuestion && (
        <div className="fixed inset-0 z-50 bg-[#0F172A] text-white flex flex-col">

          {/* TOP TELEMETRY BAR */}
          <div className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/60 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">AI Interview In Progress</span>
            </div>

            <div className="bg-slate-950 px-4 py-1.5 rounded-full border border-slate-800 text-xs font-semibold text-slate-400 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span>Question {session?.questions.length || 1} / 10</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExit}
                className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 px-3.5 py-1.5 rounded-lg border border-rose-900/40 transition font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" /> Exit Interview
              </button>
              <div className="flex items-center gap-2 text-slate-400 font-medium text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <Clock className="w-4 h-4 text-rose-500" />
                <span>{formatTimer(interviewTime)}</span>
              </div>
            </div>
          </div>

          {/* MAIN CHAT & AVATAR CANVAS */}
          <div className="flex-1 flex flex-col md:flex-row p-6 gap-6 items-stretch overflow-hidden">

            {/* Left AI Avatar Box */}
            <div className="flex-1 flex flex-col bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 justify-center items-center relative overflow-hidden shadow-inner">
              <SVGAvatar state={avatarState} />

              {/* Dynamic waveform based on voice speaking state */}
              <div className="mt-8 flex items-center gap-1.5 h-8">
                {avatarState === "speaking" ? (
                  // Active talking waveform
                  [...Array(12)].map((_, i) => (
                    <span
                      key={i}
                      style={{ animationDelay: `${i * 0.08}s` }}
                      className="w-1 bg-gradient-to-t from-rose-500 to-rose-400 rounded-full animate-[talk_0.3s_infinite]"
                    ></span>
                  ))
                ) : avatarState === "listening" ? (
                  // Pulsing listening waveform
                  [...Array(12)].map((_, i) => (
                    <span
                      key={i}
                      className="w-1 h-2 bg-blue-500/60 rounded-full animate-pulse"
                    ></span>
                  ))
                ) : (
                  // Flat line
                  [...Array(12)].map((_, i) => (
                    <span key={i} className="w-1 h-1 bg-slate-600 rounded-full"></span>
                  ))
                )}
              </div>
            </div>

            {/* Right Question Bubble & Live Transcriber */}
            <div className="flex-1 flex flex-col gap-6">

              {/* Question bubble */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 relative">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">
                  {avatarState === "speaking" ? "AI is speaking..." : avatarState === "thinking" ? "AI is preparing next topic..." : "AI Panel"}
                </span>
                <p className="text-base font-medium leading-relaxed text-slate-100">
                  {currentQuestion.questionText}
                </p>
              </div>

              {/* Live transcript input feedback box */}
              <div className="flex-grow bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between overflow-y-auto">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                    {isListening && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>}
                    {isListening ? "Listening to your answer..." : "Transcript status"}
                  </span>

                  {liveTranscript ? (
                    <p className="text-sm font-medium leading-relaxed text-slate-200 mt-2">
                      {liveTranscript}
                    </p>
                  ) : (
                    <p className="text-xs italic text-slate-600 mt-2">
                      {isListening ? "Speak clearly. Your voice is transcribing here in real-time..." : "Voice recognizer waiting for AI to complete speaking..."}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  {isListening ? (
                    <button
                      onClick={handleAnswerSubmit}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition text-xs shadow-lg"
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <button
                      disabled
                      className="bg-slate-800 text-slate-500 font-semibold px-6 py-3 rounded-xl text-xs"
                    >
                      Wait for AI
                    </button>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* BOTTOM CONTROLS & CAMERA FEED */}
          <div className="h-24 bg-slate-950 border-t border-slate-800 px-6 flex items-center justify-between">
            {/* Floating Webcam Feed */}
            <div className="flex items-center gap-4">
              <div className="w-24 h-16 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden relative shadow-inner">
                {cameraStream && !isCamOff ? (
                  <video
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                    ref={(el) => {
                      if (el && cameraStream) el.srcObject = cameraStream;
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-600">
                    <CameraOff className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-300">{user?.name}</h4>
                <p className="text-[10px] text-slate-500">MERN Stack Candidate</p>
              </div>
            </div>

            {/* Stream Toggles */}
            <div className="flex items-center gap-3">
              {/* Mic toggle */}
              <button
                onClick={() => {
                  if (micStream) {
                    micStream.getAudioTracks()[0].enabled = isMuted;
                    setIsMuted(!isMuted);
                    toast.success(isMuted ? "Microphone active" : "Microphone muted");
                  }
                }}
                className={`p-3 rounded-xl border transition ${isMuted ? "bg-rose-950/40 border-rose-800 text-[#E11D48]" : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"}`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Camera toggle */}
              <button
                onClick={() => {
                  if (cameraStream) {
                    cameraStream.getVideoTracks()[0].enabled = isCamOff;
                    setIsCamOff(!isCamOff);
                    toast.success(isCamOff ? "Camera active" : "Camera disabled");
                  }
                }}
                className={`p-3 rounded-xl border transition ${isCamOff ? "bg-rose-950/40 border-rose-800 text-[#E11D48]" : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"}`}
              >
                {isCamOff ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              </button>

              {/* Screen Sharing Indicator */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl text-[10px] font-semibold text-slate-300">
                <Monitor className="w-3.5 h-3.5 text-green-500" />
                <span>Screen Sharing Active</span>
              </div>
            </div>

            {/* Leave button */}
            <button
              onClick={() => {
                if (confirm("Are you sure you want to exit? Your answers will be submitted for evaluation.")) {
                  handleEndInterview(false);
                }
              }}
              className="flex items-center gap-1.5 text-xs text-[#E11D48] bg-rose-950/40 border border-rose-850 hover:bg-rose-950/80 px-4 py-2.5 rounded-xl font-semibold transition"
            >
              <LogOut className="w-4 h-4" />
              Leave Interview
            </button>
          </div>

          {/* WARNING MODAL OVERLAYS (PROCTORING) */}
          {warningModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">

              {/* Tab Switch warning */}
              {warningModal.type === "tab" && (
                <div className="bg-white text-slate-950 border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
                  <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertOctagon className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Tab Switch Detected</h2>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    Please do not switch tabs or open other applications during the Interview. This is warning <span className="font-bold text-rose-600">{warningModal.count} out of 5</span>. Reaching 5 switches will auto-terminate your session.
                  </p>
                  <button
                    onClick={() => setWarningModal(null)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition text-xs shadow-md"
                  >
                    OK, I understand
                  </button>
                </div>
              )}

              {/* Fullscreen Exit warning */}
              {warningModal.type === "fullscreen" && (
                <div className="bg-white text-slate-950 border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
                  <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Fullscreen Exit Detected</h2>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    Fullscreen mode is required to maintain the proctoring lock for this mock interview.
                  </p>
                  <button
                    onClick={requestReFullscreen}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition text-xs shadow-md"
                  >
                    Return to Fullscreen
                  </button>
                </div>
              )}

              {/* Screen Share Drop Warning */}
              {warningModal.type === "screenshare" && (
                <div className="bg-white text-slate-950 border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
                  <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <Monitor className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Screen Share Interrupted</h2>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Screen sharing has stopped. Please resume screen sharing immediately to continue the interview.
                  </p>

                  {/* Countdown Timer */}
                  <div className="text-3xl font-black text-rose-600 mb-6">
                    {screenGraceSeconds}s
                  </div>

                  <button
                    onClick={resumeScreenShare}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition text-xs shadow-md"
                  >
                    Resume Screen Share
                  </button>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* VIEW: INTERVIEW COMPLETED / SCORECARD */}
      {view === "completed" && session && (
        <div className="max-w-2xl mx-auto bg-white border border-[#E5E7EB] rounded-2xl p-10 shadow-sm text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-bold text-[#111111] mb-2">Interview Completed!</h2>
          <p className="text-xs text-[#6B7280] mb-8 leading-relaxed max-w-md">
            Great job! Your mock interview has been evaluated and a detailed report has been generated.
          </p>

          <div className="grid grid-cols-3 gap-6 w-full mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-[#9CA3AF] block tracking-wider">Total Questions</span>
              <span className="text-xl font-extrabold text-[#111111] mt-1.5 block">10</span>
            </div>
            <div className="text-center border-x border-[#E5E7EB]">
              <span className="text-[10px] uppercase font-bold text-[#9CA3AF] block tracking-wider">Duration</span>
              <span className="text-xl font-extrabold text-[#111111] mt-1.5 block">
                {session.report?.candidateSummary.duration || "15:32"}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-[#9CA3AF] block tracking-wider">Overall Score</span>
              <span className="text-xl font-extrabold text-blue-600 mt-1.5 block">
                {session.evaluation?.overallScore || 0}%
              </span>
            </div>
          </div>

          <button
            onClick={() => setView("report")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition text-xs shadow-md flex items-center gap-2"
          >
            View Detailed Report
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW: DETAILED REPORT PANEL */}
      {view === "report" && session && session.report && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-2.5">
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Evaluation Results</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                  {session.evaluation?.overallScore}%
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#111111]">Overall Rating</h4>
                  <p className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                    Passed
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setReportTab("overview")}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${reportTab === "overview" ? "bg-slate-900 text-white" : "bg-white border border-[#E5E7EB] text-slate-700 hover:bg-slate-50"}`}
            >
              <Activity className="w-4 h-4" />
              Overview Summary
            </button>

            <button
              onClick={() => setReportTab("questions")}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${reportTab === "questions" ? "bg-slate-900 text-white" : "bg-white border border-[#E5E7EB] text-slate-700 hover:bg-slate-50"}`}
            >
              <FileText className="w-4 h-4" />
              Question Feedback
            </button>

            <button
              onClick={() => setReportTab("skills")}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${reportTab === "skills" ? "bg-slate-900 text-white" : "bg-white border border-[#E5E7EB] text-slate-700 hover:bg-slate-50"}`}
            >
              <Volume2 className="w-4 h-4" />
              Strengths & Learning
            </button>

            <button
              onClick={() => setReportTab("transcript")}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${reportTab === "transcript" ? "bg-slate-900 text-white" : "bg-white border border-[#E5E7EB] text-slate-700 hover:bg-slate-50"}`}
            >
              <RefreshCw className="w-4 h-4" />
              Interview Transcript
            </button>

            <button
              onClick={() => setReportTab("proctor")}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${reportTab === "proctor" ? "bg-slate-900 text-white" : "bg-white border border-[#E5E7EB] text-slate-700 hover:bg-slate-50"}`}
            >
              <Shield className="w-4 h-4" />
              Proctoring Summary
            </button>
          </div>

          {/* Tab Content Display Area */}
          <div className="lg:col-span-3 space-y-6">

            {/* OVERVIEW SUMMARY TAB */}
            {reportTab === "overview" && (
              <div className="space-y-6">

                {/* Circular chart breakdown */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                    <h3 className="text-sm font-bold text-[#111111]">Overall Performance</h3>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 text-xs text-[#2563EB] font-semibold border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Report
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    {/* Ring 1 - Overall */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-20 h-20 flex items-center justify-center border-4 border-slate-100 rounded-full mb-3">
                        <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent"></div>
                        <span className="text-base font-extrabold text-slate-800">{session.evaluation?.overallScore}%</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700 block">Overall Score</span>
                      <span className="text-[10px] text-slate-400 mt-1">Excellent</span>
                    </div>

                    {/* Ring 2 - Tech */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-20 h-20 flex items-center justify-center border-4 border-slate-100 rounded-full mb-3">
                        <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent"></div>
                        <span className="text-base font-extrabold text-slate-800">{session.evaluation?.technicalScore}%</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700 block">Technical Skills</span>
                      <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded-full mt-1">Good</span>
                    </div>

                    {/* Ring 3 - Comm */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-20 h-20 flex items-center justify-center border-4 border-slate-100 rounded-full mb-3">
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                        <span className="text-base font-extrabold text-slate-800">{session.evaluation?.communicationScore}%</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700 block">Communication</span>
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full mt-1">Good</span>
                    </div>

                    {/* Ring 4 - Solve */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-20 h-20 flex items-center justify-center border-4 border-slate-100 rounded-full mb-3">
                        <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent"></div>
                        <span className="text-base font-extrabold text-slate-800">{session.evaluation?.problemSolvingScore}%</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700 block">Problem Solving</span>
                      <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full mt-1">Good</span>
                    </div>
                  </div>
                </div>

                {/* Video Playback of session */}
                {videoUrl && (
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-[#111111] mb-4">Interview Recording Playback</h3>
                    <video
                      controls
                      src={videoUrl}
                      className="w-full rounded-xl bg-black aspect-video border border-slate-200"
                    />
                  </div>
                )}

                {/* Timeline and Stats summary */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-[#111111] mb-6 border-b border-slate-100 pb-3">Interview Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <span className="text-xs font-semibold text-[#9CA3AF] block uppercase tracking-wider">Total Questions</span>
                      <span className="text-lg font-bold text-[#111111] mt-1.5 block">10</span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#9CA3AF] block uppercase tracking-wider">Answers Submitted</span>
                      <span className="text-lg font-bold text-[#111111] mt-1.5 block">10</span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#9CA3AF] block uppercase tracking-wider">Duration</span>
                      <span className="text-lg font-bold text-[#111111] mt-1.5 block">
                        {session.report.candidateSummary.duration}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* QUESTION FEEDBACK TAB */}
            {reportTab === "questions" && (
              <div className="space-y-4">
                {session.report.questionFeedback.map((q, idx) => (
                  <div key={idx} className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm">
                    <div
                      onClick={() => setExpandedQuestion(expandedQuestion === q.question ? null : q.question)}
                      className="flex justify-between items-center cursor-pointer"
                    >
                      <div className="flex gap-3">
                        <span className="w-6 h-6 bg-slate-150 text-slate-800 rounded-full flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 max-w-xl">{q.question}</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                          Score: {q.score}
                        </span>
                        {expandedQuestion === q.question ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {expandedQuestion === q.question && (
                      <div className="mt-5 border-t border-slate-100 pt-5 space-y-4 text-xs">
                        <div>
                          <span className="font-bold text-slate-700 block mb-1.5">Candidate Answer Transcript</span>
                          <p className="text-slate-600 bg-[#FAFAFA] border border-[#F3F4F6] p-3 rounded-lg leading-relaxed">
                            {q.answer}
                          </p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-700 block mb-1.5">Constructive Feedback</span>
                          <p className="text-slate-600 leading-relaxed">
                            {q.feedback}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Accuracy</span>
                            <span className="text-xs font-bold text-slate-800 block mt-1">{q.metrics.accuracy}/10</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Communication</span>
                            <span className="text-xs font-bold text-slate-800 block mt-1">{q.metrics.communication}/10</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Problem Solving</span>
                            <span className="text-xs font-bold text-slate-800 block mt-1">{q.metrics.problemSolving}/10</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Confidence</span>
                            <span className="text-xs font-bold text-slate-800 block mt-1">{q.metrics.confidence}/10</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* STRENGTHS & LEARNING TAB */}
            {reportTab === "skills" && (
              <div className="space-y-6">

                {/* Strengths & Weaknesses grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Strengths */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-green-600 mb-4 flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Strong Areas
                    </h3>
                    <ul className="space-y-3 text-xs text-slate-600">
                      {session.report.strengths.map((str, idx) => (
                        <li key={idx} className="flex gap-2 items-start">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0"></span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Weaknesses */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-4 flex items-center gap-1.5">
                      <X className="w-4 h-4" /> Areas for Improvement
                    </h3>
                    <ul className="space-y-3 text-xs text-slate-600">
                      {session.report.weaknesses.map((weak, idx) => (
                        <li key={idx} className="flex gap-2 items-start">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                          <span>{weak}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* Recommendations */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-4 flex items-center gap-1.5">
                    <ArrowRight className="w-4 h-4" /> Recommended Learning Path
                  </h3>
                  <ul className="space-y-3 text-xs text-slate-600">
                    {session.report.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            )}

            {/* INTERVIEW TRANSCRIPT TAB */}
            {reportTab === "transcript" && (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-6">
                <h3 className="text-sm font-bold text-[#111111] border-b border-slate-100 pb-3">Complete Transcript</h3>

                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {session.report.transcript.map((chat, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${chat.speaker === "AI" ? "bg-slate-50 border border-slate-100 mr-auto text-slate-800" : "bg-blue-600 text-white ml-auto"}`}
                    >
                      <div className="flex justify-between items-center gap-4 mb-1.5 font-bold uppercase tracking-wider text-[9px] opacity-75">
                        <span>{chat.speaker}</span>
                        <span>{chat.timestamp}</span>
                      </div>
                      <p className="font-medium">{chat.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PROCTORING SUMMARY TAB */}
            {reportTab === "proctor" && (
              <div className="space-y-6">

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-[#111111] mb-6 border-b border-slate-100 pb-3">Proctoring Telemetry</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Tab Switches</span>
                      <span className="text-lg font-bold text-slate-800 block mt-1.5">
                        {session.report.proctoringSummary.tabSwitches}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Fullscreen Exits</span>
                      <span className="text-lg font-bold text-slate-800 block mt-1.5">
                        {session.report.proctoringSummary.fullscreenExits}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Screen Share Drops</span>
                      <span className="text-lg font-bold text-slate-800 block mt-1.5">
                        {session.report.proctoringSummary.screenShareInterruptions}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border border-[#F3F4F6] p-4 rounded-xl">
                    <div className={`p-2.5 rounded-lg ${session.report.proctoringSummary.status === "Clean" ? "bg-green-50 text-green-600" : session.report.proctoringSummary.status === "Flagged" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}>
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Proctor Status</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        This session is marked as <span className="font-bold">{session.report.proctoringSummary.status}</span>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline activity log */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-[#111111] mb-6 border-b border-slate-100 pb-3">Session Timeline</h3>
                  <div className="relative border-l border-slate-200 pl-4 space-y-6 ml-2 text-xs">
                    {session.report.timeline.map((log, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white ring-4 ring-blue-50"></span>
                        <div className="flex gap-4">
                          <span className="text-[10px] text-slate-400 font-bold tracking-wider">{log.timestamp}</span>
                          <span className="text-slate-700 font-semibold">{log.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
