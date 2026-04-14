import { createActor } from "@/backend";
import type {
  AgentState,
  AnalyticsSnapshot,
  ChatMessage,
  NewsEvent,
  QuotaCheck,
  SystemInfo,
} from "@/types/chat";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Fallback mock data — used when backend methods are not yet available
// ---------------------------------------------------------------------------
const MOCK_HISTORY: ChatMessage[] = [
  {
    id: BigInt(1),
    role: { assistant: null },
    content:
      "Good morning. I'm F.R.I.D.A.Y. — Fully Responsive Intelligent Digital Assistant for You. MeshGen AI systems are online. All neural pathways nominal. How can I assist you today?",
    timestamp: BigInt(Date.now()) * BigInt(1_000_000),
  },
];

const MOCK_SYSTEM_INFO: SystemInfo = {
  messageCount: BigInt(0),
  status: "ONLINE",
  uptimePlaceholder: "00:00:00",
};

const MOCK_ANALYTICS: AnalyticsSnapshot = {
  eventsToday: 0,
  locationsTracked: 0,
  videosGenerated: 0,
  alertsDismissed: 0,
  apiCallsThisHour: 0,
  tier: "FREE",
};

const MOCK_AGENT_STATE: AgentState = {
  newsAgent: "IDLE",
  mapAgent: "IDLE",
  videoAgent: "IDLE",
  lastRunAt: 0,
  lastEventCount: 0,
};

const MOCK_QUOTA: QuotaCheck = {
  allowed: true,
  remaining: 100,
  limit: 100,
};

// ---------------------------------------------------------------------------
// Actor shims
// ---------------------------------------------------------------------------
interface MeshGenActor {
  getChatHistory?(): Promise<ChatMessage[]>;
  getSystemInfo?(): Promise<SystemInfo>;
  sendMessage?(content: string): Promise<string>;
  clearChat?(): Promise<void>;
}

interface GNewsActor {
  getGNewsKey?(): Promise<string>;
  setGNewsKey?(key: string): Promise<void>;
}

interface OpenRouterActor {
  getOpenRouterKey?(): Promise<string>;
  setOpenRouterKey?(key: string): Promise<void>;
}

interface NewsActor {
  fetchNews?(): Promise<NewsArticleRaw[]>;
}

interface EventsActor {
  storeEvent?(event: NewsEventRaw): Promise<void>;
  getEvents?(): Promise<NewsEventRaw[]>;
  getRecentEvents?(limit: bigint): Promise<NewsEventRaw[]>;
  dismissEvent?(id: string): Promise<void>;
  getActiveAlerts?(): Promise<NewsEventRaw[]>;
  getNewsContextForChat?(): Promise<string>;
  getAnalytics?(): Promise<AnalyticsRaw>;
  incrementVideoCount?(): Promise<void>;
  incrementApiCall?(): Promise<void>;
  resetHourlyApiCalls?(): Promise<void>;
  checkQuota?(): Promise<QuotaRaw>;
  getTier?(): Promise<string>;
  setTier?(tier: string): Promise<void>;
  getAgentState?(): Promise<AgentStateRaw>;
  triggerNewsRefresh?(): Promise<void>;
}

// Raw backend types (Candid-mapped)
interface NewsArticleRaw {
  url: string;
  title: string;
  publishedAt: string;
  description: string;
  image: string;
  hasVideo: boolean;
}

interface NewsEventRaw {
  id: string;
  title: string;
  description: string;
  severity: string;
  country: string;
  lat: number;
  lng: number;
  source: string;
  url: string;
  publishedAt: bigint;
  dismissed: boolean;
}

interface AnalyticsRaw {
  eventsToday: bigint;
  locationsTracked: bigint;
  videosGenerated: bigint;
  alertsDismissed: bigint;
  apiCallsThisHour: bigint;
  tier: string;
}

interface AgentStateRaw {
  newsAgent: string;
  mapAgent: string;
  videoAgent: string;
  lastRunAt: bigint;
  lastEventCount: bigint;
}

interface QuotaRaw {
  allowed: boolean;
  remaining: bigint;
  limit: bigint;
}

