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

  /// Extract the first string value after `"field":"` in a JSON text fragment.
  func extractJsonString(json : Text, field : Text) : Text {
    let needle = "\"" # field # "\":\"";
    var it = json.split(#text needle);
    ignore it.next(); // skip before key
    switch (it.next()) {
      case (null) { "" };
      case (?after) {
        // value ends at the next unescaped quote — split on `","` or `"}` as boundary
        switch (after.split(#text "\"").next()) {
          case (?val) { val };
          case (null) { "" };
        };
      };
    };
  };

  /// Parse raw JSON response body (Blob) into NewsArticle array.
  public func parseNewsResponse(body : Blob) : [ExternalTypes.NewsArticle] {
    let text = switch (body.decodeUtf8()) {
      case (null) { return [] };
      case (?t) { t };
    };

    var articles : [ExternalTypes.NewsArticle] = [];

    // Each article block is demarcated by `"title":"`
    let titleDelim = "\"title\":\"";
    var chunks = text.split(#text titleDelim);
    var isFirst = true;

    for (chunk in chunks) {
      if (isFirst) {
        isFirst := false;
      } else {
        // Title is the text up to the first `"`
        let title = switch (chunk.split(#text "\"").next()) {
          case (?t) { t };
          case (null) { "" };
        };

        if (title != "") {
          let description = extractJsonString(chunk, "description");
          let url = extractJsonString(chunk, "url");
          let image = extractJsonString(chunk, "image");
          let publishedAt = extractJsonString(chunk, "publishedAt");

          articles := articles.concat([
            {
              title = title;
              description = description;
              url = url;
              image = image;
              publishedAt = publishedAt;
              hasVideo = false;
            }
          ]);
        };
      };
    };

    articles;
  };

  /// Fetch top headlines from the GNews API via http-outcalls.
  /// Pass the stored API key; falls back to "demo" when the key is empty.
  public func fetchTopHeadlines(apiKey : Text) : async [ExternalTypes.NewsArticle] {
    let token = if (apiKey == "") { "demo" } else { apiKey };
    let url = "https://gnews.io/api/v4/top-headlines?lang=en&max=6&token=" # token;

    let request : HttpRequestArgs = {
      url = url;
      max_response_bytes = ?200_000;
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
      return fallbackHeadlines();
    };

    if (response.status != 200) {
      return fallbackHeadlines();
    };

    let parsed = parseNewsResponse(response.body);
    if (parsed.size() == 0) {
      fallbackHeadlines();
    } else {
      parsed;
    };
  };

  /// Fallback headlines when API is unavailable.
  func fallbackHeadlines() : [ExternalTypes.NewsArticle] {
    [
      {
        title = "MeshGen AI — Real-time news feed initializing";
        description = "Connect to live news by configuring a valid GNews API key.";
        url = "https://gnews.io";
        image = "";
        publishedAt = "2026-04-14T00:00:00Z";
        hasVideo = false;
      },
      {
        title = "AI systems continue to transform global industries";
        description = "Artificial intelligence is reshaping how businesses operate across sectors.";
        url = "https://gnews.io";
        image = "";
        publishedAt = "2026-04-14T00:00:00Z";
        hasVideo = false;
      },
      {
        title = "Internet Computer Protocol advances decentralized computing";
        description = "The Internet Computer continues to push boundaries in blockchain-based cloud computing.";
        url = "https://internetcomputer.org";
        image = "";
        publishedAt = "2026-04-14T00:00:00Z";
        hasVideo = false;
      },
    ];
  };
};
