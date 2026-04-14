import List "mo:core/List";
import Time "mo:core/Time";
import Types "../types/chat";
import EventTypes "../types/events";
import ChatLib "../lib/chat";

mixin (
  messages : List.List<Types.ChatMessage>,
  nextId : { var value : Nat },
  openRouterApiKey : { var value : Text },
  events : List.List<EventTypes.NewsEvent>,
  llmState : ChatLib.LlmState,
) {
  /// Transform function for IC HTTP outcalls — strips non-deterministic headers
  /// so all replicas reach consensus on the response body.
  public shared query func transformHttpResponse(raw : { response : ChatLib.HttpResponse; context : Blob }) : async ChatLib.HttpResponse {
    {
      status = raw.response.status;
      body = raw.response.body;
      headers = [];
    };
  };

  public shared func sendMessage(userMessage : Text) : async Text {
    let now = Time.now();

    ignore ChatLib.addMessage(messages, nextId.value, #user, userMessage, now);
    nextId.value += 1;

    let response = await ChatLib.generateFridayResponse(userMessage, openRouterApiKey.value, events, llmState);

    ignore ChatLib.addMessage(messages, nextId.value, #assistant, response, Time.now());
    nextId.value += 1;

    response;
  };

  public query func getChatHistory() : async [Types.ChatMessage] {
    ChatLib.getHistory(messages);
  };

  public shared func clearChat() : async () {
    ChatLib.clearHistory(messages);
  };

  public query func getSystemInfo() : async Types.SystemInfo {
    ChatLib.getSystemInfo(messages, llmState.llmStatus);
  };

  public query func getLlmStatus() : async Text {
    llmState.llmStatus;
  };
};