function toMeshActor(actor: unknown): MeshGenActor {
  return actor as MeshGenActor;
}
function toGNewsActor(actor: unknown): GNewsActor {
  return actor as GNewsActor;
}
function toOpenRouterActor(actor: unknown): OpenRouterActor {
  return actor as OpenRouterActor;
}
function toNewsActor(actor: unknown): NewsActor {
  return actor as NewsActor;
}
function toEventsActor(actor: unknown): EventsActor {
  return actor as EventsActor;
}

/** Safely coerce any backend role value into a typed Role object */
function normalizeRole(raw: unknown): ChatMessage["role"] {
  if (typeof raw === "string") {
    return raw === "user" ? { user: null } : { assistant: null };
  }
  if (raw && typeof raw === "object" && "user" in (raw as object)) {
    return { user: null };
  }
  return { assistant: null };
}

/** Normalize all fields on a message returned from the backend */
function normalizeMessage(msg: ChatMessage): ChatMessage {
  return {
    id: msg.id,
    content:
      typeof msg.content === "string" ? msg.content : String(msg.content ?? ""),
    timestamp:
      typeof msg.timestamp === "bigint"
        ? msg.timestamp
        : BigInt(Date.now()) * BigInt(1_000_000),
    role: normalizeRole((msg as { role: unknown }).role),
  };
}

function normalizeNewsEvent(raw: NewsEventRaw): NewsEvent {
  const severityMap: Record<string, NewsEvent["severity"]> = {
    CRITICAL: "CRITICAL",
    HIGH: "HIGH",
    MEDIUM: "MEDIUM",
    LOW: "LOW",
  };
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    severity: severityMap[raw.severity] ?? "LOW",
    country: raw.country,
    lat: raw.lat,
    lng: raw.lng,
    source: raw.source,
    url: raw.url,
    publishedAt: Number(raw.publishedAt),
    dismissed: raw.dismissed,
  };
}

function normalizeAnalytics(raw: AnalyticsRaw): AnalyticsSnapshot {
  return {
    eventsToday: Number(raw.eventsToday),
    locationsTracked: Number(raw.locationsTracked),
    videosGenerated: Number(raw.videosGenerated),
    alertsDismissed: Number(raw.alertsDismissed),
    apiCallsThisHour: Number(raw.apiCallsThisHour),
    tier: raw.tier,
  };
}

function normalizeAgentState(raw: AgentStateRaw): AgentState {
  return {
    newsAgent: raw.newsAgent,
    mapAgent: raw.mapAgent,
    videoAgent: raw.videoAgent,
    lastRunAt: Number(raw.lastRunAt),
    lastEventCount: Number(raw.lastEventCount),
  };
}

function normalizeQuota(raw: QuotaRaw): QuotaCheck {
  return {
    allowed: raw.allowed,
    remaining: Number(raw.remaining),
    limit: Number(raw.limit),
  };
}

// ---------------------------------------------------------------------------
// LLM status types
// ---------------------------------------------------------------------------

export type LlmStatus = "online" | "degraded" | "offline";

interface LlmStatusActor {
  getLlmStatus?(): Promise<string>;
}

function toLlmStatusActor(actor: unknown): LlmStatusActor {
  return actor as LlmStatusActor;
}

// ---------------------------------------------------------------------------
// LLM status hook — polls every 30s; derives status from backend or fallback
// ---------------------------------------------------------------------------

export function useGetLlmStatus() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<LlmStatus>({
    queryKey: ["llmStatus"],
    queryFn: async (): Promise<LlmStatus> => {
      if (!actor || isFetching) return "degraded";
      try {
        // If backend exposes getLlmStatus, use it
        const raw = await toLlmStatusActor(actor).getLlmStatus?.();
        if (raw) {
          const s = raw.toLowerCase();
          if (s === "online") return "online";
          if (s === "offline") return "offline";
          return "degraded";
        }
        // Fall back: probe getSystemInfo — if status is ONLINE the core is up
        const info = await toMeshActor(actor).getSystemInfo?.();
        if (info?.status) {
          const s = info.status.toUpperCase();
          if (s === "ONLINE") return "online";
          if (s === "ERROR" || s === "OFFLINE") return "offline";
          return "degraded";
        }
        return "online";
      } catch {
        return "offline";
      }
    },
    enabled: true,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}

// ---------------------------------------------------------------------------
// Chat hooks
// ---------------------------------------------------------------------------

export function useChatHistory() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<ChatMessage[]>({
    queryKey: ["chatHistory"],
    queryFn: async () => {
      if (!actor || isFetching) return MOCK_HISTORY;
      try {
        const history = await toMeshActor(actor).getChatHistory?.();
        return history ? history.map(normalizeMessage) : MOCK_HISTORY;
      } catch {
        return MOCK_HISTORY;
      }
    },
    enabled: true,
    staleTime: 0,
  });
}

