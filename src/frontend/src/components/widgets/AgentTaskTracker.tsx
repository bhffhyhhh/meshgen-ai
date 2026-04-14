import { useGetAgentState } from "@/hooks/useChat";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type TaskStatus = "PENDING" | "RUNNING" | "DONE" | "ERROR";

interface AgentTask {
  id: string;
  name: string;
  status: TaskStatus;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  badge?: string | null;
}

// ---------------------------------------------------------------------------
// Demo task definitions (5 fixed tasks)
// ---------------------------------------------------------------------------
const DEMO_TASKS: Omit<
  AgentTask,
  "status" | "progress" | "startedAt" | "completedAt" | "badge"
>[] = [
  { id: "web-search", name: "WEB SEARCH" },
  { id: "data-analysis", name: "DATA ANALYSIS" },
  { id: "neural-sync", name: "NEURAL SYNC" },
  { id: "system-scan", name: "SYSTEM SCAN" },
  { id: "memory-index", name: "MEMORY INDEX" },
];

const NEWS_FETCH_TASK_ID = "news-fetch";

function getTimestamp(): string {
  return new Date().toTimeString().slice(0, 8);
}

function makePending(): AgentTask[] {
  return DEMO_TASKS.map((t) => ({
    ...t,
    status: "PENDING" as TaskStatus,
    progress: 0,
    startedAt: null,
    completedAt: null,
    badge: null,
  }));
}

