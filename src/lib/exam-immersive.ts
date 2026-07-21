/** Session flag so dashboard chrome stays hidden for the whole exam. */
const KEY = "e2e_exam_immersive";

export function setExamImmersive(active: boolean) {
  if (typeof window === "undefined") return;
  if (active) sessionStorage.setItem(KEY, "1");
  else sessionStorage.removeItem(KEY);
}

export function isExamImmersive(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(KEY) === "1";
}

export async function lockExamFullscreen(): Promise<boolean> {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
    document.body.classList.add("exam-fullscreen");
    document.documentElement.classList.add("exam-fullscreen");
    return Boolean(document.fullscreenElement);
  } catch {
    return Boolean(document.fullscreenElement);
  }
}

export function unlockExamFullscreen() {
  document.body.classList.remove("exam-fullscreen");
  document.documentElement.classList.remove("exam-fullscreen");
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}
