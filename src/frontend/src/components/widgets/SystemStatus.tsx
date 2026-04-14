import { Skeleton } from "@/components/ui/skeleton";
import { useGetLlmStatus, useSystemInfo } from "@/hooks/useChat";
import type { LlmStatus } from "@/hooks/useChat";
import { Activity, HardDrive, MessageSquare, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Panel wrapper — consistent HUD style
// ---------------------------------------------------------------------------
function HudPanel({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg p-4 relative overflow-hidden ${className}`}
      style={{
        background: "oklch(var(--card))",
        border: "1px solid oklch(var(--border))",
        boxShadow:
          "0 0 20px oklch(0.6 0.18 240 / 0.15), 0 4px 24px oklch(0 0 0 / 0.4), inset 0 0 12px oklch(var(--primary) / 0.03)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-lg"
        aria-hidden="true"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(0 0 0 / 0.03) 2px, oklch(0 0 0 / 0.03) 4px)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Uptime counter from page load
// ---------------------------------------------------------------------------
const PAGE_LOAD = Date.now();

function useUptime() {
  const [uptime, setUptime] = useState("00:00:00");
  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - PAGE_LOAD) / 1000);
      const h = Math.floor(elapsed / 3600)
        .toString()
        .padStart(2, "0");
      const min = Math.floor((elapsed % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const sec = (elapsed % 60).toString().padStart(2, "0");
      setUptime(`${h}:${min}:${sec}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return uptime;
}

// ---------------------------------------------------------------------------
// Fluctuating load value
// ---------------------------------------------------------------------------
function useFluctuatingValue(min: number, max: number, interval = 2500) {
  const [value, setValue] = useState(() => min + Math.random() * (max - min));
  useEffect(() => {
    const id = setInterval(() => {
      setValue((prev) => {
        const delta = (Math.random() - 0.5) * 8;
        return Math.min(max, Math.max(min, prev + delta));
      });
    }, interval);
    return () => clearInterval(id);
  }, [min, max, interval]);
  return value;
}

// ---------------------------------------------------------------------------
// Load bar component — color shifts green → amber → red
// ---------------------------------------------------------------------------
function LoadBar({ value, label }: { value: number; label: string }) {
  const barColor =
    value >= 90
      ? "bg-red-500/80"
      : value >= 75
        ? "bg-amber-500/80"
        : "bg-green-500/70";

  const glowColor =
    value >= 90
      ? "0 0 8px oklch(0.6 0.22 25 / 0.6)"
      : value >= 75
        ? "0 0 8px oklch(0.75 0.18 85 / 0.5)"
        : "0 0 8px oklch(0.65 0.2 145 / 0.5)";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-muted-foreground/60 tracking-wider">
          {label}
        </span>
        <span
          className={`text-[11px] font-mono font-semibold tabular-nums ${
            value >= 90
              ? "text-red-400"
              : value >= 75
                ? "text-amber-400"
                : "text-green-400"
          }`}
        >
          {value.toFixed(1)}%
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "oklch(var(--muted) / 0.6)" }}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${value}%`, boxShadow: glowColor }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status row
// ---------------------------------------------------------------------------
interface StatusRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  dotColor: string;
  valueClass?: string;
}

function StatusRow({
  icon: Icon,
  label,
  value,
  dotColor,
  valueClass = "text-primary/80",
}: StatusRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
        <span className="text-[10px] font-mono text-muted-foreground/60 tracking-wider truncate">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`} />
        <span
          className={`text-[11px] font-mono font-semibold tabular-nums ${valueClass}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LLM status banner — shown when degraded or offline
// ---------------------------------------------------------------------------
interface LlmStatusConfig {
  dot: string;
  label: string;
  bannerBg: string;
  bannerBorder: string;
  bannerText: string;
  statusDot: string;
  statusLabel: string;
  statusValueClass: string;
}

function getLlmStatusConfig(status: LlmStatus): LlmStatusConfig {
  switch (status) {
    case "online":
      return {
        dot: "bg-green-400",
        label: "All systems nominal",
        bannerBg: "",
        bannerBorder: "",
        bannerText: "",
        statusDot: "bg-green-400",
        statusLabel: "ONLINE",
        statusValueClass: "text-green-400",
      };
    case "degraded":
      return {
        dot: "bg-amber-400 animate-pulse",
        label: "Intelligence core: reduced capacity",
        bannerBg: "rgba(217,119,6,0.08)",
        bannerBorder: "rgba(217,119,6,0.3)",
        bannerText:
          "Intelligence core in reduced mode — using cached responses",
        statusDot: "bg-amber-400",
        statusLabel: "DEGRADED",
        statusValueClass: "text-amber-400",
      };
    case "offline":
      return {
        dot: "bg-red-400",
        label: "Intelligence core offline",
        bannerBg: "rgba(220,38,38,0.08)",
        bannerBorder: "rgba(220,38,38,0.3)",
        bannerText: "Intelligence core offline — map & alerts unaffected",
        statusDot: "bg-red-400",
        statusLabel: "OFFLINE",
        statusValueClass: "text-red-400",
      };
  }
}

// ---------------------------------------------------------------------------
// SystemStatus component
// ---------------------------------------------------------------------------
export default function SystemStatus() {
  const { data: sysInfo, isLoading } = useSystemInfo();
  const { data: llmStatus = "online" } = useGetLlmStatus();
  const uptime = useUptime();
  const coreLoad = useFluctuatingValue(85, 99, 2500);
  const memSync = useFluctuatingValue(60, 100, 3200);

  // Animated status dot — blinks once on mount
  const [statusBlink, setStatusBlink] = useState(false);
  const blinkRef = useRef(false);
  useEffect(() => {
    if (!blinkRef.current) {
      blinkRef.current = true;
      setStatusBlink(true);
      setTimeout(() => setStatusBlink(false), 800);
    }
  }, []);

  const cfg = getLlmStatusConfig(llmStatus);
  const showBanner = llmStatus !== "online";

  return (
    <HudPanel data-ocid="system-status">
      {/* LLM status banner — degraded or offline */}
      {showBanner && (
        <div
          className="flex items-center gap-2 -mx-4 -mt-4 mb-3 px-3 py-2 rounded-t-lg"
          style={{
            background: cfg.bannerBg,
            borderBottom: `1px solid ${cfg.bannerBorder}`,
          }}
          data-ocid="llm-status-banner"
          aria-live="polite"
        >
          <div
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`}
            aria-hidden="true"
          />
          <span
            className="text-[10px] font-mono tracking-wider leading-tight"
            style={{
              color:
                llmStatus === "offline"
                  ? "oklch(0.7 0.2 25)"
                  : "oklch(0.78 0.16 75)",
            }}
          >
            {cfg.bannerText}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-primary pulse-reactor" />
          <span className="text-[11px] font-mono text-primary/80 tracking-[0.3em] uppercase">
            System Status
          </span>
        </div>
        <div
          className={`w-2 h-2 rounded-full ${statusBlink ? "bg-primary scale-125" : cfg.dot} transition-all duration-300`}
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-3" />

      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton
              key={n}
              className="h-5 w-full rounded"
              style={{ background: "oklch(var(--muted) / 0.5)" }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-0.5">
          {/* LLM core status row — dynamic */}
          <StatusRow
            icon={Activity}
            label="LLM CORE"
            value={cfg.statusLabel}
            dotColor={cfg.statusDot}
            valueClass={cfg.statusValueClass}
          />
          <StatusRow
            icon={MessageSquare}
            label="MSG COUNT"
            value={sysInfo?.messageCount?.toString() ?? "0"}
            dotColor="bg-primary"
            valueClass="text-primary/90"
          />
          <StatusRow
            icon={Timer}
            label="UPTIME"
            value={uptime}
            dotColor="bg-border"
            valueClass="text-foreground/60"
          />

          {/* Divider before bars */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent my-2" />

          {/* Core load bar */}
          <LoadBar value={coreLoad} label="NEURAL CORE LOAD" />

          {/* Memory sync bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                <span className="text-[10px] font-mono text-muted-foreground/60 tracking-wider">
                  MEMORY SYNC
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent/70 animate-pulse" />
                <span className="text-[11px] font-mono font-semibold tabular-nums text-accent/90">
                  {memSync.toFixed(1)}%
                </span>
              </div>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "oklch(var(--muted) / 0.6)" }}
            >
              <div
                className="h-full rounded-full bg-accent/70 transition-all duration-700"
                style={{
                  width: `${memSync}%`,
                  boxShadow: "0 0 6px oklch(0.72 0.15 70 / 0.5)",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </HudPanel>
  );
}
