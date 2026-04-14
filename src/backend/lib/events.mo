import List "mo:core/List";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Types "../types/events";

module {
  let MAX_EVENTS : Nat = 500;

  /// Store a new event; evict the oldest entry when the cap is reached.
  public func store(events : List.List<Types.NewsEvent>, event : Types.NewsEvent) {
    if (events.size() >= MAX_EVENTS) {
      // Remove the oldest (first) entry to make room
      ignore events.removeLast(); // removeLast is O(1), but we need the first
      // Since List is a growable array, we evict by shifting: rebuild without first
      let arr = events.toArray();
      events.clear();
      // Skip index 0 (oldest), re-add the rest
      var i = 1;
      while (i < arr.size()) {
        events.add(arr[i]);
        i += 1;
      };
    };
    events.add(event);
  };

  /// Return all stored events as an immutable array.
  public func getAll(events : List.List<Types.NewsEvent>) : [Types.NewsEvent] {
    events.toArray();
  };

  /// Return up to `limit` most recent events (from the end of the list).
  public func getRecent(events : List.List<Types.NewsEvent>, limit : Nat) : [Types.NewsEvent] {
    let total = events.size();
    if (total == 0) return [];
    let start : Int = if (total > limit) { total - limit } else { 0 };
    events.sliceToArray(start, total);
  };

  /// Mark an event as dismissed. Returns true when the event was found.
  public func dismiss(events : List.List<Types.NewsEvent>, id : Text) : Bool {
    var found = false;
    events.mapInPlace(func(e) {
      if (e.id == id) {
        found := true;
        { e with dismissed = true };
      } else {
        e;
      }
    });
    found;
  };

  /// Return all events where dismissed = false.
  public func getActive(events : List.List<Types.NewsEvent>) : [Types.NewsEvent] {
    events.filter(func(e) { not e.dismissed }).toArray();
  };

  /// Build a short text summary of the top 5 most recent events for LLM prompt injection.
  public func buildChatContext(events : List.List<Types.NewsEvent>) : Text {
    let recent = getRecent(events, 5);
    if (recent.size() == 0) return "";

    var ctx = "CURRENT EVENTS:\n";
    for (e in recent.values()) {
      let timeText = (e.publishedAt / 1_000_000_000).toText(); // convert ns to seconds
      ctx := ctx # "- " # e.title # " — " # e.severity # " in " # e.country # " at " # timeText # "\n";
    };
    ctx;
  };
};
