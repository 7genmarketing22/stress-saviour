"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Clock, Loader2, PhoneOff, ShieldCheck, Video, XCircle } from "lucide-react";

interface JoinInfo {
  domain: string;
  room: string;
  jwt: string | null;
  jwtConfigured: boolean;
  role: "moderator" | "participant";
  displayName: string;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  doctorName: string;
  patientName: string;
}

type Phase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "too_early"; opensAt: string; message: string }
  | { kind: "waiting_for_doctor"; info: JoinInfo }
  | { kind: "in_call"; info: JoinInfo };

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    JitsiMeetExternalAPI?: any;
  }
}

function loadJitsiScript(domain: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve();
    const script = document.createElement("script");
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the video library."));
    document.body.appendChild(script);
  });
}

export default function VideoConsultationPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const requestJoin = useCallback(async (): Promise<
    | { ok: true; info: JoinInfo }
    | { ok: false; status: number; error: string; message?: string; opensAt?: string }
  > => {
    const res = await fetch("/api/video/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId }),
    });
    const body = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: body.error ?? "Failed to join",
        message: body.message,
        opensAt: body.opensAt,
      };
    }
    return { ok: true, info: body as JoinInfo };
  }, [appointmentId]);

  const enterCall = useCallback(
    async (info: JoinInfo) => {
      try {
        await loadJitsiScript(info.domain);
      } catch {
        setPhase({ kind: "error", message: "Could not load the video client. Check your connection and retry." });
        return;
      }
      setPhase({ kind: "in_call", info });
    },
    []
  );

  // Initial join attempt.
  useEffect(() => {
    let stopped = false;
    (async () => {
      const result = await requestJoin();
      if (stopped) return;
      if (!result.ok) {
        if (result.status === 401) {
          const returnTo = `/video/${appointmentId}`;
          router.replace(`/login?redirect=${encodeURIComponent(returnTo)}`);
          return;
        }
        if (result.status === 425 && result.opensAt) {
          setPhase({ kind: "too_early", opensAt: result.opensAt, message: result.message ?? "" });
        } else {
          setPhase({ kind: "error", message: result.message ?? result.error });
        }
        return;
      }
      const info = result.info;
      // Patient waits until the doctor has started the session.
      if (info.role === "participant" && info.status !== "ongoing" && info.status !== "completed") {
        setPhase({ kind: "waiting_for_doctor", info });
      } else {
        enterCall(info);
      }
    })();
    return () => {
      stopped = true;
    };
  }, [requestJoin, enterCall, appointmentId, router]);

  // Waiting room: poll until the doctor starts the meeting (or cancels).
  useEffect(() => {
    if (phase.kind !== "waiting_for_doctor") return;
    pollRef.current = setInterval(async () => {
      const result = await requestJoin();
      if (!result.ok) {
        if (pollRef.current) clearInterval(pollRef.current);
        setPhase({
          kind: "error",
          message: result.message ?? result.error ?? "This appointment is no longer available.",
        });
        return;
      }
      if (result.info.status === "ongoing") {
        if (pollRef.current) clearInterval(pollRef.current);
        enterCall(result.info);
      }
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase.kind, requestJoin, enterCall]);

  const leaveToDashboard = useCallback(
    (role: "moderator" | "participant") => {
      router.push(role === "moderator" ? "/doctor/appointments" : "/patient/appointments");
    },
    [router]
  );

  // Mount the Jitsi iframe once in-call.
  useEffect(() => {
    if (phase.kind !== "in_call" || !containerRef.current || !window.JitsiMeetExternalAPI) return;
    const { info } = phase;

    const api = new window.JitsiMeetExternalAPI(info.domain, {
      roomName: info.room,
      parentNode: containerRef.current,
      ...(info.jwt ? { jwt: info.jwt } : {}),
      userInfo: { displayName: info.displayName },
      configOverwrite: {
        prejoinConfig: { enabled: false },
        disableDeepLinking: true,
        startWithAudioMuted: false,
        subject: `Consultation — ${info.doctorName} / ${info.patientName}`,
        // Without JWT auth the lobby would show a moderator prompt; keep it off.
        enableLobbyChat: false,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        MOBILE_APP_PROMO: false,
      },
    });
    apiRef.current = api;

    api.addListener("videoConferenceJoined", async () => {
      // The doctor owns lobby control. Patients enter as non-moderators and
      // remain in Jitsi's lobby until the doctor admits them.
      if (info.role === "moderator") {
        api.executeCommand("toggleLobby", true);
        const started = await fetch("/api/video/started", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId }),
        });
        if (!started.ok) {
          setPhase({
            kind: "error",
            message:
              "The consultation opened, but its status could not be updated. Please return to appointments and try again.",
          });
        }
      }
    });
    api.addListener(
      "errorOccurred",
      (error: { type?: string; message?: string }) => {
        const text = `${error?.type ?? ""} ${error?.message ?? ""}`.toLowerCase();
        const isAuthError =
          text.includes("auth") ||
          text.includes("token") ||
          text.includes("expired") ||
          text.includes("not allowed");
        setPhase({
          kind: "error",
          message: isAuthError
            ? "This meeting link has expired or is invalid. Return to your appointments and join again to get a fresh link."
            : "The video connection failed. Check your connection and try joining again.",
        });
      }
    );
    api.addListener("readyToClose", () => leaveToDashboard(info.role));
    api.addListener("videoConferenceLeft", () => leaveToDashboard(info.role));

    return () => {
      api.dispose();
      apiRef.current = null;
    };
  }, [phase, leaveToDashboard, appointmentId]);

  if (phase.kind === "loading") {
    return (
      <Shell>
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        <p className="text-sm text-slate-300 mt-4">Preparing your secure consultation room…</p>
      </Shell>
    );
  }

  if (phase.kind === "too_early") {
    const opens = new Date(phase.opensAt);
    return (
      <Shell>
        <Clock className="h-10 w-10 text-amber-400" />
        <h1 className="text-lg font-bold text-white mt-4">The room isn't open yet</h1>
        <p className="text-sm text-slate-300 mt-2 max-w-sm text-center">{phase.message}</p>
        <p className="text-xs text-slate-400 mt-2">
          Opens at {opens.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <Button className="mt-6" variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </Shell>
    );
  }

  if (phase.kind === "error") {
    return (
      <Shell>
        <XCircle className="h-10 w-10 text-rose-400" />
        <h1 className="text-lg font-bold text-white mt-4">Unable to join</h1>
        <p className="text-sm text-slate-300 mt-2 max-w-sm text-center">{phase.message}</p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Go back
          </Button>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </Shell>
    );
  }

  if (phase.kind === "waiting_for_doctor") {
    return (
      <Shell>
        <div className="relative">
          <Video className="h-10 w-10 text-brand-400" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500" />
          </span>
        </div>
        <h1 className="text-lg font-bold text-white mt-4">
          Waiting for {phase.info.doctorName} to start the consultation…
        </h1>
        <p className="text-sm text-slate-300 mt-2 max-w-sm text-center">
          You'll be connected automatically as soon as your doctor opens the room. Keep this
          page open.
        </p>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-4">
          <ShieldCheck className="h-3.5 w-3.5" />
          Private, encrypted room — only you and your doctor can join.
        </div>
        <Button className="mt-6" variant="outline" onClick={() => leaveToDashboard("participant")}>
          <PhoneOff className="h-4 w-4 mr-2" />
          Leave waiting room
        </Button>
      </Shell>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-semibold uppercase tracking-wider">Live consultation</span>
          <span className="text-slate-500">
            {phase.info.doctorName} / {phase.info.patientName}
          </span>
          {!phase.info.jwtConfigured && (
            <span className="hidden sm:inline rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              Host login may appear — configure Jitsi JWT for seamless join
            </span>
          )}
        </div>
        <Button
          size="sm"
          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold h-8"
          onClick={() => {
            apiRef.current?.executeCommand("hangup");
            leaveToDashboard(phase.info.role);
          }}
        >
          <PhoneOff className="h-3.5 w-3.5 mr-1.5" />
          {phase.info.role === "moderator" ? "End consultation" : "Leave"}
        </Button>
      </div>
      <div ref={containerRef} className="flex-1 [&>iframe]:h-full [&>iframe]:w-full" />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6">
      {children}
    </div>
  );
}
