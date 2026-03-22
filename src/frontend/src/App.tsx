import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Heart,
  Play,
  RotateCcw,
  Shield,
  Trophy,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import GameCanvas, {
  type GameState,
  type GameResult,
} from "./components/GameCanvas";
import { useHighScores, useSubmitScore } from "./hooks/useQueries";

const queryClient = new QueryClient();

function AppContent() {
  const [screen, setScreen] = useState<"landing" | "game" | "gameover">(
    "landing",
  );
  const [gameState, setGameState] = useState<GameState>("START");
  const [currentScore, setCurrentScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"game" | "leaderboard">("game");

  const { data: highScores, isLoading: scoresLoading } = useHighScores();
  const submitScore = useSubmitScore();

  const handleGameOver = useCallback((result: GameResult) => {
    setFinalScore(result.score);
    setScreen("gameover");
    setScoreSubmitted(false);
  }, []);

  const handleScoreUpdate = useCallback((score: number) => {
    setCurrentScore(score);
  }, []);

  const handlePlayNow = () => {
    setScreen("game");
    setActiveTab("game");
    setCurrentScore(0);
    setGameState("PLAYING");
  };

  const handlePlayAgain = () => {
    setCurrentScore(0);
    setFinalScore(0);
    setScoreSubmitted(false);
    setScreen("game");
    setActiveTab("game");
    setGameState("START");
    // Brief delay then start playing
    setTimeout(() => setGameState("PLAYING"), 100);
  };

  const handleSubmitScore = async () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name!");
      return;
    }
    try {
      await submitScore.mutateAsync({
        name: playerName.trim(),
        score: finalScore,
      });
      setScoreSubmitted(true);
      toast.success("Score submitted! 🏆");
    } catch {
      toast.error("Failed to submit score. Try again!");
    }
  };

  return (
    <div className="min-h-screen bg-background font-body">
      <AnimatePresence mode="wait">
        {screen === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <LandingPage
              onPlay={handlePlayNow}
              highScores={highScores}
              scoresLoading={scoresLoading}
            />
          </motion.div>
        )}

        {screen === "game" && (
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GamePage
              gameState={gameState}
              onStateChange={setGameState}
              onGameOver={handleGameOver}
              onScoreUpdate={handleScoreUpdate}
              currentScore={currentScore}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              highScores={highScores}
              scoresLoading={scoresLoading}
              onBackToMenu={() => setScreen("landing")}
            />
          </motion.div>
        )}

        {screen === "gameover" && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <GameOverPage
              score={finalScore}
              playerName={playerName}
              onNameChange={setPlayerName}
              onSubmitScore={handleSubmitScore}
              onPlayAgain={handlePlayAgain}
              onBackToMenu={() => setScreen("landing")}
              scoreSubmitted={scoreSubmitted}
              isSubmitting={submitScore.isPending}
              highScores={highScores}
              scoresLoading={scoresLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster />
    </div>
  );
}

// --- Landing Page ---
interface Score {
  playerName: string;
  points: bigint;
}

