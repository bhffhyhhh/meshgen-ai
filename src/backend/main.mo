import List "mo:core/List";
import ChatTypes "types/chat";
import EventTypes "types/events";
import AnalyticsTypes "types/analytics";
import AgentTypes "types/agents";
import ChatLib "lib/chat";
import ChatMixin "mixins/chat-api";
import ExternalMixin "mixins/external-api";
import ConfigMixin "mixins/config-api";
import EventsMixin "mixins/events-api";
import AnalyticsMixin "mixins/analytics-api";
import AgentsMixin "mixins/agents-api";

actor {
  // ── Chat state ───────────────────────────────────────────────────────────
  let messages = List.empty<ChatTypes.ChatMessage>();
  let nextId = { var value : Nat = 0 };
  let gNewsApiKey = { var value : Text = "" };
  let openRouterApiKey = { var value : Text = "" };

  // ── LLM fallback state ───────────────────────────────────────────────────
  let llmState : ChatLib.LlmState = ChatLib.newLlmState();

  // ── Events state ─────────────────────────────────────────────────────────
  let events = List.empty<EventTypes.NewsEvent>();

  // ── Analytics state ──────────────────────────────────────────────────────
  let analyticsState : AnalyticsTypes.AnalyticsState = {
    var eventsToday = 0;
    var locationsTracked = 0;
    var videosGenerated = 0;
    var alertsDismissed = 0;
    var apiCallsThisHour = 0;
  };
  let tier = { var value : Text = "free" };

  // ── Agent state ──────────────────────────────────────────────────────────
  let agentState = {
    var value : AgentTypes.AgentState = {
      newsAgent = #idle;
      mapAgent = #idle;
      videoAgent = #idle;
      lastRunAt = 0;
      lastEventCount = 0;
    };
  };

  // ── Mixin composition ────────────────────────────────────────────────────
  include ChatMixin(messages, nextId, openRouterApiKey, events, llmState);
  include ExternalMixin(gNewsApiKey);
  include ConfigMixin(gNewsApiKey, openRouterApiKey);
  include EventsMixin(events);
  include AnalyticsMixin(analyticsState, tier);
  include AgentsMixin(agentState, events, gNewsApiKey);
};
