import {
  useGetAnalytics,
  useGetGNewsKey,
  useGetOpenRouterKey,
  useGetTier,
  useSetGNewsKey,
  useSetOpenRouterKey,
} from "@/hooks/useChat";
import { useEffect, useRef, useState } from "react";

interface ApiKeyConfigProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Tier config
// ---------------------------------------------------------------------------
const TIER_PLANS = [
  {
    id: "FREE",
    label: "FREE",
    price: "$0",
    features: [
      "50 API calls/hour",
      "Basic news feed",
      "Standard alerts",
      "Single briefing mode",
    ],
  },
  {
    id: "PRO",
    label: "PRO",
    price: "$9.99/mo",
    features: [
      "1,000 API calls/hour",
      "Live global intelligence",
      "Global briefing mode",
      "Priority alerts",
      "Analytics dashboard",
    ],
  },
  {
    id: "ENTERPRISE",
    label: "ENTERPRISE",
    price: "$99/mo",
    features: [
      "Unlimited API calls",
      "Multi-agent orchestration",
      "Custom alert rules",
      "Advanced analytics",
      "Priority support",
    ],
  },
] as const;

type TierKey = "FREE" | "PRO" | "ENTERPRISE";

const TIER_BADGE_CLASS: Record<TierKey, string> = {
  FREE: "tier-free",
  PRO: "tier-pro",
  ENTERPRISE: "tier-enterprise",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ApiKeyConfig({ onClose }: ApiKeyConfigProps) {
  // GNews key state
  const { data: savedGNewsKey, isLoading: gNewsLoading } = useGetGNewsKey();
  const {
    mutate: saveGNewsKey,
    isPending: gNewsPending,
    isSuccess: gNewsSuccess,
    isError: gNewsError,
  } = useSetGNewsKey();
  const [gNewsValue, setGNewsValue] = useState("");
  const [showGNews, setShowGNews] = useState(false);

  // OpenRouter key state
  const { data: savedOpenRouterKey, isLoading: orLoading } =
    useGetOpenRouterKey();
  const {
    mutate: saveOpenRouterKey,
    isPending: orPending,
    isSuccess: orSuccess,
    isError: orError,
  } = useSetOpenRouterKey();
  const [orValue, setOrValue] = useState("");
  const [showOR, setShowOR] = useState(false);

  // Tier & analytics
  const { data: tier = "FREE" } = useGetTier();
  const { data: analytics } = useGetAnalytics();
  const [upgradeNote, setUpgradeNote] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (savedGNewsKey !== undefined) setGNewsValue(savedGNewsKey);
  }, [savedGNewsKey]);
  useEffect(() => {
    if (savedOpenRouterKey !== undefined) setOrValue(savedOpenRouterKey);
  }, [savedOpenRouterKey]);
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  function handleSaveGNews() {
    saveGNewsKey(gNewsValue.trim());
  }
  function handleClearGNews() {
    setGNewsValue("");
    saveGNewsKey("");
  }
  function handleSaveOR() {
    saveOpenRouterKey(orValue.trim());
  }
  function handleClearOR() {
    setOrValue("");
    saveOpenRouterKey("");
  }

  const currentTier =
    (tier as TierKey) in TIER_BADGE_CLASS ? (tier as TierKey) : "FREE";
  const apiCallsUsed = analytics?.apiCallsThisHour ?? 0;
  const apiLimit =
    currentTier === "FREE"
      ? 50
      : currentTier === "PRO"
        ? 1000
        : Number.POSITIVE_INFINITY;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      data-ocid="api-config-overlay"
    >
      <div className="relative w-full max-w-md mx-4 rounded-lg border border-primary/40 bg-card shadow-[0_0_40px_0px_oklch(0.75_0.18_90/0.20)] overflow-hidden hud-flicker">
        {/* Top accent bar */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h2 className="font-mono text-sm font-bold text-primary tracking-[0.2em] uppercase text-glow-gold">
              API Configuration
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close configuration panel"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded border border-border/50 bg-muted/20 text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors duration-200 font-mono text-sm"
            data-ocid="api-config-close"
          >
            ×
          </button>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

        {/* Body */}
        <div className="px-5 py-5 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* ── GNews Section ── */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="gnews-api-key"
                className="block text-[11px] font-mono text-primary/70 tracking-[0.25em] uppercase mb-1"
              >
                GNews API Key
              </label>
              <p className="text-[10px] font-mono text-muted-foreground/50 tracking-wider">
                Used by F.R.I.D.A.Y. to fetch live news in the World Monitor
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  id="gnews-api-key"
                  ref={inputRef}
                  type={showGNews ? "text" : "password"}
                  value={gNewsValue}
                  onChange={(e) => setGNewsValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveGNews();
                  }}
                  placeholder="Paste your GNews API key here"
                  disabled={gNewsLoading}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full h-9 px-3 rounded border border-border/60 bg-muted/20 text-primary font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/70 focus:ring-1 focus:ring-primary/30 transition-colors duration-200 disabled:opacity-50"
                  data-ocid="gnews-api-key-input"
                />
              </div>
              <button
                type="button"
                aria-label={
                  showGNews ? "Hide GNews API key" : "Show GNews API key"
                }
                onClick={() => setShowGNews((v) => !v)}
                className="h-9 w-9 flex items-center justify-center rounded border border-border/50 bg-muted/20 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors duration-200 text-xs font-mono shrink-0"
                data-ocid="gnews-key-visibility-toggle"
              >
                {showGNews ? "🙈" : "👁"}
              </button>
            </div>

            {gNewsSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded border border-primary/30 bg-primary/5">
                <span className="text-primary text-xs">⬡</span>
                <span className="text-[11px] font-mono text-primary/80 tracking-wider">
                  GNews key saved — World Monitor is now live
                </span>
              </div>
            )}
            {gNewsError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded border border-destructive/30 bg-destructive/5">
                <span className="text-destructive text-xs">⚠</span>
                <span className="text-[11px] font-mono text-destructive/80 tracking-wider">
                  Save failed — please try again
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveGNews}
                disabled={gNewsPending || gNewsLoading || !gNewsValue.trim()}
                className="flex-1 h-9 rounded border border-primary/60 bg-primary/10 text-primary font-mono text-sm tracking-[0.15em] uppercase hover:bg-primary/20 hover:border-primary/80 hover:shadow-[0_0_12px_0px_oklch(0.75_0.18_90/0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                data-ocid="gnews-key-save-btn"
              >
                {gNewsPending ? "Saving…" : "Save Key"}
              </button>
              <button
                type="button"
                onClick={handleClearGNews}
                disabled={gNewsPending || gNewsLoading || !savedGNewsKey}
                aria-label="Clear saved GNews API key"
                className="h-9 px-3 rounded border border-border/50 bg-muted/20 text-muted-foreground font-mono text-xs tracking-wider uppercase hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                data-ocid="gnews-key-clear-btn"
              >
                Clear
              </button>
            </div>

            <p className="text-center text-[10px] font-mono text-muted-foreground/40 tracking-wider">
              No key yet?{" "}
              <a
                href="https://gnews.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary/60 hover:text-primary underline underline-offset-2 transition-colors duration-200"
              >
                Get a free key at gnews.io
              </a>
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

          {/* ── OpenRouter Section ── */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="openrouter-api-key"
                className="block text-[11px] font-mono text-primary/70 tracking-[0.25em] uppercase mb-1"
              >
                OpenRouter API Key
              </label>
              <p className="text-[10px] font-mono text-muted-foreground/50 tracking-wider">
                Powers F.R.I.D.A.Y.'s intelligent AI responses via OpenRouter
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  id="openrouter-api-key"
                  type={showOR ? "text" : "password"}
                  value={orValue}
                  onChange={(e) => setOrValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveOR();
                  }}
                  placeholder="Paste your OpenRouter API key here"
                  disabled={orLoading}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full h-9 px-3 rounded border border-border/60 bg-muted/20 text-primary font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/70 focus:ring-1 focus:ring-primary/30 transition-colors duration-200 disabled:opacity-50"
                  data-ocid="openrouter-api-key-input"
                />
              </div>
              <button
                type="button"
                aria-label={
                  showOR ? "Hide OpenRouter API key" : "Show OpenRouter API key"
                }
                onClick={() => setShowOR((v) => !v)}
                className="h-9 w-9 flex items-center justify-center rounded border border-border/50 bg-muted/20 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors duration-200 text-xs font-mono shrink-0"
                data-ocid="openrouter-key-visibility-toggle"
              >
                {showOR ? "🙈" : "👁"}
              </button>
            </div>

            {orSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded border border-primary/30 bg-primary/5">
                <span className="text-primary text-xs">⬡</span>
                <span className="text-[11px] font-mono text-primary/80 tracking-wider">
                  OpenRouter key saved — F.R.I.D.A.Y. AI engine connected
                </span>
              </div>
            )}
            {orError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded border border-destructive/30 bg-destructive/5">
                <span className="text-destructive text-xs">⚠</span>
                <span className="text-[11px] font-mono text-destructive/80 tracking-wider">
                  Save failed — please try again
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveOR}
                disabled={orPending || orLoading || !orValue.trim()}
                className="flex-1 h-9 rounded border border-primary/60 bg-primary/10 text-primary font-mono text-sm tracking-[0.15em] uppercase hover:bg-primary/20 hover:border-primary/80 hover:shadow-[0_0_12px_0px_oklch(0.75_0.18_90/0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                data-ocid="openrouter-key-save-btn"
              >
                {orPending ? "Saving…" : "Save Key"}
              </button>
              <button
                type="button"
                onClick={handleClearOR}
                disabled={orPending || orLoading || !savedOpenRouterKey}
                aria-label="Clear saved OpenRouter API key"
                className="h-9 px-3 rounded border border-border/50 bg-muted/20 text-muted-foreground font-mono text-xs tracking-wider uppercase hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                data-ocid="openrouter-key-clear-btn"
              >
                Clear
              </button>
            </div>

            <p className="text-center text-[10px] font-mono text-muted-foreground/40 tracking-wider">
              No key yet?{" "}
              <a
                href="https://openrouter.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary/60 hover:text-primary underline underline-offset-2 transition-colors duration-200"
              >
                Get a free key at openrouter.ai
              </a>
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

          {/* ── SUBSCRIPTION Section ── */}
          <div className="space-y-4" data-ocid="subscription-section">
            <div className="flex items-center gap-3">
              <div className="w-1 h-4 rounded-full bg-primary/60" />
              <span className="text-[11px] font-mono text-primary/70 tracking-[0.25em] uppercase font-bold">
                Subscription
              </span>
            </div>

            {/* Current tier + usage */}
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded"
              style={{
                border: "1px solid oklch(var(--border) / 0.4)",
                background: "oklch(var(--muted) / 0.1)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground/50 tracking-widest">
                  CURRENT TIER
                </span>
                <span
                  className={`text-[10px] font-mono tracking-widest px-2 py-0.5 rounded ${TIER_BADGE_CLASS[currentTier]}`}
                  data-ocid="subscription.current-tier"
                >
                  {currentTier}
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/45 tracking-wider">
                {apiCallsUsed} /{" "}
                {apiLimit === Number.POSITIVE_INFINITY ? "∞" : apiLimit} calls
                this hour
              </span>
            </div>

            {/* API usage bar */}
            {apiLimit !== Number.POSITIVE_INFINITY && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[9px] font-mono text-muted-foreground/40 tracking-wider">
                    API USAGE
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground/40 tracking-wider">
                    {Math.min(100, Math.round((apiCallsUsed / apiLimit) * 100))}
                    %
                  </span>
                </div>
                <div
                  className="h-1 rounded-full overflow-hidden"
                  style={{ background: "oklch(var(--muted) / 0.3)" }}
                >
                  <div
                    className="h-full rounded-full progress-bar-fill transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((apiCallsUsed / apiLimit) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Tier cards */}
            <div className="grid grid-cols-3 gap-2">
              {TIER_PLANS.map((plan) => {
                const isActive = currentTier === plan.id;
                const isFree = plan.id === "FREE";
                return (
                  <div
                    key={plan.id}
                    className={`flex flex-col gap-2 p-2.5 rounded transition-all duration-200 ${isActive ? "ring-1 ring-primary/50" : ""}`}
                    style={{
                      border: isActive
                        ? "1px solid oklch(var(--primary) / 0.6)"
                        : "1px solid oklch(var(--border) / 0.4)",
                      background: isActive
                        ? "oklch(var(--primary) / 0.06)"
                        : "oklch(var(--muted) / 0.08)",
                    }}
                    data-ocid={`subscription.plan-${plan.id.toLowerCase()}`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded w-fit ${TIER_BADGE_CLASS[plan.id as TierKey]}`}
                      >
                        {plan.label}
                      </span>
                      <span className="text-[12px] font-display font-bold text-foreground/90 mt-1">
                        {plan.price}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-0.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-1">
                          <span className="text-primary/40 text-[8px] mt-px shrink-0">
                            ▸
                          </span>
                          <span className="text-[8px] font-mono text-muted-foreground/55 leading-snug">
                            {f}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {isActive ? (
                      <span className="text-[8px] font-mono text-primary/60 tracking-widest text-center">
                        ACTIVE
                      </span>
                    ) : isFree ? null : (
                      <button
                        type="button"
                        onClick={() =>
                          setUpgradeNote(
                            `Contact support to upgrade to ${plan.label}.`,
                          )
                        }
                        data-ocid={`subscription.upgrade-${plan.id.toLowerCase()}-btn`}
                        className="w-full h-6 rounded text-[8px] font-mono tracking-widest uppercase transition-all duration-200 border border-primary/40 text-primary/70 hover:border-primary/70 hover:text-primary hover:bg-primary/08"
                      >
                        UPGRADE
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Upgrade note */}
            {upgradeNote && (
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded border border-primary/30 bg-primary/5"
                data-ocid="subscription.upgrade-note"
              >
                <span className="text-primary text-xs mt-0.5 shrink-0">ℹ</span>
                <div className="flex-1">
                  <p className="text-[11px] font-mono text-primary/80 tracking-wider leading-relaxed">
                    {upgradeNote}
                  </p>
                  <a
                    href="https://caffeine.ai?utm_source=meshgen-upgrade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono text-primary/60 hover:text-primary underline underline-offset-2 transition-colors duration-200 tracking-wider"
                  >
                    Contact Caffeine Support →
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => setUpgradeNote(null)}
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors text-xs shrink-0"
                  aria-label="Dismiss note"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom accent bars */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent mt-px" />
      </div>
    </div>
  );
}
