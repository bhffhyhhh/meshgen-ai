module {
  /// Status of an individual agent in the multi-agent HUD.
  public type AgentStatus = { #idle; #running; #complete; #error };

  /// Aggregate state of all agents plus timing metadata.
  public type AgentState = {
    newsAgent : AgentStatus;
    mapAgent : AgentStatus;
    videoAgent : AgentStatus;
    lastRunAt : Int;
    lastEventCount : Nat;
  };
};
