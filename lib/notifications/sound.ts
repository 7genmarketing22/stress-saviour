/** Shared notification chime served from /public/bell.wav */

const BELL_SRC = "/bell.wav";

let audio: HTMLAudioElement | null = null;
let unlocked = false;
let lastPlayedAt = 0;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio(BELL_SRC);
    audio.preload = "auto";
    audio.volume = 0.85;
  }
  return audio;
}

/**
 * Call after a user gesture (e.g. enabling notifications) so later
 * autoplay of the chime is allowed on desktop + mobile browsers.
 */
export async function unlockNotificationSound(): Promise<void> {
  const el = getAudio();
  if (!el) return;
  try {
    el.muted = true;
    await el.play();
    el.pause();
    el.currentTime = 0;
    el.muted = false;
    unlocked = true;
  } catch {
    // Still attempt play later; some browsers unlock on first successful play.
  }
}

/** Play the bell chime for a new message / notification (best-effort). */
export function playNotificationSound(): void {
  const now = Date.now();
  // Avoid double-play when realtime + push both fire within ~1s.
  if (now - lastPlayedAt < 900) return;
  lastPlayedAt = now;

  const el = getAudio();
  if (!el) return;

  const run = async () => {
    try {
      el.pause();
      el.currentTime = 0;
      el.muted = false;
      await el.play();
      unlocked = true;
    } catch {
      // Autoplay blocked until a user gesture unlocks audio.
      if (!unlocked) return;
    }
  };

  void run();
}

export const NOTIFICATION_SOUND_URL = BELL_SRC;