function LandingPage({
  onPlay,
  highScores,
  scoresLoading,
}: {
  onPlay: () => void;
  highScores: Score[] | undefined;
  scoresLoading: boolean;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 scanline opacity-30" />

      {/* Nav */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-game-orange to-amber-400 flex items-center justify-center glow-orange">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-base text-foreground leading-none">
                Road
              </div>
              <div className="font-display font-bold text-base text-game-orange leading-none">
                Rushers
              </div>
            </div>
          </div>
          <nav
            className="hidden md:flex items-center gap-6"
            aria-label="Main navigation"
          >
            {["Home", "Features", "Leaderboards", "Community", "Support"].map(
              (item) => (
                <a
                  key={item}
                  href="#features"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-ocid={`nav.${item.toLowerCase()}.link`}
                >
                  {item}
                </a>
              ),
            )}
          </nav>
          <Button
            className="btn-orange rounded-full px-5"
            onClick={onPlay}
            data-ocid="nav.play_now.button"
          >
            Play Now
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="relative z-10 text-center py-20 px-6 max-w-4xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-game-orange font-semibold text-sm tracking-widest uppercase mb-4"
          >
            Top Down 2D Racing Game
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display font-extrabold text-5xl md:text-7xl uppercase tracking-tight text-foreground mb-4 glow-orange-text"
          >
            EXPERIENCE THE
            <br />
            <span className="text-game-orange">RUSH</span> IN 2D!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-game-gray text-lg mb-8"
          >
            Dodge traffic, build speed, and claim the top spot on the
            leaderboard.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            <Button
              size="lg"
              className="btn-orange rounded-xl px-8 py-4 text-base glow-orange"
              onClick={onPlay}
              data-ocid="hero.play_now.primary_button"
            >
              <Play className="w-5 h-5 mr-2" />
              PLAY GAME NOW
            </Button>
          </motion.div>
        </section>

        {/* Game preview image */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="relative z-10 max-w-3xl mx-auto px-6 mb-16"
        >
          <div className="relative rounded-2xl overflow-hidden card-border-glow glow-blue animate-float">
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent z-10" />
            <img
              src="/assets/generated/game-preview.dim_800x450.jpg"
              alt="Road Rushers game preview"
              className="w-full block"
            />
            <div className="absolute bottom-4 left-4 right-4 z-20 flex gap-3 text-xs">
              {["Speed", "Score", "Lap", "Boost"].map((stat) => (
                <div
                  key={stat}
                  className="bg-background/80 border border-game-orange/30 rounded px-3 py-1.5"
                >
                  <span className="text-game-orange font-bold">{stat}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Feature cards */}
        <section className="relative z-10 max-w-5xl mx-auto px-6 pb-16">
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Lightning Fast",
                desc: "Accelerate to extreme speeds as your score climbs. The longer you survive, the faster the rush.",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "3 Lives System",
                desc: "You get 3 chances before it's game over. Dodge traffic, stay in your lane, and survive.",
              },
              {
                icon: <Trophy className="w-6 h-6" />,
                title: "Global Leaderboard",
                desc: "Submit your score and compete with players worldwide. Can you reach the top?",
              },
              {
                icon: <Heart className="w-6 h-6" />,
                title: "Easy Controls",
                desc: "Mobile: swipe or tap left/right to switch lanes, swipe up/down to change speed. PC: arrow keys or WASD. Simple to learn, hard to master.",
              },
            ].map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="bg-card card-border-glow rounded-xl p-6"
                data-ocid={`features.item.${i + 1}`}
              >
                <div className="w-10 h-10 rounded-lg bg-game-orange/15 flex items-center justify-center text-game-orange mb-4">
                  {feat.icon}
                </div>
                <h3 className="font-display font-bold text-lg text-foreground mb-2">
                  {feat.title}
                </h3>
                <p className="text-muted-foreground text-sm">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Leaderboard preview */}
        <section className="relative z-10 max-w-2xl mx-auto px-6 pb-20">
          <div className="bg-card card-border-glow rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-6 h-6 text-game-orange" />
              <h2 className="font-display font-bold text-xl">Top Scores</h2>
            </div>
            <LeaderboardTable scores={highScores} isLoading={scoresLoading} />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-background/60 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              className="text-game-orange hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              caffeine.ai
            </a>
          </p>
          <p className="text-muted-foreground text-sm">
            Road Rushers — Top Down 2D Racing
          </p>
        </div>
      </footer>
    </div>
  );
}

// --- D-pad control button helper ---
function DpadButton({
  label,
  arrowKey,
  children,
  "data-ocid": ocid,
}: {
  label: string;
  arrowKey: string;
  children: React.ReactNode;
  "data-ocid"?: string;
}) {
  const fire = (type: "keydown" | "keyup") => {
    window.dispatchEvent(
      new KeyboardEvent(type, { key: arrowKey, bubbles: true }),
    );
  };

  return (
    <button
      type="button"
      aria-label={label}
      data-ocid={ocid}
      className="w-14 h-14 rounded-xl border-2 border-game-orange/70 bg-background/80 text-foreground flex items-center justify-center shadow-lg active:scale-95 active:bg-game-orange/20 transition-all select-none touch-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        fire("keydown");
      }}
      onPointerUp={() => fire("keyup")}
      onPointerLeave={() => fire("keyup")}
      onPointerCancel={() => fire("keyup")}
    >
      {children}
    </button>
  );
}

