import { useEffect, useState } from "react";

// Panel wrapper consistent with HUD design system
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
      {/* Scan-line texture */}
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

export default function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  const [tick, setTick] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      setTick((t) => !t);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  const s = now.getSeconds().toString().padStart(2, "0");

  const dayName = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
  const monthDay = now
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
  const year = now.getFullYear();

  // UTC offset string e.g. "+05:30"
  const utcOffset = now.toTimeString().slice(9, 15);

  // Timezone abbreviation
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <HudPanel data-ocid="live-clock">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full bg-primary pulse-reactor" />
        <span className="text-[11px] font-mono text-primary/80 tracking-[0.3em] uppercase">
          System Time
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full bg-primary"
            style={{
              animation: "reactor-pulse 1s ease-in-out infinite",
              animationDelay: `${tick ? "0s" : "0.5s"}`,
            }}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-3" />

      {/* Clock display */}
      <div
        className="flex items-baseline gap-1.5 justify-center"
        aria-live="polite"
        aria-label={`Current time: ${h}:${m}:${s}`}
      >
        <span
          className="text-3xl font-mono font-bold text-primary text-glow-gold tabular-nums leading-none tracking-widest"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {h}
        </span>
        <span
          className="text-2xl font-mono font-bold text-primary/60 leading-none"
          style={{ opacity: tick ? 1 : 0.3, transition: "opacity 0.15s" }}
        >
          :
        </span>
        <span className="text-3xl font-mono font-bold text-primary text-glow-gold tabular-nums leading-none tracking-widest">
          {m}
        </span>
        <span
          className="text-2xl font-mono font-bold text-primary/60 leading-none"
          style={{ opacity: tick ? 1 : 0.3, transition: "opacity 0.15s" }}
        >
          :
        </span>
        <span className="text-3xl font-mono font-bold text-primary/90 text-glow-gold tabular-nums leading-none tracking-widest">
          {s}
        </span>
      </div>

      {/* Date */}
      <div className="flex items-center justify-center gap-2 mt-2">
        <span className="text-[11px] font-mono text-foreground/60 tracking-[0.2em]">
          {dayName}
        </span>
        <span className="text-[9px] text-border/60">·</span>
        <span className="text-[11px] font-mono text-foreground/60 tracking-[0.2em]">
          {monthDay} {year}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent mt-3 mb-2" />

      {/* UTC offset + timezone */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse" />
          <span className="text-[10px] font-mono text-muted-foreground/50 tracking-widest">
            UTC{utcOffset}
          </span>
        </div>
        <span
          className="text-[9px] font-mono text-muted-foreground/35 tracking-wider truncate max-w-[120px] text-right"
          title={tz}
        >
          {tz.split("/").pop()?.replace(/_/g, " ") ?? tz}
        </span>
      </div>
    </HudPanel>
  );
}
