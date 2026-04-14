import { useGetAgentState, useTriggerNewsRefresh } from "@/hooks/useChat";
import type { AgentState as BackendAgentState } from "@/types/chat";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type AgentStatus = "IDLE" | "RUNNING" | "COMPLETE" | "ERROR";

interface LocalAgentState {
  id: "news" | "map" | "video";
  name: string;
  status: AgentStatus;
  activity: string;
  lastTs: number;
  progress: number;
  taskCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function relativeTime(ts: number): string {
  if (!ts || ts <= 0) return "never";
  const diff = Math.round((Date.now() - ts) / 1000);
  if (diff < 2) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function normalizeStatus(raw: string): AgentStatus {
  const upper = raw.toUpperCase();
  if (upper === "RUNNING" || upper === "ACTIVE") return "RUNNING";
  if (upper === "COMPLETE" || upper === "DONE") return "COMPLETE";
  if (upper === "ERROR") return "ERROR";
  return "IDLE";
}

const ACTIVITY_LABELS: Record<
  LocalAgentState["id"],
  Record<AgentStatus, string>
> = {
  news: {
    IDLE: "Awaiting data cycle",
    RUNNING: "Processing live intelligence...",
    COMPLETE: "Cycle complete",
    ERROR: "Analysis interrupted",
  },
  map: {
    IDLE: "Awaiting data cycle",
    RUNNING: "Processing live intelligence...",
    COMPLETE: "Cycle complete",
    ERROR: "Analysis interrupted",
  },
  video: {
    IDLE: "Awaiting data cycle",
    RUNNING: "Processing live intelligence...",
    COMPLETE: "Cycle complete",
    ERROR: "Analysis interrupted",
  },
};

// ---------------------------------------------------------------------------
// External trigger ref (so parent can call triggerSearchAgent())
// ---------------------------------------------------------------------------
type TriggerFn = () => void;
const searchTriggerRef: { current: TriggerFn | null } = { current: null };

/** Call this to activate the Video Agent from outside the component. */
export function triggerSearchAgent(): void {
  searchTriggerRef.current?.();
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: AgentStatus }) {
  const cfg: Record<AgentStatus, { wrap: string; dot: string }> = {
    IDLE: {
      wrap: "border border-[oklch(0.4_0.04_240/0.6)] text-[oklch(0.55_0.04_240)] bg-[oklch(0.18_0.04_248/0.5)]",
      dot: "bg-[oklch(0.45_0.04_240)]",
    },
    RUNNING: {
      wrap: "border border-[oklch(0.65_0.2_145/0.7)] text-[oklch(0.75_0.18_145)] bg-[oklch(0.18_0.08_145/0.3)]",
      dot: "bg-[oklch(0.72_0.2_145)] animate-ping",
    },
    COMPLETE: {
      wrap: "border border-[oklch(0.55_0.18_240/0.6)] text-[oklch(0.72_0.15_230)] bg-[oklch(0.18_0.06_240/0.4)]",
      dot: "bg-[oklch(0.65_0.18_230)]",
    },
    ERROR: {
      wrap: "border border-[oklch(0.55_0.22_25/0.7)] text-[oklch(0.72_0.2_25)] bg-[oklch(0.18_0.08_25/0.3)]",
      dot: "bg-[oklch(0.65_0.22_25)] animate-ping",
    },
  };

  const { wrap, dot } = cfg[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono tracking-widest uppercase shrink-0 ${wrap}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------
function ProgressBar({
  progress,
  status,
}: { progress: number; status: AgentStatus }) {
  if (status === "IDLE") return null;

  const barColor =
    status === "RUNNING"
      ? "bg-[oklch(0.7_0.2_145)]"
      : status === "COMPLETE"
        ? "bg-[oklch(0.62_0.16_230)]"
        : "bg-[oklch(0.62_0.22_25)]";

  const trackColor =
    status === "RUNNING"
      ? "bg-[oklch(0.18_0.08_145/0.25)]"
      : status === "COMPLETE"
        ? "bg-[oklch(0.18_0.06_240/0.25)]"
        : "bg-[oklch(0.18_0.08_25/0.25)]";

  return (
    <div className={`h-0.5 w-full rounded-full overflow-hidden ${trackColor}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColor} ${
          status === "RUNNING" ? "shadow-[0_0_6px_currentColor]" : ""
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single agent card
// ---------------------------------------------------------------------------
function AgentCard({
  agent,
  relTime,
}: {
  agent: LocalAgentState;
  relTime: string;
}) {
  const cardGlow: Record<AgentStatus, string> = {
    IDLE: "border-[oklch(0.32_0.12_240/0.3)] bg-[oklch(0.14_0.04_250/0.6)] opacity-70",
    RUNNING:
      "border-[oklch(0.65_0.2_145/0.6)] bg-[oklch(0.13_0.05_145/0.2)] shadow-[0_0_12px_oklch(0.65_0.2_145/0.25),inset_0_0_8px_oklch(0.65_0.2_145/0.05)]",
    COMPLETE:
      "border-[oklch(0.55_0.18_240/0.5)] bg-[oklch(0.13_0.05_240/0.15)] shadow-[0_0_10px_oklch(0.55_0.18_240/0.2)]",
    ERROR:
      "border-[oklch(0.55_0.22_25/0.6)] bg-[oklch(0.13_0.05_25/0.15)] shadow-[0_0_12px_oklch(0.55_0.22_25/0.25)]",
  };

  const nameGlow: Record<AgentStatus, string> = {
    IDLE: "text-[oklch(0.62_0.12_80/0.6)]",
    RUNNING: "text-[oklch(0.82_0.18_85)] text-glow-gold",
    COMPLETE: "text-[oklch(0.72_0.15_85)]",
    ERROR: "text-[oklch(0.72_0.2_25)]",
  };

  return (
    <div
      className={`relative rounded-md p-2.5 border transition-all duration-400 overflow-hidden scan-line ${cardGlow[agent.status]}`}
      data-ocid={`multi-agent-hud.agent-card.${agent.id}`}
    >
      {/* Top row: name + badge */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span
          className={`font-mono text-[10px] tracking-[0.2em] uppercase truncate min-w-0 font-semibold ${nameGlow[agent.status]}`}
        >
          {agent.name}
        </span>
        <StatusBadge status={agent.status} />
      </div>

      {/* Progress bar */}
      <ProgressBar progress={agent.progress} status={agent.status} />

      {/* Activity description */}
      <p className="text-[10px] font-mono leading-relaxed line-clamp-1 mt-1.5 text-[oklch(0.6_0.05_240)]">
        {agent.activity}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[9px] font-mono text-[oklch(0.42_0.06_240)] tabular-nums">
          LAST · {relTime}
        </span>
        <span className="text-[9px] font-mono text-[oklch(0.42_0.06_240)] tabular-nums">
          {agent.taskCount} ops
        </span>
      </div>

      {/* Active shimmer accent line */}
      {agent.status === "RUNNING" && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.7_0.2_145/0.8)] to-transparent" />
      )}
      {agent.status === "COMPLETE" && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.62_0.16_230/0.6)] to-transparent" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Build local agent list from backend AgentState
// ---------------------------------------------------------------------------
function buildAgents(
  backendState: BackendAgentState,
  prev: LocalAgentState[],
): LocalAgentState[] {
  const ids: Array<LocalAgentState["id"]> = ["news", "map", "video"];
  const names: Record<LocalAgentState["id"], string> = {
    news: "NEWS AGENT",
    map: "MAP AGENT",
    video: "VIDEO AGENT",
  };
  const rawStatuses: Record<LocalAgentState["id"], string> = {
    news: backendState.newsAgent,
    map: backendState.mapAgent,
    video: backendState.videoAgent,
  };

  return ids.map((id) => {
    const existing = prev.find((a) => a.id === id);
    const status = normalizeStatus(rawStatuses[id]);
    const prevStatus = existing?.status ?? "IDLE";
    const statusChanged = status !== prevStatus;

    return {
      id,
      name: names[id],
      status,
      activity: ACTIVITY_LABELS[id][status],
      lastTs: statusChanged ? Date.now() : (existing?.lastTs ?? Date.now()),
      progress:
        status === "RUNNING"
          ? (existing?.progress ?? 30)
          : status === "COMPLETE"
            ? 100
            : 0,
      taskCount:
        status === "COMPLETE" && prevStatus !== "COMPLETE"
          ? (existing?.taskCount ?? 0) + 1
          : (existing?.taskCount ?? 0),
    };
  });
}

// ---------------------------------------------------------------------------
// MultiAgentHUD
// ---------------------------------------------------------------------------
interface MultiAgentHUDProps {
  isProcessingChat?: boolean;
}

const INIT_AGENTS: LocalAgentState[] = [
  {
    id: "news",
    name: "NEWS AGENT",
    status: "IDLE",
    activity: ACTIVITY_LABELS.news.IDLE,
    lastTs: Date.now() - 8000,
    progress: 0,
    taskCount: 0,
  },
  {
    id: "map",
    name: "MAP AGENT",
    status: "IDLE",
    activity: ACTIVITY_LABELS.map.IDLE,
    lastTs: Date.now() - 14000,
    progress: 0,
    taskCount: 0,
  },
  {
    id: "video",
    name: "VIDEO AGENT",
    status: "IDLE",
    activity: ACTIVITY_LABELS.video.IDLE,
    lastTs: Date.now() - 2000,
    progress: 0,
    taskCount: 0,
  },
];

export default function MultiAgentHUD({
  isProcessingChat = false,
}: MultiAgentHUDProps) {
  const [agents, setAgents] = useState<LocalAgentState[]>(INIT_AGENTS);
  const [collapsed, setCollapsed] = useState(false);
  const [, tick] = useState(0);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);

  // Backend state
  const { data: backendState } = useGetAgentState();
  const triggerRefresh = useTriggerNewsRefresh();

  // Animate running progress locally
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync backend state → local agents
  useEffect(() => {
    if (!backendState) return;
    setAgents((prev) => buildAgents(backendState, prev));
  }, [backendState]);

  // Animate progress bar while any agent is RUNNING
  useEffect(() => {
    const hasRunning = agents.some((a) => a.status === "RUNNING");
    if (hasRunning) {
      if (progressRef.current) return; // already running
      progressRef.current = setInterval(() => {
        setAgents((prev) =>
          prev.map((a) =>
            a.status === "RUNNING"
              ? { ...a, progress: Math.min(a.progress + 3, 90) }
              : a,
          ),
        );
      }, 400);
    } else {
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
    }
    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
    };
  }, [agents]);

  // Force re-render every 5s for relative timestamps
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // Video agent triggered by isProcessingChat
  const wasProcessing = useRef(false);
  const videoReturnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only drive VIDEO agent from chat prop when backend isn't controlling it
    const backendVideoStatus = backendState
      ? normalizeStatus(backendState.videoAgent)
      : "IDLE";
    if (backendVideoStatus !== "IDLE") return;

    if (isProcessingChat && !wasProcessing.current) {
      wasProcessing.current = true;
      if (videoReturnTimer.current) clearTimeout(videoReturnTimer.current);
      setAgents((prev) =>
        prev.map((a) =>
          a.id === "video"
            ? {
                ...a,
                status: "RUNNING",
                activity: ACTIVITY_LABELS.video.RUNNING,
                lastTs: Date.now(),
                progress: 0,
              }
            : a,
        ),
      );
    } else if (!isProcessingChat && wasProcessing.current) {
      wasProcessing.current = false;
      setAgents((prev) =>
        prev.map((a) =>
          a.id === "video"
            ? {
                ...a,
                status: "COMPLETE",
                activity: ACTIVITY_LABELS.video.COMPLETE,
                lastTs: Date.now(),
                progress: 100,
                taskCount: a.taskCount + 1,
              }
            : a,
        ),
      );
      videoReturnTimer.current = setTimeout(() => {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === "video"
              ? {
                  ...a,
                  status: "IDLE",
                  activity: ACTIVITY_LABELS.video.IDLE,
                  lastTs: Date.now(),
                  progress: 0,
                }
              : a,
          ),
        );
      }, 5000);
    }
  }, [isProcessingChat, backendState]);

  // External trigger (video agent)
  useEffect(() => {
    searchTriggerRef.current = () => {
      if (wasProcessing.current) return;
      if (videoReturnTimer.current) clearTimeout(videoReturnTimer.current);
      wasProcessing.current = true;
      setAgents((prev) =>
        prev.map((a) =>
          a.id === "video"
            ? {
                ...a,
                status: "RUNNING",
                activity: ACTIVITY_LABELS.video.RUNNING,
                lastTs: Date.now(),
                progress: 0,
              }
            : a,
        ),
      );
      const t = setTimeout(() => {
        wasProcessing.current = false;
        setAgents((prev) =>
          prev.map((a) =>
            a.id === "video"
              ? {
                  ...a,
                  status: "COMPLETE",
                  activity: ACTIVITY_LABELS.video.COMPLETE,
                  lastTs: Date.now(),
                  progress: 100,
                  taskCount: a.taskCount + 1,
                }
              : a,
          ),
        );
        videoReturnTimer.current = setTimeout(() => {
          setAgents((prev) =>
            prev.map((a) =>
              a.id === "video"
                ? {
                    ...a,
                    status: "IDLE",
                    activity: ACTIVITY_LABELS.video.IDLE,
                    lastTs: Date.now(),
                    progress: 0,
                  }
                : a,
            ),
          );
        }, 5000);
      }, 2500);
      return t;
    };
    return () => {
      searchTriggerRef.current = null;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (videoReturnTimer.current) clearTimeout(videoReturnTimer.current);
    };
  }, []);

  // Handle trigger refresh
  const handleRefresh = useCallback(async () => {
    setRefreshResult(null);
    try {
      await triggerRefresh.mutateAsync();
      const count = backendState?.lastEventCount ?? 0;
      setRefreshResult(`${count} events fetched`);
    } catch {
      setRefreshResult("Refresh failed");
    }
    setTimeout(() => setRefreshResult(null), 4000);
  }, [triggerRefresh, backendState?.lastEventCount]);

  const activeCount = agents.filter((a) => a.status === "RUNNING").length;
  const now = Date.now();

  const lastRunTs = backendState?.lastRunAt ?? 0;
  const lastRunLabel = lastRunTs > 0 ? relativeTime(lastRunTs) : "never";
  const eventCount = backendState?.lastEventCount ?? 0;

  return (
    <div
      className="rounded-lg overflow-hidden hud-panel"
      data-ocid="multi-agent-hud"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[oklch(0.15_0.05_248/0.9)] border-b border-[oklch(var(--border)/0.5)] hover:bg-[oklch(0.17_0.05_248/0.9)] transition-colors duration-200 group"
        aria-label={
          collapsed ? "Expand Multi-Agent HUD" : "Collapse Multi-Agent HUD"
        }
        data-ocid="multi-agent-hud.toggle"
      >
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-3.5 rounded-full bg-[oklch(var(--primary))] shadow-[0_0_6px_oklch(var(--primary)/0.8)]" />
          <span className="text-[10px] font-mono text-[oklch(0.82_0.15_85)] tracking-[0.22em] uppercase">
            Multi‑Agent HUD
          </span>
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[oklch(0.65_0.2_145/0.15)] border border-[oklch(0.65_0.2_145/0.4)] text-[oklch(0.72_0.18_145)] tracking-widest animate-pulse">
              {activeCount} ACTIVE
            </span>
          )}
          <span className="text-[10px] font-mono text-[oklch(0.45_0.06_240)] group-hover:text-[oklch(0.65_0.12_85)] transition-colors duration-200">
            {collapsed ? "▼" : "▲"}
          </span>
        </div>
      </button>

      {/* Gold scan line divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-[oklch(var(--primary)/0.35)] to-transparent" />

      {/* Cards */}
      {!collapsed && (
        <div className="p-2.5 space-y-1.5">
          {agents.map((agent, i) => (
            <div key={agent.id}>
              <AgentCard
                agent={agent}
                relTime={relativeTime(agent.lastTs < now ? agent.lastTs : now)}
              />
              {i < agents.length - 1 && (
                <div className="mt-1.5 h-px bg-gradient-to-r from-transparent via-[oklch(var(--border)/0.4)] to-transparent" />
              )}
            </div>
          ))}

          {/* Metadata row */}
          <div className="mt-2 pt-2 border-t border-[oklch(var(--border)/0.3)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono text-[oklch(0.42_0.06_240)] tabular-nums">
                LAST CYCLE ·{" "}
                <span className="text-[oklch(0.6_0.08_240)]">
                  {lastRunLabel}
                </span>
              </span>
              <span className="text-[9px] font-mono tabular-nums">
                <span className="text-[oklch(0.42_0.06_240)]">EVENTS · </span>
                <span className="text-[oklch(0.82_0.18_85)] font-semibold">
                  {eventCount}
                </span>
              </span>
            </div>
          </div>

          {/* Trigger Refresh button */}
          <div className="mt-1">
            {refreshResult ? (
              <div
                className="text-center py-1.5 text-[9px] font-mono text-[oklch(0.72_0.18_145)] tracking-widest"
                data-ocid="multi-agent-hud.success_state"
              >
                ✓ {refreshResult}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={triggerRefresh.isPending}
                className="w-full py-1.5 rounded border border-[oklch(var(--primary)/0.35)] bg-[oklch(var(--primary)/0.06)] text-[9px] font-mono tracking-[0.2em] uppercase text-[oklch(0.72_0.15_85)] hover:bg-[oklch(var(--primary)/0.12)] hover:border-[oklch(var(--primary)/0.55)] hover:text-[oklch(0.85_0.18_85)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                data-ocid="multi-agent-hud.trigger_refresh_button"
              >
                {triggerRefresh.isPending ? (
                  <span className="animate-pulse">Refreshing...</span>
                ) : (
                  "⟳ TRIGGER REFRESH"
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
