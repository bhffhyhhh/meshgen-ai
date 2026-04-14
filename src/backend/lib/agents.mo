import List "mo:core/List";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import AgentTypes "../types/agents";
import EventTypes "../types/events";
import EventsLib "../lib/events";

module {
  // ── HTTP outcall types (IC management canister) ───────────────────────────
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

  type HttpResponse = {
    status : Nat;
    headers : [{ name : Text; value : Text }];
    body : Blob;
  };

  type IC = actor {
    http_request : HttpRequestArgs -> async HttpResponse;
  };

  let ic : IC = actor "aaaaa-aa";

  // ── Country keyword → (lat, lng) lookup ───────────────────────────────────
  // Simple keyword-based country detection for location inference
  type CountryEntry = { keyword : Text; country : Text; lat : Float; lng : Float };

  let countryTable : [CountryEntry] = [
    { keyword = "ukraine"; country = "Ukraine"; lat = 49.0; lng = 32.0 },
    { keyword = "russia"; country = "Russia"; lat = 61.0; lng = 105.0 },
    { keyword = "china"; country = "China"; lat = 35.0; lng = 105.0 },
    { keyword = "usa"; country = "USA"; lat = 38.0; lng = -97.0 },
    { keyword = "united states"; country = "USA"; lat = 38.0; lng = -97.0 },
    { keyword = "america"; country = "USA"; lat = 38.0; lng = -97.0 },
    { keyword = "uk"; country = "UK"; lat = 55.0; lng = -3.0 },
    { keyword = "britain"; country = "UK"; lat = 55.0; lng = -3.0 },
    { keyword = "england"; country = "UK"; lat = 52.0; lng = -1.0 },
    { keyword = "france"; country = "France"; lat = 46.0; lng = 2.0 },
    { keyword = "germany"; country = "Germany"; lat = 51.0; lng = 10.0 },
    { keyword = "india"; country = "India"; lat = 20.0; lng = 77.0 },
    { keyword = "pakistan"; country = "Pakistan"; lat = 30.0; lng = 69.0 },
    { keyword = "israel"; country = "Israel"; lat = 31.5; lng = 34.75 },
    { keyword = "gaza"; country = "Palestine"; lat = 31.4; lng = 34.3 },
    { keyword = "iran"; country = "Iran"; lat = 32.0; lng = 53.0 },
    { keyword = "iraq"; country = "Iraq"; lat = 33.0; lng = 44.0 },
    { keyword = "syria"; country = "Syria"; lat = 34.8; lng = 38.9 },
    { keyword = "turkey"; country = "Turkey"; lat = 39.0; lng = 35.0 },
    { keyword = "egypt"; country = "Egypt"; lat = 26.0; lng = 30.0 },
    { keyword = "nigeria"; country = "Nigeria"; lat = 9.0; lng = 8.0 },
    { keyword = "kenya"; country = "Kenya"; lat = -1.0; lng = 37.0 },
    { keyword = "south africa"; country = "South Africa"; lat = -29.0; lng = 25.0 },
    { keyword = "brazil"; country = "Brazil"; lat = -10.0; lng = -55.0 },
    { keyword = "mexico"; country = "Mexico"; lat = 23.0; lng = -102.0 },
    { keyword = "canada"; country = "Canada"; lat = 56.0; lng = -96.0 },
    { keyword = "australia"; country = "Australia"; lat = -27.0; lng = 133.0 },
    { keyword = "japan"; country = "Japan"; lat = 36.0; lng = 138.0 },
    { keyword = "south korea"; country = "South Korea"; lat = 36.0; lng = 128.0 },
    { keyword = "north korea"; country = "North Korea"; lat = 40.0; lng = 127.0 },
    { keyword = "taiwan"; country = "Taiwan"; lat = 23.5; lng = 121.0 },
    { keyword = "afghanistan"; country = "Afghanistan"; lat = 33.0; lng = 66.0 },
    { keyword = "ethiopia"; country = "Ethiopia"; lat = 9.0; lng = 40.0 },
    { keyword = "somalia"; country = "Somalia"; lat = 6.0; lng = 46.0 },
    { keyword = "sudan"; country = "Sudan"; lat = 15.0; lng = 32.0 },
    { keyword = "venezuela"; country = "Venezuela"; lat = 8.0; lng = -66.0 },
    { keyword = "colombia"; country = "Colombia"; lat = 4.0; lng = -72.0 },
    { keyword = "indonesia"; country = "Indonesia"; lat = -5.0; lng = 120.0 },
    { keyword = "philippines"; country = "Philippines"; lat = 13.0; lng = 122.0 },
    { keyword = "myanmar"; country = "Myanmar"; lat = 17.0; lng = 96.0 },
    { keyword = "thailand"; country = "Thailand"; lat = 15.0; lng = 101.0 },
    { keyword = "vietnam"; country = "Vietnam"; lat = 16.0; lng = 108.0 },
    { keyword = "italy"; country = "Italy"; lat = 42.0; lng = 12.0 },
    { keyword = "spain"; country = "Spain"; lat = 40.0; lng = -4.0 },
    { keyword = "poland"; country = "Poland"; lat = 52.0; lng = 20.0 },
    { keyword = "saudi arabia"; country = "Saudi Arabia"; lat = 24.0; lng = 45.0 },
    { keyword = "yemen"; country = "Yemen"; lat = 15.5; lng = 48.0 },
    { keyword = "libya"; country = "Libya"; lat = 26.0; lng = 17.0 },
  ];

  /// Infer country and approximate coordinates from article title/description text.
  func inferLocation(text : Text) : { country : Text; lat : Float; lng : Float } {
    let lower = text.toLower();
    for (entry in countryTable.values()) {
      if (lower.contains(#text (entry.keyword))) {
        return { country = entry.country; lat = entry.lat; lng = entry.lng };
      };
    };
    // Default to world centroid when no match
    { country = "Global"; lat = 20.0; lng = 0.0 };
  };

  // ── Severity scoring by keyword ───────────────────────────────────────────
  func scoreSeverity(text : Text) : Text {
    let lower = text.toLower();
    if (
      lower.contains(#text "war") or
      lower.contains(#text "attack") or
      lower.contains(#text "killed") or
      lower.contains(#text "earthquake") or
      lower.contains(#text "tsunami") or
      lower.contains(#text "explosion") or
      lower.contains(#text "terror") or
      lower.contains(#text "nuclear") or
      lower.contains(#text "missile") or
      lower.contains(#text "bomb") or
      lower.contains(#text "crisis") or
      lower.contains(#text "disaster")
    ) {
      "critical";
    } else if (
      lower.contains(#text "protest") or
      lower.contains(#text "election") or
      lower.contains(#text "sanction") or
      lower.contains(#text "flood") or
      lower.contains(#text "fire") or
      lower.contains(#text "storm") or
      lower.contains(#text "hurricane") or
      lower.contains(#text "shoot") or
      lower.contains(#text "arrest") or
      lower.contains(#text "outbreak") or
      lower.contains(#text "epidemic")
    ) {
      "high";
    } else if (
      lower.contains(#text "trade") or
      lower.contains(#text "economy") or
      lower.contains(#text "market") or
      lower.contains(#text "deal") or
      lower.contains(#text "summit") or
      lower.contains(#text "treaty") or
      lower.contains(#text "agreement")
    ) {
      "medium";
    } else {
      "low";
    };
  };

  // ── JSON field extraction helpers ─────────────────────────────────────────
  func extractJsonField(json : Text, field : Text) : Text {
    let needle = "\"" # field # "\":\"";
    var it = json.split(#text needle);
    ignore it.next();
    switch (it.next()) {
      case (null) { "" };
      case (?after) {
        var result = "";
        var prevBackslash = false;
        let chars = after.toArray();
        var i = 0;
        var done = false;
        while (i < chars.size() and not done) {
          let ch = chars[i];
          if (prevBackslash) {
            if (ch == 'n') { result := result # "\n" }
            else if (ch == 't') { result := result # "\t" }
            else if (Text.fromChar(ch) == "\"") { result := result # "\"" }
            else if (ch == '\\') { result := result # "\\" }
            else { result := result # Text.fromChar(ch) };
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
        result;
      };
    };
  };

  /// Parse GNews JSON response body and extract up to 20 articles as events.
  func parseGNewsArticles(
    body : Blob,
    nowNs : Int,
  ) : [EventTypes.NewsEvent] {
    let textOpt = body.decodeUtf8();
    let text = switch (textOpt) {
      case (null) { return [] };
      case (?t) { t };
    };

    // Split on article boundaries: each article starts after `{` within the articles array
    // We look for `"title":"` occurrences and extract fields per article
    var results : List.List<EventTypes.NewsEvent> = List.empty();
    var articleParts = text.split(#text "\"title\":\"");
    ignore articleParts.next(); // skip JSON preamble

    var idx : Nat = 0;
    for (part in articleParts) {
      if (idx >= 20) { }; // soft limit — still iterate but don't add
      if (idx < 20) {
        // Extract title (everything up to next unescaped quote)
        var title = "";
        var prevBackslash = false;
        let chars = part.toArray();
        var i = 0;
        var done = false;
        while (i < chars.size() and not done) {
          let ch = chars[i];
          if (prevBackslash) {
            if (ch == 'n') { title := title # "\n" }
            else if (Text.fromChar(ch) == "\"") { title := title # "\"" }
            else if (ch == '\\') { title := title # "\\" }
            else { title := title # Text.fromChar(ch) };
            prevBackslash := false;
          } else if (ch == '\\') {
            prevBackslash := true;
          } else if (Text.fromChar(ch) == "\"") {
            done := true;
          } else {
            title := title # Text.fromChar(ch);
          };
          i += 1;
        };

        if (title != "") {
          let description = extractJsonField(part, "description");
          let sourceText = extractJsonField(part, "name"); // source.name
          let url = extractJsonField(part, "url");

          let combined = title # " " # description;
          let loc = inferLocation(combined);
          let severity = scoreSeverity(combined);

          let eventId = "ev-" # nowNs.toText() # "-" # idx.toText();

          let event : EventTypes.NewsEvent = {
            id = eventId;
            title;
            description = if (description == "") { title } else { description };
            severity;
            country = loc.country;
            lat = loc.lat;
            lng = loc.lng;
            source = if (sourceText == "") { "GNews" } else { sourceText };
            url;
            publishedAt = nowNs;
            dismissed = false;
          };
          results.add(event);
        };
        idx += 1;
      };
    };
    results.toArray();
  };

  // ── Public functions ───────────────────────────────────────────────────────

  /// Return the current agent state snapshot (immutable copy).
  public func getState(agentState : AgentTypes.AgentState) : AgentTypes.AgentState {
    agentState;
  };

  /// Fetch news via GNews http-outcall, extract events, store them, and return
  /// an updated AgentState along with the count of new events discovered.
  public func triggerNewsRefresh(
    agentState : { var value : AgentTypes.AgentState },
    events : List.List<EventTypes.NewsEvent>,
    gNewsApiKey : Text,
  ) : async { success : Bool; eventCount : Nat } {
    // Mark news agent as running
    agentState.value := {
      agentState.value with
      newsAgent = #running;
      mapAgent = #running;
    };

    if (gNewsApiKey == "") {
      agentState.value := {
        agentState.value with
        newsAgent = #error;
        mapAgent = #error;
      };
      return { success = false; eventCount = 0 };
    };

    let url = "https://gnews.io/api/v4/top-headlines?lang=en&max=20&apikey=" # gNewsApiKey;

    let request : HttpRequestArgs = {
      url;
      max_response_bytes = ?500_000;
      headers = [{ name = "Accept"; value = "application/json" }];
      body = null;
      method = #get;
      transform = null;
    };

    let response = try {
      await (with cycles = 500_000_000_000) ic.http_request(request);
    } catch (_) {
      agentState.value := {
        agentState.value with
        newsAgent = #error;
        mapAgent = #error;
      };
      return { success = false; eventCount = 0 };
    };

    if (response.status < 200 or response.status >= 300) {
      agentState.value := {
        agentState.value with
        newsAgent = #error;
        mapAgent = #error;
      };
      return { success = false; eventCount = 0 };
    };

    let nowNs = Time.now();
    let newEvents = parseGNewsArticles(response.body, nowNs);

    for (event in newEvents.values()) {
      EventsLib.store(events, event);
    };

    let count = newEvents.size();

    agentState.value := {
      newsAgent = #complete;
      mapAgent = #complete;
      videoAgent = agentState.value.videoAgent;
      lastRunAt = nowNs;
      lastEventCount = count;
    };

    { success = true; eventCount = count };
  };
};
