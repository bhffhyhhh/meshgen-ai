import AnalyticsTypes "../types/analytics";

module {
  // Quota limits per tier (API calls per hour)
  let QUOTA_FREE : Nat = 20;
  let QUOTA_PRO : Nat = 200;
  let QUOTA_ENTERPRISE : Nat = 2_000;

  /// Build a read-only snapshot from mutable analytics state.
  public func snapshot(
    state : AnalyticsTypes.AnalyticsState,
    tier : Text,
  ) : AnalyticsTypes.AnalyticsSnapshot {
    {
      eventsToday = state.eventsToday;
      locationsTracked = state.locationsTracked;
      videosGenerated = state.videosGenerated;
      alertsDismissed = state.alertsDismissed;
      apiCallsThisHour = state.apiCallsThisHour;
      tier;
    };
  };

  /// Increment the video generation counter.
  public func incrementVideoCount(state : AnalyticsTypes.AnalyticsState) {
    state.videosGenerated += 1;
  };

  /// Increment the API call counter.
  public func incrementApiCall(state : AnalyticsTypes.AnalyticsState) {
    state.apiCallsThisHour += 1;
    state.eventsToday += 1;
  };

  /// Reset the hourly API call counter (called by frontend timer).
  public func resetHourlyApiCalls(state : AnalyticsTypes.AnalyticsState) {
    state.apiCallsThisHour := 0;
  };

  /// Determine whether the current tier allows another API call.
  public func checkQuota(
    state : AnalyticsTypes.AnalyticsState,
    tier : Text,
  ) : { allowed : Bool; remaining : Nat; limit : Nat } {
    let limit = if (tier == "enterprise") {
      QUOTA_ENTERPRISE;
    } else if (tier == "pro") {
      QUOTA_PRO;
    } else {
      QUOTA_FREE;
    };
    let used = state.apiCallsThisHour;
    let remaining = if (used >= limit) { 0 } else { limit - used };
    { allowed = remaining > 0; remaining; limit };
  };
};
