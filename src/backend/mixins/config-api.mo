mixin (
  gNewsApiKey : { var value : Text },
  openRouterApiKey : { var value : Text },
) {
  /// Store the GNews API key for live news headlines.
  public shared func setGNewsKey(key : Text) : async () {
    gNewsApiKey.value := key;
  };

  /// Retrieve the currently stored GNews API key.
  /// Returns an empty string if no key has been set.
  public query func getGNewsKey() : async Text {
    gNewsApiKey.value;
  };

  /// Store the OpenRouter API key used for F.R.I.D.A.Y.'s LLM responses.
  public shared func setOpenRouterKey(key : Text) : async () {
    openRouterApiKey.value := key;
  };

  /// Retrieve the currently stored OpenRouter API key.
  /// Returns an empty string if no key has been set.
  public query func getOpenRouterKey() : async Text {
    openRouterApiKey.value;
  };
};
