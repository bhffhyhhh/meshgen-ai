import List "mo:core/List";
import AgentTypes "../types/agents";
import EventTypes "../types/events";
import AgentsLib "../lib/agents";

mixin (
  agentState : { var value : AgentTypes.AgentState },
  events : List.List<EventTypes.NewsEvent>,
  gNewsApiKey : { var value : Text },
) {
  /// Return the current status of all agents and last run metadata.
  public query func getAgentState() : async AgentTypes.AgentState {
    AgentsLib.getState(agentState.value);
  };

  /// Trigger a full news refresh cycle: fetch → extract locations → store events → update agent state.
  public shared func triggerNewsRefresh() : async { success : Bool; eventCount : Nat } {
    await AgentsLib.triggerNewsRefresh(agentState, events, gNewsApiKey.value);
  };
};
