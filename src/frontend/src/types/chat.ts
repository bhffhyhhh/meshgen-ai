export type Role = { user: null } | { assistant: null };

export interface ChatMessage {
  id: bigint;
  role: Role;
  content: string;
  timestamp: bigint;
}

export interface SystemInfo {
  messageCount: bigint;
  status: string;
  uptimePlaceholder: string;
}

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface NewsEvent {
  id: string;
  title: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  country: string;
  lat: number;
  lng: number;
  source: string;
  url: string;
  publishedAt: number;
  dismissed: boolean;
}

export interface AnalyticsSnapshot {
  eventsToday: number;
  locationsTracked: number;
  videosGenerated: number;
  alertsDismissed: number;
  apiCallsThisHour: number;
  tier: string;
}

export interface AgentState {
  newsAgent: string;
  mapAgent: string;
  videoAgent: string;
  lastRunAt: number;
  lastEventCount: number;
}

export interface QuotaCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export function isUserRole(role: Role): boolean {
  if (typeof role === "string") return (role as string) === "user";
  if (typeof role !== "object" || role === null) return false;
  return "user" in (role as object);
}

export function isAssistantRole(role: Role): boolean {
  if (typeof role === "string") return (role as string) === "assistant";
  if (typeof role !== "object" || role === null) return false;
  return "assistant" in (role as object);
}

export function formatTimestamp(ts: bigint | null | undefined): string {
  try {
    if (ts == null) return "";
    const safe = typeof ts === "bigint" ? ts : BigInt(String(ts));
    const ms = Number(safe / BigInt(1_000_000));
    if (!Number.isFinite(ms) || ms <= 0) return "";
    return new Date(ms).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
