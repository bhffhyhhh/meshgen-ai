import {
  useCheckQuota,
  useGetRecentEvents,
  useIncrementVideo,
} from "@/hooks/useChat";
import type { NewsEvent } from "@/types/chat";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lock,
  Pause,
  Play,
  Radio,
  Shield,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  hasVideo: boolean;
  source?: string;
}

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type SlideType =
  | "title"
  | "overview"
  | "analysis"
  | "details"
  | "end"
  | "event";

interface Slide {
  id: number;
  type: SlideType;
  heading: string;
  bullets?: string[];
  body?: string;
  meta?: string;
  risk?: RiskLevel;
  imageUrl?: string | null;
  sourceUrl?: string;
  country?: string;
  severity?: RiskLevel;
}

// ---------------------------------------------------------------------------
// Risk assessment
// ---------------------------------------------------------------------------
const CRITICAL_KW = [
  "nuclear",
  "missile",
  "attack",
  "war",
  "killed",
  "dead",
  "explosion",
  "terror",
];
const HIGH_KW = [
  "earthquake",
  "crisis",
  "emergency",
  "disaster",
  "flood",
  "outbreak",
  "breach",
  "hack",
  "collapse",
  "fire",
];
const MEDIUM_KW = [
  "protest",
  "conflict",
  "threat",
  "arrest",
  "storm",
  "strike",
  "sanctions",
  "tension",
];

function assessRisk(title: string, desc: string): RiskLevel {
  const text = `${title} ${desc}`.toLowerCase();
  if (CRITICAL_KW.some((kw) => text.includes(kw))) return "CRITICAL";
  if (HIGH_KW.some((kw) => text.includes(kw))) return "HIGH";
  if (MEDIUM_KW.some((kw) => text.includes(kw))) return "MEDIUM";
  return "LOW";
}

const RISK_CONFIG: Record<
  RiskLevel,
  { color: string; glow: string; label: string }
> = {
  LOW: {
    color: "text-emerald-400",
    glow: "shadow-[0_0_12px_theme(colors.emerald.400/0.5)]",
    label: "LOW RISK",
  },
  MEDIUM: {
    color: "text-yellow-400",
    glow: "shadow-[0_0_12px_theme(colors.yellow.400/0.5)]",
    label: "MEDIUM RISK",
  },
  HIGH: {
    color: "text-orange-400",
    glow: "shadow-[0_0_12px_theme(colors.orange.400/0.5)]",
    label: "HIGH RISK",
  },
  CRITICAL: {
    color: "text-red-400",
    glow: "shadow-[0_0_16px_theme(colors.red.400/0.7)]",
    label: "CRITICAL THREAT",
  },
};

const SEVERITY_CSS: Record<RiskLevel, string> = {
  CRITICAL: "badge-critical",
  HIGH: "badge-high",
  MEDIUM: "badge-medium",
  LOW: "badge-low",
};

// ---------------------------------------------------------------------------
// Slide builders
// ---------------------------------------------------------------------------
function splitIntoBullets(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 10);
  if (sentences.length >= 3) return sentences.slice(0, 4);
  const chunks: string[] = [];
  const words = text.split(" ");
  for (let i = 0; i < words.length; i += Math.ceil(words.length / 3)) {
    chunks.push(words.slice(i, i + Math.ceil(words.length / 3)).join(" "));
  }
  return chunks.filter(Boolean).slice(0, 4);
}

function buildSlides(article: NewsArticle): Slide[] {
  const risk = assessRisk(article.title, article.description ?? "");
  const sourceLabel = article.source ?? "UNKNOWN SOURCE";
  const pubDate = (() => {
    try {
      return new Date(article.publishedAt).toUTCString();
    } catch {
      return article.publishedAt;
    }
  })();
  const desc =
    article.description ??
    "No additional details available from current intelligence stream.";
  const bullets = splitIntoBullets(desc);
  const analysisText =
    risk === "CRITICAL" || risk === "HIGH"
      ? `F.R.I.D.A.Y. has flagged this as a priority event. Situation is being actively monitored. Cross-referencing with ${sourceLabel} intelligence streams. Recommend immediate review.`
      : "Event is currently under standard F.R.I.D.A.Y. observation protocols. No immediate escalation required. Monitoring frequency: 15 minutes. Source reliability: nominal.";

  return [
    {
      id: 1,
      type: "title",
      heading: article.title,
      meta: `${sourceLabel}  ·  ${pubDate}`,
      imageUrl: article.image || null,
    },
    { id: 2, type: "overview", heading: "SITUATION OVERVIEW", bullets },
    {
      id: 3,
      type: "analysis",
      heading: "THREAT ASSESSMENT",
      risk,
      body: analysisText,
    },
    {
      id: 4,
      type: "details",
      heading: "OPERATIONAL DETAILS",
      bullets: [
        `Source: ${sourceLabel}`,
        `Published: ${pubDate}`,
        `Classification: ${risk} PRIORITY`,
        "Intel stream: F.R.I.D.A.Y. GLOBAL MONITOR",
      ],
    },
    {
      id: 5,
      type: "end",
      heading: "BRIEFING COMPLETE",
      sourceUrl: article.url,
    },
  ];
}

