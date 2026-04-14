import type {
  AgentState,
  AnalyticsSnapshot,
  backendInterface,
  ChatMessage,
  NewsArticle,
  NewsEvent,
  SystemInfo,
} from "../backend";
import { AgentStatus, Role } from "../backend";

const sampleMessages: ChatMessage[] = [
  {
    id: BigInt(0),
    content: "Hello F.R.I.D.A.Y., run a system diagnostics check.",
    role: Role.user,
    timestamp: BigInt(Date.now()) * BigInt(1_000_000),
  },
  {
    id: BigInt(1),
    content:
      "All systems nominal, Boss. Arc reactor output at 112%. Suit integrity: 100%. Jarvis neural net sync: optimal. Ready for deployment.",
    role: Role.assistant,
    timestamp: BigInt(Date.now() + 1000) * BigInt(1_000_000),
  },
  {
    id: BigInt(2),
    content: "What is the current threat assessment?",
    role: Role.user,
    timestamp: BigInt(Date.now() + 2000) * BigInt(1_000_000),
  },
  {
    id: BigInt(3),
    content:
      "Scanning global threat matrix now. No immediate high-priority threats detected. Monitoring 3 low-level anomalies in sector 7. Recommend standard protocol.",
    role: Role.assistant,
    timestamp: BigInt(Date.now() + 3000) * BigInt(1_000_000),
  },
];

const mockAnalytics: AnalyticsSnapshot = {
  locationsTracked: BigInt(23),
  videosGenerated: BigInt(5),
  tier: "PRO",
  alertsDismissed: BigInt(12),
  eventsToday: BigInt(47),
  apiCallsThisHour: BigInt(34),
};

const mockAgentState: AgentState = {
  newsAgent: AgentStatus.complete,
  lastEventCount: BigInt(3),
  lastRunAt: BigInt(Date.now()) * BigInt(1_000_000),
  mapAgent: AgentStatus.running,
  videoAgent: AgentStatus.idle,
};

const mockEvents: NewsEvent[] = [
  {
    id: "evt-1",
    lat: 40.7128,
    lng: -74.006,
    url: "https://example.com/news/1",
    title: "Political Summit Convenes in New York",
    country: "US",
    source: "Reuters",
    publishedAt: BigInt(Date.now()) * BigInt(1_000_000),
    description: "World leaders gather for emergency summit to address global stability concerns.",
    severity: "high",
    dismissed: false,
  },
  {
    id: "evt-2",
    lat: 51.5074,
    lng: -0.1278,
    url: "https://example.com/news/2",
    title: "Economic Markets Show Volatility in London",
    country: "GB",
    source: "BBC",
    publishedAt: BigInt(Date.now() - 3_600_000) * BigInt(1_000_000),
    description: "Financial markets respond to new economic data reports released this morning.",
    severity: "medium",
    dismissed: false,
  },
  {
    id: "evt-3",
    lat: 35.6762,
    lng: 139.6503,
    url: "https://example.com/news/3",
    title: "Technology Breakthrough Announced in Tokyo",
    country: "JP",
    source: "NHK",
    publishedAt: BigInt(Date.now() - 7_200_000) * BigInt(1_000_000),
    description: "Major tech corporation reveals new AI development platform.",
    severity: "low",
    dismissed: false,
  },
];

export const mockBackend: backendInterface = {
  sendMessage: async (_userMessage: string): Promise<string> => {
    return "I'm F.R.I.D.A.Y., running in demo mode. The real AI backend is currently unavailable.";
  },
  getChatHistory: async (): Promise<Array<ChatMessage>> => {
    return sampleMessages;
  },
  clearChat: async (): Promise<void> => {
    return undefined;
  },
  getSystemInfo: async (): Promise<SystemInfo> => {
    return {
      status: "OPERATIONAL",
      uptimePlaceholder: "99.97%",
      messageCount: BigInt(4),
      llmStatus: "online",
    };
  },
  getLlmStatus: async (): Promise<string> => {
    return "online";
  },
  transformHttpResponse: async (raw: { response: { status: bigint; headers: Array<{ name: string; value: string }>; body: Uint8Array }; context: Uint8Array }): Promise<{ status: bigint; headers: Array<{ name: string; value: string }>; body: Uint8Array }> => {
    return { status: raw.response.status, headers: [], body: raw.response.body };
  },
  fetchNews: async (): Promise<Array<NewsArticle>> => {
    return [
      {
        url: "https://example.com/article/1",
        title: "Global Risk Levels Rise Amid Diplomatic Tensions",
        publishedAt: new Date().toISOString(),
        description: "Intelligence analysts report elevated risk indicators across multiple regions worldwide.",
        image: "",
        hasVideo: false,
      },
      {
        url: "https://example.com/article/2",
        title: "Climate Disaster Warning Issued for Southeast Asia",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        description: "Meteorological agencies issue high-severity weather alerts for coastal regions.",
        image: "",
        hasVideo: false,
      },
    ];
  },
  searchWeb: async (): Promise<[]> => {
    return [];
  },
  getGNewsKey: async (): Promise<string> => {
    return "";
  },
  setGNewsKey: async (_key: string): Promise<void> => {
    return undefined;
  },
  getOpenRouterKey: async (): Promise<string> => {
    return "";
  },
  setOpenRouterKey: async (_key: string): Promise<void> => {
    return undefined;
  },
  checkQuota: async () => ({
    allowed: true,
    limit: BigInt(20),
    remaining: BigInt(20),
  }),
  dismissEvent: async (_id: string): Promise<boolean> => {
    return true;
  },
  getActiveAlerts: async (): Promise<Array<NewsEvent>> => {
    return mockEvents.filter(e => e.severity === "high");
  },
  getAgentState: async (): Promise<AgentState> => {
    return mockAgentState;
  },
  getAnalytics: async (): Promise<AnalyticsSnapshot> => {
    return mockAnalytics;
  },
  getEvents: async (): Promise<Array<NewsEvent>> => {
    return mockEvents;
  },
  getNewsContextForChat: async (): Promise<string> => {
    return "Recent events: Political summit in New York, economic volatility in London, tech announcement in Tokyo.";
  },
  getRecentEvents: async (_limit: bigint): Promise<Array<NewsEvent>> => {
    return mockEvents;
  },
  getTier: async (): Promise<string> => {
    return "FREE";
  },
  incrementApiCall: async (): Promise<void> => {
    return undefined;
  },
  incrementVideoCount: async (): Promise<void> => {
    return undefined;
  },
  resetHourlyApiCalls: async (): Promise<void> => {
    return undefined;
  },
  setTier: async (_tierValue: string): Promise<boolean> => {
    return true;
  },
  storeEvent: async (_event: NewsEvent): Promise<void> => {
    return undefined;
  },
  triggerNewsRefresh: async () => ({
    success: true,
    eventCount: BigInt(0),
  }),
};
