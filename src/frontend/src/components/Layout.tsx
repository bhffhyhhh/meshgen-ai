import ApiKeyConfig from "@/components/ApiKeyConfig";
import ArcReactor from "@/components/ArcReactor";
import { Separator } from "@/components/ui/separator";
import { useSystemInfo } from "@/hooks/useChat";
import { Settings, Wifi, WifiOff } from "lucide-react";
import { type ReactNode, useState } from "react";

interface LayoutProps {
  children: ReactNode;
}

function PulsingDot({
  color = "bg-primary",
  size = "w-2 h-2",
}: { color?: string; size?: string }) {
  return (
    <span
      className={`inline-block rounded-full animate-pulse ${color} ${size}`}
    />
  );
}

function Header() {
  const { data: sysInfo } = useSystemInfo();
  const [configOpen, setConfigOpen] = useState(false);
  const isOnline = sysInfo?.status === "ONLINE" || !sysInfo;

  return (
    <>
      <header
        className="sticky top-0 z-50 hud-flicker"
        style={{
          background: "oklch(var(--card))",
          borderBottom: "1px solid oklch(var(--border))",
          boxShadow:
            "0 0 20px oklch(0.6 0.18 240 / 0.15), 0 2px 8px oklch(0 0 0 / 0.4)",
        }}
        data-ocid="header"
      >
        {/* Top gold accent bar */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

        <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Left — logo + branding */}
          <div className="flex items-center gap-3 min-w-0">
            <ArcReactor size={40} />
            <div className="min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-bold text-primary leading-none text-glow-gold animate-text-glow truncate tracking-wider">
                MESHGEN AI
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <PulsingDot color="bg-green-400" size="w-1.5 h-1.5" />
                <p className="text-[10px] font-mono text-green-400/80 tracking-[0.25em] uppercase">
                  F.R.I.D.A.Y. ONLINE
                </p>
              </div>
            </div>
          </div>

          {/* Center — HUD matrix decorative (md+) */}
          <div className="hidden md:flex flex-col items-center gap-1 flex-1 max-w-sm">
            <div className="flex items-center gap-1 w-full">
              {["SYS", "NET", "GPU", "I/O"].map((label, i) => (
                <div key={label} className="flex items-center gap-1 flex-1">
                  {i > 0 && <div className="h-px flex-1 bg-border/40" />}
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/50 bg-muted/20">
                    <PulsingDot size="w-1.5 h-1.5" />
                    <span className="text-[9px] font-mono text-primary/60 tracking-wider">
                      {label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground/40 tracking-widest">
              <span>MESH NETWORK ACTIVE</span>
              <span className="text-primary/40">·</span>
              <span>NEURAL CORE ENGAGED</span>
            </div>
          </div>

          {/* Right — status + settings */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-3 h-3 text-green-400/70" />
                ) : (
                  <WifiOff className="w-3 h-3 text-destructive/60" />
                )}
                <span
                  className={`text-[11px] font-mono tracking-wider ${isOnline ? "text-green-400/90" : "text-destructive/70"}`}
                >
                  {sysInfo?.status ?? "INITIALIZING"}
                </span>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground/50 tracking-widest">
                {sysInfo?.uptimePlaceholder ?? "UP: ——"}
              </span>
            </div>

            <Separator
              orientation="vertical"
              className="h-8 hidden sm:block opacity-30"
            />

            <div className="flex flex-col items-center gap-0.5 min-w-[32px]">
              <span className="text-[16px] font-mono font-bold text-primary text-glow-gold leading-none tabular-nums">
                {sysInfo?.messageCount?.toString() ?? "0"}
              </span>
              <span className="text-[8px] font-mono text-muted-foreground/50 tracking-widest uppercase">
                MSGS
              </span>
            </div>

            <Separator orientation="vertical" className="h-8 opacity-30" />

            <button
              type="button"
              aria-label="Open API configuration"
              onClick={() => setConfigOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded border border-border/50 bg-muted/20 text-muted-foreground hover:text-primary hover:border-primary/60 hover:bg-primary/10 hover:shadow-[0_0_8px_oklch(0.8_0.18_90/0.25)] transition-all duration-150"
              data-ocid="open-config-btn"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        {/* Bottom scan-line accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </header>

      {configOpen && <ApiKeyConfig onClose={() => setConfigOpen(false)} />}
    </>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const caffeineUrl = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`;

  return (
    <footer
      className="mt-auto"
      style={{
        background: "oklch(var(--card))",
        borderTop: "1px solid oklch(var(--border))",
      }}
      data-ocid="footer"
    >
      <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Left — status signal */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1 h-1 rounded-full bg-primary/40 animate-pulse"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </div>
          <span className="text-[9px] font-mono text-muted-foreground/40 tracking-widest uppercase">
            ALL SYSTEMS NOMINAL · MESH GENERATION READY
          </span>
          <span className="hidden sm:inline text-[9px] font-mono text-muted-foreground/30 tracking-widest">
            ·
          </span>
          <span className="hidden sm:inline text-[9px] font-mono text-primary/40 tracking-widest uppercase">
            V2.4.1
          </span>
        </div>

        {/* Right — branding */}
        <p className="text-[9px] font-mono text-muted-foreground/35 tracking-wide">
          © {year}.{" "}
          <a
            href={caffeineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/45 hover:text-primary/80 transition-colors duration-200"
          >
            Built with love using caffeine.ai
          </a>{" "}
          ·{" "}
          <span className="text-primary/35 tracking-widest">
            CAFFEINE PLATFORM
          </span>
        </p>
      </div>
    </footer>
  );
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Scan-line overlay over the whole app */}
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        aria-hidden="true"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(0 0 0 / 0.025) 2px, oklch(0 0 0 / 0.025) 4px)",
        }}
      />

      {/* Ambient background glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, oklch(0.25 0.08 240 / 0.18) 0%, transparent 70%), radial-gradient(ellipse 40% 30% at 80% 100%, oklch(0.60 0.12 90 / 0.10) 0%, transparent 60%)",
        }}
      />

      <Header />

      <main className="flex-1 relative z-10 overflow-hidden">{children}</main>

      <Footer />
    </div>
  );
}