function buildGlobalBriefingSlides(events: NewsEvent[]): Slide[] {
  const top3 = events.slice(0, 3);
  const slides: Slide[] = [
    {
      id: 1,
      type: "title",
      heading: "FRIDAY GLOBAL INTELLIGENCE BRIEFING",
      meta: `${new Date().toUTCString()}  ·  ${top3.length} ACTIVE EVENTS`,
      imageUrl: null,
    },
  ];

  top3.forEach((ev, i) => {
    slides.push({
      id: i + 2,
      type: "event",
      heading: ev.title,
      body:
        ev.description.slice(0, 120) + (ev.description.length > 120 ? "…" : ""),
      meta: ev.source.toUpperCase(),
      country: ev.country || "GLOBAL",
      severity: ev.severity as RiskLevel,
    });
  });

  slides.push({
    id: top3.length + 2,
    type: "end",
    heading: "BRIEFING COMPLETE",
  });

  return slides;
}

// ---------------------------------------------------------------------------
// Voice picker
// ---------------------------------------------------------------------------
function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.name.toLowerCase().includes("female")) ||
    voices.find((v) =>
      /samantha|victoria|karen|moira|fiona|zira/i.test(v.name),
    ) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    null
  );
}

// ---------------------------------------------------------------------------
// Slide narration
// ---------------------------------------------------------------------------
function slideNarration(slide: Slide): string {
  switch (slide.type) {
    case "title":
      return `Intel briefing. ${slide.heading}. Source: ${slide.meta ?? "unknown"}.`;
    case "overview":
      return `Situation overview. ${(slide.bullets ?? []).join(" ")}`;
    case "analysis":
      return `Threat assessment: ${slide.risk ?? "LOW"}. ${slide.body ?? ""}`;
    case "details":
      return `Operational details. ${(slide.bullets ?? []).join(". ")}`;
    case "event":
      return `Event in ${slide.country ?? "unknown region"}. Severity: ${slide.severity ?? "LOW"}. ${slide.heading}. ${slide.body ?? ""}`;
    case "end":
      return "Briefing complete. Returning to monitoring.";
  }
}

