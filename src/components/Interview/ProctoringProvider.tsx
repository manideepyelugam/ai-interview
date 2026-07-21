"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

type Perms = { camera: boolean; mic: boolean; screen: boolean };

type StoredProctor = {
  camera: MediaStream | null;
  mic: MediaStream | null;
  screen: MediaStream | null;
  perms: Perms;
};

/**
 * Module-level store so React Strict Mode remounts / soft navigations
 * do NOT kill live tracks or force a second permission prompt.
 */
const store: StoredProctor = {
  camera: null,
  mic: null,
  screen: null,
  perms: { camera: false, mic: false, screen: false },
};

function trackLive(stream: MediaStream | null) {
  return Boolean(stream?.getTracks().some((t) => t.readyState === "live"));
}

function isEntireScreen(track: MediaStreamTrack): boolean {
  const settings = track.getSettings() as MediaTrackSettings & {
    displaySurface?: string;
  };
  // Chrome/Edge: "monitor" = entire screen; "window" / "browser" = app or tab
  const surface = settings.displaySurface;
  if (!surface) {
    // Safari/Firefox may omit — accept but warn
    return true;
  }
  return surface === "monitor";
}

type ProctoringContextValue = {
  perms: Perms;
  cameraStream: MediaStream | null;
  micStream: MediaStream | null;
  screenStream: MediaStream | null;
  isReady: boolean;
  requestDevices: () => Promise<boolean>;
  requestScreenShare: () => Promise<boolean>;
  enterFullscreen: () => Promise<void>;
  stopAll: () => void;
  setScreenEndedHandler: (fn: (() => void) | null) => void;
};

const ProctoringContext = createContext<ProctoringContextValue | null>(null);

export function ProctoringProvider({ children }: { children: ReactNode }) {
  const [perms, setPerms] = useState<Perms>(store.perms);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(store.camera);
  const [micStream, setMicStream] = useState<MediaStream | null>(store.mic);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(store.screen);
  const screenEndedHandlerRef = useRef<(() => void) | null>(null);

  // Hydrate from module store on mount (survives Strict Mode remount)
  useEffect(() => {
    setCameraStream(store.camera);
    setMicStream(store.mic);
    setScreenStream(store.screen);
    setPerms({
      camera: trackLive(store.camera),
      mic: trackLive(store.mic),
      screen: trackLive(store.screen),
    });
    // Do NOT stop tracks on unmount — only stopAll() should.
  }, []);

  const syncPerms = useCallback(() => {
    const next = {
      camera: trackLive(store.camera),
      mic: trackLive(store.mic),
      screen: trackLive(store.screen),
    };
    store.perms = next;
    setPerms(next);
  }, []);

  const stopAll = useCallback(() => {
    store.camera?.getTracks().forEach((t) => t.stop());
    store.mic?.getTracks().forEach((t) => t.stop());
    store.screen?.getTracks().forEach((t) => t.stop());
    store.camera = null;
    store.mic = null;
    store.screen = null;
    store.perms = { camera: false, mic: false, screen: false };
    setCameraStream(null);
    setMicStream(null);
    setScreenStream(null);
    setPerms({ camera: false, mic: false, screen: false });
  }, []);

  const requestDevices = useCallback(async () => {
    try {
      if (trackLive(store.camera) && trackLive(store.mic)) {
        setCameraStream(store.camera);
        setMicStream(store.mic);
        syncPerms();
        return true;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      const cam = new MediaStream([stream.getVideoTracks()[0]]);
      const mic = new MediaStream([stream.getAudioTracks()[0]]);
      store.camera = cam;
      store.mic = mic;
      setCameraStream(cam);
      setMicStream(mic);
      syncPerms();
      toast.success("Camera and microphone connected.");
      return true;
    } catch {
      toast.error("Please allow camera and microphone access.");
      return false;
    }
  }, [syncPerms]);

  const requestScreenShare = useCallback(async () => {
    try {
      if (trackLive(store.screen)) {
        setScreenStream(store.screen);
        syncPerms();
        return true;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: false,
        preferCurrentTab: false,
        selfBrowserSurface: "exclude",
        systemAudio: "exclude",
      } as MediaStreamConstraints);

      const track = stream.getVideoTracks()[0];
      if (!isEntireScreen(track)) {
        track.stop();
        stream.getTracks().forEach((t) => t.stop());
        toast.error(
          "Entire screen share is required. Sharing only a tab or window is not allowed — please select your full screen."
        );
        return false;
      }

      store.screen = stream;
      setScreenStream(stream);
      syncPerms();
      track.onended = () => {
        store.screen = null;
        setScreenStream(null);
        syncPerms();
        screenEndedHandlerRef.current?.();
      };
      toast.success("Entire screen sharing enabled.");
      return true;
    } catch {
      toast.error("Entire screen share is required for this interview.");
      return false;
    }
  }, [syncPerms]);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen rejected:", err);
    }
  }, []);

  const setScreenEndedHandler = useCallback((fn: (() => void) | null) => {
    screenEndedHandlerRef.current = fn;
  }, []);

  const isReady =
    trackLive(cameraStream) && trackLive(micStream) && trackLive(screenStream);

  const value = useMemo(
    () => ({
      perms,
      cameraStream,
      micStream,
      screenStream,
      isReady,
      requestDevices,
      requestScreenShare,
      enterFullscreen,
      stopAll,
      setScreenEndedHandler,
    }),
    [
      perms,
      cameraStream,
      micStream,
      screenStream,
      isReady,
      requestDevices,
      requestScreenShare,
      enterFullscreen,
      stopAll,
      setScreenEndedHandler,
    ]
  );

  return (
    <ProctoringContext.Provider value={value}>{children}</ProctoringContext.Provider>
  );
}

export function useProctoring() {
  const ctx = useContext(ProctoringContext);
  if (!ctx) {
    throw new Error("useProctoring must be used within ProctoringProvider");
  }
  return ctx;
}

export function useProctoringOptional() {
  return useContext(ProctoringContext);
}
