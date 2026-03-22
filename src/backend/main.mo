import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Text "mo:core/Text";

actor {
  type Score = {
    playerName : Text;
    points : Nat;
  };

  module Score {
    public func compareByPoints(score1 : Score, score2 : Score) : Order.Order {
      Nat.compare(score2.points, score1.points);
    };
  };

  var highScores = Array.repeat({ playerName = ""; points = 0 }, 10);

  public func submitScore(playerName : Text, points : Nat) : async () {
    if (playerName == "") { Runtime.trap("Player name cannot be empty") };

    let score = { playerName; points };

    let allScores = highScores.concat([score]);
    let sortedScores = allScores.sort(Score.compareByPoints);
    highScores := Array.tabulate(10, func(i) { sortedScores[i] });
  };

  public query func getHighScores() : async [Score] {
    highScores;
  };
};
