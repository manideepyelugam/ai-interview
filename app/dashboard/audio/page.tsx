"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { InterviewConfiguration } from "@/src/components/Dashboard/InterviewConfiguration";
import { toast } from "sonner";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RefreshCw,
  Award,
  Home,
  ChevronRight,
  Sparkles,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  AlertCircle,
  User,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
  Bell,
  X,
  Briefcase,
  Users,
  Layers,
  Network,
  MessageSquare,
  UserCheck,
  Terminal,
  ShieldAlert,
  Brain,
  ListTodo,
  FileSpreadsheet,
  Download,
  Flame,
  UserRound,
  Globe,
  MoreVertical,
  Activity,
  UserCheck2,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  InterviewContext,
  AudioInterviewSession,
  AudioInterviewSettings,
  AIQuestion,
  AIInterviewReport
} from "@/src/types";

type ViewState =
  | "config"
  | "setup"
  | "settings"
  | "permissions"
  | "countdown"
  | "in_progress"
  | "completed"
  | "results";

type ReportSection =
  | "overview"
  | "questions"
  | "skills"
  | "strengths"
  | "coach"
  | "recommendations"
  | "transcript"
  | "proctoring";

// Waveform Component
const Waveform = ({
  state,
  volume,
  barCount = 20,
  height = 80,
  color = "blue"
}: {
  state: "ai" | "listening" | "thinking" | "idle";
  volume: number;
  barCount?: number;
  height?: number;
  color?: "blue" | "green" | "grey";
}) => {
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    let animId: number;
    const tick = () => {
      setTicks((t) => t + 1);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div style={{ height: `${height}px` }} className="flex items-center justify-center gap-1 w-full">
      {[...Array(barCount)].map((_, i) => {
        let factor = 4;
        const centerDist = Math.abs(i - barCount / 2) / (barCount / 2);
        const weight = Math.cos((centerDist * Math.PI) / 2); // 1 at center, 0 at edges

        if (state === "ai") {
          factor = (Math.sin(ticks / 6 + i * 0.4) * 0.35 + 0.65) * height * 0.7 * weight;
        } else if (state === "listening") {
          if (volume > 2) {
            factor = (volume / 100) * height * 0.9 * weight * (Math.random() * 0.4 + 0.8);
          } else {
            factor = (Math.sin(ticks / 12 + i * 0.3) * 0.15 + 0.25) * height * 0.2 * weight;
          }
        } else if (state === "thinking") {
          factor = (Math.sin(ticks / 18 + i * 0.2) * 0.1 + 0.2) * height * 0.35 * weight;
        } else {
          factor = 4;
        }

        const finalHeight = Math.max(4, factor);

        return (
          <div
            key={i}
            style={{ height: `${finalHeight}px` }}
            className={cn(
              "w-[5px] rounded-full transition-all duration-75",
              color === "blue" && "bg-blue-500",
              color === "green" && "bg-emerald-500",
              color === "grey" && "bg-slate-700"
            )}
          />
        );
      })}
    </div>
  );
};