// ---------------------------------------------------------------------------
// HUD Corner Brackets
// ---------------------------------------------------------------------------
function HudCorners({ size = 6 }: { size?: number }) {
  const s = `${size * 4}px`;
  return (
    <>
      <span
        className="absolute top-0 left-0 border-t-2 border-l-2 border-primary/70 pointer-events-none"
        style={{ width: s, height: s }}
      />
      <span
        className="absolute top-0 right-0 border-t-2 border-r-2 border-primary/70 pointer-events-none"
        style={{ width: s, height: s }}
      />
      <span
        className="absolute bottom-0 left-0 border-b-2 border-l-2 border-primary/70 pointer-events-none"
        style={{ width: s, height: s }}
      />
      <span
        className="absolute bottom-0 right-0 border-b-2 border-r-2 border-primary/70 pointer-events-none"
        style={{ width: s, height: s }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Slide type icons
// ---------------------------------------------------------------------------
function SlideIcon({ type }: { type: SlideType }) {
  const cls = "w-4 h-4 text-primary/70";
  switch (type) {
    case "title":
      return <Radio className={cls} />;
    case "overview":
      return <FileText className={cls} />;
    case "analysis":
      return <AlertTriangle className={cls} />;
    case "details":
      return <Shield className={cls} />;
    case "event":
      return <AlertTriangle className={cls} />;
    case "end":
      return <CheckCircle2 className={cls} />;
  }
}

// ---------------------------------------------------------------------------
// Slide content components
// ---------------------------------------------------------------------------
function TitleSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex flex-col gap-5 p-8 min-h-[280px] justify-center">
      {slide.imageUrl && (
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <img
            src={slide.imageUrl}
            alt=""
            className="w-full h-full object-cover opacity-20"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-card/60 via-card/80 to-card/95" />
        </div>
      )}
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-mono tracking-[0.25em] text-primary/70 uppercase">
            INTEL BRIEFING
          </span>
        </div>
        <h2 className="text-xl font-display font-bold text-foreground leading-snug tracking-wide">
          {slide.heading}
        </h2>
        <p className="text-[11px] font-mono text-muted-foreground/70 tracking-widest mt-1">
          {slide.meta}
        </p>
      </div>
    </div>
  );
}

function BulletSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex flex-col gap-5 p-8 min-h-[280px] justify-center">
      <div className="flex items-center gap-2 mb-1">
        <SlideIcon type={slide.type} />
        <span className="text-[10px] font-mono tracking-[0.25em] text-primary/80 uppercase font-bold">
          {slide.heading}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {(slide.bullets ?? []).map((bullet) => (
          <li key={bullet.slice(0, 40)} className="flex items-start gap-3">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-sm bg-primary/60 flex-shrink-0" />
            <span className="text-[13px] font-mono text-foreground/85 leading-relaxed">
              {bullet}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnalysisSlide({ slide }: { slide: Slide }) {
  const risk = slide.risk ?? "LOW";
  const cfg = RISK_CONFIG[risk];
  const bars: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const riskIdx = bars.indexOf(risk);

  return (
    <div className="flex flex-col gap-5 p-8 min-h-[280px] justify-center">
      <div className="flex items-center gap-2 mb-1">
        <SlideIcon type="analysis" />
        <span className="text-[10px] font-mono tracking-[0.25em] text-primary/80 uppercase font-bold">
          {slide.heading}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border w-fit ${cfg.color} border-current/40 ${cfg.glow}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="text-[11px] font-mono tracking-widest font-bold">
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {bars.map((b, i) => (
            <div
              key={b}
              className={`h-1.5 flex-1 rounded-sm transition-all duration-300 ${i <= riskIdx ? cfg.color.replace("text-", "bg-") : "bg-border/30"}`}
            />
          ))}
        </div>
      </div>
      <p className="text-[13px] font-mono text-foreground/80 leading-relaxed">
        {slide.body}
      </p>
    </div>
  );
}

function EventSlide({ slide }: { slide: Slide }) {
  const severity = (slide.severity ?? "LOW") as RiskLevel;
  const badgeCls = SEVERITY_CSS[severity];
  return (
    <div className="flex flex-col gap-4 p-8 min-h-[280px] justify-center">
      <div className="flex items-center gap-2">
        <SlideIcon type="event" />
        <span className="text-[10px] font-mono tracking-[0.25em] text-primary/80 uppercase font-bold">
          EVENT REPORT
        </span>
        <span
          className={`ml-auto text-[9px] font-mono tracking-widest px-2 py-0.5 rounded ${badgeCls}`}
        >
          {severity}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-muted-foreground/50 tracking-widest">
          📍
        </span>
        <span className="text-[11px] font-mono text-primary/70 tracking-wider uppercase">
          {slide.country}
        </span>
        {slide.meta && (
          <>
            <span className="text-muted-foreground/30 text-[10px]">·</span>
            <span className="text-[10px] font-mono text-muted-foreground/45 tracking-wider">
              {slide.meta}
            </span>
          </>
        )}
      </div>
      <h3 className="text-base font-display font-bold text-foreground leading-snug">
        {slide.heading}
      </h3>
      {slide.body && (
        <p className="text-[12px] font-mono text-foreground/70 leading-relaxed">
          {slide.body}
        </p>
      )}
    </div>
  );
}

function EndSlide({ slide, onClose }: { slide: Slide; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 min-h-[280px]">
      <div className="w-16 h-16 rounded-full border-2 border-primary/70 flex items-center justify-center glow-gold">
        <CheckCircle2 className="w-7 h-7 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-lg font-display font-bold text-primary text-glow-gold tracking-widest uppercase">
          {slide.heading}
        </p>
        <p className="text-[11px] font-mono text-muted-foreground/60 tracking-widest mt-1">
          MeshGen AI · F.R.I.D.A.Y. INTELLIGENCE SYSTEM
        </p>
      </div>
      {slide.sourceUrl && (
        <a
          href={slide.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-ocid="briefing.source_link"
          className="text-[11px] font-mono text-primary/70 hover:text-primary border border-primary/30 hover:border-primary/60 rounded px-4 py-2 transition-all duration-200 tracking-widest uppercase hover:glow-gold"
        >
          → OPEN FULL REPORT
        </a>
      )}
      <button
        type="button"
        onClick={onClose}
        data-ocid="briefing.return_button"
        className="text-[10px] font-mono text-muted-foreground/50 hover:text-muted-foreground tracking-widest uppercase transition-colors duration-200"
      >
        RETURN TO MONITORING
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Volume Slider
// ---------------------------------------------------------------------------
function VolumeControl({
  volume,
  onChange,
}: { volume: number; onChange: (v: number) => void }) {
  const isMuted = volume === 0;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(isMuted ? 70 : 0)}
        aria-label={isMuted ? "Unmute" : "Mute"}
        data-ocid="briefing.mute_button"
        className="text-muted-foreground/60 hover:text-primary transition-colors duration-200"
      >
        {isMuted ? (
          <VolumeX className="w-3.5 h-3.5" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        )}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={volume}
        onChange={(e) => onChange(Number(e.target.value))}
        data-ocid="briefing.volume_slider"
        aria-label="Volume"
        className="w-20 h-1 accent-primary cursor-pointer"
        style={{ accentColor: "oklch(var(--primary))" }}
      />
      <span className="text-[9px] font-mono text-muted-foreground/40 w-6 text-right">
        {volume}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quota / Tier gate
// ---------------------------------------------------------------------------
function QuotaBlockedState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 px-4">
      <div
        className="w-12 h-12 rounded-full border border-destructive/50 flex items-center justify-center"
        style={{ background: "oklch(var(--destructive) / 0.08)" }}
      >
        <Lock className="w-5 h-5 text-destructive/80" />
      </div>
      <p className="text-[12px] font-mono text-destructive/80 text-center tracking-wider leading-relaxed max-w-xs">
        {message}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Modal
// ---------------------------------------------------------------------------
interface Props {
  article?: NewsArticle | null;
  onClose: () => void;
  isGlobalBriefing?: boolean;
}

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;
type Speed = (typeof SPEEDS)[number];

export default function VideoSummaryModal({
  article,
  onClose,
  isGlobalBriefing = false,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [volume, setVolume] = useState(80);
  const [direction, setDirection] = useState<"right" | "left">("right");
  const [animKey, setAnimKey] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const slidesRef = useRef<Slide[]>([]);

  // Backend hooks
  const { data: recentEvents = [] } = useGetRecentEvents(3);
  const { data: quota } = useCheckQuota();
  const { mutate: incrementVideo } = useIncrementVideo();

  // Build slides based on mode
  const slides: Slide[] = isGlobalBriefing
    ? buildGlobalBriefingSlides(recentEvents)
    : article
      ? buildSlides(article)
      : [];

  slidesRef.current = slides;
  const total = slides.length;
  const currentSlide = slides[currentIndex];

  // Tier gate for free users in global briefing mode
  const isFreeBlocked = isGlobalBriefing && quota?.allowed === false;
  const isQuotaBlocked = !isGlobalBriefing && quota?.allowed === false;

  // Stop TTS
  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
  }, []);

  // Narrate a single slide, then advance
  const narrateSlide = useCallback(
    (index: number) => {
      if (!window.speechSynthesis) return;
      stopSpeech();
      const slide = slidesRef.current[index];
      if (!slide) return;

      const text = slideNarration(slide);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speed;
      utterance.pitch = 0.9;
      utterance.volume = volume / 100;
      const voice = pickVoice();
      if (voice) utterance.voice = voice;
      utteranceRef.current = utterance;

      utterance.onend = () => {
        const next = index + 1;
        if (next < slidesRef.current.length) {
          setTimeout(() => {
            setDirection("right");
            setCurrentIndex(next);
            setAnimKey((k) => k + 1);
            setTimeout(() => narrateSlide(next), 150);
          }, 600);
        } else {
          setIsPlaying(false);
        }
      };
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [speed, volume, stopSpeech],
  );

  const handlePlay = useCallback(() => {
    if (isFreeBlocked || isQuotaBlocked) return;
    if (isPlaying) {
      stopSpeech();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      incrementVideo();
      narrateSlide(currentIndex);
    }
  }, [
    isPlaying,
    isFreeBlocked,
    isQuotaBlocked,
    currentIndex,
    narrateSlide,
    stopSpeech,
    incrementVideo,
  ]);

  const goTo = useCallback(
    (index: number, dir: "right" | "left" = "right") => {
      if (isPlaying) {
        stopSpeech();
        setIsPlaying(false);
      }
      const clamped = Math.max(0, Math.min(index, total - 1));
      setDirection(dir);
      setCurrentIndex(clamped);
      setAnimKey((k) => k + 1);
    },
    [isPlaying, stopSpeech, total],
  );

  // Reset on new article
  const prevArticleUrlRef = useRef<string | undefined>(undefined);
  const articleUrl = article?.url;
  if (prevArticleUrlRef.current !== articleUrl) {
    prevArticleUrlRef.current = articleUrl;
    setCurrentIndex(0);
    setIsPlaying(false);
    setAnimKey((k) => k + 1);
    stopSpeech();
  }

  useEffect(() => () => stopSpeech(), [stopSpeech]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopSpeech();
        onClose();
      }
      if (e.key === "ArrowRight") goTo(currentIndex + 1, "right");
      if (e.key === "ArrowLeft") goTo(currentIndex - 1, "left");
      if (e.key === " ") {
        e.preventDefault();
        handlePlay();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [currentIndex, goTo, handlePlay, onClose, stopSpeech]);

  // Don't render if no content
  if (!isGlobalBriefing && !article) return null;

  const slideAnim =
    direction === "right"
      ? "animate-slide-in-right"
      : "animate-[slide-in-left_0.35s_cubic-bezier(0.4,0,0.6,1)_both]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
      style={{ animation: "fade-in 0.25s ease-out both" }}
      data-ocid="briefing.modal"
    >
      {/* Backdrop scan-line */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, oklch(0 0 0 / 0.04) 3px, oklch(0 0 0 / 0.04) 4px)",
        }}
      />

      <div className="relative w-full max-w-2xl mx-4 flex flex-col gap-3">
        {/* ── HEADER BAR ── */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span
                className="w-1 h-1 rounded-full bg-primary/50 animate-pulse"
                style={{ animationDelay: "0.3s" }}
              />
            </div>
            <span className="text-[11px] font-mono text-primary/90 tracking-[0.25em] uppercase font-bold text-glow-gold">
              {isGlobalBriefing
                ? "GLOBAL INTELLIGENCE BRIEFING"
                : "INTEL BRIEFING SYSTEM"}
            </span>
            <span className="text-[9px] font-mono text-muted-foreground/40 tracking-widest hidden sm:block">
              F.R.I.D.A.Y. v2.1
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              stopSpeech();
              onClose();
            }}
            aria-label="Close briefing"
            data-ocid="briefing.close_button"
            className="flex items-center justify-center w-7 h-7 rounded border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/60 hover:bg-primary/10 transition-all duration-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── SLIDE CARD ── */}
        <div
          className="relative rounded-xl overflow-hidden glow-border-gold scan-line"
          style={{ background: "oklch(var(--card))" }}
        >
          <HudCorners size={8} />
          {/* Slide type label */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
            {currentSlide && <SlideIcon type={currentSlide.type} />}
            <span className="text-[9px] font-mono text-primary/50 tracking-[0.2em] uppercase">
              {currentSlide?.type === "event"
                ? "EVENT"
                : (currentSlide?.type?.toUpperCase() ?? "")}
            </span>
          </div>
          {/* Slide counter */}
          <div className="absolute top-3 right-3 z-20">
            <span className="text-[9px] font-mono text-muted-foreground/40 tracking-widest">
              SLIDE {currentIndex + 1} / {total}
            </span>
          </div>

          {/* Quota blocked states */}
          {isFreeBlocked && (
            <QuotaBlockedState message="Pro tier required for video briefings. Upgrade in API Configuration to unlock global intelligence reports." />
          )}
          {isQuotaBlocked && !isFreeBlocked && (
            <QuotaBlockedState message="API quota exceeded. Upgrade to Pro for unlimited video briefings." />
          )}

          {/* Animated slide content */}
          {!isFreeBlocked && !isQuotaBlocked && (
            <div key={animKey} className={slideAnim}>
              {currentSlide?.type === "title" && (
                <TitleSlide slide={currentSlide} />
              )}
              {(currentSlide?.type === "overview" ||
                currentSlide?.type === "details") && (
                <BulletSlide slide={currentSlide} />
              )}
              {currentSlide?.type === "analysis" && (
                <AnalysisSlide slide={currentSlide} />
              )}
              {currentSlide?.type === "event" && (
                <EventSlide slide={currentSlide} />
              )}
              {currentSlide?.type === "end" && (
                <EndSlide
                  slide={currentSlide}
                  onClose={() => {
                    stopSpeech();
                    onClose();
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* ── PROGRESS DOTS ── */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                goTo(s.id - 1, s.id - 1 > currentIndex ? "right" : "left")
              }
              aria-label={`Go to slide ${s.id}`}
              data-ocid={`briefing.dot.${s.id}`}
              className={`rounded-sm transition-all duration-300 ${
                s.id - 1 === currentIndex
                  ? "w-5 h-1.5 bg-primary"
                  : s.id - 1 < currentIndex
                    ? "w-2 h-1 bg-primary/40"
                    : "w-2 h-1 bg-border/40 hover:bg-border/70"
              }`}
              style={
                s.id - 1 === currentIndex
                  ? { boxShadow: "0 0 8px oklch(var(--primary) / 0.8)" }
                  : undefined
              }
            />
          ))}
        </div>

        {/* ── CONTROL BAR ── */}
        <div
          className="relative flex items-center gap-2 px-4 py-3 rounded-lg border border-border/40"
          style={{ background: "oklch(var(--card) / 0.95)" }}
        >
          <HudCorners size={4} />

          <button
            type="button"
            onClick={() => goTo(currentIndex - 1, "left")}
            disabled={currentIndex === 0}
            aria-label="Previous slide"
            data-ocid="briefing.prev_button"
            className="flex items-center justify-center w-8 h-8 rounded border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/60 hover:bg-primary/10 transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Play / Pause */}
          <button
            type="button"
            onClick={handlePlay}
            aria-label={isPlaying ? "Pause narration" : "Play narration"}
            data-ocid="briefing.play_button"
            disabled={isFreeBlocked || isQuotaBlocked}
            className={`flex items-center gap-2 px-4 h-9 rounded border text-[11px] font-mono tracking-widest uppercase font-bold flex-shrink-0 transition-all duration-200 ${
              isFreeBlocked || isQuotaBlocked
                ? "border-border/30 bg-muted/20 text-muted-foreground/40 cursor-not-allowed"
                : "border-primary/60 bg-primary/15 text-primary hover:bg-primary/25 hover:border-primary"
            }`}
            style={
              isPlaying
                ? { boxShadow: "0 0 14px oklch(var(--primary) / 0.5)" }
                : undefined
            }
          >
            {isFreeBlocked || isQuotaBlocked ? (
              <Lock className="w-4 h-4" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isFreeBlocked
                ? "LOCKED"
                : isQuotaBlocked
                  ? "QUOTA"
                  : isPlaying
                    ? "PAUSE"
                    : "PLAY"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => goTo(currentIndex + 1, "right")}
            disabled={currentIndex === total - 1}
            aria-label="Next slide"
            data-ocid="briefing.next_button"
            className="flex items-center justify-center w-8 h-8 rounded border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/60 hover:bg-primary/10 transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed flex-shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-border/30 mx-1 flex-shrink-0" />

          {/* Speed */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                data-ocid={`briefing.speed_${String(s).replace(".", "_")}x`}
                className={`px-2 h-6 text-[9px] font-mono tracking-widest transition-all duration-200 first:rounded-l last:rounded-r ${
                  speed === s
                    ? "bg-primary/20 border border-primary/60 text-primary z-10"
                    : "border border-border/30 text-muted-foreground/50 hover:text-muted-foreground hover:border-border/60 -ml-px"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          <div className="flex-1" />
          <VolumeControl volume={volume} onChange={setVolume} />
        </div>

        <p className="text-center text-[9px] font-mono text-muted-foreground/25 tracking-widest">
          ← → NAVIGATE · SPACE PLAY/PAUSE · ESC CLOSE
        </p>
      </div>
    </div>
  );
}
