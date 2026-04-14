module {
  /// A tracked news event with geolocation and alert state.
  public type NewsEvent = {
    id : Text;
    title : Text;
    description : Text;
    severity : Text;
    country : Text;
    lat : Float;
    lng : Float;
    source : Text;
    url : Text;
    publishedAt : Int;
    dismissed : Bool;
  };
};