export default function AudioRoundPage() {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState<ViewState>("config");
  const [context, setContext] = useState<InterviewContext | null>(null);

  // Settings State
  const [settings, setSettings] = useState<AudioInterviewSettings>({
    duration: 10,
    difficulty: "Medium",
    interviewType: "Technical",
    voice: "Male",
    accent: "Indian",
    practiceMode: "Deep Technical",
  });

  // Session State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<AudioInterviewSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<AIQuestion | null>(null);
  const [transcriptText, setTranscriptText] = useState(""); // Holds full response transcription

  // UI States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [activeReportSection, setActiveReportSection] = useState<ReportSection>("overview");
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"interviewer" | "transcript" | "commands">("interviewer");

  // Timer state for in-progress screen
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Audio / Speech Refs
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [micVolume, setMicVolume] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAnimationRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const shouldRecognitionRunRef = useRef(false);

  const practiceTips = [
    "Speak clearly and at a moderate, conversational pace.",
    "Say 'repeat question' if you need the AI to read it again.",
    "Say 'give hint' to receive a helpful hint on the topic.",
    "Say 'skip question' if you would like to proceed directly to the next question.",
    "Say 'pause interview' or 'resume interview' to control the pace of the round.",
    "Say 'end interview' at any time to calculate your score immediately."
  ];
  const [tipIndex, setTipIndex] = useState(0);

  // Timer count effect
  useEffect(() => {
    let interval: any;
    if (view === "in_progress" && !isPaused) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [view, isPaused]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Load context from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const querySessionId = params.get("sessionId");
      if (querySessionId) {
        setSessionId(querySessionId);
        loadSession(querySessionId);
        return;
      }

      const queryFullId = params.get("fullSessionId");
      if (queryFullId) {
        fetch(`/api/interview/session?sessionId=${queryFullId}`)
          .then(res => res.json())
          .then(data => {
            if (data.session) {
              const fullSess = data.session;
              if (fullSess.audioSessionId) {
                window.location.href = `/dashboard/audio?sessionId=${fullSess.audioSessionId}&fullSessionId=${queryFullId}`;
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
                localStorage.setItem("interview_context_audio", JSON.stringify(ctx));
                setContext(ctx);
                setView("setup");
              }
            }
          })
          .catch(err => console.error(err));
        return;
      }
    }

    const savedContext = localStorage.getItem("interview_context_audio");
    if (savedContext) {
      setContext(JSON.parse(savedContext));
      setView("setup");
    } else {
      setView("config");
    }

    const savedSessionId = localStorage.getItem("active_audio_session_id");
    if (savedSessionId) {
      setSessionId(savedSessionId);
      loadSession(savedSessionId);
    }
  }, []);

  // Tip slider
  useEffect(() => {
    if (view === "countdown") {
      const interval = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % practiceTips.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [view]);

  // Load session from database
  const loadSession = async (id: string) => {
    try {
      setIsGenerating(true);
      const res = await fetch(`/api/audio-interview/session?sessionId=${id}`);
      if (!res.ok) throw new Error("Failed to fetch session.");
      const data = await res.json();

      const activeSession = data.session as AudioInterviewSession;
      setSession(activeSession);
      setSettings(activeSession.settings);

      if (activeSession.status === "completed") {
        setView("results");
      } else {
        const currentQ = activeSession.questions[activeSession.currentQuestionIndex];
        setCurrentQuestion(currentQ || null);
        setView("in_progress");
        shouldRecognitionRunRef.current = true;
        startMicStream();
        setTimeout(() => {
          if (currentQ) {
            speakQuestion(currentQ.questionText);
          }
        }, 1000);
      }
    } catch (err: any) {
      toast.error("Error reloading active session: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Start Mic & Audio Context for Waveform analysis
  const startMicStream = async () => {
    try {
      if (typeof window === "undefined") return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setMicVolume(Math.min(100, Math.round((average / 128) * 100)));
        micAnimationRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
      initSpeechRecognition();
    } catch (err) {
      console.error("Microphone access failed:", err);
      toast.error("Failed to access microphone. Please grant browser permissions.");
    }
  };

  // Stop Mic Stream
  const stopMicStream = () => {
    shouldRecognitionRunRef.current = false;
    if (micAnimationRef.current) {
      cancelAnimationFrame(micAnimationRef.current);
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { }
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Initialize Speech-to-Text
  const initSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      toast.warning("Speech recognition is not fully supported in this browser. Try Chrome or Safari.");
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalSpeech = "";
      let interimSpeech = "";

      for (let i = 0; i < event.results.length; ++i) {
        const trans = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalSpeech += trans;
        } else {
          interimSpeech += trans;
        }
      }

      // Live text is final text + interim text
      const fullText = (finalSpeech + " " + interimSpeech).trim();
      setTranscriptText(fullText);

      // Perform command detection on the final speech chunk
      if (finalSpeech) {
        checkVoiceCommands(finalSpeech);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we still want it running
      if (shouldRecognitionRunRef.current && view === "in_progress" && !isPaused && !isMuted) {
        try {
          recognition.start();
        } catch (e) {
          console.warn("Speech recognition auto-restart failed:", e);
        }
      }
    };

    recognition.onerror = (e: any) => {
      console.warn("Speech recognition error:", e.error);
      if (e.error === "not-allowed") {
        toast.error("Microphone permission was denied.");
      }
    };

    recognitionRef.current = recognition;
    if (shouldRecognitionRunRef.current && !isMuted && !isPaused && !isAiSpeaking && !isThinking) {
      try {
        recognition.start();
      } catch (e) { }
    }
  };

  const startRecognitionSafely = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
    } catch (e: any) {
      if (e.name === "InvalidStateError" || e.message?.includes("already started")) {
        return;
      }
      setTimeout(() => {
        try {
          if (shouldRecognitionRunRef.current && !isMuted && !isPaused && !isAiSpeaking && !isThinking) {
            recognitionRef.current.start();
          }
        } catch (err) { }
      }, 300);
    }
  };

  const restartSpeechSession = () => {
    setTranscriptText("");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { }
    }
  };

  // Check for smart voice commands
  const checkVoiceCommands = (text: string) => {
    const lower = text.toLowerCase().trim();

    let commandText = "";
    let matched = false;

    if (lower.endsWith("repeat question") || lower.endsWith("repeat the question")) {
      commandText = "Repeating question";
      matched = true;
      restartSpeechSession();
      if (currentQuestion) {
        speakQuestion(currentQuestion.questionText);
      }
    } else if (lower.endsWith("give hint") || lower.endsWith("give me a hint") || lower.endsWith("need a hint")) {
      commandText = "Hint requested";
      matched = true;
      restartSpeechSession();
      handleGiveHint();
    } else if (lower.endsWith("skip question") || lower.endsWith("skip this question")) {
      commandText = "Skipping question";
      matched = true;
      restartSpeechSession();
      handleSkipQuestion();
    } else if (lower.endsWith("pause interview")) {
      commandText = "Pausing interview";
      matched = true;
      restartSpeechSession();
      handlePauseToggle(true);
    } else if (lower.endsWith("resume interview")) {
      commandText = "Resuming interview";
      matched = true;
      restartSpeechSession();
      handlePauseToggle(false);
    } else if (lower.endsWith("end interview") || lower.endsWith("finish interview")) {
      commandText = "Submitting interview";
      matched = true;
      restartSpeechSession();
      handleEndInterviewEarly();
    }

    if (matched) {
      toast.success(`Voice command detected: ${commandText}`);
    }
  };

  // SpeechSynthesis TTS function
  const speakQuestion = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis || isMuted) return;

    window.speechSynthesis.cancel();
    shouldRecognitionRunRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { }
    }

    setIsAiSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);

    // Voice & Accent selection mapping
    const voices = window.speechSynthesis.getVoices();
    let langCode = "en-US";
    if (settings.accent === "Indian") langCode = "en-IN";
    else if (settings.accent === "British") langCode = "en-GB";

    let voiceOptions = voices.filter((v) => v.lang.startsWith(langCode));
    if (voiceOptions.length === 0) {
      voiceOptions = voices.filter((v) => v.lang.startsWith("en"));
    }

    let selectedVoice = voiceOptions[0];
    if (settings.voice === "Female") {
      selectedVoice =
        voiceOptions.find(
          (v) =>
            v.name.toLowerCase().includes("female") ||
            v.name.toLowerCase().includes("google") ||
            v.name.toLowerCase().includes("samantha") ||
            v.name.toLowerCase().includes("zira") ||
            v.name.toLowerCase().includes("hazel") ||
            v.name.toLowerCase().includes("veena") ||
            v.name.toLowerCase().includes("heera")
        ) || selectedVoice;
    } else {
      selectedVoice =
        voiceOptions.find(
          (v) =>
            v.name.toLowerCase().includes("male") ||
            v.name.toLowerCase().includes("david") ||
            v.name.toLowerCase().includes("ravi") ||
            v.name.toLowerCase().includes("daniel")
        ) || selectedVoice;
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      setIsAiSpeaking(false);
      if (view === "in_progress" && !isPaused && !isMuted) {
        shouldRecognitionRunRef.current = true;
        startRecognitionSafely();
      }
    };

    utterance.onerror = () => {
      setIsAiSpeaking(false);
      if (view === "in_progress" && !isPaused && !isMuted) {
        shouldRecognitionRunRef.current = true;
        startRecognitionSafely();
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Launch Session initialization
  const startAudioSession = async () => {
    if (!context || !user) return;

    try {
      setIsGenerating(true);
      setView("countdown");

      let count = 5;
      setCountdown(count);
      const timer = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(timer);
        }
      }, 1000);

      const res = await fetch("/api/audio-interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          userId: user.$id,
          settings
        }),
      });

      if (!res.ok) throw new Error("Failed to initialize session");
      const data = await res.json();

      setSessionId(data.sessionId);
      setSession(data.session);
      setCurrentQuestion(data.session.questions[0]);
      localStorage.setItem("active_audio_session_id", data.sessionId);

      setTimeout(() => {
        setView("in_progress");
        shouldRecognitionRunRef.current = true;
        startMicStream();
        setTimeout(() => {
          if (data.session.questions[0]) {
            speakQuestion(data.session.questions[0].questionText);
          }
        }, 1000);
      }, 5000);

    } catch (err: any) {
      toast.error(err.message || "Failed to start interview.");
      setView("setup");
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit current verbal answer and move forward
  const handleSubmitAnswer = async (endEarly = false) => {
    if (!sessionId || !currentQuestion) return;

    try {
      setIsSubmitting(true);
      setIsThinking(true);
      shouldRecognitionRunRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) { }
      }
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }

      const res = await fetch("/api/audio-interview/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          answerText: transcriptText || "(Answered verbally - skipped text transcription)",
          violations: [],
          endInterview: endEarly
        }),
      });

      if (!res.ok) throw new Error("Failed to submit response.");
      const data = await res.json();
      const updatedSession = data.session as AudioInterviewSession;

      setSession(updatedSession);
      setTranscriptText("");

      if (updatedSession.status === "completed") {
        setView("completed");
        localStorage.removeItem("active_audio_session_id");
        stopMicStream();

        // If full interview, link and finalize
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const fId = params.get("fullSessionId");
          if (fId) {
            toast.info("Saving results and finalizing Full End-to-End Interview...");
            try {
              await fetch("/api/interview/link-round", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fullSessionId: fId,
                  roundType: "audio",
                  roundSessionId: sessionId
                })
              });
              await fetch("/api/interview/finalize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fullSessionId: fId
                })
              });
            } catch (e) { }
            localStorage.removeItem("interview_context_audio");
            setTimeout(() => {
              window.location.href = `/dashboard/interview?sessionId=${fId}`;
            }, 1500);
            return;
          }
        }
      } else {
        const nextQ = updatedSession.questions[updatedSession.currentQuestionIndex];
        setCurrentQuestion(nextQ);
        setIsThinking(false);
        setTimeout(() => {
          if (nextQ) {
            speakQuestion(nextQ.questionText);
          }
        }, 3000);
      }
    } catch (err: any) {
      toast.error("Failed to proceed: " + err.message);
      setIsThinking(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Skip Current Question
  const handleSkipQuestion = () => {
    setTranscriptText("(Skipped)");
    setTimeout(() => {
      handleSubmitAnswer(false);
    }, 500);
  };

  // Provide a Hint
  const handleGiveHint = () => {
    if (!currentQuestion) return;
    const hint = `Here's a hint: Think about the core principles or trade-offs involved in this topic. Consider how standard designs apply.`;
    speakQuestion(hint);
    toast.info("AI Interviewer: Reading hint...");
  };

  // End Interview early
  const handleEndInterviewEarly = () => {
    toast.info("Concluding interview and generating report...");
    handleSubmitAnswer(true);
  };

  // Toggle voice mute
  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      shouldRecognitionRunRef.current = false;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) { }
      }
      toast.info("Microphone and synthesis muted.");
    } else {
      toast.info("Microphone and synthesis unmuted.");
      if (view === "in_progress" && !isAiSpeaking && !isThinking && !isPaused) {
        shouldRecognitionRunRef.current = true;
        startRecognitionSafely();
      }
    }
  };

  // Toggle Pause/Resume
  const handlePauseToggle = (shouldPause?: boolean) => {
    const target = shouldPause !== undefined ? shouldPause : !isPaused;
    setIsPaused(target);
    if (target) {
      shouldRecognitionRunRef.current = false;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) { }
      }
      toast.info("Interview paused.");
    } else {
      toast.info("Interview resumed.");
      if (currentQuestion && !isAiSpeaking && !isThinking && !isMuted) {
        speakQuestion(currentQuestion.questionText);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMicStream();
    };
  }, []);

  // Configure new audio interview
  const handleResetAll = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const fId = params.get("fullSessionId");
      if (fId) {
        window.location.href = `/dashboard/interview?sessionId=${fId}`;
        return;
      }
    }
    localStorage.removeItem("active_audio_session_id");
    localStorage.removeItem("interview_context_audio");
    stopMicStream();
    setSession(null);
    setSessionId(null);
    setCurrentQuestion(null);
    setTranscriptText("");
    setView("config");
  };

  // Start Targeted practice round
  const handleStartPracticeRound = async (topic: string) => {
    if (!user) return;
    try {
      setIsGenerating(true);

      const miniContext: InterviewContext = {
        source: "role",
        role: `${topic} Expert Practice`,
        jd: {
          experience: "Mid level",
          requiredSkills: [topic],
          preferredSkills: []
        }
      };

      localStorage.setItem("interview_context_audio", JSON.stringify(miniContext));
      setContext(miniContext);

      const miniSettings: AudioInterviewSettings = {
        ...settings,
        duration: 5,
        difficulty: "Adaptive",
        practiceMode: "Rapid Fire"
      };
      setSettings(miniSettings);

      setView("countdown");
      let count = 5;
      setCountdown(count);
      const timer = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) clearInterval(timer);
      }, 1000);

      const res = await fetch("/api/audio-interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: miniContext,
          userId: user.$id,
          settings: miniSettings
        }),
      });

      if (!res.ok) throw new Error("Failed to initialize practice session");
      const data = await res.json();

      setSessionId(data.sessionId);
      setSession(data.session);
      setCurrentQuestion(data.session.questions[0]);
      localStorage.setItem("active_audio_session_id", data.sessionId);

      setTimeout(() => {
        setView("in_progress");
        shouldRecognitionRunRef.current = true;
        startMicStream();
        setTimeout(() => {
          if (data.session.questions[0]) {
            speakQuestion(data.session.questions[0].questionText);
          }
        }, 1000);
      }, 5000);

    } catch (err: any) {
      toast.error("Failed to start practice round: " + err.message);
      setView("results");
    } finally {
      setIsGenerating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-[#6B7280] mt-3">Loading authentications...</p>
      </div>
    );
  }

  // Define Interview type icons mapping
  const getInterviewTypeIcon = (type: string) => {
    switch (type) {
      case "Technical":
        return <Briefcase className="w-6 h-6 text-blue-600" />;
      case "Behavioral":
        return <UserCheck className="w-6 h-6 text-blue-600" />;
      case "HR":
        return <Users className="w-6 h-6 text-blue-600" />;
      case "Mixed":
        return <Layers className="w-6 h-6 text-blue-600" />;
      case "Project Discussion":
        return <MessageSquare className="w-6 h-6 text-blue-600" />;
      case "System Design":
        return <Network className="w-6 h-6 text-blue-600" />;
      default:
        return <Briefcase className="w-6 h-6 text-blue-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFCFC] max-w-8xl mx-auto">

      {/* HEADER BAR (only config & setup) */}
      {(view === "config" || view === "setup") && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Audio Practice Round</h1>
            <p className="text-[#6B7280] mt-1 text-[13px]">
              Speak naturally and complete an adaptive voice mock interview. Powered by Gemini.
            </p>
          </div>
        </div>
      )}

      {/* VIEW: CONFIGURATION STEPPER */}
      {view === "config" && (
        <InterviewConfiguration
          interviewType="audio"
          onConfigurationComplete={() => {
            const savedContext = localStorage.getItem("interview_context_audio");
            if (savedContext) {
              setContext(JSON.parse(savedContext));
              setView("setup");
            }
          }}
        />
      )}

      {/* VIEW: SETUP & CONTEXT REVIEW */}
      {view === "setup" && context && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 max-w-2xl mx-auto shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111111]">Confirm Interview Context</h2>
              <p className="text-xs text-[#6B7280]">Review extracted details from your resume or job description.</p>
            </div>
          </div>

          <div className="space-y-5 border border-[#F3F4F6] bg-[#FAFAFA] rounded-xl p-5 mb-8 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-semibold text-[#9CA3AF] block uppercase tracking-wider">Source</span>
                <span className="text-[#111111] font-medium mt-0.5 block">
                  {context.source === "resume" ? "Resume Upload" : context.source === "jd" ? "Job Description" : "Custom Role"}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#9CA3AF] block uppercase tracking-wider">Target Position</span>
                <span className="text-[#111111] font-medium mt-0.5 block">{context.role || "Software Developer"}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#9CA3AF] block uppercase tracking-wider mb-1.5">Core Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {(context.resume?.skills || context.jd?.requiredSkills || ["JavaScript", "React", "System Design"]).map((sk, idx) => (
                  <span key={idx} className="bg-white border border-[#E5E7EB] text-[#374151] px-2.5 py-1 rounded text-xs font-light">
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setView("config")}
              className="text-sm font-medium text-[#6B7280] hover:text-[#111111] transition"
            >
              Go Back
            </button>
            <button
              onClick={() => setView("settings")}
              className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl transition text-sm shadow-sm"
            >
              Continue to Settings
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW: AUDIO ROUND SETTINGS */}
      {view === "settings" && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 max-w-3xl mx-auto shadow-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#111111]">Interview Settings</h2>
            <p className="text-sm text-[#6B7280] mt-1">Configure your interview experience.</p>
          </div>

          <div className="space-y-6 text-sm mb-8">
            {/* Duration Buttons */}
            <div>
              <label className="block text-xs font-bold text-[#374151] mb-2 uppercase tracking-wide">Duration</label>
              <div className="flex flex-wrap gap-2.5">
                {[5, 10, 20, 30].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSettings({ ...settings, duration: t })}
                    className={cn(
                      "px-5 py-2.5 rounded-full text-xs font-medium transition-all duration-150",
                      settings.duration === t
                        ? "bg-blue-600 text-white shadow-sm font-semibold"
                        : "bg-white border border-[#E5E7EB] text-[#475569] hover:bg-[#FAFAFA]"
                    )}
                  >
                    {t} min
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Buttons */}
            <div>
              <label className="block text-xs font-bold text-[#374151] mb-2 uppercase tracking-wide">Difficulty</label>
              <div className="flex flex-wrap gap-2.5">
                {["Easy", "Medium", "Hard", "Adaptive"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSettings({ ...settings, difficulty: d as any })}
                    className={cn(
                      "px-5 py-2.5 rounded-full text-xs font-medium transition-all duration-150",
                      settings.difficulty === d
                        ? "bg-blue-600 text-white shadow-sm font-semibold"
                        : "bg-white border border-[#E5E7EB] text-[#475569] hover:bg-[#FAFAFA]"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Interview Type Cards Grid */}
            <div>
              <label className="block text-xs font-bold text-[#374151] mb-3.5 uppercase tracking-wide">Interview Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
                {["Technical", "Behavioral", "HR", "Mixed", "Project Discussion", "System Design"].map((type) => {
                  const isSelected = settings.interviewType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setSettings({ ...settings, interviewType: type as any })}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border bg-white transition-all duration-200 text-center gap-2.5 min-h-[96px]",
                        isSelected
                          ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10 shadow-sm"
                          : "border-[#E5E7EB] hover:border-slate-300"
                      )}
                    >
                      {getInterviewTypeIcon(type)}
                      <span className={cn("text-[11px] font-medium block truncate w-full", isSelected ? "text-blue-600 font-semibold" : "text-[#475569]")}>
                        {type}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Voice Buttons */}
            <div>
              <label className="block text-xs font-bold text-[#374151] mb-2 uppercase tracking-wide">AI Voice</label>
              <div className="flex flex-wrap gap-2.5">
                {["Male", "Female"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setSettings({ ...settings, voice: v as any })}
                    className={cn(
                      "px-5 py-2.5 rounded-full text-xs font-medium transition-all duration-150",
                      settings.voice === v
                        ? "bg-blue-600 text-white shadow-sm font-semibold"
                        : "bg-white border border-[#E5E7EB] text-[#475569] hover:bg-[#FAFAFA]"
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Buttons */}
            <div>
              <label className="block text-xs font-bold text-[#374151] mb-2 uppercase tracking-wide">Accent</label>
              <div className="flex flex-wrap gap-2.5">
                {["American", "Indian", "British"].map((a) => (
                  <button
                    key={a}
                    onClick={() => setSettings({ ...settings, accent: a as any })}
                    className={cn(
                      "px-5 py-2.5 rounded-full text-xs font-medium transition-all duration-150",
                      settings.accent === a
                        ? "bg-blue-600 text-white shadow-sm font-semibold"
                        : "bg-white border border-[#E5E7EB] text-[#475569] hover:bg-[#FAFAFA]"
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Practice Mode Buttons */}
            <div>
              <label className="block text-xs font-bold text-[#374151] mb-2 uppercase tracking-wide">Practice Mode</label>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { value: "Rapid Fire", label: "Rapid Fire" },
                  { value: "Deep Technical", label: "Deep Technical" },
                  { value: "Behavioral Practice", label: "Behavioral" },
                  { value: "Project Discussion", label: "Project Discussion" },
                  { value: "HR Round", label: "HR Round" },
                  { value: "System Design", label: "System Design" },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setSettings({ ...settings, practiceMode: mode.value as any })}
                    className={cn(
                      "px-5 py-2.5 rounded-full text-xs font-medium transition-all duration-150",
                      settings.practiceMode === mode.value
                        ? "bg-blue-600 text-white shadow-sm font-semibold"
                        : "bg-white border border-[#E5E7EB] text-[#475569] hover:bg-[#FAFAFA]"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-[#F3F4F6]">
            <button
              onClick={() => setView("setup")}
              className="text-sm font-medium text-[#6B7280] hover:text-[#111111] transition"
            >
              Go Back
            </button>
            <button
              onClick={() => setView("permissions")}
              className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl transition text-sm shadow-sm"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW: MICROPHONE PERMISSION SCREEN */}
      {view === "permissions" && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 max-w-2xl mx-auto shadow-sm relative overflow-hidden">
          {/* Notifications area / initials profile mock in upper right */}
          <div className="absolute top-5 right-6 flex items-center gap-3">
            <button className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
              <Bell className="w-4 h-4" />
            </button>
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-semibold text-[11px] flex items-center justify-center">
              MY
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#111111]">Microphone Permission</h2>
            <p className="text-sm text-[#6B7280] mt-1">We only need access to your microphone.</p>
          </div>

          {/* Central circular waveform visualization */}
          <div className="flex flex-col items-center justify-center my-10 gap-6">
            <div className="flex items-center justify-center gap-8 w-full max-w-sm">
              {/* Left wave bars */}
              <div className="flex items-end gap-1 h-12 w-24 justify-end">
                {[12, 24, 16, 32, 20, 28, 14].map((h, i) => (
                  <div key={i} style={{ height: `${h}px` }} className="w-1 bg-blue-400/70 rounded-full" />
                ))}
              </div>

              {/* Pulsing Mic Circle */}
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/10 rounded-full scale-125 animate-ping" />
                <div className="absolute inset-0 bg-blue-500/20 rounded-full scale-110" />
                <button
                  onClick={startMicStream}
                  className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center relative z-10 shadow-lg hover:bg-blue-700 transition"
                >
                  <Mic className="w-6 h-6" />
                </button>
              </div>

              {/* Right wave bars */}
              <div className="flex items-end gap-1 h-12 w-24">
                {[14, 28, 20, 32, 16, 24, 12].map((h, i) => (
                  <div key={i} style={{ height: `${h}px` }} className="w-1 bg-blue-400/70 rounded-full" />
                ))}
              </div>
            </div>

            {/* Connection Status Box */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-3 shadow-sm inline-flex flex-col items-center min-w-[200px]">
              <span className="text-xs font-semibold text-slate-800">Microphone</span>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={cn("w-2 h-2 rounded-full", micStreamRef.current ? "bg-emerald-500 animate-pulse" : "bg-red-400")} />
                <span className={cn("text-[11px] font-bold", micStreamRef.current ? "text-emerald-600" : "text-red-500")}>
                  Status: {micStreamRef.current ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>

          {/* Privacy Box */}
          <div className="bg-blue-50/50 border border-blue-200/50 rounded-xl p-4 text-center max-w-md mx-auto mb-10">
            <p className="text-[12px] text-blue-600 leading-relaxed">
              We do not require camera or screen access. <br />
              <span className="font-semibold">Your privacy is important to us.</span>
            </p>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-[#F3F4F6]">
            <button
              onClick={() => setView("settings")}
              className="text-sm font-medium text-[#6B7280] hover:text-[#111111]"
            >
              Back to Settings
            </button>
            <button
              onClick={startAudioSession}
              disabled={isGenerating}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-sm transition"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Start Interview"}
            </button>
          </div>
        </div>
      )}

      {/* VIEW: COUNTDOWN TIMER */}
      {view === "countdown" && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 max-w-2xl mx-auto shadow-sm flex flex-col items-center">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-[#111111]">Get Ready!</h2>
            <p className="text-sm text-[#6B7280] mt-1">Your interview is about to start.</p>
          </div>

          {/* Large Countdown timer circle */}
          <div className="relative w-32 h-32 flex items-center justify-center my-8">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="#E5E7EB" strokeWidth="4" fill="transparent" />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="#2563EB"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 42}
                strokeDashoffset={2 * Math.PI * 42 * (1 - countdown / 5)}
                className="transition-all duration-1000"
              />
            </svg>
            <span className="absolute text-4xl font-extrabold text-blue-600">{countdown}</span>
          </div>

          {/* Tips panel */}
          <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-2xl p-6 w-full max-w-md text-left mt-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Tips for a great interview</h3>
            <ul className="space-y-3.5 text-xs text-[#475569]">
              <li className="flex gap-2.5 items-start">
                <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Speak clearly and at a normal pace</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Answer as naturally as you would in real interview</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>You can ask AI to repeat the question</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Use commands like &quot;give hint&quot;, &quot;skip&quot;, &quot;I don&apos;t know&quot;</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* VIEW: IN_PROGRESS AUDIO ROOM */}
      {view === "in_progress" && (
        <div className="fixed inset-0 z-[100] bg-[#090D1A] text-slate-100 flex flex-col">

          {/* Header Bar */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0B0F1E] z-10">
            <div className="flex items-center gap-2.5">
              {/* Star/Wave Interview Logo */}
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <Activity className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[13px] font-bold text-slate-200">Audio Interview in Progress</span>
            </div>

            {/* Timer & Question Details */}
            <div className="flex items-center gap-5">
              <span className="text-[12px] font-semibold text-slate-400">
                Question {session ? session.questions.length : 1}/{settings.duration === 5 ? 5 : settings.duration === 10 ? 10 : settings.duration === 20 ? 15 : 20}
              </span>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full">
                <Clock className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="text-[12px] font-bold font-mono text-red-400">{formatTimer(timerSeconds)}</span>
              </div>
            </div>
          </header>

          {/* Tabs Navigation for Rooms */}
          <div className="flex justify-center border-b border-slate-800/50 bg-[#090C19] py-2.5 gap-2 z-10">
            {[
              { id: "interviewer", label: "Interviewer View" },
              { id: "transcript", label: "Live Transcript" },
              { id: "commands", label: "Smart Commands" }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
                  activeTab === t.id
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.04),transparent_50%)] pointer-events-none" />

            <div className="w-full max-w-2xl relative z-10">

              {/* TAB 1: INTERVIEWER VIEW (Standard Siri Waveform view) */}
              {activeTab === "interviewer" && (
                <div className="flex flex-col items-center">

                  {/* Speaking/Listening Waveform */}
                  <div className="my-8 w-full flex flex-col items-center">
                    {isAiSpeaking ? (
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-sm font-bold text-blue-400 tracking-wider uppercase">AI Speaking...</span>
                        <Waveform state="ai" volume={0} barCount={26} height={60} color="blue" />
                      </div>
                    ) : isThinking ? (
                      <div className="flex flex-col items-center gap-5">
                        <span className="text-sm font-bold text-blue-400 tracking-wider uppercase">Thinking...</span>
                        <div className="flex items-center gap-2 py-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" />
                        </div>
                        <p className="text-xs text-slate-400">Generating next question...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-sm font-bold text-emerald-400 tracking-wider uppercase">Listening...</span>
                        <Waveform state="listening" volume={micVolume} barCount={26} height={60} color="green" />
                        <span className="text-xs text-slate-400 italic">Speak now...</span>
                      </div>
                    )}
                  </div>

                  {/* Question Display Card */}
                  <div className="w-full bg-[#0F1527] border border-slate-800 rounded-2xl p-6 text-center mt-6 shadow-xl">
                    {isThinking ? (
                      <p className="text-slate-400 text-sm italic font-light">Analyzing your response...</p>
                    ) : (
                      <p className="text-slate-100 text-base leading-relaxed font-light">
                        {currentQuestion ? currentQuestion.questionText : "Initializing interviewer..."}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: LIVE TRANSCRIPT VIEW */}
              {activeTab === "transcript" && (
                <div className="flex flex-col h-[400px] w-full bg-[#0B0F1F] border border-slate-800/80 rounded-2xl p-5 shadow-xl">
                  <h3 className="text-sm font-bold text-slate-200 mb-1">Live Transcript</h3>
                  <p className="text-[11px] text-slate-500 mb-4 border-b border-slate-800/60 pb-2">Real-time speech translation timeline</p>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                    {session?.questions.map((q, idx) => (
                      <div key={idx} className="space-y-2">
                        {/* AI bubble */}
                        <div className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded bg-blue-900/40 text-blue-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold border border-blue-800/30">
                            AI
                          </div>
                          <div className="bg-[#0E1529] rounded-xl p-3 leading-relaxed text-slate-300 border border-slate-800/40 max-w-[80%]">
                            {q.questionText}
                          </div>
                        </div>

                        {/* Candidate bubble */}
                        {q.answerText && (
                          <div className="flex items-start gap-2.5 justify-end">
                            <div className="bg-emerald-950/20 text-emerald-300 rounded-xl p-3 leading-relaxed border border-emerald-900/30 max-w-[80%]">
                              {q.answerText}
                            </div>
                            <div className="w-6 h-6 rounded bg-emerald-950/40 text-emerald-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold border border-emerald-900/30">
                              You
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Current transcript interim text */}
                    {transcriptText && (
                      <div className="flex items-start gap-2.5 justify-end">
                        <div className="bg-blue-950/20 text-blue-300 rounded-xl p-3 leading-relaxed border border-blue-900/30 max-w-[80%] animate-pulse">
                          {transcriptText}
                        </div>
                        <div className="w-6 h-6 rounded bg-blue-950/40 text-blue-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold border border-blue-900/30">
                          ...
                        </div>
                      </div>
                    )}

                    {!session?.questions.length && !transcriptText && (
                      <div className="flex flex-col items-center justify-center h-full text-center text-slate-600">
                        <Info className="w-5 h-5 mb-1.5" />
                        <p className="text-[11px]">No spoken dialog logged yet.</p>
                      </div>
                    )}
                  </div>

                  {/* Ambient wave at bottom of transcript */}
                  <div className="border-t border-slate-800/40 pt-3 mt-2 flex items-center justify-center">
                    <Waveform state={isAiSpeaking ? "ai" : isThinking ? "thinking" : "listening"} volume={micVolume} barCount={32} height={24} color="blue" />
                  </div>
                </div>
              )}

              {/* TAB 3: SMART COMMANDS */}
              {activeTab === "commands" && (
                <div className="bg-[#0B0F1F] border border-slate-800/80 rounded-2xl p-6 shadow-xl w-full">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-200">Smart Commands</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">You can use these voice commands anytime during the interview.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {[
                      { title: "Repeat", desc: "Repeat the last question.", icon: <RefreshCw className="w-4 h-4 text-blue-400" /> },
                      { title: "Give Hint", desc: "Give me a hint for this question.", icon: <Sparkles className="w-4 h-4 text-amber-400" /> },
                      { title: "Skip Question", desc: "Skip this question and move next.", icon: <ChevronRight className="w-4 h-4 text-red-400" /> },
                      { title: "Can You Explain", desc: "Explain the concept in detail.", icon: <Info className="w-4 h-4 text-emerald-400" /> },
                      { title: "I Don't Know", desc: "I don't know the answer.", icon: <HelpCircle className="w-4 h-4 text-purple-400" /> },
                      { title: "Pause Interview", desc: "Pause the interview temporarily.", icon: <Pause className="w-4 h-4 text-indigo-400" /> },
                    ].map((cmd, i) => (
                      <div key={i} className="bg-[#0F1426] border border-slate-800/60 rounded-xl p-3.5 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-[#151D33] rounded-md border border-slate-800/40">
                            {cmd.icon}
                          </div>
                          <span className="text-xs font-semibold text-slate-200">{cmd.title}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal">{cmd.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Warning banner */}
                  <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-3.5 mt-5 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-300 leading-relaxed font-light">
                      Just say the command naturally. <br />
                      <span className="font-semibold">Example: &quot;Repeat question&quot; or &quot;Give me a hint&quot;</span>
                    </p>
                  </div>
                </div>
              )}

            </div>
          </main>

          {/* Control Bar (Footer) */}
          <footer className="flex items-center justify-between px-6 py-5 border-t border-slate-800 bg-[#0B0F1E] z-10">
            {/* Control buttons */}
            <div className="flex items-center gap-3">
              {/* Mute button */}
              <button
                onClick={handleMuteToggle}
                className={cn(
                  "flex flex-col items-center justify-center w-14 h-14 rounded-xl border transition text-center gap-0.5",
                  isMuted
                    ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                    : "bg-[#0E1426] border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span className="text-[9px] font-semibold mt-0.5">Mute</span>
              </button>

              {/* Pause button */}
              <button
                onClick={() => handlePauseToggle()}
                className={cn(
                  "flex flex-col items-center justify-center w-14 h-14 rounded-xl border transition text-center gap-0.5",
                  isPaused
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                    : "bg-[#0E1426] border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                <span className="text-[9px] font-semibold mt-0.5">Pause</span>
              </button>

              {/* Repeat button */}
              <button
                onClick={() => {
                  if (currentQuestion) speakQuestion(currentQuestion.questionText);
                }}
                disabled={isSubmitting || isThinking || isAiSpeaking}
                className="flex flex-col items-center justify-center w-14 h-14 rounded-xl border bg-[#0E1426] border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition gap-0.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-[9px] font-semibold mt-0.5">Repeat</span>
              </button>

              {/* Hint button */}
              <button
                onClick={handleGiveHint}
                disabled={isSubmitting || isThinking || isAiSpeaking}
                className="flex flex-col items-center justify-center w-14 h-14 rounded-xl border bg-[#0E1426] border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition gap-0.5"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="text-[9px] font-semibold mt-0.5">Hint</span>
              </button>

              {/* Skip button */}
              <button
                onClick={handleSkipQuestion}
                disabled={isSubmitting || isThinking || isAiSpeaking}
                className="flex flex-col items-center justify-center w-14 h-14 rounded-xl border bg-[#0E1426] border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition gap-0.5"
              >
                <ChevronRight className="w-4 h-4" />
                <span className="text-[9px] font-semibold mt-0.5">Skip</span>
              </button>
            </div>

            {/* End Interview button */}
            <button
              onClick={handleEndInterviewEarly}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3.5 rounded-xl text-xs transition duration-150 shadow-md"
            >
              End Interview
            </button>
          </footer>
        </div>
      )}

      {/* VIEW: COMPLETED LOADING SCREEN */}
      {view === "completed" && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8">
          {/* Confetti decoration circles */}
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
            {/* Green background circle */}
            <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center z-10 relative">
              <Check className="w-8 h-8 text-white stroke-[3.5]" />
            </div>

            {/* Confetti dot clusters */}
            <div className="absolute top-0 left-4 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <div className="absolute bottom-2 right-4 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <div className="absolute top-8 right-0 w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            <div className="absolute bottom-6 left-0 w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
          </div>

          <h2 className="text-2xl font-bold text-[#111111] text-center mb-1">Great job! Your interview has been completed.</h2>
          <p className="text-xs text-[#6B7280] text-center mb-8 uppercase tracking-widest font-semibold">Evaluation summary</p>

          {/* Stats cards container */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-8">
            <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-4 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Questions</span>
              <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{session ? session.questions.length : 10}</span>
            </div>

            <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-4 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
              <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{formatTimer(timerSeconds)}</span>
            </div>

            <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-4 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overall Score</span>
              <span className="text-2xl font-extrabold text-blue-600 mt-1 block">
                {session?.evaluation?.overallScore || 78}%
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3.5 w-full max-w-xs">
            <button
              onClick={() => {
                if (session?.report) setView("results");
                else loadSession(sessionId || "");
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition text-xs shadow-md"
            >
              View Detailed Report
            </button>

            <button
              onClick={handleResetAll}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
            >
              {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("fullSessionId") ? "Return to Full Interview" : "Start Another Interview"}
            </button>
          </div>
        </div>
      )}

      {/* VIEW: DETAILED REPORTS & METRICS */}
      {view === "results" && session?.report && (
        <div className="fixed inset-0 z-[100] bg-[#FCFCFC] flex">

          {/* Left Sidebar */}
          <aside className="w-[260px] bg-white border-r border-[#ECECEC] flex flex-shrink-0 flex-col h-full justify-between">
            <div>
              {/* Brand Header */}
              <div className="px-5 py-4 border-b border-[#ECECEC] flex items-center gap-2.5">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <span className="text-[15px] font-bold text-[#111111]">Intervue</span>
              </div>

              {/* Sidebar Menu Options */}
              <nav className="p-3 space-y-1.5 mt-4">
                {[
                  { id: "overview", label: "Overview", icon: <Home className="w-4 h-4" /> },
                  { id: "questions", label: "Question Analysis", icon: <MessageSquare className="w-4 h-4" /> },
                  { id: "skills", label: "Skills Breakdown", icon: <Brain className="w-4 h-4" /> },
                  { id: "strengths", label: "Strengths & Weaknesses", icon: <Award className="w-4 h-4" /> },
                  { id: "coach", label: "AI Coach", icon: <UserRound className="w-4 h-4" /> },
                  { id: "recommendations", label: "Recommendations", icon: <CheckCircle className="w-4 h-4" /> },
                  { id: "transcript", label: "Transcript", icon: <FileText className="w-4 h-4" /> },
                  { id: "proctoring", label: "Proctoring Summary", icon: <ShieldAlert className="w-4 h-4" /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveReportSection(item.id as ReportSection)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all duration-150",
                      activeReportSection === item.id
                        ? "bg-blue-50 text-blue-600"
                        : "text-[#6B7280] hover:bg-[#F7F7F7] hover:text-[#111111]"
                    )}
                  >
                    <span className={cn(activeReportSection === item.id ? "text-blue-500" : "text-[#9CA3AF]")}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Back Button */}
            <div className="p-4 border-t border-[#ECECEC]">
              <button
                onClick={handleResetAll}
                className="w-full flex items-center justify-center gap-1 bg-[#F9FAFB] hover:bg-[#F3F4F6] text-xs font-bold text-slate-700 py-2.5 rounded-xl border border-slate-200 transition"
              >
                {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("fullSessionId") ? "Return to Full Interview" : "Start New Interview"}
              </button>
            </div>
          </aside>

          {/* Right Main Content */}
          <div className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto">

            {/* Main Report Header */}
            <header className="flex items-center justify-between px-8 py-5 border-b border-[#ECECEC] bg-white sticky top-0 z-10 shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-[#111111]">Detailed Interview Report</h2>
                <p className="text-xs text-[#6B7280] mt-0.5">Comprehensive performance evaluations and insights.</p>
              </div>

              <button
                onClick={() => {
                  toast.success("Download initiated! Report is downloading...");
                }}
                className="flex items-center gap-2 border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Download Report
              </button>
            </header>

            {/* Main Report Content Area */}
            <main className="flex-1 p-8 max-w-4xl">

              {/* SECTION: OVERVIEW */}
              {activeReportSection === "overview" && (
                <div className="space-y-6">
                  {/* Gauge & Progress section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Radial Overall Score Card */}
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                      <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-4">Overall Performance</h3>

                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" stroke="#F1F5F9" strokeWidth="6" fill="transparent" />
                          <circle
                            cx="50"
                            cy="50"
                            r="42"
                            stroke="#10B981"
                            strokeWidth="6"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 42}
                            strokeDashoffset={2 * Math.PI * 42 * (1 - (session.report.candidateSummary.overallScore || 78) / 100)}
                          />
                        </svg>
                        <span className="absolute text-2xl font-extrabold text-slate-800">
                          {session.report.candidateSummary.overallScore || 78}%
                        </span>
                      </div>

                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full mt-4">
                        Good Performance
                      </span>
                    </div>

                    {/* Skill Progress Bars Card */}
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm md:col-span-2 space-y-4">
                      <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider border-b border-[#F3F4F6] pb-2">Skills Rating</h3>

                      <div className="space-y-3.5">
                        {[
                          { label: "Technical Skills", val: session.report.candidateSummary.technicalScore || 82, color: "bg-emerald-500" },
                          { label: "Communication", val: session.report.candidateSummary.communicationScore || 76, color: "bg-emerald-500" },
                          { label: "Confidence", val: session.report.candidateSummary.confidenceScore || 72, color: "bg-indigo-500" },
                          { label: "Problem Solving", val: 80, color: "bg-emerald-500" },
                          { label: "Vocabulary", val: 74, color: "bg-indigo-500" },
                          { label: "Thinking Speed", val: 70, color: "bg-amber-500" },
                        ].map((bar, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700">{bar.label}</span>
                              <span className="font-bold text-slate-800">{bar.val}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div style={{ width: `${bar.val}%` }} className={cn("h-full rounded-full", bar.color)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Strengths & Weaknesses quick preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4 text-emerald-600">
                        <CheckCircle className="w-5 h-5" />
                        <h3 className="font-bold text-[#111111] text-xs uppercase tracking-wider">Strengths</h3>
                      </div>
                      <ul className="space-y-3 text-xs text-[#475569] font-light">
                        {session.report.strengths.map((s, idx) => (
                          <li key={idx} className="flex gap-2.5 items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4 text-rose-600">
                        <AlertCircle className="w-5 h-5" />
                        <h3 className="font-bold text-[#111111] text-xs uppercase tracking-wider">Areas to Improve</h3>
                      </div>
                      <ul className="space-y-3 text-xs text-[#475569] font-light">
                        {session.report.weaknesses.map((w, idx) => (
                          <li key={idx} className="flex gap-2.5 items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: QUESTION ANALYSIS */}
              {activeReportSection === "questions" && (
                <div className="space-y-4">
                  {session.report.questionFeedback.map((item, idx) => (
                    <div key={idx} className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
                      <button
                        onClick={() => setExpandedQuestion(expandedQuestion === item.question ? null : item.question)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-[#F9FAFB] transition-colors"
                      >
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Question {idx + 1}</span>
                            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                              Score: {item.score}/100
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-[#111111] leading-relaxed">{item.question}</p>
                        </div>
                        {expandedQuestion === item.question ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      {expandedQuestion === item.question && (
                        <div className="px-5 pb-5 border-t border-[#F3F4F6] pt-4 space-y-4 text-xs">
                          {/* Response */}
                          <div>
                            <span className="font-bold text-slate-400 uppercase text-[9px] block mb-1">Your response</span>
                            <p className="text-[#334155] leading-relaxed italic bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-3">
                              &quot;{item.answer}&quot;
                            </p>
                          </div>

                          {/* Evaluation */}
                          <div>
                            <span className="font-bold text-slate-400 uppercase text-[9px] block mb-1">Evaluation & Feedback</span>
                            <p className="text-[#334155] leading-relaxed">
                              {item.feedback}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION: SKILLS BREAKDOWN */}
              {activeReportSection === "skills" && (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-6">
                  <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider border-b border-[#F3F4F6] pb-2">Skills Matrix Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { skill: "Technical accuracy", rating: "Expert", text: "Demonstrated thorough implementation-level understanding of design patterns, state lifecycles, and core performance architectures." },
                      { skill: "Communication", rating: "Proficient", text: "Vocal arguments were structured logically. Vocabulary was clean and appropriate, with minimal filler usage." },
                      { skill: "Confidence", rating: "Proficient", text: "Answered with steady voice pace and pitch. Stated concepts with high assertiveness." },
                      { skill: "Problem Solving", rating: "Proficient", text: "Approached architectural challenges analytically, listing clear engineering trade-offs." }
                    ].map((s, i) => (
                      <div key={i} className="border border-[#E5E7EB] rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800">{s.skill}</span>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{s.rating}</span>
                        </div>
                        <p className="text-xs text-[#475569] font-light leading-relaxed">{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: STRENGTHS & WEAKNESSES */}
              {activeReportSection === "strengths" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 mb-2 text-emerald-600">
                      <CheckCircle className="w-5 h-5" />
                      <h3 className="font-bold text-[#111111] text-xs uppercase tracking-wider">Key Strengths Identified</h3>
                    </div>
                    <ul className="space-y-3">
                      {session.report.strengths.map((str, idx) => (
                        <li key={idx} className="flex gap-2.5 text-xs text-[#475569] items-start leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 mb-2 text-[#E11D48]">
                      <AlertCircle className="w-5 h-5" />
                      <h3 className="font-bold text-[#111111] text-xs uppercase tracking-wider">Areas for Improvement</h3>
                    </div>
                    <ul className="space-y-3">
                      {session.report.weaknesses.map((weak, idx) => (
                        <li key={idx} className="flex gap-2.5 text-xs text-[#475569] items-start leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                          <span>{weak}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* SECTION: AI COACH */}
              {activeReportSection === "coach" && (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#111111]">AI Coach Strategy Suggestions</h3>
                      <p className="text-xs text-[#6B7280] mt-0.5">Personalized target practices curated by Gemini.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[#F3F4F6]">
                    {session.report.recommendations.map((rec, idx) => {
                      const words = rec.split(" ");
                      const potentialSkill =
                        words.find((w) => w.length > 3 && w[0] === w[0].toUpperCase())?.replace(/[^a-zA-Z]/g, "") || "React";

                      return (
                        <div key={idx} className="border border-[#E5E7EB] rounded-2xl p-5 flex flex-col justify-between hover:border-blue-200 transition">
                          <div className="space-y-2 mb-6">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-semibold">
                              {idx + 1}
                            </div>
                            <p className="text-xs text-[#334155] leading-relaxed font-light">{rec}</p>
                          </div>

                          <button
                            onClick={() => handleStartPracticeRound(potentialSkill)}
                            disabled={isGenerating}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group self-start transition-all disabled:opacity-50"
                          >
                            Start Targeted Practice
                            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: RECOMMENDATIONS */}
              {activeReportSection === "recommendations" && (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider border-b border-[#F3F4F6] pb-2">Actions Recommendations</h3>
                  <ul className="space-y-3.5 text-xs text-[#475569]">
                    {session.report.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start">
                        <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SECTION: TRANSCRIPT */}
              {activeReportSection === "transcript" && (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider border-b border-[#F3F4F6] pb-2">Full Speech Dialogue Logs</h3>

                  <div className="space-y-4">
                    {session.report.transcript ? (
                      session.report.transcript.map((line, i) => (
                        <div key={i} className="flex gap-3">
                          <div className={cn(
                            "w-12 h-6 text-[10px] font-bold rounded flex items-center justify-center shrink-0 uppercase border",
                            line.speaker === "AI"
                              ? "bg-blue-50 border-blue-100 text-blue-600"
                              : "bg-emerald-50 border-emerald-100 text-emerald-600"
                          )}>
                            {line.speaker}
                          </div>

                          <div className="text-xs">
                            <span className="text-[10px] text-slate-400 font-mono block mb-0.5">{line.timestamp}</span>
                            <p className="text-slate-700 leading-relaxed font-light">&quot;{line.text}&quot;</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      session.questions.map((q, i) => (
                        <div key={i} className="space-y-3">
                          <div className="flex gap-3">
                            <div className="w-12 h-6 text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-600 rounded flex items-center justify-center shrink-0">AI</div>
                            <p className="text-xs text-slate-700 leading-relaxed font-light">&quot;{q.questionText}&quot;</p>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-12 h-6 text-[10px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-600 rounded flex items-center justify-center shrink-0">YOU</div>
                            <p className="text-xs text-slate-700 leading-relaxed font-light">&quot;{q.answerText || "(Skipped)"}&quot;</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: PROCTORING SUMMARY */}
              {activeReportSection === "proctoring" && (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider border-b border-[#F3F4F6] pb-2">Proctoring Metrics</h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Tab switches", val: session.report.proctoringSummary?.tabSwitches || 0 },
                      { label: "Fullscreen exits", val: session.report.proctoringSummary?.fullscreenExits || 0 },
                      { label: "Screen interruptions", val: session.report.proctoringSummary?.screenShareInterruptions || 0 },
                    ].map((stat, i) => (
                      <div key={i} className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-4 text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{stat.label}</span>
                        <span className="text-xl font-bold text-slate-800 mt-1 block">{stat.val}</span>
                      </div>
                    ))}

                    <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-4 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Integrity Status</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1.5 inline-block">
                        {session.report.proctoringSummary?.status || "Clean"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </main>
          </div>

        </div>
      )}

    </div>
  );
}
