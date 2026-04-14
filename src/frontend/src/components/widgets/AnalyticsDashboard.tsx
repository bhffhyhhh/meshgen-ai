import { Skeleton } from "@/components/ui/skeleton";
import { useGetAnalytics, useGetTier } from "@/hooks/useChat";
import type { AnalyticsSnapshot } from "@/types/chat";
import { BarChart2, TrendingUp } from "lucide-react";
import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Tier limits
// ---------------------------------------------------------------------------
const TIER_LIMITS: Record<string, number> = {
  FREE: 20,
  PRO: 200,
  ENTERPRISE: 99999,
};

// ---------------------------------------------------------------------------
// Sparkline — 24 hourly bars derived from eventsToday
// ---------------------------------------------------------------------------
function Sparkline({ eventsToday }: { eventsToday: number }) {
  const bars = useMemo(() => {
    const now = new Date().getHours();
    return Array.from({ length: 24 }, (_, i) => {
      // Simulate hourly distribution with a peak around now
      const distance = Math.abs(i - now);
      const base = Math.max(0, 1 - distance / 12);
      const noise = 0.3 + Math.abs(Math.sin(i * 2.3 + 1)) * 0.7;
      const raw = base * noise * (eventsToday > 0 ? eventsToday / 8 : 4);
      const normalized = Math.min(48, Math.max(8, Math.round(raw)));
      return { h: normalized, hour: i };
    });
  }, [eventsToday]);

  return (
    <div className="flex items-end gap-[3px] h-12 py-0.5" aria-hidden="true">
      {bars.map(({ h, hour }) => (
        <div
          key={hour}
          className="sparkline-bar rounded-sm w-[4px] shrink-0 transition-all duration-500"
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric card
// ---------------------------------------------------------------------------
interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function MetricCard({ label, value, icon }: MetricCardProps) {
  return (
    <div
      className="hud-panel rounded p-2.5 flex flex-col gap-1 relative overflow-hidden"
      data-ocid={`analytics.metric.${label.toLowerCase().replace(/\s+/g, "_")}`}
    >
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/30 rounded-tl" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/20 rounded-br" />
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono text-muted-foreground/50 tracking-widest uppercase truncate">
          {label}
        </span>
        <span className="text-muted-foreground/30 shrink-0">{icon}</span>
      </div>
      <span className="text-xl font-display text-primary text-glow-gold tabular-nums leading-none">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// API usage bar
// ---------------------------------------------------------------------------
interface UsageBarProps {
  used: number;
  limit: number;
  tier: string;
}

function UsageBar({ used, limit, tier }: UsageBarProps) {
  const isEnterprise = tier.toUpperCase() === "ENTERPRISE";
  const pct = isEnterprise
    ? 5
    : Math.min(100, Math.round((used / limit) * 100));
  const isCritical = pct >= 90;
  const isHigh = pct >= 70;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono text-muted-foreground/50 tracking-widest uppercase">
          API CALLS / HOUR
        </span>
        <span
          className={`text-[9px] font-mono tabular-nums ${
            isCritical
              ? "text-red-400"
              : isHigh
                ? "text-amber-400"
                : "text-primary/60"
          }`}
        >
          {isEnterprise ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border/30 overflow-hidden">
        <div
          className="h-full rounded-full progress-bar-fill transition-all duration-700"
          style={{ width: `${pct}%` }}
          data-ocid="analytics.usage_bar"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier badge
// ---------------------------------------------------------------------------
function TierBadge({ tier }: { tier: string }) {
  const t = tier.toUpperCase();
  const cls =
    t === "ENTERPRISE"
      ? "tier-enterprise"
      : t === "PRO"
        ? "tier-pro"
        : "tier-free";

  const label =
    t === "ENTERPRISE"
      ? "ENTERPRISE TIER"
      : t === "PRO"
        ? "PRO TIER"
        : "FREE TIER";

  return (
    <span
      className={`text-[8px] font-mono tracking-widest uppercase rounded px-2 py-0.5 font-bold ${cls}`}
      data-ocid="analytics.tier_badge"
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Analytics skeleton
// ---------------------------------------------------------------------------
function AnalyticsSkeleton() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        {(["a", "b", "c", "d"] as const).map((id) => (
          <Skeleton key={id} className="h-14 rounded" />
        ))}
      </div>
      <Skeleton className="h-12 rounded" />
      <Skeleton className="h-6 rounded" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AnalyticsDashboard() {
  const { data: analytics, isLoading } = useGetAnalytics();
  const { data: tier = "FREE" } = useGetTier();

  const snap: AnalyticsSnapshot = analytics ?? {
    eventsToday: 0,
    locationsTracked: 0,
    videosGenerated: 0,
    alertsDismissed: 0,
    apiCallsThisHour: 0,
    tier: "FREE",
  };

  const tierKey = tier.toUpperCase();
  const limit = TIER_LIMITS[tierKey] ?? 20;
  const isFreeTier = tierKey === "FREE";

  return (
    <div
      className="hud-panel scan-line rounded-lg p-3 flex flex-col relative overflow-hidden"
      data-ocid="analytics.panel"
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40 rounded-tl-lg pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/40 rounded-tr-lg pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/30 rounded-bl-lg pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/30 rounded-br-lg pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-primary/50" />
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold text-primary/70">
            ANALYTICS
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <TierBadge tier={tier} />
          <BarChart2 className="w-3 h-3 text-muted-foreground/30" />
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-1 mb-2.5">
        <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
        <TrendingUp className="w-2.5 h-2.5 text-primary/40" />
        <div className="flex-1 h-px bg-gradient-to-l from-primary/30 to-transparent" />
      </div>

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : (
        <div className="space-y-3">
          {/* 2×2 metric grid */}
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Events Today"
              value={snap.eventsToday}
              icon={<span className="text-[10px]">⚡</span>}
            />
            <MetricCard
              label="Locations"
              value={snap.locationsTracked}
              icon={<span className="text-[10px]">📍</span>}
            />
            <MetricCard
              label="Videos"
              value={snap.videosGenerated}
              icon={<span className="text-[10px]">🎥</span>}
            />
            <MetricCard
              label="Dismissed"
              value={snap.alertsDismissed}
              icon={<span className="text-[10px]">🔕</span>}
            />
          </div>

          {/* Sparkline */}
          <div className="hud-panel rounded p-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono text-muted-foreground/40 tracking-widest uppercase">
                24H ACTIVITY
              </span>
              <span className="text-[9px] font-mono text-primary/40 tabular-nums">
                {snap.eventsToday} events
              </span>
            </div>
            <Sparkline eventsToday={snap.eventsToday} />
          </div>

          {/* API Usage */}
          <div className="hud-panel rounded p-2 space-y-2">
            <UsageBar used={snap.apiCallsThisHour} limit={limit} tier={tier} />
            {isFreeTier && (
              <p
                className="text-[9px] font-mono text-primary/40 tracking-wider"
                data-ocid="analytics.upgrade_cta"
              >
                ↑ Upgrade to Pro for higher limits
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-1.5 pt-2 mt-1.5 border-t border-border/20">
        <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse shrink-0" />
        <span className="text-[9px] font-mono text-muted-foreground/40 tracking-widest truncate">
          F.R.I.D.A.Y. · LIVE TELEMETRY
        </span>
        <span className="ml-auto text-[8px] font-mono text-muted-foreground/25 shrink-0">
          5m
        </span>
      </div>
    </div>
  );
}