// ---------------------------------------------------------------------------
// Status badge — HUD-styled
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: TaskStatus }) {
  const styles: Record<
    TaskStatus,
    { bg: string; text: string; border: string }
  > = {
    PENDING: {
      bg: "oklch(var(--muted))",
      text: "oklch(var(--muted-foreground))",
      border: "oklch(var(--border) / 0.6)",
    },
    RUNNING: {
      bg: "oklch(0.25 0.08 240)",
      text: "oklch(0.75 0.15 200)",
      border: "oklch(0.6 0.18 240 / 0.8)",
    },
    DONE: {
      bg: "oklch(0.2 0.08 145)",
      text: "oklch(0.7 0.2 145)",
      border: "oklch(0.5 0.2 145 / 0.6)",
    },
    ERROR: {
      bg: "oklch(0.2 0.08 25)",
      text: "oklch(0.7 0.2 25)",
      border: "oklch(0.5 0.2 25 / 0.6)",
    },
  };

  const s = styles[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono tracking-widest uppercase shrink-0 ${status === "RUNNING" ? "animate-pulse" : ""}`}
      style={{
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
    >
      {status === "RUNNING" && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: "oklch(0.75 0.15 200)" }}
        />
      )}
      {status === "DONE" && <span>✓</span>}
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single task row
// ---------------------------------------------------------------------------
function TaskRow({ task }: { task: AgentTask }) {
  const isProcessingReq = task.id === "processing-request";
  const isNewsFetch = task.id === NEWS_FETCH_TASK_ID;

  return (
    <div
      className="py-2 border-b last:border-0 transition-all duration-150"
      style={{
        borderColor: "oklch(var(--primary) / 0.12)",
        background: isProcessingReq
          ? "oklch(var(--primary) / 0.04)"
          : isNewsFetch
            ? "oklch(0.18 0.06 240 / 0.15)"
            : "transparent",
      }}
      data-ocid={`agent-task-tracker.task.${task.id}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-[11px] font-mono tracking-wider truncate"
            style={{
              color: isProcessingReq
                ? "oklch(var(--primary) / 0.9)"
                : isNewsFetch
                  ? "oklch(0.72 0.15 220)"
                  : "oklch(var(--foreground) / 0.75)",
              textShadow: isProcessingReq
                ? "0 0 6px oklch(var(--primary) / 0.4)"
                : isNewsFetch && task.status === "RUNNING"
                  ? "0 0 6px oklch(0.72 0.15 220 / 0.4)"
                  : "none",
            }}
          >
            {isProcessingReq ? "▶ " : isNewsFetch ? "📡 " : ""}
            {task.name}
          </span>
          {/* Event count badge on DONE */}
          {isNewsFetch && task.status === "DONE" && task.badge && (
            <span
              className="shrink-0 px-1 py-0.5 rounded text-[8px] font-mono"
              style={{
                background: "oklch(0.2 0.06 240 / 0.5)",
                color: "oklch(var(--muted-foreground) / 0.7)",
                border: "1px solid oklch(var(--border) / 0.4)",
              }}
              data-ocid="agent-task-tracker.news-fetch.event_count"
            >
              {task.badge}
            </span>
          )}
        </div>
        <StatusBadge status={task.status} />
      </div>

      {/* Progress bar */}
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: "oklch(var(--muted) / 0.6)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${task.progress}%`,
            background:
              task.status === "RUNNING"
                ? isNewsFetch
                  ? "oklch(0.65 0.15 220)"
                  : "oklch(0.75 0.18 85)"
                : task.status === "DONE"
                  ? "oklch(0.65 0.2 145)"
                  : "oklch(var(--border))",
            boxShadow:
              task.status === "RUNNING"
                ? isNewsFetch
                  ? "0 0 6px oklch(0.65 0.15 220 / 0.6)"
                  : "0 0 6px oklch(0.75 0.18 85 / 0.6)"
                : "none",
          }}
        />
      </div>

      {/* Timestamp */}
      {(task.completedAt ?? task.startedAt) && (
        <div className="mt-1">
          <span
            className="text-[9px] font-mono tracking-wider"
            style={{ color: "oklch(var(--muted-foreground) / 0.5)" }}
          >
            {task.status === "DONE" ? "✓ " : "▶ "}
            {task.completedAt ?? task.startedAt}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentTaskTracker component
// ---------------------------------------------------------------------------
interface AgentTaskTrackerProps {
  isProcessing?: boolean;
}

function normalizeNewsAgentStatus(
  raw: string,
): "PENDING" | "RUNNING" | "DONE" | "ERROR" {
  const upper = raw.toUpperCase();
  if (upper === "RUNNING" || upper === "ACTIVE") return "RUNNING";
  if (upper === "COMPLETE" || upper === "DONE") return "DONE";
  if (upper === "ERROR") return "ERROR";
  return "PENDING";
}

export default function AgentTaskTracker({
  isProcessing = false,
}: AgentTaskTrackerProps) {
  const [tasks, setTasks] = useState<AgentTask[]>(makePending);
  const [processingTask, setProcessingTask] = useState<AgentTask | null>(null);
  const cycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasProcessing = useRef(false);

  // Backend news agent state
  const { data: agentState } = useGetAgentState();

  const clearTimers = useCallback(() => {
    if (cycleRef.current) clearTimeout(cycleRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
  }, []);

  const runTask = useCallback((index: number, taskList: AgentTask[]) => {
    if (index >= taskList.length) {
      cycleRef.current = setTimeout(() => {
        const fresh = makePending();
        setTasks(fresh);
        cycleRef.current = setTimeout(() => runTask(0, fresh), 600);
      }, 5000);
      return;
    }

    const now = getTimestamp();
    setTasks((prev) =>
      prev.map((t, i) =>
        i === index
          ? {
              ...t,
              status: "RUNNING" as TaskStatus,
              progress: 0,
              startedAt: now,
            }
          : t,
      ),
    );

    let prog = 0;
    progressRef.current = setInterval(() => {
      prog = Math.min(prog + Math.random() * 18 + 8, 95);
      setTasks((prev) =>
        prev.map((t, i) =>
          i === index ? { ...t, progress: Math.round(prog) } : t,
        ),
      );
    }, 250);

    cycleRef.current = setTimeout(() => {
      if (progressRef.current) clearInterval(progressRef.current);
      const doneTime = getTimestamp();
      let nextList: AgentTask[] = [];
      setTasks((prev) => {
        nextList = prev.map((t, i) =>
          i === index
            ? {
                ...t,
                status: "DONE" as TaskStatus,
                progress: 100,
                completedAt: doneTime,
              }
            : t,
        );
        return nextList;
      });
      cycleRef.current = setTimeout(() => {
        runTask(index + 1, nextList);
      }, 2000);
    }, 3000);
  }, []);

  useEffect(() => {
    const initial = makePending();
    setTasks(initial);
    cycleRef.current = setTimeout(() => runTask(0, initial), 1200);
    return clearTimers;
  }, [clearTimers, runTask]);

  // Processing task from ChatPage
  useEffect(() => {
    if (isProcessing && !wasProcessing.current) {
      wasProcessing.current = true;
      setProcessingTask({
        id: "processing-request",
        name: "PROCESSING REQUEST",
        status: "RUNNING",
        progress: 0,
        startedAt: getTimestamp(),
        completedAt: null,
        badge: null,
      });
    } else if (!isProcessing && wasProcessing.current) {
      wasProcessing.current = false;
      setProcessingTask((prev) =>
        prev
          ? {
              ...prev,
              status: "DONE",
              progress: 100,
              completedAt: getTimestamp(),
            }
          : null,
      );
      setTimeout(() => setProcessingTask(null), 3000);
    }
  }, [isProcessing]);

  // Animate processing task progress
  useEffect(() => {
    if (processingTask?.status !== "RUNNING") return;
    const iv = setInterval(() => {
      setProcessingTask((prev) => {
        if (!prev || prev.status !== "RUNNING") return prev;
        const next = Math.min(prev.progress + Math.random() * 12 + 5, 90);
        return { ...prev, progress: Math.round(next) };
      });
    }, 300);
    return () => clearInterval(iv);
  }, [processingTask?.status]);

  // Build the NEWS FETCH 6th task from backend state
  const newsFetchTask: AgentTask = (() => {
    const rawStatus = agentState?.newsAgent ?? "IDLE";
    const status = normalizeNewsAgentStatus(rawStatus);
    const eventCount = agentState?.lastEventCount ?? 0;
    return {
      id: NEWS_FETCH_TASK_ID,
      name: "NEWS FETCH",
      status,
      progress: status === "RUNNING" ? 55 : status === "DONE" ? 100 : 0,
      startedAt: status === "RUNNING" ? getTimestamp() : null,
      completedAt: status === "DONE" ? getTimestamp() : null,
      badge:
        status === "DONE" && eventCount > 0 ? `${eventCount} events` : null,
    };
  })();

  const allTasks: AgentTask[] = processingTask
    ? [processingTask, ...tasks, newsFetchTask]
    : [...tasks, newsFetchTask];

  const runningCount = allTasks.filter((t) => t.status === "RUNNING").length;
  const doneCount = allTasks.filter((t) => t.status === "DONE").length;
  const cycleProgress = Math.round((doneCount / allTasks.length) * 100);

  return (
    <div
      className="rounded-lg p-3 relative overflow-hidden"
      style={{
        background: "oklch(var(--card))",
        border: "1px solid oklch(var(--primary) / 0.35)",
        boxShadow:
          "0 0 20px oklch(0.6 0.18 240 / 0.15), 0 4px 24px oklch(0 0 0 / 0.4), inset 0 0 12px oklch(var(--primary) / 0.03)",
      }}
      data-ocid="agent-task-tracker"
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

      <div className="relative z-10 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-primary pulse-reactor" />
            <span className="text-[11px] font-mono text-primary/80 tracking-[0.3em] uppercase">
              Agent Tasks
            </span>
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded text-[8px] font-mono font-bold"
              style={{
                background: "oklch(var(--primary) / 0.15)",
                color: "oklch(var(--primary) / 0.9)",
                border: "1px solid oklch(var(--primary) / 0.35)",
              }}
            >
              {allTasks.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {runningCount > 0 && (
              <span
                className="text-[9px] font-mono tracking-wider animate-pulse"
                style={{ color: "oklch(0.75 0.15 200)" }}
                data-ocid="agent-task-tracker.loading_state"
              >
                {runningCount} ACTIVE
              </span>
            )}
            <span
              className="text-[9px] font-mono tracking-wider tabular-nums"
              style={{ color: "oklch(var(--muted-foreground) / 0.5)" }}
            >
              {doneCount}/{allTasks.length}
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        {/* Task list */}
        <div>
          {allTasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>

        {/* Cycle progress bar */}
        <div className="pt-1">
          <div className="flex items-center gap-1.5">
            <div
              className="flex-1 h-1 rounded-full overflow-hidden"
              style={{ background: "oklch(var(--muted) / 0.5)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${cycleProgress}%`,
                  background: "oklch(var(--primary) / 0.65)",
                  boxShadow: "0 0 4px oklch(var(--primary) / 0.5)",
                }}
              />
            </div>
            <span
              className="text-[9px] font-mono shrink-0 tracking-wider"
              style={{ color: "oklch(var(--muted-foreground) / 0.4)" }}
            >
              CYCLE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