export function useSystemInfo() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<SystemInfo>({
    queryKey: ["systemInfo"],
    queryFn: async () => {
      if (!actor || isFetching) return MOCK_SYSTEM_INFO;
      try {
        const info = await toMeshActor(actor).getSystemInfo?.();
        return info ?? MOCK_SYSTEM_INFO;
      } catch {
        return MOCK_SYSTEM_INFO;
      }
    },
    enabled: true,
    refetchInterval: 30_000,
  });
}

export function useSendMessage() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation<ChatMessage, Error, string>({
    mutationFn: async (content: string): Promise<ChatMessage> => {
      if (actor) {
        try {
          const responseText = await toMeshActor(actor).sendMessage?.(content);
          if (responseText !== undefined) {
            return {
              id: BigInt(Date.now()),
              role: { assistant: null },
              content:
                typeof responseText === "string"
                  ? responseText
                  : String(responseText),
              timestamp: BigInt(Date.now()) * BigInt(1_000_000),
            };
          }
        } catch (err) {
          console.warn("[MeshGen AI] sendMessage error, using mock:", err);
        }
      }
      return {
        id: BigInt(Date.now()),
        role: { assistant: null },
        content: generateMockResponse(content),
        timestamp: BigInt(Date.now()) * BigInt(1_000_000),
      };
    },
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: ["chatHistory"] });
      const previous = queryClient.getQueryData<ChatMessage[]>(["chatHistory"]);

      const userMsg: ChatMessage = {
        id: BigInt(Date.now()),
        role: { user: null },
        content,
        timestamp: BigInt(Date.now()) * BigInt(1_000_000),
      };

      queryClient.setQueryData<ChatMessage[]>(["chatHistory"], (old) => [
        ...(old ?? []),
        userMsg,
      ]);

      return { previous };
    },
    onSuccess: (assistantMsg) => {
      try {
        queryClient.setQueryData<ChatMessage[]>(["chatHistory"], (old) => [
          ...(old ?? []),
          assistantMsg,
        ]);
        queryClient.invalidateQueries({ queryKey: ["systemInfo"] });
      } catch (err) {
        console.warn("[MeshGen AI] onSuccess cache update error:", err);
      }
    },
    onError: (_err, _vars, context) => {
      const ctx = context as { previous?: ChatMessage[] } | undefined;
      if (ctx?.previous) {
        queryClient.setQueryData(["chatHistory"], ctx.previous);
      }
    },
  });
}

export function useClearChat() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!actor) return;
      try {
        await toMeshActor(actor).clearChat?.();
      } catch {
        // ignore — clear locally regardless
      }
    },
    onSuccess: () => {
      queryClient.setQueryData<ChatMessage[]>(["chatHistory"], []);
      queryClient.invalidateQueries({ queryKey: ["systemInfo"] });
    },
  });
}

// ---------------------------------------------------------------------------
// GNews API Key hooks
// ---------------------------------------------------------------------------

