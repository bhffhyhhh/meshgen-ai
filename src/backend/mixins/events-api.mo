import List "mo:core/List";
import EventTypes "../types/events";
import EventsLib "../lib/events";

mixin (events : List.List<EventTypes.NewsEvent>) {
  /// Persist a new event; oldest is evicted when the 500-event cap is hit.
  public shared func storeEvent(event : EventTypes.NewsEvent) : async () {
    EventsLib.store(events, event);
  };

  /// Return all stored events.
  public query func getEvents() : async [EventTypes.NewsEvent] {
    EventsLib.getAll(events);
  };

  /// Return the N most recently stored events.
  public query func getRecentEvents(limit : Nat) : async [EventTypes.NewsEvent] {
    EventsLib.getRecent(events, limit);
  };

  /// Mark an event as dismissed. Returns true if the event was found.
  public shared func dismissEvent(id : Text) : async Bool {
    EventsLib.dismiss(events, id);
  };

  /// Return all events that have not been dismissed.
  public query func getActiveAlerts() : async [EventTypes.NewsEvent] {
    EventsLib.getActive(events);
  };

  /// Return a short formatted text of the top 5 events for LLM prompt injection.
  public query func getNewsContextForChat() : async Text {
    EventsLib.buildChatContext(events);
  };
};
