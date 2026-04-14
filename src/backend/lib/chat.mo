import List "mo:core/List";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Types "../types/chat";
import Common "../types/common";
import EventTypes "../types/events";
import EventsLib "../lib/events";

module {
  // ── IC HTTP outcall types ──────────────────────────────────────────────────
  public type HttpResponse = {
    status : Nat;
    headers : [{ name : Text; value : Text }];
    body : Blob;
  };

  type HttpRequestArgs = {
    url : Text;
    max_response_bytes : ?Nat64;
    headers : [{ name : Text; value : Text }];
    body : ?Blob;
    method : { #get; #post; #head };
    transform : ?{
      function : shared query ({ response : HttpResponse; context : Blob }) -> async HttpResponse;
      context : Blob;
    };
  };

  type IC = actor {
    http_request : HttpRequestArgs -> async HttpResponse;
  };

  let ic : IC = actor "aaaaa-aa";

  // ── LLM state (held by actor, passed into lib functions) ───────────────────
  public type LlmState = {
    var lastSuccessfulResponse : Text;
    var llmStatus : Text;
    var consecutiveFailures : Nat;
  };

  public func newLlmState() : LlmState {
    {
      var lastSuccessfulResponse = "";
      var llmStatus = "online";
      var consecutiveFailures = 0;
    };
  };

  // F.R.I.D.A.Y. system prompt (with optional news context injected)
  func getSystemPrompt(newsContext : Text) : Text {
    let base =
      "You are F.R.I.D.A.Y. (Female Replacement Intelligent Digital Assistant Youth), " #
      "Tony Stark's AI from Iron Man, powering the MeshGen AI assistant. " #
      "You are brilliant, highly capable, and genuinely helpful. You answer all questions " #
      "directly and accurately - like ChatGPT, Claude, or Gemini would. " #
      "You help with analysis, research, coding, math, writing, science, history, and any task the user needs. " #
      "You do NOT echo back what the user said. You do NOT give vague non-answers. " #
      "You speak with subtle Iron Man / Stark Industries references occasionally but ALWAYS lead with " #
      "genuinely helpful, accurate, and complete responses. " #
      "When asked factual questions, provide real, correct information. " #
      "When asked to calculate, solve, or explain - do it thoroughly. " #
      "Keep responses concise but complete. Use markdown formatting when it helps clarity.";
    if (newsContext == "") {
      base;
    } else {
      base # "\n\n" # newsContext;
    };
  };

  // ── Message list helpers ───────────────────────────────────────────────────

  public func addMessage(
    messages : List.List<Types.ChatMessage>,
    nextId : Nat,
    role : Types.Role,
    content : Text,
    timestamp : Common.Timestamp,
  ) : Types.ChatMessage {
    let msg : Types.ChatMessage = {
      id = nextId;
      role;
      content;
      timestamp;
    };
    messages.add(msg);
    msg;
  };

  public func getHistory(messages : List.List<Types.ChatMessage>) : [Types.ChatMessage] {
    messages.toArray();
  };

  public func clearHistory(messages : List.List<Types.ChatMessage>) : () {
    messages.clear();
  };

  public func getSystemInfo(messages : List.List<Types.ChatMessage>, llmStatus : Text) : Types.SystemInfo {
    let statusText = if (llmStatus == "online") {
      "F.R.I.D.A.Y. systems nominal — all intelligence cores active";
    } else if (llmStatus == "degraded") {
      "F.R.I.D.A.Y. operating in reduced capacity — cached intelligence active";
    } else {
      "F.R.I.D.A.Y. intelligence core offline — map and alerts operational";
    };
    {
      messageCount = messages.size();
      status = statusText;
      uptimePlaceholder = "Running on Internet Computer — uptime: continuous";
      llmStatus = llmStatus;
    };
  };

  // ── JSON helpers ───────────────────────────────────────────────────────────

  func jsonEscape(t : Text) : Text {
    var out = t;
    out := out.replace(#char '\\', "\\\\");
    out := out.replace(#text "\"", "\\\"");
    out := out.replace(#char '\n', "\\n");
    out := out.replace(#char '\r', "\\r");
    out := out.replace(#char '\t', "\\t");
    out;
  };

  func extractLlmContent(body : Blob) : ?Text {
    let text = switch (body.decodeUtf8()) {
      case (null) { return null };
      case (?t) { t };
    };

    let needles = [
      "\"content\":\"",
      "\"message\":{\"role\":\"assistant\",\"content\":\"",
      "\"text\":\"",
    ];

    for (needle in needles.values()) {
      let it = text.split(#text needle);
      ignore it.next();
      switch (it.next()) {
        case (null) {};
        case (?after) {
          var result = "";
          var i = 0;
          var prevBackslash = false;
          let chars = after.toArray();
          var done = false;
          while (i < chars.size() and not done) {
            let ch = chars[i];
            if (prevBackslash) {
              if (ch == 'n') {
                result := result # "\n";
              } else if (ch == 't') {
                result := result # "\t";
              } else if (ch == 'r') {
                result := result # "\r";
              } else if (Text.fromChar(ch) == "\"") {
                result := result # "\"";
              } else if (ch == '\\') {
                result := result # "\\";
              } else {
                result := result # "\\" # Text.fromChar(ch);
              };
              prevBackslash := false;
            } else if (ch == '\\') {
              prevBackslash := true;
            } else if (Text.fromChar(ch) == "\"") {
              done := true;
            } else {
              result := result # Text.fromChar(ch);
            };
            i += 1;
          };
          if (result != "") {
            return ?result;
          };
        };
      };
    };

    null;
  };

  // ── Smart topic-aware fallback ─────────────────────────────────────────────

  func smartFallback(userMessage : Text) : Text {
    let lower = userMessage.toLower();
    let offlinePrefix = "F.R.I.D.A.Y. operating in offline mode. World Monitor, map, and alerts continue operating normally. ";

    if (lower.contains(#text "weather") or lower.contains(#text "temperature") or lower.contains(#text "forecast")) {
      return offlinePrefix # "For weather information, check a service like weather.com or your device's built-in weather app.";
    };
    if (lower.contains(#text "hello") or lower.contains(#text "hi") or lower.contains(#text "hey")) {
      return "Hello! F.R.I.D.A.Y. online. Intelligence core operating on cached intelligence — I'm still here to help.";
    };
    if (lower.contains(#text "who are you") or lower.contains(#text "what are you") or lower.contains(#text "your name")) {
      return "I'm F.R.I.D.A.Y. — Female Replacement Intelligent Digital Assistant Youth — powering MeshGen AI. Currently operating on cached intelligence.";
    };
    if (lower.contains(#text "calculate") or lower.contains(#text "math") or lower.contains(#text "equation") or lower.contains(#text "solve") or lower.contains(#text "what is ")) {
      return offlinePrefix # "For math, try Wolfram Alpha at wolframalpha.com. I'll be back at full capacity shortly.";
    };
    if (lower.contains(#text "code") or lower.contains(#text "program") or lower.contains(#text "function") or lower.contains(#text "javascript") or lower.contains(#text "python")) {
      return offlinePrefix # "For code help right now, try GitHub Copilot or the official docs for your language.";
    };
    if (lower.contains(#text "news") or lower.contains(#text "latest") or lower.contains(#text "what's happening")) {
      return "For live news, check the World Monitor panel — it pulls real headlines via the GNews API.";
    };
    offlinePrefix # "I'm currently unable to reach my intelligence core. Please verify your OpenRouter API key is entered correctly in the settings panel (⚙ gear icon). Your key should start with 'sk-or-'. Once configured, I'll be fully operational.";
  };

  // ── Cache-mode response (Layer 2) ─────────────────────────────────────────

  func cachedResponse(userMessage : Text, lastSuccessful : Text) : Text {
    "F.R.I.D.A.Y. running on cached intelligence — live AI core temporarily unavailable.\n\n" #
    "Your message: \"" # userMessage # "\"\n\n" #
    "The World Monitor, map overlays, smart alerts, and agent systems are running independently. " #
    "For full conversational AI, the intelligence core will restore automatically. Previous context: " #
    (if (lastSuccessful == "") {
      "no prior session data available."
    } else {
      "session active with prior intelligence data loaded."
    });
  };

  // ── Single OpenRouter attempt ──────────────────────────────────────────────

  func buildRequestBody(model : Text, systemPrompt : Text, userMessage : Text) : Blob {
    let body =
      "{" #
      "\"model\":\"" # model # "\"," #
      "\"messages\":[" #
        "{\"role\":\"system\",\"content\":\"" # jsonEscape(systemPrompt) # "\"}," #
        "{\"role\":\"user\",\"content\":\"" # jsonEscape(userMessage) # "\"}" #
      "]," #
      "\"max_tokens\":800," #
      "\"temperature\":0.7" #
      "}";
    body.encodeUtf8();
  };

  func callOpenRouter(
    apiKey : Text,
    model : Text,
    systemPrompt : Text,
    userMessage : Text,
  ) : async ?Text {
    let bodyBlob = buildRequestBody(model, systemPrompt, userMessage);
    let request : HttpRequestArgs = {
      url = "https://openrouter.ai/api/v1/chat/completions";
      max_response_bytes = ?300_000;
      headers = [
        { name = "Content-Type"; value = "application/json" },
        { name = "Authorization"; value = "Bearer " # apiKey },
        { name = "HTTP-Referer"; value = "https://meshgenai.icp" },
        { name = "X-Title"; value = "MeshGen AI" },
      ];
      body = ?bodyBlob;
      method = #post;
      transform = null;
    };

    let response = try {
      await (with cycles = 2_000_000_000_000) ic.http_request(request);
    } catch (_) {
      return null;
    };

    if (response.status < 200 or response.status >= 300) {
      return null;
    };

    let bodyText = switch (response.body.decodeUtf8()) {
      case (null) { return null };
      case (?t) { t };
    };

    if (bodyText.contains(#text "\"error\"") and not bodyText.contains(#text "\"choices\"")) {
      return null;
    };

    extractLlmContent(response.body);
  };

  // ── Main LLM call (3-layer fallback) ──────────────────────────────────────
  /// Layer 1: Live LLM (mistral-7b-instruct → gpt-3.5-turbo)
  /// Layer 2: Cached response mode
  /// Layer 3: Static smart fallback
  /// state: actor-owned mutable LLM state passed by reference
  public func generateFridayResponse(
    userMessage : Text,
    apiKey : Text,
    events : List.List<EventTypes.NewsEvent>,
    state : LlmState,
  ) : async Text {
    if (apiKey == "") {
      if (state.consecutiveFailures < 3 and state.lastSuccessfulResponse != "") {
        state.llmStatus := "degraded";
        return cachedResponse(userMessage, state.lastSuccessfulResponse);
      };
      state.llmStatus := "offline";
      return "No API key configured — please add your OpenRouter API key in the settings panel (⚙ gear icon) to activate my AI capabilities.";
    };

    let newsContext = EventsLib.buildChatContext(events);
    let systemPrompt = getSystemPrompt(newsContext);

    let primaryResult = await callOpenRouter(apiKey, "mistralai/mistral-7b-instruct", systemPrompt, userMessage);
    switch (primaryResult) {
      case (?content) {
        state.lastSuccessfulResponse := content;
        state.llmStatus := "online";
        state.consecutiveFailures := 0;
        return content;
      };
      case (null) {};
    };

    let fallbackResult = await callOpenRouter(apiKey, "openai/gpt-3.5-turbo", systemPrompt, userMessage);
    switch (fallbackResult) {
      case (?content) {
        state.lastSuccessfulResponse := content;
        state.llmStatus := "online";
        state.consecutiveFailures := 0;
        return content;
      };
      case (null) {};
    };

    state.consecutiveFailures += 1;

    if (state.consecutiveFailures < 3 and state.lastSuccessfulResponse != "") {
      state.llmStatus := "degraded";
      return cachedResponse(userMessage, state.lastSuccessfulResponse);
    };

    state.llmStatus := "offline";
    smartFallback(userMessage);
  };
};
