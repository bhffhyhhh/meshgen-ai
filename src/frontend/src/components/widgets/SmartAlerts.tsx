import { createActor } from "@/backend";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, Shield, X, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type AlertSeverity = "critical" | "high" | "medium";

export interface SmartAlert {
  id: string;
  headline: string;
  severity: AlertSeverity;
  source: string;
  timestamp: string;
  keywordsMatched: string[];
  articleUrl: string;
}

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  hasVideo: boolean;
}

interface NewsActor {
  fetchNews?(): Promise<NewsArticle[]>;
}

function toNewsActor(actor: unknown): NewsActor {
  return actor as NewsActor;
}

// ---------------------------------------------------------------------------
// Keyword maps — 3 severity tiers
// ---------------------------------------------------------------------------
const KEYWORD_MAP: Record<AlertSeverity, string[]> = {
  critical: [
    "earthquake",
    "tsunami",
    "nuclear",
    "explosion",
    "attack",
    "shooting",
    "detonation",
    "blast",
    "missile",
    "airstrike",
  ],
  high: [
    "emergency",
    "disaster",
    "flood",
    "fire",
    "hurricane",
    "tornado",
    "cyclone",
    "wildfire",
    "avalanche",
    "chemical",
  ],
  medium: [
    "alert",
    "warning",
    "crash",
    "protest",
    "outbreak",
    "contamination",
    "riot",
    "strike",
    "collision",
    "spillage",
  ],
};

