module {
  /// Snapshot of current analytics counters.
  public type AnalyticsSnapshot = {
    eventsToday : Nat;
    locationsTracked : Nat;
    videosGenerated : Nat;
    alertsDismissed : Nat;
    apiCallsThisHour : Nat;
    tier : Text;
  };

  /// Mutable analytics state (internal use only — not exposed directly).
  public type AnalyticsState = {
    var eventsToday : Nat;
    var locationsTracked : Nat;
    var videosGenerated : Nat;
    var alertsDismissed : Nat;
    var apiCallsThisHour : Nat;
  };
};
