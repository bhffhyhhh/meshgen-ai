import { Mic, MicOff, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// SpeechRecognition browser API typing shim
// ---------------------------------------------------------------------------
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// ---------------------------------------------------------------------------
// VoiceTab props
// ---------------------------------------------------------------------------
interface VoiceTabProps {
  /** Latest AI response text — auto-spoken when it changes */
  latestAiResponse?: string;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function VoiceTab({ latestAiResponse }: VoiceTabProps) {
  const SpeechRecognitionClass = getSpeechRecognition();
  const isSupported = !!SpeechRecognitionClass;

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<"idle" | "listening" | "sending">(
    "idle",
  );
  const [volume, setVolume] = useState(0.85);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const spokenResponseRef = useRef<string>("");

  // Auto-speak new AI responses
  useEffect(() => {
    if (
      latestAiResponse &&
      latestAiResponse !== spokenResponseRef.current &&
      window.speechSynthesis
    ) {
      spokenResponseRef.current = latestAiResponse;
      const utterance = new SpeechSynthesisUtterance(latestAiResponse);
      utterance.volume = volume;
      utterance.rate = 0.95;
      utterance.pitch = 0.9;
      // Prefer a clear female voice for F.R.I.D.A.Y.
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.name.toLowerCase().includes("google") &&
          v.name.toLowerCase().includes("female"),
      );
      if (preferred) utterance.voice = preferred;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, [latestAiResponse, volume]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    setStatus("idle");
  }, []);

  const dispatchVoiceInput = useCallback((text: string) => {
    if (!text.trim()) return;
    setStatus("sending");
    window.dispatchEvent(
      new CustomEvent("voice-input", { detail: { text: text.trim() } }),
    );
    setTimeout(() => {
      setStatus("idle");
      setTranscript("");
    }, 1200);
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    let interimTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      interimTranscript = interim;
      const combined = (final + interim).trim();
      setTranscript(combined);
      if (final.trim()) {
        interimTranscript = "";
        dispatchVoiceInput(final.trim());
        stopListening();
      }
    };

    recognition.onend = () => {
      if (interimTranscript) {
        dispatchVoiceInput(interimTranscript);
      }
      setListening(false);
      setStatus("idle");
    };

    recognition.onerror = () => {
      stopListening();
    };

    recognition.start();
    setListening(true);
    setStatus("listening");
    setTranscript("");
  }, [SpeechRecognitionClass, dispatchVoiceInput, stopListening]);

  const handleMicClick = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, stopListening, startListening]);

  // Status badge
  const statusBadge =
    status === "listening" ? (
      <span className="text-[8px] font-mono tracking-widest uppercase border rounded px-1.5 py-px text-red-400 border-red-500/60 bg-red-500/15 animate-pulse">
        LISTENING...
      </span>
    ) : status === "sending" ? (
      <span className="text-[8px] font-mono tracking-widest uppercase border rounded px-1.5 py-px text-amber-400 border-amber-400/60 bg-amber-400/15 animate-pulse">
        SENDING TO FRIDAY...
      </span>
    ) : null;

  return (
    <div
      className="hud-panel scan-line rounded-lg p-3 flex flex-col relative overflow-hidden"
      data-ocid="voice-tab.panel"
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40 rounded-tl-lg pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/40 rounded-tr-lg pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/30 rounded-bl-lg pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/30 rounded-br-lg pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-1 h-4 rounded-full ${listening ? "bg-red-400 shadow-[0_0_6px_red]" : "bg-primary/50"}`}
          />
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold text-primary/70">
            VOICE LINK
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isSupported ? (
            <span className="text-[8px] font-mono tracking-widest text-green-400/70 uppercase">
              ● ACTIVE
            </span>
          ) : (
            <span className="text-[8px] font-mono tracking-widest text-muted-foreground/40 uppercase">
              ○ OFFLINE
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-1 mb-2.5">
        <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
        <Mic className="w-2.5 h-2.5 text-primary/40" />
        <div className="flex-1 h-px bg-gradient-to-l from-primary/30 to-transparent" />
      </div>

      {!isSupported ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <MicOff className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-[10px] font-mono text-muted-foreground/50 leading-relaxed">
            Voice input not supported in this browser.
            <br />
            Use text input instead.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mic button + status */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleMicClick}
              aria-label={listening ? "Stop listening" : "Start voice input"}
              data-ocid="voice-tab.mic_button"
              className={`
                relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                ${
                  listening
                    ? "border-red-500/80 bg-red-500/20 text-red-400 voice-listening shadow-[0_0_16px_oklch(0.55_0.22_25/0.5)]"
                    : "border-primary/60 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/80 hover:shadow-[0_0_12px_oklch(var(--primary)/0.4)]"
                }
              `}
            >
              {listening ? (
                <Mic className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
              {listening && (
                <span className="absolute inset-0 rounded-full border border-red-500/40 animate-ping" />
              )}
            </button>

            <div className="flex flex-col gap-1">
              {statusBadge ?? (
                <span className="text-[9px] font-mono text-muted-foreground/40 tracking-wider">
                  {listening ? "Tap to stop" : "Tap to speak"}
                </span>
              )}
            </div>
          </div>

          {/* Transcript display */}
          <div
            className="hud-panel rounded p-2 min-h-[40px] max-h-20 overflow-hidden"
            data-ocid="voice-tab.transcript"
          >
            {transcript ? (
              <p className="text-[10px] font-mono text-foreground/80 leading-relaxed break-words">
                {transcript}
                {listening && (
                  <span className="inline-block w-1 h-3 ml-0.5 bg-primary/70 animate-pulse align-middle" />
                )}
              </p>
            ) : (
              <p className="text-[10px] font-mono text-muted-foreground/30 tracking-wider italic">
                {listening
                  ? "Listening for speech..."
                  : "Transcript appears here"}
              </p>
            )}
          </div>

          {/* Volume control */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-3 h-3 text-muted-foreground/40" />
                <label
                  htmlFor="voice-volume"
                  className="text-[9px] font-mono text-muted-foreground/50 tracking-widest uppercase"
                >
                  RESPONSE VOLUME
                </label>
              </div>
              <span className="text-[9px] font-mono text-primary/50 tabular-nums">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              id="voice-volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              data-ocid="voice-tab.volume_slider"
              className="w-full h-1 rounded-full appearance-none cursor-pointer bg-border/30"
              style={{
                accentColor: "oklch(var(--primary))",
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-border/20">
        <div
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isSupported
              ? listening
                ? "bg-red-400 animate-pulse"
                : "bg-green-400/60 animate-pulse"
              : "bg-muted-foreground/20"
          }`}
        />
        <span className="text-[9px] font-mono text-muted-foreground/40 tracking-widest truncate">
          {isSupported
            ? listening
              ? "VOICE LINK ACTIVE · RECEIVING"
              : "VOICE LINK ACTIVE · STANDBY"
            : "VOICE LINK OFFLINE"}
        </span>
      </div>
    </div>
  );
}