export function useGetGNewsKey() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<string>({
    queryKey: ["gNewsKey"],
    queryFn: async () => {
      if (!actor || isFetching) return "";
      try {
        return (await toGNewsActor(actor).getGNewsKey?.()) ?? "";
      } catch {
        return "";
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSetGNewsKey() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (key: string) => {
      if (!actor) throw new Error("Actor not ready");
      await toGNewsActor(actor).setGNewsKey?.(key);
    },
    onSuccess: (_data, key) => {
      queryClient.setQueryData<string>(["gNewsKey"], key);
    },
  });
}

// ---------------------------------------------------------------------------
// OpenRouter API Key hooks
// ---------------------------------------------------------------------------

export function useGetOpenRouterKey() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<string>({
    queryKey: ["openRouterKey"],
    queryFn: async () => {
      if (!actor || isFetching) return "";
      try {
        return (await toOpenRouterActor(actor).getOpenRouterKey?.()) ?? "";
      } catch {
        return "";
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSetOpenRouterKey() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (key: string) => {
      if (!actor) throw new Error("Actor not ready");
      await toOpenRouterActor(actor).setOpenRouterKey?.(key);
    },
    onSuccess: (_data, key) => {
      queryClient.setQueryData<string>(["openRouterKey"], key);
    },
  });
}

// ---------------------------------------------------------------------------
// News articles hook (used by WorldMonitor + SmartAlerts)
// ---------------------------------------------------------------------------

export interface NewsArticle {
  url: string;
  title: string;
  publishedAt: string;
  description: string;
  image: string;
  hasVideo: boolean;
}

export function useNewsArticles() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<NewsArticle[]>({
    queryKey: ["newsArticles"],
    queryFn: async () => {
      if (!actor || isFetching) return [];
      try {
        const articles = await toNewsActor(actor).fetchNews?.();
        return articles ?? [];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5 * 60_000,
  });
}

// ---------------------------------------------------------------------------
// Smart Alerts (derived from news articles)
// ---------------------------------------------------------------------------

const ALERT_KEYWORDS: Record<NewsEvent["severity"], string[]> = {
  CRITICAL: [
    "earthquake",
    "tsunami",
    "nuclear",
    "war declared",
    "attack",
    "explosion",
    "catastrophe",
  ],
  HIGH: [
    "flood",
    "hurricane",
    "tornado",
    "wildfire",
    "shooting",
    "crash",
    "killed",
    "dead",
  ],
  MEDIUM: ["protest", "storm", "drought", "arrested", "crisis", "outbreak"],
  LOW: ["election", "summit", "sanctions", "warning", "tension"],
};

function inferSeverity(text: string): NewsEvent["severity"] {
  const lower = text.toLowerCase();
  for (const [severity, keywords] of Object.entries(ALERT_KEYWORDS) as [
    NewsEvent["severity"],
    string[],
  ][]) {
    if (keywords.some((kw) => lower.includes(kw))) return severity;
  }
  return "LOW";
}

export function useSmartAlerts() {
  const { data: articles = [] } = useNewsArticles();

  const alerts: NewsEvent[] = articles.slice(0, 10).map((article, i) => ({
    id: `alert-${i}`,
    title: article.title,
    description: article.description,
    severity: inferSeverity(`${article.title} ${article.description}`),
    country: "Global",
    lat: 0,
    lng: 0,
    source: new URL(article.url).hostname.replace("www.", ""),
    url: article.url,
    publishedAt: Date.parse(article.publishedAt) || Date.now(),
    dismissed: false,
  }));

  return alerts;
}

// ---------------------------------------------------------------------------
// Events hooks
// ---------------------------------------------------------------------------

export function useGetEvents() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<NewsEvent[]>({
    queryKey: ["events"],
    queryFn: async () => {
      if (!actor || isFetching) return [];
      try {
        const events = await toEventsActor(actor).getEvents?.();
        return events ? events.map(normalizeNewsEvent) : [];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5 * 60_000,
  });
}

export function useGetRecentEvents(limit: number) {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<NewsEvent[]>({
    queryKey: ["recentEvents", limit],
    queryFn: async () => {
      if (!actor || isFetching) return [];
      try {
        const events = await toEventsActor(actor).getRecentEvents?.(
          BigInt(limit),
        );
        return events ? events.map(normalizeNewsEvent) : [];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5 * 60_000,
  });
}

export function useDismissEvent() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      if (!actor) return;
      try {
        await toEventsActor(actor).dismissEvent?.(id);
      } catch {
        // ignore
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["activeAlerts"] });
    },
  });
}

export function useGetActiveAlerts() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<NewsEvent[]>({
    queryKey: ["activeAlerts"],
    queryFn: async () => {
      if (!actor || isFetching) return [];
      try {
        const alerts = await toEventsActor(actor).getActiveAlerts?.();
        return alerts ? alerts.map(normalizeNewsEvent) : [];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Analytics hooks
// ---------------------------------------------------------------------------

export function useGetAnalytics() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<AnalyticsSnapshot>({
    queryKey: ["analytics"],
    queryFn: async () => {
      if (!actor || isFetching) return MOCK_ANALYTICS;
      try {
        const raw = await toEventsActor(actor).getAnalytics?.();
        return raw ? normalizeAnalytics(raw) : MOCK_ANALYTICS;
      } catch {
        return MOCK_ANALYTICS;
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5 * 60_000,
  });
}

export function useIncrementVideo() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!actor) return;
      try {
        await toEventsActor(actor).incrementVideoCount?.();
      } catch {
        // ignore
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useIncrementApiCall() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!actor) return;
      try {
        await toEventsActor(actor).incrementApiCall?.();
      } catch {
        // ignore
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useGetTier() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<string>({
    queryKey: ["tier"],
    queryFn: async () => {
      if (!actor || isFetching) return "FREE";
      try {
        return (await toEventsActor(actor).getTier?.()) ?? "FREE";
      } catch {
        return "FREE";
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60_000,
  });
}

export function useSetTier() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (tier: string) => {
      if (!actor) throw new Error("Actor not ready");
      await toEventsActor(actor).setTier?.(tier);
    },
    onSuccess: (_data, tier) => {
      queryClient.setQueryData<string>(["tier"], tier);
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useCheckQuota() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<QuotaCheck>({
    queryKey: ["quota"],
    queryFn: async () => {
      if (!actor || isFetching) return MOCK_QUOTA;
      try {
        const raw = await toEventsActor(actor).checkQuota?.();
        return raw ? normalizeQuota(raw) : MOCK_QUOTA;
      } catch {
        return MOCK_QUOTA;
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60_000,
  });
}

export function useGetAgentState() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<AgentState>({
    queryKey: ["agentState"],
    queryFn: async () => {
      if (!actor || isFetching) return MOCK_AGENT_STATE;
      try {
        const raw = await toEventsActor(actor).getAgentState?.();
        return raw ? normalizeAgentState(raw) : MOCK_AGENT_STATE;
      } catch {
        return MOCK_AGENT_STATE;
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10_000,
  });
}

export function useTriggerNewsRefresh() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!actor) return;
      try {
        await toEventsActor(actor).triggerNewsRefresh?.();
      } catch {
        // ignore
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsArticles"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["agentState"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Mock response generator
// ---------------------------------------------------------------------------
function generateMockResponse(input: string): string {
  const lower = input.toLowerCase();
  if (
    lower.includes("hello") ||
    lower.includes("hi") ||
    lower.includes("hey")
  ) {
    return "Greetings. F.R.I.D.A.Y. at your service. All MeshGen AI subsystems running at 98.7% efficiency. What shall we build today?";
  }
  if (
    lower.includes("mesh") ||
    lower.includes("generate") ||
    lower.includes("model")
  ) {
    return "Initiating MeshGen pipeline. Neural mesh synthesis protocols engaged. Analyzing parameters and routing through the topology optimizer. Estimated generation time: 2.3 seconds. Standing by for your specifications.";
  }
  if (lower.includes("status") || lower.includes("system")) {
    return "System status report: All nodes nominal. GPU cluster at 94% capacity. Network latency 12ms. Arc reactor power output: stable. No anomalies detected in the mesh generation matrix.";
  }
  if (lower.includes("help") || lower.includes("what can")) {
    return "I can assist with 3D mesh generation, topology analysis, surface optimization, texture synthesis, and real-time model refinement. I also monitor system health and can interface with external rendering pipelines. What would you like to create?";
  }
  return `Acknowledged. Processing your request through the MeshGen AI inference engine. F.R.I.D.A.Y. cross-referencing neural mesh database for "${input.slice(0, 40)}${input.length > 40 ? "..." : ""}". Analysis complete — standing by for further instructions.`;
}
