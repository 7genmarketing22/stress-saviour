/** Shared notification chime served from /public/bell.wav */

const BELL_SRC = "/bell.wav";

let shared: HTMLAudioElement | null = null;
let unlocked = false;
let lastPlayedAt = 0;
let audioContext: AudioContext | null = null;

function getSharedAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!shared) {
    shared = new Audio(BELL_SRC);
    shared.preload = "auto";
    shared.volume = 0.9;
    // Helps some mobile browsers treat this as UI feedback rather than media.
    try {
      shared.setAttribute("playsinline", "true");
    } catch {
      // ignore
    }
  }
  return shared;
}

async function resumeAudioContext(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    if (!audioContext) {
      audioContext = new Ctx();
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
  } catch {
    // ignore
  }
}

/**
 * Call after a user gesture (e.g. enabling notifications) so later
 * autoplay of the chime is allowed on desktop + mobile browsers.
 */
export async function unlockNotificationSound(): Promise<void> {
  const el = getSharedAudio();
  if (!el) return;
  try {
    await resumeAudioContext();
    el.muted = true;
    el.volume = 0;
    await el.play();
    el.pause();
    el.currentTime = 0;
    el.muted = false;
    el.volume = 0.9;
    unlocked = true;
  } catch {
    // Still attempt play later; some browsers unlock on first successful play.
  }
}

/** Play the bell chime for a new message / notification (best-effort). */
export function playNotificationSound(): void {
  if (typeof window === "undefined") return;

  const now = Date.now();
  // Avoid double-play when realtime + push both fire within ~1s.
  if (now - lastPlayedAt < 900) return;
  lastPlayedAt = now;

  const run = async () => {
    try {
      await resumeAudioContext();
    } catch {
      // ignore
    }

    // Fresh Audio() is more reliable on mobile after backgrounding.
    try {
      const el = new Audio(BELL_SRC);
      el.volume = 0.9;
      try {
        el.setAttribute("playsinline", "true");
      } catch {
        // ignore
      }
      await el.play();
      unlocked = true;
      return;
    } catch {
      // fall through to shared element
    }

    const el = getSharedAudio();
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
      el.muted = false;
      el.volume = 0.9;
      await el.play();
      unlocked = true;
    } catch {
      if (!unlocked) return;
    }
  };

  void run();
}

export const NOTIFICATION_SOUND_URL = BELL_SRC;
