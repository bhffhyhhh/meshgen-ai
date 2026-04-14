import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { LlmStatus } from "@/hooks/useChat";
import { Send } from "lucide-react";
import { useCallback, useState } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  llmStatus?: LlmStatus;
}

function getFooterText(status: LlmStatus = "online"): string {
  switch (status) {
    case "online":
      return "MeshGen AI · F.R.I.D.A.Y. inference engine · All systems nominal";
    case "degraded":
      return "MeshGen AI · F.R.I.D.A.Y. inference engine · Intelligence core: reduced capacity";
    case "offline":
      return "MeshGen AI · F.R.I.D.A.Y. inference engine · Intelligence core offline — map & alerts active";
  }
}

export default function ChatInput({
  onSend,
  isLoading,
  llmStatus,
}: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
  }, [value, isLoading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const footerText = getFooterText(llmStatus);
  const footerColor =
    llmStatus === "offline"
      ? "oklch(0.7 0.2 25 / 0.5)"
      : llmStatus === "degraded"
        ? "oklch(0.78 0.16 75 / 0.5)"
        : undefined;

  return (
    <div className="p-4 border-t border-border bg-card/60 backdrop-blur-sm">
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a directive to F.R.I.D.A.Y. — Enter to send, Shift+Enter for new line"
            className="min-h-[52px] max-h-[160px] resize-none font-mono text-sm bg-input/60 border-border/60 focus:border-primary/70 focus:ring-1 focus:ring-primary/40 transition-smooth placeholder:text-muted-foreground/35 leading-relaxed"
            data-ocid="chat-input"
            disabled={isLoading}
            aria-label="Message input"
          />
          {isLoading && (
            <div className="absolute right-3 bottom-3 flex items-center gap-1">
              {(["a", "b", "c"] as const).map((id, i) => (
                <div
                  key={id}
                  className="w-1 h-1 rounded-full bg-primary/60 animate-bounce"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={handleSend}
          disabled={isLoading || !value.trim()}
          className="h-[52px] w-[52px] p-0 bg-primary/90 hover:bg-primary text-primary-foreground glow-gold transition-smooth shrink-0 disabled:opacity-40"
          data-ocid="send-btn"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <p
        className="text-[10px] font-mono text-center mt-2 tracking-wider transition-colors duration-500"
        style={{ color: footerColor ?? undefined }}
      >
        {footerText}
      </p>
    </div>
  );
}
