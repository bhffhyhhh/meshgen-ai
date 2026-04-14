import Common "common";

module {
  public type Role = { #user; #assistant };

  public type ChatMessage = {
    id : Common.MessageId;
    role : Role;
    content : Text;
    timestamp : Common.Timestamp;
  };

  public type SystemInfo = {
    messageCount : Nat;
    status : Text;
    uptimePlaceholder : Text;
    llmStatus : Text;
  };
};
