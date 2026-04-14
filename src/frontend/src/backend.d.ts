import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface SearchResult {
    url: string;
    title: string;
    snippet: string;
}
export type Timestamp = bigint;
export interface AnalyticsSnapshot {
    locationsTracked: bigint;
    videosGenerated: bigint;
    tier: string;
    alertsDismissed: bigint;
    eventsToday: bigint;
    apiCallsThisHour: bigint;
}
export interface NewsEvent {
    id: string;
    lat: number;
    lng: number;
    url: string;
    title: string;
    country: string;
    source: string;
    publishedAt: bigint;
    description: string;
    severity: string;
    dismissed: boolean;
}
export type MessageId = bigint;
export interface HttpResponse {
    status: bigint;
    body: Uint8Array;
    headers: Array<{
        value: string;
        name: string;
    }>;
}
export interface NewsArticle {
    url: string;
    title: string;
    publishedAt: string;
    description: string;
    image: string;
    hasVideo: boolean;
}
export interface ChatMessage {
    id: MessageId;
    content: string;
    role: Role;
    timestamp: Timestamp;
}
export interface AgentState {
    newsAgent: AgentStatus;
    lastEventCount: bigint;
    lastRunAt: bigint;
    mapAgent: AgentStatus;
    videoAgent: AgentStatus;
}
export interface SystemInfo {
    status: string;
    llmStatus: string;
    uptimePlaceholder: string;
    messageCount: bigint;
}
export enum AgentStatus {
    idle = "idle",
    error = "error",
    complete = "complete",
    running = "running"
}
export enum Role {
    user = "user",
    assistant = "assistant"
}
export interface backendInterface {
    checkQuota(): Promise<{
        allowed: boolean;
        limit: bigint;
        remaining: bigint;
    }>;
    clearChat(): Promise<void>;
    dismissEvent(id: string): Promise<boolean>;
    fetchNews(): Promise<Array<NewsArticle>>;
    getActiveAlerts(): Promise<Array<NewsEvent>>;
    getAgentState(): Promise<AgentState>;
    getAnalytics(): Promise<AnalyticsSnapshot>;
    getChatHistory(): Promise<Array<ChatMessage>>;
    getEvents(): Promise<Array<NewsEvent>>;
    getGNewsKey(): Promise<string>;
    getLlmStatus(): Promise<string>;
    getNewsContextForChat(): Promise<string>;
    getOpenRouterKey(): Promise<string>;
    getRecentEvents(limit: bigint): Promise<Array<NewsEvent>>;
    getSystemInfo(): Promise<SystemInfo>;
    getTier(): Promise<string>;
    incrementApiCall(): Promise<void>;
    incrementVideoCount(): Promise<void>;
    resetHourlyApiCalls(): Promise<void>;
    searchWeb(searchQuery: string): Promise<Array<SearchResult>>;
    sendMessage(userMessage: string): Promise<string>;
    setGNewsKey(key: string): Promise<void>;
    setOpenRouterKey(key: string): Promise<void>;
    setTier(tierValue: string): Promise<boolean>;
    storeEvent(event: NewsEvent): Promise<void>;
    transformHttpResponse(raw: {
        context: Uint8Array;
        response: HttpResponse;
    }): Promise<HttpResponse>;
    triggerNewsRefresh(): Promise<{
        success: boolean;
        eventCount: bigint;
    }>;
}
