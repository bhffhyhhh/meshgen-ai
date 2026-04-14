import { createActor } from "@/backend";
import VideoSummaryModal from "@/components/VideoSummaryModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetGNewsKey, useGetRecentEvents } from "@/hooks/useChat";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { Globe, Radio, RefreshCw, Settings, Video } from "lucide-react";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NewsArticle {
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  hasVideo: boolean;
  source?: string;
}

interface NewsActor {
  fetchNews?(): Promise<NewsArticle[]>;
}

function toNewsActor(actor: unknown): NewsActor {
  return actor as NewsActor;
}

// ---------------------------------------------------------------------------
// CRITICAL keyword detection
// ---------------------------------------------------------------------------
const CRITICAL_KEYWORDS = [
  "war",
  "attack",
  "explosion",
  "earthquake",
  "tsunami",
  "hurricane",
  "crisis",
  "emergency",
  "shooting",
  "blast",
  "killed",
  "death",
  "nuclear",
  "pandemic",
  "collapse",
];

function isCritical(title: string): boolean {
  const lower = title.toLowerCase();
  return CRITICAL_KEYWORDS.some((kw) => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
function useNewsArticles() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<NewsArticle[]>({
    queryKey: ["newsArticles"],
    queryFn: async () => {
      if (!actor || isFetching) return [];
      try {
        const articles = await toNewsActor(actor).fetchNews?.();
        return Array.isArray(articles) ? articles : [];
      } catch (err) {
        console.warn("[MeshGen AI] fetchNews error:", err);
        throw err;
      }
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTime(publishedAt: string): string {
  try {
    const diff = Date.now() - new Date(publishedAt).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "JUST NOW";
    if (mins < 60) return `${mins}M AGO`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}H AGO`;
    return `${Math.floor(hrs / 24)}D AGO`;
  } catch {
    return publishedAt;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function NewsSkeletonCard() {
  return (
    <div
      className="flex gap-2.5 p-2.5 rounded mb-2"
      style={{ border: "1px solid oklch(var(--border) / 0.3)" }}
    >
      <Skeleton
        className="w-12 h-12 shrink-0 rounded"
        style={{
          background: "oklch(var(--primary) / 0.08)",
          animation: "shimmer 1.5s ease-in-out infinite",
        }}
      />
      <div className="flex flex-col gap-1.5 flex-1">
        <Skeleton
          className="h-2 w-3/4 rounded"
          style={{ background: "oklch(var(--primary) / 0.08)" }}
        />
        <Skeleton
          className="h-2 w-full rounded"
          style={{ background: "oklch(var(--primary) / 0.06)" }}
        />
        <Skeleton
          className="h-2 w-1/2 rounded"
          style={{ background: "oklch(var(--primary) / 0.05)" }}
        />
      </div>
    </div>
  );
}

function NewsCard({
  article,
  onBriefing,
}: { article: NewsArticle; onBriefing: (article: NewsArticle) => void }) {
  const critical = isCritical(article.title);

  return (
    <div
      className="group flex gap-2.5 p-2 rounded mb-2 last:mb-0 transition-all duration-150 cursor-default"
      style={{
        border: `1px solid ${critical ? "oklch(0.6 0.22 25 / 0.4)" : "oklch(var(--border) / 0.3)"}`,
        background: critical
          ? "oklch(0.18 0.05 25 / 0.3)"
          : "oklch(var(--muted) / 0.15)",
        boxShadow: "none",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = critical
          ? "oklch(0.6 0.22 25 / 0.7)"
          : "oklch(var(--primary) / 0.5)";
        el.style.boxShadow = critical
          ? "0 0 8px oklch(0.6 0.22 25 / 0.2)"
          : "0 0 8px oklch(var(--primary) / 0.15)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = critical
          ? "oklch(0.6 0.22 25 / 0.4)"
          : "oklch(var(--border) / 0.3)";
        el.style.boxShadow = "none";
      }}
      data-ocid="news-card"
    >
      {/* Thumbnail */}
      {article.image ? (
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative w-12 h-12 shrink-0 rounded overflow-hidden block"
          style={{ border: "1px solid oklch(var(--border) / 0.4)" }}
        >
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          {article.hasVideo && (
            <div
              className="absolute bottom-0 right-0 rounded-tl p-px"
              style={{ background: "oklch(var(--primary) / 0.85)" }}
            >
              <Video
                className="w-2.5 h-2.5"
                style={{ color: "oklch(var(--primary-foreground))" }}
              />
            </div>
          )}
        </a>
      ) : (
        <div
          className="w-12 h-12 shrink-0 rounded flex items-center justify-center"
          style={{
            border: "1px solid oklch(var(--border) / 0.4)",
            background: "oklch(var(--muted) / 0.4)",
          }}
        >
          <Globe
            className="w-4 h-4"
            style={{ color: "oklch(var(--muted-foreground) / 0.4)" }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            {critical && (
              <span
                className="text-[8px] font-mono tracking-widest px-1 py-px rounded animate-pulse"
                style={{
                  background: "oklch(0.2 0.08 25)",
                  color: "oklch(0.7 0.22 25)",
                  border: "1px solid oklch(0.5 0.2 25 / 0.5)",
                }}
              >
                CRITICAL
              </span>
            )}
            {article.hasVideo && (
              <span
                className="text-[8px] font-mono tracking-widest px-1 py-px rounded"
                style={{
                  border: "1px solid oklch(var(--primary) / 0.4)",
                  color: "oklch(var(--primary) / 0.9)",
                }}
              >
                VIDEO
              </span>
            )}
          </div>
          <span
            className="text-[9px] font-mono tracking-wider ml-auto shrink-0"
            style={{ color: "oklch(var(--muted-foreground) / 0.4)" }}
          >
            {formatTime(article.publishedAt)}
          </span>
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-mono leading-snug line-clamp-2 no-underline transition-colors duration-150"
          style={{ color: "oklch(var(--foreground) / 0.8)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color =
              "oklch(var(--foreground))";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color =
              "oklch(var(--foreground) / 0.8)";
          }}
        >
          {article.title}
        </a>

        {article.source && (
          <span
            className="text-[9px] font-mono tracking-wider"
            style={{ color: "oklch(var(--muted-foreground) / 0.45)" }}
          >
            {article.source.toUpperCase()}
          </span>
        )}

        {/* Per-article BRIEFING button */}
        <button
          type="button"
          onClick={() => onBriefing(article)}
          data-ocid="news-briefing-btn"
          className="mt-0.5 self-start text-[8px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded transition-all duration-150"
          style={{
            border: "1px solid oklch(var(--primary) / 0.4)",
            color: "oklch(var(--primary) / 0.7)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = "oklch(var(--primary) / 0.8)";
            el.style.color = "oklch(var(--primary))";
            el.style.background = "oklch(var(--primary) / 0.08)";
            el.style.boxShadow = "0 0 6px oklch(var(--primary) / 0.2)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = "oklch(var(--primary) / 0.4)";
            el.style.color = "oklch(var(--primary) / 0.7)";
            el.style.background = "transparent";
            el.style.boxShadow = "none";
          }}
        >
          ▶ BRIEFING
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function WorldMonitor() {
  const {
    data: articles = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useNewsArticles();
  const { data: gNewsKey } = useGetGNewsKey();
  const { data: recentEvents = [] } = useGetRecentEvents(3);
  const hasKey = !!gNewsKey;

  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
    null,
  );
  const [showGlobalBriefing, setShowGlobalBriefing] = useState(false);

  const eventCount = recentEvents.length;

  return (
    <>
      <div
        className="rounded-lg p-4 flex flex-col relative overflow-hidden"
        style={{
          background: "oklch(var(--card))",
          border: "1px solid oklch(var(--border))",
          boxShadow:
            "0 0 20px oklch(0.6 0.18 240 / 0.15), 0 4px 24px oklch(0 0 0 / 0.4), inset 0 0 12px oklch(var(--primary) / 0.03)",
        }}
        data-ocid="world-monitor"
      >
        {/* Scan-line overlay */}
        <div
          className="pointer-events-none absolute inset-0 rounded-lg"
          aria-hidden="true"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(0 0 0 / 0.03) 2px, oklch(0 0 0 / 0.03) 4px)",
          }}
        />

        <div className="relative z-10 flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-accent pulse-reactor" />
              <span className="text-[11px] font-mono text-accent/80 tracking-[0.3em] uppercase">
                World Monitor
              </span>
              {articles.length > 0 && (
                <span
                  className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold"
                  style={{
                    background: "oklch(var(--accent) / 0.15)",
                    color: "oklch(var(--accent) / 0.9)",
                    border: "1px solid oklch(var(--accent) / 0.35)",
                  }}
                >
                  {articles.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* GLOBAL BRIEFING button */}
              <button
                type="button"
                onClick={() => setShowGlobalBriefing(true)}
                data-ocid="world-monitor.global-briefing-btn"
                className="flex items-center gap-1.5 px-2 h-6 rounded text-[8px] font-mono tracking-widest uppercase transition-all duration-150"
                style={{
                  border: "1px solid oklch(var(--primary) / 0.5)",
                  color: "oklch(var(--primary) / 0.85)",
                  background: "oklch(var(--primary) / 0.06)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "oklch(var(--primary) / 0.14)";
                  el.style.borderColor = "oklch(var(--primary) / 0.8)";
                  el.style.color = "oklch(var(--primary))";
                  el.style.boxShadow = "0 0 8px oklch(var(--primary) / 0.3)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "oklch(var(--primary) / 0.06)";
                  el.style.borderColor = "oklch(var(--primary) / 0.5)";
                  el.style.color = "oklch(var(--primary) / 0.85)";
                  el.style.boxShadow = "none";
                }}
              >
                <Radio className="w-2.5 h-2.5" />
                BRIEFING{eventCount > 0 ? ` (${eventCount})` : ""}
              </button>

              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                aria-label="Refresh news feed"
                data-ocid="news-refresh-btn"
                className="flex items-center justify-center w-6 h-6 rounded transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  border: "1px solid oklch(var(--primary) / 0.3)",
                  color: "oklch(var(--primary) / 0.6)",
                }}
                onMouseEnter={(e) => {
                  if (!isFetching) {
                    const el = e.currentTarget;
                    el.style.borderColor = "oklch(var(--primary) / 0.6)";
                    el.style.color = "oklch(var(--primary))";
                    el.style.background = "oklch(var(--primary) / 0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = "oklch(var(--primary) / 0.3)";
                  el.style.color = "oklch(var(--primary) / 0.6)";
                  el.style.background = "transparent";
                }}
              >
                <RefreshCw
                  className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`}
                />
              </button>
              <Globe
                className="w-3.5 h-3.5"
                style={{ color: "oklch(var(--muted-foreground) / 0.4)" }}
              />
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent mb-3" />

          {/* Content area */}
          <ScrollArea className="h-[240px]">
            <div className="pr-2">
              {isLoading && (
                <>
                  <NewsSkeletonCard />
                  <NewsSkeletonCard />
                  <NewsSkeletonCard />
                </>
              )}

              {isError && !isLoading && (
                <div
                  className="flex flex-col items-center justify-center h-32 gap-3 rounded"
                  style={{
                    border: "1px solid oklch(var(--destructive) / 0.3)",
                    background: "oklch(var(--destructive) / 0.05)",
                  }}
                  data-ocid="news-error-state"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: "oklch(var(--destructive) / 0.8)" }}
                    />
                    <span
                      className="text-[10px] font-mono tracking-widest uppercase"
                      style={{ color: "oklch(var(--destructive) / 0.8)" }}
                    >
                      FEED OFFLINE
                    </span>
                  </div>
                  <p
                    className="text-[9px] font-mono tracking-wider uppercase text-center"
                    style={{ color: "oklch(var(--muted-foreground) / 0.5)" }}
                  >
                    Communications offline
                  </p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    data-ocid="news-retry-btn"
                    className="text-[9px] font-mono tracking-widest uppercase px-3 py-1 rounded transition-all duration-150"
                    style={{
                      border: "1px solid oklch(var(--primary) / 0.4)",
                      color: "oklch(var(--primary) / 0.8)",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget;
                      el.style.background = "oklch(var(--primary) / 0.08)";
                      el.style.borderColor = "oklch(var(--primary) / 0.7)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget;
                      el.style.background = "transparent";
                      el.style.borderColor = "oklch(var(--primary) / 0.4)";
                    }}
                  >
                    ↻ RETRY
                  </button>
                </div>
              )}

              {!isLoading &&
                !isError &&
                articles.length > 0 &&
                articles.map((article, i) => (
                  <NewsCard
                    key={`${article.url}-${i}`}
                    article={article}
                    onBriefing={setSelectedArticle}
                  />
                ))}

              {!isLoading && !isError && articles.length === 0 && (
                <div
                  className="flex flex-col items-center justify-center h-32 gap-3 rounded p-4"
                  style={{
                    border: "1px solid oklch(var(--border) / 0.4)",
                    background: "oklch(var(--muted) / 0.1)",
                  }}
                  data-ocid="news-empty-state"
                >
                  <Globe
                    className="w-6 h-6"
                    style={{ color: "oklch(var(--muted-foreground) / 0.25)" }}
                  />
                  <span
                    className="text-[10px] font-mono tracking-widest uppercase"
                    style={{ color: "oklch(var(--muted-foreground) / 0.45)" }}
                  >
                    Awaiting Signal
                  </span>
                  {!hasKey && (
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded"
                      style={{
                        border: "1px solid oklch(var(--primary) / 0.2)",
                        background: "oklch(var(--primary) / 0.05)",
                      }}
                      data-ocid="news-no-key-notice"
                    >
                      <Settings
                        className="w-2.5 h-2.5 shrink-0"
                        style={{ color: "oklch(var(--primary) / 0.5)" }}
                      />
                      <span
                        className="text-[9px] font-mono tracking-wider"
                        style={{ color: "oklch(var(--primary) / 0.65)" }}
                      >
                        Add GNews API key in Settings for live news
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div
            className="flex items-center gap-1.5 pt-2 mt-1"
            style={{ borderTop: "1px solid oklch(var(--border) / 0.3)" }}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${isError ? "bg-red-500/60" : "animate-pulse"}`}
              style={{
                background: isError ? undefined : "oklch(var(--accent) / 0.7)",
              }}
            />
            <span
              className="text-[10px] font-mono tracking-widest"
              style={{ color: "oklch(var(--muted-foreground) / 0.4)" }}
            >
              {isError
                ? "SIGNAL LOST — RETRY"
                : "LIVE · F.R.I.D.A.Y.-CURATED FEED"}
            </span>
          </div>
        </div>
      </div>

      {/* Per-article briefing modal */}
      {selectedArticle && (
        <VideoSummaryModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}

      {/* Global briefing modal */}
      {showGlobalBriefing && (
        <VideoSummaryModal
          isGlobalBriefing
          onClose={() => setShowGlobalBriefing(false)}
        />
      )}
    </>
  );
}