// ---------------------------------------------------------------------------
// Mock demo alerts (shown when no GNews key / no live data)
// ---------------------------------------------------------------------------
const MOCK_ALERTS: SmartAlert[] = [
  {
    id: "mock-1",
    headline:
      "Magnitude 6.2 earthquake strikes off the coast of southern Japan — tsunami watch issued",
    severity: "critical",
    source: "reuters.com",
    timestamp: new Date(Date.now() - 8 * 60_000).toISOString(),
    keywordsMatched: ["earthquake", "tsunami"],
    articleUrl: "#",
  },
  {
    id: "mock-2",
    headline:
      "Category 4 hurricane makes landfall in the Gulf Coast — emergency declared in three states",
    severity: "high",
    source: "apnews.com",
    timestamp: new Date(Date.now() - 22 * 60_000).toISOString(),
    keywordsMatched: ["hurricane", "emergency"],
    articleUrl: "#",
  },
  {
    id: "mock-3",
    headline:
      "Health authorities issue outbreak warning as new respiratory illness spreads across border regions",
    severity: "medium",
    source: "who.int",
    timestamp: new Date(Date.now() - 47 * 60_000).toISOString(),
    keywordsMatched: ["outbreak", "warning"],
    articleUrl: "#",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTime(ts: string): string {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "JUST NOW";
    if (mins < 60) return `${mins}m AGO`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h AGO`;
    return `${Math.floor(hrs / 24)}d AGO`;
  } catch {
    return "UNKNOWN";
  }
}

function classifyArticle(article: NewsArticle): SmartAlert | null {
  const text = `${article.title} ${article.description ?? ""}`.toLowerCase();

  for (const severity of ["critical", "high", "medium"] as AlertSeverity[]) {
    const hits = KEYWORD_MAP[severity].filter((kw) => text.includes(kw));
    if (hits.length > 0) {
      let hostname = "unknown";
      try {
        hostname = new URL(article.url).hostname.replace("www.", "");
      } catch {
        hostname = "news";
      }
      return {
        id: article.url,
        headline: article.title,
        severity,
        source: hostname,
        timestamp: article.publishedAt,
        keywordsMatched: hits,
        articleUrl: article.url,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Severity config — red / amber / yellow per tier
// ---------------------------------------------------------------------------
const SEVERITY_CONFIG: Record<
  AlertSeverity,
  {
    label: string;
    dot: string;
    badge: string;
    border: string;
    glow: string;
    glowCard: string;
    keyword: string;
  }
> = {
  critical: {
    label: "CRITICAL",
    dot: "bg-red-500",
    badge:
      "text-red-400 border-red-500/60 bg-red-500/15 shadow-[0_0_6px_oklch(0.55_0.22_25/0.4)]",
    border: "border-l-red-500/80",
    glow: "shadow-[0_0_10px_oklch(0.55_0.22_25/0.5),inset_0_0_8px_oklch(0.55_0.22_25/0.05)]",
    glowCard: "hover:shadow-[0_0_14px_oklch(0.55_0.22_25/0.35)]",
    keyword: "text-red-400/70 border-red-500/30 bg-red-500/10",
  },
  high: {
    label: "HIGH",
    dot: "bg-amber-400",
    badge:
      "text-amber-400 border-amber-400/60 bg-amber-400/15 shadow-[0_0_6px_oklch(0.72_0.15_70/0.4)]",
    border: "border-l-amber-400/80",
    glow: "shadow-[0_0_10px_oklch(0.72_0.15_70/0.4),inset_0_0_8px_oklch(0.72_0.15_70/0.05)]",
    glowCard: "hover:shadow-[0_0_14px_oklch(0.72_0.15_70/0.3)]",
    keyword: "text-amber-400/70 border-amber-400/30 bg-amber-400/10",
  },
  medium: {
    label: "MED",
    dot: "bg-yellow-400",
    badge:
      "text-yellow-400 border-yellow-400/60 bg-yellow-400/15 shadow-[0_0_6px_oklch(0.85_0.2_100/0.35)]",
    border: "border-l-yellow-400/80",
    glow: "shadow-[0_0_8px_oklch(0.85_0.2_100/0.3),inset_0_0_6px_oklch(0.85_0.2_100/0.04)]",
    glowCard: "hover:shadow-[0_0_12px_oklch(0.85_0.2_100/0.25)]",
    keyword: "text-yellow-400/70 border-yellow-400/30 bg-yellow-400/10",
  },
};

// ---------------------------------------------------------------------------
// AlertCard sub-component
// ---------------------------------------------------------------------------
interface AlertCardProps {
  alert: SmartAlert;
  onDismiss: (id: string) => void;
  dismissing: boolean;
}

function AlertCard({ alert, onDismiss, dismissing }: AlertCardProps) {
  const cfg = SEVERITY_CONFIG[alert.severity];

  return (
    <div
      className={`
        relative scan-line rounded border-l-2 border border-border/30
        bg-card/40 backdrop-blur-sm overflow-hidden
        transition-all duration-400 ease-out
        ${cfg.border} ${cfg.glow} ${cfg.glowCard}
        ${dismissing ? "opacity-0 scale-95 translate-x-2 h-0 py-0 my-0" : "opacity-100 scale-100 translate-x-0"}
      `}
      style={{
        transition:
          "opacity 0.35s ease, transform 0.35s ease, height 0.4s ease, margin 0.4s ease, padding 0.4s ease",
      }}
      data-ocid={`alert-card-${alert.severity}`}
    >
      {/* Top-edge accent line */}
      <div
        className={`absolute top-0 left-0 right-0 h-px ${
          alert.severity === "critical"
            ? "bg-gradient-to-r from-transparent via-red-500/60 to-transparent"
            : alert.severity === "high"
              ? "bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"
              : "bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent"
        }`}
      />

      <a
        href={alert.articleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col gap-1.5 p-2.5 no-underline"
      >
        {/* Row 1: severity badge + pulse dot + time + dismiss */}
        <div className="flex items-center gap-1.5 pr-5">
          <span
            className={`text-[8px] font-mono tracking-widest border rounded px-1.5 py-px shrink-0 font-bold ${cfg.badge}`}
          >
            ▲ {cfg.label}
          </span>
          <div
            className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${cfg.dot}`}
          />
          <span className="text-[9px] font-mono text-muted-foreground/50 ml-auto tracking-wider shrink-0">
            {formatTime(alert.timestamp)}
          </span>
        </div>

        {/* Row 2: headline */}
        <p className="text-[11px] font-mono text-foreground/85 group-hover:text-foreground leading-snug line-clamp-2 transition-colors duration-200 pr-1">
          {alert.headline}
        </p>

        {/* Row 3: source + detected keywords */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] font-mono text-muted-foreground/40 tracking-wider">
            {alert.source}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/30">
            ·
          </span>
          {alert.keywordsMatched.slice(0, 2).map((kw) => (
            <span
              key={kw}
              className={`text-[8px] font-mono border rounded px-1 tracking-wider ${cfg.keyword}`}
            >
              {kw.toUpperCase()}
            </span>
          ))}
        </div>
      </a>

      {/* Dismiss button — always visible on touch, hover on desktop */}
      <button
        type="button"
        aria-label="Dismiss alert"
        data-ocid={`alert-dismiss-${alert.severity}`}
        onClick={() => onDismiss(alert.id)}
        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded opacity-50 hover:opacity-100 text-muted-foreground/50 hover:text-foreground/80 hover:bg-background/40 transition-all duration-200"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const MAX_VISIBLE = 5;

export default function SmartAlerts() {
  const { actor, isFetching } = useActor(createActor);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0); // force refresh every 30s
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    refreshRef.current = setInterval(() => {
      setTick((t) => t + 1);
    }, 30_000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, []);

  const { data: articles = [] } = useQuery<NewsArticle[]>({
    queryKey: ["newsArticles", tick],
    queryFn: async () => {
      if (!actor || isFetching) return [];
      try {
        const result = await toNewsActor(actor).fetchNews?.();
        return Array.isArray(result) ? result : [];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  // Classify articles into alerts
  const liveAlerts = useMemo<SmartAlert[]>(() => {
    if (articles.length === 0) return [];
    const classified: SmartAlert[] = [];
    for (const article of articles) {
      const alert = classifyArticle(article);
      if (alert) classified.push(alert);
    }
    return classified;
  }, [articles]);

  // Use live alerts if available, otherwise mock demo data
  const sourceAlerts = liveAlerts.length > 0 ? liveAlerts : MOCK_ALERTS;

  // Filter dismissed, cap at MAX_VISIBLE (newest first by timestamp)
  const visibleAlerts = useMemo(() => {
    const active = sourceAlerts
      .filter((a) => !dismissed.has(a.id))
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    return active.slice(0, MAX_VISIBLE);
  }, [sourceAlerts, dismissed]);

  const handleDismiss = useCallback((id: string) => {
    // Animate out first, then add to dismissed
    setDismissing((prev) => new Set([...prev, id]));
    setTimeout(() => {
      setDismissed((prev) => new Set([...prev, id]));
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 380);
  }, []);

  const handleClearAll = useCallback(() => {
    // Stagger clear animation
    visibleAlerts.forEach((a, i) => {
      setTimeout(() => {
        setDismissing((prev) => new Set([...prev, a.id]));
      }, i * 60);
    });
    setTimeout(
      () => {
        setDismissed(new Set(sourceAlerts.map((a) => a.id)));
        setDismissing(new Set());
      },
      visibleAlerts.length * 60 + 420,
    );
  }, [visibleAlerts, sourceAlerts]);

  const criticalCount = visibleAlerts.filter(
    (a) => a.severity === "critical",
  ).length;
  const highCount = visibleAlerts.filter((a) => a.severity === "high").length;
  const totalCount = visibleAlerts.length;

  const headerColor =
    criticalCount > 0
      ? "text-red-400"
      : highCount > 0
        ? "text-amber-400"
        : totalCount > 0
          ? "text-yellow-400"
          : "text-primary/70";

  const countBadge =
    criticalCount > 0
      ? "text-red-400 border-red-500/50 bg-red-500/10"
      : highCount > 0
        ? "text-amber-400 border-amber-400/50 bg-amber-400/10"
        : "text-yellow-400 border-yellow-400/50 bg-yellow-400/10";

  return (
    <div
      className="hud-panel scan-line rounded-lg p-3 flex flex-col relative overflow-hidden"
      data-ocid="smart-alerts.panel"
    >
      {/* Corner accent decorations */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40 rounded-tl-lg pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/40 rounded-tr-lg pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/30 rounded-bl-lg pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/30 rounded-br-lg pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-1 h-4 rounded-full ${criticalCount > 0 ? "bg-red-500 shadow-[0_0_6px_red]" : highCount > 0 ? "bg-amber-400 shadow-[0_0_6px_#fbbf24]" : "bg-primary/50"}`}
          />
          <span
            className={`text-[10px] font-mono tracking-[0.2em] uppercase font-bold ${headerColor}`}
            data-ocid="smart-alerts.header"
          >
            SMART ALERTS
          </span>
          {totalCount > 0 && (
            <span
              className={`text-[9px] font-mono px-1.5 py-px rounded border font-bold ${countBadge}`}
              data-ocid="smart-alerts.count"
            >
              [{totalCount}]
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Last-refresh indicator */}
          <span className="text-[8px] font-mono text-muted-foreground/30 tracking-wider hidden sm:block">
            30s
          </span>
          {totalCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              aria-label="Clear all alerts"
              data-ocid="smart-alerts.clear_button"
              className="text-[8px] font-mono tracking-widest text-muted-foreground/50 hover:text-destructive/80 border border-border/30 hover:border-destructive/40 rounded px-1.5 py-px transition-all duration-200 uppercase"
            >
              CLEAR
            </button>
          )}
          <Bell
            className={`w-3.5 h-3.5 transition-all duration-300 ${criticalCount > 0 ? "text-red-400/90 animate-pulse" : highCount > 0 ? "text-amber-400/80" : "text-muted-foreground/40"}`}
          />
        </div>
      </div>

      {/* Divider with severity indicator */}
      <div className="flex items-center gap-1 mb-2">
        <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
        {criticalCount > 0 && (
          <Zap className="w-2.5 h-2.5 text-red-400/70 animate-pulse" />
        )}
        <div className="flex-1 h-px bg-gradient-to-l from-primary/30 to-transparent" />
      </div>

      {/* Scrollable alert list */}
      <ScrollArea className="flex-1 max-h-[200px]">
        <div className="space-y-2 pr-1">
          {visibleAlerts.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-6 gap-3"
              data-ocid="smart-alerts.empty_state"
            >
              {/* Green pulse ring */}
              <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-green-500/30 animate-ping" />
                <div className="absolute inset-1 rounded-full border border-green-500/20" />
                <Shield className="w-5 h-5 text-green-400/70" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-[11px] font-mono text-green-400/80 tracking-[0.15em] font-bold">
                  NO THREATS DETECTED
                </p>
                <p className="text-[9px] font-mono text-muted-foreground/40 tracking-wider">
                  ALL SYSTEMS NOMINAL
                </p>
              </div>
            </div>
          ) : (
            visibleAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onDismiss={handleDismiss}
                dismissing={dismissing.has(alert.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer status bar */}
      <div className="flex items-center gap-1.5 pt-2 mt-1.5 border-t border-border/20">
        <AlertTriangle
          className={`w-2.5 h-2.5 shrink-0 ${criticalCount > 0 ? "text-red-500/80" : "text-muted-foreground/30"}`}
        />
        <span className="text-[9px] font-mono text-muted-foreground/40 tracking-widest truncate">
          {totalCount > 0
            ? `${totalCount} ACTIVE · F.R.I.D.A.Y. MONITORING`
            : "SYSTEMS NOMINAL · F.R.I.D.A.Y. MONITORING"}
        </span>
        <div className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full bg-green-400/60 animate-pulse" />
      </div>
    </div>
  );
}
