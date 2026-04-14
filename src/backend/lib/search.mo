import ExternalTypes "../types/external";
import Text "mo:core/Text";
import Array "mo:core/Array";

module {
  // IC management canister HTTP outcall interface
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

  /// Detect whether a user message contains search intent keywords.
  public func hasSearchIntent(message : Text) : Bool {
    let lower = message.toLower();
    lower.contains(#text "search") or
    lower.contains(#text "look up") or
    lower.contains(#text "find") or
    lower.contains(#text "what is") or
    lower.contains(#text "who is") or
    lower.contains(#text "how to") or
    lower.contains(#text "latest news") or
    lower.contains(#text "tell me about");
  };

  /// Parse raw JSON response body from DuckDuckGo into SearchResult array.
  public func parseSearchResponse(body : Blob) : [ExternalTypes.SearchResult] {
    let text = switch (body.decodeUtf8()) {
      case (null) { return [] };
      case (?t) { t };
    };

    var results : [ExternalTypes.SearchResult] = [];

    // Extract Abstract (main answer)
    let abstract_ = extractJsonString(text, "Abstract");
    let abstractUrl = extractJsonString(text, "AbstractURL");

    if (abstract_ != "" and abstractUrl != "") {
      let heading = extractJsonString(text, "Heading");
      results := [
        {
          title = if (heading != "") heading else "Search Result";
          snippet = abstract_;
          url = abstractUrl;
        }
      ];
    };

    // Extract RelatedTopics
    let topicsStart = switch (text.split(#text "\"RelatedTopics\"").next()) {
      case (null) { return results };
      case (?_) {
        var it = text.split(#text "\"RelatedTopics\"");
        ignore it.next();
        switch (it.next()) {
          case (null) { return results };
          case (?s) { s };
        };
      };
    };

    // Parse topic entries: look for "Text" and "FirstURL" pairs
    let topicChunks = topicsStart.split(#text "\"Text\"");
    var isFirst = true;
    var count = 0;

    for (chunk in topicChunks) {
      if (isFirst) {
        isFirst := false;
      } else if (count < 5) {
        // Extract Text value
        let textVal = switch (chunk.stripStart(#text ":\"")) {
          case (?s) {
            switch (s.split(#text "\"").next()) {
              case (?v) { v };
              case (null) { "" };
            };
          };
          case (null) { "" };
        };

        // Extract FirstURL from the same chunk
        let urlVal = extractJsonString(chunk, "FirstURL");

        if (textVal != "" and urlVal != "") {
          // Build a title from the first sentence of textVal
          let titlePart = switch (textVal.split(#char '.').next()) {
            case (?t) { t };
            case (null) { textVal };
          };
          results := results.concat([
            {
              title = titlePart;
              snippet = textVal;
              url = urlVal;
            }
          ]);
          count += 1;
        };
      };
    };

    results;
  };

  /// Extract a simple string field value from a JSON fragment.
  func extractJsonString(json : Text, field : Text) : Text {
    let needle = "\"" # field # "\":\"";
    var it = json.split(#text needle);
    ignore it.next();
    switch (it.next()) {
      case (null) { "" };
      case (?after) {
        switch (after.split(#text "\"").next()) {
          case (?val) { val };
          case (null) { "" };
        };
      };
    };
  };

  /// Run a web search using the DuckDuckGo instant answer API via http-outcalls.
  /// Returns a list of SearchResult records.
  public func searchWeb(searchQuery : Text) : async [ExternalTypes.SearchResult] {
    // URL-encode the query by replacing spaces with + (simple approach)
    let encodedQuery = searchQuery.replace(#char ' ', "+");
    let url = "https://api.duckduckgo.com/?q=" # encodedQuery # "&format=json&no_html=1&skip_disambig=1";

    let request : HttpRequestArgs = {
      url = url;
      max_response_bytes = ?300_000;
      headers = [
        { name = "Accept"; value = "application/json" },
        { name = "User-Agent"; value = "MeshGenAI/1.0" },
      ];
      body = null;
      method = #get;
      transform = null;
    };

    let response = try {
      await (with cycles = 230_949_972_000) ic.http_request(request);
    } catch (_) {
      return fallbackResults(searchQuery);
    };

    if (response.status != 200) {
      return fallbackResults(searchQuery);
    };

    let parsed = parseSearchResponse(response.body);
    if (parsed.size() == 0) {
      fallbackResults(searchQuery);
    } else {
      parsed;
    };
  };

  /// Format search results as a human-readable text block for inclusion in a chat response.
  public func formatSearchResults(results : [ExternalTypes.SearchResult]) : Text {
    if (results.size() == 0) {
      return "No results found.";
    };

    var output = "**Search Results:**\n\n";
    var i = 0;
    for (r in results.values()) {
      i += 1;
      output := output # i.toText() # ". **" # r.title # "**\n";
      output := output # r.snippet # "\n";
      output := output # r.url # "\n\n";
    };
    output;
  };

  /// Fallback results when the API is unavailable.
  func fallbackResults(searchQuery : Text) : [ExternalTypes.SearchResult] {
    [
      {
        title = "Search: " # searchQuery;
        snippet = "Live search results are temporarily unavailable. Try again shortly.";
        url = "https://duckduckgo.com/?q=" # searchQuery.replace(#char ' ', "+");
      }
    ];
  };
};
