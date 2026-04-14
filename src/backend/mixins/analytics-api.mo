import AnalyticsTypes "../types/analytics";
import AnalyticsLib "../lib/analytics";

mixin (
  analyticsState : AnalyticsTypes.AnalyticsState,
  tier : { var value : Text },
) {
  /// Return the current analytics counters snapshot.
  public query func getAnalytics() : async AnalyticsTypes.AnalyticsSnapshot {
    AnalyticsLib.snapshot(analyticsState, tier.value);
  };

  /// Increment the video generation counter.
  public shared func incrementVideoCount() : async () {
    AnalyticsLib.incrementVideoCount(analyticsState);
  };

  /// Increment the API call counter.
  public shared func incrementApiCall() : async () {
    AnalyticsLib.incrementApiCall(analyticsState);
  };

  /// Reset the hourly API call counter (called by the frontend timer).
  public shared func resetHourlyApiCalls() : async () {
    AnalyticsLib.resetHourlyApiCalls(analyticsState);
  };

  /// Return current quota status based on the active subscription tier.
  public query func checkQuota() : async { allowed : Bool; remaining : Nat; limit : Nat } {
    AnalyticsLib.checkQuota(analyticsState, tier.value);
  };

  /// Return the current subscription tier as a text value.
  public query func getTier() : async Text {
    tier.value;
  };

  /// Set the subscription tier. Returns true on success, false if unrecognised.
  public shared func setTier(tierValue : Text) : async Bool {
    if (tierValue == "free" or tierValue == "pro" or tierValue == "enterprise") {
      tier.value := tierValue;
      true;
    } else {
      false;
    };
  };
};
