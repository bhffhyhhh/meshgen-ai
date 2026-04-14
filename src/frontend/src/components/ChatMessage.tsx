import ArcReactor from "@/components/ArcReactor";
import { formatTimestamp, isAssistantRole, isUserRole } from "@/types/chat";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import { Globe, Terminal } from "lucide-react";
import { memo, useMemo } from "react";

interface ChatMessageProps {
  message: ChatMessageType;
  index: number;
}

// URL regex: matches http/https URLs
const URL_PATTERN = /https?:\/\/[^\s)>]+/g;
const MD_LINK_REGEX = /^-\s+\[(.+?)\]\((https?:\/\/[^\s)]+)\)/;

interface TextSegment {
  type: "text";
  key: string;
  text: string;
}
interface LinkSegment {
  type: "link";
  key: string;
  text: string;
  href: string;
}
interface SearchBlockSegment {
  type: "search-block";
  key: string;
  links: Array<{ label: string; href: string; key: string }>;
}
type ContentSegment = TextSegment | LinkSegment | SearchBlockSegment;

function parseInlineUrls(text: string, keyPrefix: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  const regex = new RegExp(URL_PATTERN.source, "g");

  let match = regex.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      const slice = text.slice(lastIndex, match.index);
      segments.push({
        type: "text",
        key: `${keyPrefix}-txt-${lastIndex}`,
        text: slice,
      });
    }
    segments.push({
      type: "link",
      key: `${keyPrefix}-url-${match.index}`,
      text: match[0],
      href: match[0],
    });
    lastIndex = match.index + match[0].length;
    match = regex.exec(text);
  }

  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      key: `${keyPrefix}-tail`,
      text: text.slice(lastIndex),
    });
  }

  return segments.length > 0
    ? segments
    : [{ type: "text", key: `${keyPrefix}-full`, text }];
}

function parseMessageContent(content: string): ContentSegment[] {
  const lines = content.split("\n");
  const allSegments: ContentSegment[] = [];
  let textBuffer: string[] = [];
  let searchLinks: Array<{ label: string; href: string; key: string }> = [];
  let inSearchBlock = false;
  let blockCount = 0;

  const flushText = () => {
    if (textBuffer.length === 0) return;
    const joined = textBuffer.join("\n").trim();
    if (joined) {
      allSegments.push(...parseInlineUrls(joined, `t${allSegments.length}`));
    }
    textBuffer = [];
  };

  const flushSearchBlock = () => {
    if (searchLinks.length === 0) return;
    allSegments.push({
      type: "search-block",
      key: `sb-${blockCount++}`,
      links: [...searchLinks],
    });
    searchLinks = [];
    inSearchBlock = false;
  };

  for (const line of lines) {
    const mdMatch = MD_LINK_REGEX.exec(line);
    if (mdMatch) {
      if (!inSearchBlock) {
        flushText();
        inSearchBlock = true;
      }
      searchLinks.push({
        label: mdMatch[1],
        href: mdMatch[2],
        key: `sl-${mdMatch[2]}`,
      });
    } else {
      if (inSearchBlock) flushSearchBlock();
      textBuffer.push(line);
    }
  }

  if (inSearchBlock) flushSearchBlock();
  flushText();

  return allSegments;
}

function MessageContent({ content }: { content: string }) {
  const segments = useMemo(() => parseMessageContent(content), [content]);

  return (
    <div className="min-w-0">
      {segments.map((seg) => {
        if (seg.type === "search-block") {
          return (
            <div key={seg.key} className="mt-2 mb-1">
              {/* WEB SEARCH badge */}
              <div className="flex items-center gap-1.5 mb-2">
                <Globe className="w-3 h-3 text-primary" />
                <span
                  className="text-[9px] font-mono tracking-[0.2em] uppercase text-primary font-semibold"
                  style={{ textShadow: "0 0 8px var(--color-primary)" }}
                >
                  WEB SEARCH
                </span>
                <div className="flex-1 h-px bg-primary/20" />
              </div>
              {/* Links */}
              <ul className="flex flex-col gap-1.5 pl-0">
                {seg.links.map((link, j) => (
                  <li key={link.key} className="flex items-start gap-1.5">
                    <span className="text-primary/40 font-mono text-[10px] mt-0.5 shrink-0">
                      {String(j + 1).padStart(2, "0")}
                    </span>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm break-words min-w-0 text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary transition-colors duration-200"
                      style={{
                        textShadow:
                          "0 0 6px color-mix(in oklch, var(--color-primary) 40%, transparent)",
                      }}
                      data-ocid="search-result-link"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        if (seg.type === "link") {
          return (
            <a
              key={seg.key}
              href={seg.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary transition-colors duration-200 break-all"
              style={{
                textShadow:
                  "0 0 6px color-mix(in oklch, var(--color-primary) 40%, transparent)",
              }}
              data-ocid="inline-url-link"
            >
              {seg.text}
            </a>
          );
        }

        // type === "text"
        return (
          <span key={seg.key} className="whitespace-pre-wrap break-words">
            {seg.text}
          </span>
        );
      })}
    </div>
  );
}

const ChatMessageComponent = memo(function ChatMessage({
  message,
  index,
}: ChatMessageProps) {
  const isUser = isUserRole(message.role);
  const isAssistant = isAssistantRole(message.role);

  return (
    <div
      className={`flex gap-3 animate-slide-in-up ${isUser ? "flex-row-reverse" : "flex-row"}`}
      style={{ animationDelay: `${Math.min(index * 0.04, 0.25)}s` }}
      data-ocid={isUser ? "user-message" : "assistant-message"}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-1">
        {isAssistant ? (
          <ArcReactor size={32} />
        ) : (
          <div className="w-8 h-8 rounded-full border border-primary/40 bg-muted/60 flex items-center justify-center glow-border-gold">
            <Terminal className="w-4 h-4 text-primary/70" />
          </div>
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[78%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`px-4 py-3 rounded-lg text-sm font-body leading-relaxed transition-smooth ${
            isUser
              ? "bg-primary/10 glow-border-gold text-foreground"
              : "hud-panel text-foreground glow-blue"
          }`}
        >
          {isAssistant && (
            <span className="text-[10px] font-mono text-primary/60 tracking-widest uppercase block mb-1.5 text-glow-gold">
              F.R.I.D.A.Y.
            </span>
          )}
          {isUser && (
            <span className="text-[10px] font-mono text-primary/50 tracking-widest uppercase block mb-1.5 text-right">
              YOU
            </span>
          )}
          <MessageContent content={message.content} />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground/35 px-1">
          {(() => {
            try {
              return formatTimestamp(message.timestamp);
            } catch {
              return "";
            }
          })()}
        </span>
      </div>
    </div>
  );
});

export default ChatMessageComponent;