// --- Game Page ---
function GamePage({
  gameState,
  onStateChange,
  onGameOver,
  onScoreUpdate,
  currentScore,
  activeTab,
  onTabChange,
  highScores,
  scoresLoading,
  onBackToMenu,
}: {
  gameState: GameState;
  onStateChange: (s: GameState) => void;
  onGameOver: (r: GameResult) => void;
  onScoreUpdate: (score: number) => void;
  currentScore: number;
  activeTab: "game" | "leaderboard";
  onTabChange: (tab: "game" | "leaderboard") => void;
  highScores: Score[] | undefined;
  scoresLoading: boolean;
  onBackToMenu: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/50 bg-background/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
            onClick={onBackToMenu}
            data-ocid="game.back_to_menu.button"
          >
            <ArrowLeft className="w-4 h-4" />
            Menu
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-game-orange to-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-foreground">
              Road Rushers
            </span>
          </div>
          <div
            className="text-game-orange font-bold font-display text-lg"
            data-ocid="game.score.panel"
          >
            {currentScore.toLocaleString()}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-6 px-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-card rounded-xl p-1 mb-6 border border-border">
          {(["game", "leaderboard"] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              className={`px-6 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                activeTab === tab
                  ? "bg-game-orange text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => onTabChange(tab)}
              data-ocid={`game.${tab}.tab`}
            >
              {tab === "leaderboard" ? (
                <span className="flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  Scores
                </span>
              ) : (
                "Game"
              )}
            </button>
          ))}
        </div>

        {activeTab === "game" && (
          <div className="flex flex-col items-center gap-4 w-full max-w-lg">
            {/* Canvas container */}
            <div className="relative rounded-2xl overflow-hidden card-border-glow glow-blue">
              <GameCanvas
                gameState={gameState}
                onStateChange={onStateChange}
                onGameOver={onGameOver}
                onScoreUpdate={onScoreUpdate}
              />

              {/* Pause overlay */}
              {gameState === "PAUSED" && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-4">
                  <p className="font-display font-bold text-3xl text-game-orange uppercase">
                    Paused
                  </p>
                  <Button
                    className="btn-orange rounded-xl"
                    onClick={() => onStateChange("PLAYING")}
                    data-ocid="game.resume.button"
                  >
                    Resume
                  </Button>
                </div>
              )}
            </div>

            {/* On-screen D-pad controls */}
            <div
              className="flex flex-col items-center gap-1"
              data-ocid="game.controls.panel"
            >
              {/* Up */}
              <div className="flex justify-center">
                <DpadButton
                  label="Accelerate"
                  arrowKey="ArrowUp"
                  data-ocid="game.up.button"
                >
                  <ChevronUp className="w-6 h-6" />
                </DpadButton>
              </div>
              {/* Middle row */}
              <div className="flex items-center gap-8">
                <DpadButton
                  label="Lane left"
                  arrowKey="ArrowLeft"
                  data-ocid="game.left.button"
                >
                  <ChevronLeft className="w-6 h-6" />
                </DpadButton>
                <div className="w-14 h-14 flex items-center justify-center">
                  <span className="text-muted-foreground/40 text-xs text-center leading-tight">
                    ESC
                    <br />
                    pause
                  </span>
                </div>
                <DpadButton
                  label="Lane right"
                  arrowKey="ArrowRight"
                  data-ocid="game.right.button"
                >
                  <ChevronRight className="w-6 h-6" />
                </DpadButton>
              </div>
              {/* Down */}
              <div className="flex justify-center">
                <DpadButton
                  label="Brake"
                  arrowKey="ArrowDown"
                  data-ocid="game.down.button"
                >
                  <ChevronDown className="w-6 h-6" />
                </DpadButton>
              </div>
            </div>

            {/* Pause button */}
            {gameState === "PLAYING" && (
              <Button
                variant="outline"
                size="sm"
                className="border-border"
                onClick={() => onStateChange("PAUSED")}
                data-ocid="game.pause.button"
              >
                Pause
              </Button>
            )}
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="w-full max-w-lg">
            <div className="bg-card card-border-glow rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="w-5 h-5 text-game-orange" />
                <h2 className="font-display font-bold text-lg">Leaderboard</h2>
              </div>
              <LeaderboardTable scores={highScores} isLoading={scoresLoading} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Game Over Page ---
function GameOverPage({
  score,
  playerName,
  onNameChange,
  onSubmitScore,
  onPlayAgain,
  onBackToMenu,
  scoreSubmitted,
  isSubmitting,
  highScores,
  scoresLoading,
}: {
  score: number;
  playerName: string;
  onNameChange: (v: string) => void;
  onSubmitScore: () => void;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
  scoreSubmitted: boolean;
  isSubmitting: boolean;
  highScores: Score[] | undefined;
  scoresLoading: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden">
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 scanline opacity-20" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: 0.4,
          type: "spring",
          stiffness: 200,
          damping: 20,
        }}
        className="relative z-10 w-full max-w-lg"
        data-ocid="gameover.modal"
      >
        <div className="bg-card card-border-glow rounded-2xl p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="w-20 h-20 bg-game-orange/15 rounded-full flex items-center justify-center mx-auto mb-4 glow-orange"
          >
            <Trophy className="w-10 h-10 text-game-orange" />
          </motion.div>

          <h1 className="font-display font-extrabold text-4xl uppercase text-foreground mb-2">
            Game Over
          </h1>
          <p className="text-muted-foreground mb-6">Your run has ended</p>

          <div className="bg-background/60 rounded-xl p-4 mb-6">
            <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">
              Final Score
            </p>
            <p className="font-display font-extrabold text-5xl text-game-orange glow-orange-text">
              {score.toLocaleString()}
            </p>
          </div>

          {!scoreSubmitted ? (
            <div className="space-y-3 mb-6">
              <p className="text-sm text-muted-foreground">
                Submit your score to the leaderboard:
              </p>
              <Input
                placeholder="Your name..."
                value={playerName}
                onChange={(e) => onNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSubmitScore();
                }}
                className="bg-background/60 border-border text-center font-semibold"
                maxLength={20}
                data-ocid="gameover.name.input"
              />
              <Button
                className="w-full btn-orange rounded-xl"
                onClick={onSubmitScore}
                disabled={isSubmitting || !playerName.trim()}
                data-ocid="gameover.submit_score.submit_button"
              >
                {isSubmitting ? "Submitting..." : "Submit Score 🏆"}
              </Button>
            </div>
          ) : (
            <div className="mb-6 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
              <p className="text-green-400 font-semibold text-sm">
                ✓ Score submitted successfully!
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-border"
              onClick={onBackToMenu}
              data-ocid="gameover.back_to_menu.button"
            >
              Menu
            </Button>
            <Button
              className="flex-1 btn-orange rounded-xl"
              onClick={onPlayAgain}
              data-ocid="gameover.play_again.primary_button"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Play Again
            </Button>
          </div>
        </div>

        {/* Leaderboard below */}
        <div className="bg-card card-border-glow rounded-2xl p-6 mt-4">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-5 h-5 text-game-orange" />
            <h2 className="font-display font-bold text-lg">Top Scores</h2>
          </div>
          <LeaderboardTable scores={highScores} isLoading={scoresLoading} />
        </div>
      </motion.div>
    </div>
  );
}

// --- Leaderboard Table ---
function LeaderboardTable({
  scores,
  isLoading,
}: {
  scores: Score[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-8"
        data-ocid="leaderboard.loading_state"
      >
        <div className="w-6 h-6 border-2 border-game-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!scores || scores.length === 0) {
    return (
      <div
        className="text-center py-8 text-muted-foreground text-sm"
        data-ocid="leaderboard.empty_state"
      >
        No scores yet. Be the first to play!
      </div>
    );
  }

  const top10 = scores.slice(0, 10);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <Table data-ocid="leaderboard.table">
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-muted-foreground w-12">#</TableHead>
          <TableHead className="text-muted-foreground">Player</TableHead>
          <TableHead className="text-muted-foreground text-right">
            Score
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {top10.map((s, i) => (
          <TableRow
            key={`${s.playerName}-${i}`}
            className="border-border hover:bg-muted/30"
            data-ocid={`leaderboard.item.${i + 1}`}
          >
            <TableCell className="font-mono text-sm">
              {i < 3 ? (
                medals[i]
              ) : (
                <span className="text-muted-foreground">{i + 1}</span>
              )}
            </TableCell>
            <TableCell className="font-semibold">{s.playerName}</TableCell>
            <TableCell className="text-right font-display font-bold text-game-orange">
              {Number(s.points).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
