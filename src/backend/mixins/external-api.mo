import ExternalTypes "../types/external";
import NewsLib "../lib/news";
import SearchLib "../lib/search";

mixin (gNewsApiKey : { var value : Text }) {
  /// Fetch the latest news headlines via http-outcalls to the GNews API.
  /// Returns up to 6 NewsArticle records.
  public shared func fetchNews() : async [ExternalTypes.NewsArticle] {
    await NewsLib.fetchTopHeadlines(gNewsApiKey.value);
  };

  /// Run a live web search using the DuckDuckGo instant answer API.
  /// Returns a list of SearchResult records for the given query.
  public shared func searchWeb(searchQuery : Text) : async [ExternalTypes.SearchResult] {
    await SearchLib.searchWeb(searchQuery);
  };
};
