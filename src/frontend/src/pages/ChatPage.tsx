import ArcReactor from "@/components/ArcReactor";
import ChatInput from "@/components/ChatInput";
import ChatMessageComponent from "@/components/ChatMessage";
import VoiceTab from "@/components/VoiceTab";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import AgentTaskTracker from "@/components/widgets/AgentTaskTracker";
import AnalyticsDashboard from "@/components/widgets/AnalyticsDashboard";
import LiveClock from "@/components/widgets/LiveClock";
import MapTracking from "@/components/widgets/MapTracking";
import MultiAgentHUD from "@/components/widgets/MultiAgentHUD";
import SmartAlerts from "@/components/widgets/SmartAlerts";
import SystemStatus from "@/components/widgets/SystemStatus";
import TransportTracker from "@/components/widgets/TransportTracker";
import WorldMonitor from "@/components/widgets/WorldMonitor";
import {
  useChatHistory,
  useClearChat,
  useGetLlmStatus,
  useSendMessage,
} from "@/hooks/useChat";
import type { LlmStatus } from "@/hooks/useChat";
import type { ChatMessage } from "@/types/chat";
import { AlertTriangle, Trash2, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Degraded mode banner
// ---------------------------------------------------------------------------
function DegradedBanner({ status }: { status: LlmStatus }) {
  if (status === "online") return null;

  const isDegraded = status === "degraded";
  const bannerStyle = isDegraded
    ? {
        background: "rgba(217,119,6,0.08)",
        borderBottom: "1px solid rgba(217,119,6,0.25)",
      }
    : {
        background: "rgba(220,38,38,0.08)",
        borderBottom: "1px solid rgba(220,38,38,0.25)",
      };
  const dotClass = isDegraded ? "bg-amber-400 animate-pulse" : "bg-red-400";
  const textColor = isDegraded ? "oklch(0.78 0.16 75)" : "oklch(0.7 0.2 25)";
  const message = isDegraded
    ? "Intelligence core degraded — responses may use cached data"
    : "Intelligence core offline — map and alerts continue operating";

  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 shrink-0"
      style={bannerStyle}
      aria-live="polite"
      data-ocid="chat-degraded-banner"
    >
      <AlertTriangle
        className="w-3 h-3 shrink-0"
        style={{ color: textColor }}
        aria-hidden="true"
      />
      <div
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`}
        aria-hidden="true"
      />
      <span
        className="text-[10px] font-mono tracking-wider"
        style={{ color: textColor }}
      >
        {message}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------
function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start animate-fade-in">
      <ArcReactor size={32} />
      <div className="hud-panel px-4 py-3 rounded-lg max-w-[60%]">
        <span className="text-[10px] font-mono text-primary/60 tracking-widest uppercase block mb-1.5 text-glow-gold">
          F.R.I.D.A.Y.
        </span>
        <div className="flex items-center gap-2">
          {(["a", "b", "c"] as const).map((id, i) => (
            <div
              key={id}
              className="w-2 h-2 rounded-full bg-primary/70"
              style={{
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
          <span className="text-xs font-mono text-muted-foreground/60 ml-1 tracking-wider">
            Processing...
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ onPrompt }: { onPrompt: (p: string) => void }) {
  const STARTER_PROMPTS = [
    "Generate a low-poly sphere mesh",
    "System status report",
  ];

  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-6 text-center py-12 px-4"
      data-ocid="empty-state"
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full blur-2xl bg-primary/10 scale-150" />
        <ArcReactor size={72} className="relative z-10" />
      </div>

      <div className="space-y-2 max-w-md">
        <h2 className="font-display text-xl text-primary text-glow-gold animate-text-glow">
          F.R.I.D.A.Y. Online
        </h2>
        <p className="text-sm font-mono text-foreground/70 leading-relaxed">
          Good day. I am <span className="text-primary/80">F.R.I.D.A.Y.</span>,
          MeshGen AI operational. How may I assist you today, boss?
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {STARTER_PROMPTS.map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => onPrompt(p)}
            className="text-[11px] font-mono text-muted-foreground/60 hover:text-primary/80 px-3 py-2 border border-border/50 hover:border-primary/40 hover:bg-primary/5 rounded transition-smooth"
            data-ocid="starter-prompt-btn"
          >
            <Zap className="inline w-3 h-3 mr-1.5 opacity-60" />
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clear chat confirmation
// ---------------------------------------------------------------------------
function ClearChatBar({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-destructive/10 border border-destructive/30 rounded mx-4 mb-2 animate-fade-in">
      <span className="text-xs font-mono text-destructive/90 tracking-wider">
        Clear all chat history? This cannot be undone.
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] font-mono text-muted-foreground/60 hover:text-foreground px-2 py-1 transition-colors duration-200"
        >
          CANCEL
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="text-[11px] font-mono text-destructive/90 hover:text-destructive border border-destructive/40 px-2 py-1 rounded transition-smooth hover:bg-destructive/10"
          data-ocid="confirm-clear-btn"
        >
          CONFIRM
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main chat page
// ---------------------------------------------------------------------------
export default function ChatPage() {
  const { data: messages = [], isLoading } = useChatHistory();
  const sendMessage = useSendMessage();
  const clearChat = useClearChat();
  const { data: llmStatus = "online" } = useGetLlmStatus();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Track latest AI response for VoiceTab TTS
  const latestAiResponse = (() => {
    const aiMessages = (messages as ChatMessage[]).filter(
      (m) => "assistant" in m.role,
    );
    return aiMessages.length > 0
      ? aiMessages[aiMessages.length - 1].content
      : undefined;
  })();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const handleSend = useCallback(
    (content: string) => {
      sendMessage.mutate(content, {
        onError: () => {
          toast.error(
            "F.R.I.D.A.Y. is in reduced capacity mode — try again shortly",
          );
        },
      });
    },
    [sendMessage],
  );

  // Listen for voice-input CustomEvent from VoiceTab
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail?.text;
      if (text?.trim()) {
        handleSend(text.trim());
      }
    };
    window.addEventListener("voice-input", handler);
    return () => window.removeEventListener("voice-input", handler);
  }, [handleSend]);

  const handleClearConfirm = useCallback(() => {
    setShowClearConfirm(false);
    clearChat.mutate(undefined, {
      onSuccess: () => {
        toast.success("Chat history cleared. F.R.I.D.A.Y. memory reset.");
      },
    });
  }, [clearChat]);

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col lg:flex-row overflow-hidden min-h-0">
      {/* ── Main chat pane ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 lg:border-r border-border">
        {/* Chat toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-card/40 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-mono text-primary/70 tracking-widest uppercase">
              F.R.I.D.A.Y. Chat Interface
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground/40 tabular-nums">
              {messages.length} msg{messages.length !== 1 ? "s" : ""}
            </span>
            <Separator orientation="vertical" className="h-4 opacity-30" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              disabled={clearChat.isPending || messages.length === 0}
              className="h-7 px-2 text-muted-foreground/50 hover:text-destructive/80 font-mono text-[10px] tracking-wider transition-smooth"
              data-ocid="clear-chat-btn"
              aria-label="Clear chat history"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              CLEAR
            </Button>
          </div>
        </div>

        {/* Confirmation bar */}
        {showClearConfirm && (
          <ClearChatBar
            onConfirm={handleClearConfirm}
            onCancel={() => setShowClearConfirm(false)}
          />
        )}

        {/* Degraded-mode status banner — hidden when online */}
        <DegradedBanner status={llmStatus} />

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 py-4">
            {isLoading ? (
              <div className="space-y-5 p-2">
                {(["a", "b", "c"] as const).map((id) => (
                  <div key={id} className="flex gap-3">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <EmptyState onPrompt={handleSend} />
            ) : (
              <div className="space-y-5 pb-2">
                {messages.map((msg, i) => (
                  <ChatMessageComponent
                    key={msg.id.toString()}
                    message={msg}
                    index={i}
                  />
                ))}
                {sendMessage.isPending && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="shrink-0">
          <ChatInput
            onSend={handleSend}
            isLoading={sendMessage.isPending}
            llmStatus={llmStatus}
          />
        </div>
      </div>

      {/* ── Sidebar widgets ── always visible, scrollable ── */}
      <aside
        className="flex flex-col w-full lg:w-72 xl:w-80 bg-sidebar/50 border-t lg:border-t-0 lg:border-l border-border overflow-hidden shrink-0 lg:max-h-none max-h-72"
        data-ocid="sidebar"
      >
        <div className="px-3 py-2.5 border-b border-border/60 bg-card/30 shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground/50 tracking-widest uppercase">
            ◈ Dashboard · F.R.I.D.A.Y. Analytics
          </span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            <LiveClock />
            <SystemStatus />
            <AgentTaskTracker isProcessing={sendMessage.isPending} />
            <MultiAgentHUD isProcessingChat={sendMessage.isPending} />
            <VoiceTab latestAiResponse={latestAiResponse} />
            <WorldMonitor />
            <AnalyticsDashboard />
            <SmartAlerts />
            <MapTracking />
            <TransportTracker />
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}
