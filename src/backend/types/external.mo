module {
  public type NewsArticle = {
    title : Text;
    description : Text;
    url : Text;
    image : Text;
    publishedAt : Text;
    hasVideo : Bool;
  };

  public type SearchResult = {
    title : Text;
    snippet : Text;
    url : Text;
  };
};
