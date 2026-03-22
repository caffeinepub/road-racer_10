import { useCallback, useEffect, useRef } from "react";

export type GameState = "START" | "PLAYING" | "PAUSED" | "GAME_OVER";

export interface GameResult {
  score: number;
}

interface GameCanvasProps {
  onGameOver: (result: GameResult) => void;
  onScoreUpdate: (score: number) => void;
  gameState: GameState;
  onStateChange: (state: GameState) => void;
}

// --- Game constants (canvas-literal colors, cannot use CSS vars) ---
const CANVAS_W = 400;
const CANVAS_H = 600;
const LANE_COUNT = 3;
const ROAD_LEFT = 60;
const ROAD_RIGHT = 340;
const ROAD_W = ROAD_RIGHT - ROAD_LEFT;
const LANE_W = ROAD_W / LANE_COUNT;

const CAR_W = 38;
const CAR_H = 64;

const COLORS = {
  roadBg: "#0d1117",
  roadSurface: "#1a2030",
  roadEdge: "#2a3550",
  laneDash: "rgba(255,255,255,0.5)",
  playerBody: "#e84040",
  playerRoof: "#c02020",
  playerWindow: "rgba(120,200,255,0.8)",
  playerWheel: "#111",
  playerDetail: "#ff6060",
  obstacleColors: ["#4080ff", "#40c080", "#c0c040", "#c050d0", "#50c0d0"],
  obstacleRoof: "rgba(0,0,0,0.3)",
  obstacleWindow: "rgba(180,230,255,0.7)",
  hud: "rgba(10,15,25,0.85)",
  hudText: "#ffffff",
  hudAccent: "#ff7a1a",
  heart: "#ff4444",
  heartEmpty: "#444",
  ground: "#111827",
  guardrail: "#2a3550",
  guardrailStripe: "#ff7a1a",
};

const getLaneX = (lane: number) => ROAD_LEFT + lane * LANE_W + LANE_W / 2;

interface Car {
  x: number;
  y: number;
  lane: number;
  color: string;
  speed: number;
}

interface GameStateRef {
  state: GameState;
  playerLane: number;
  playerY: number;
  playerSpeed: number; // px/s
  targetLane: number;
  score: number;
  lives: number;
  obstacles: Car[];
  roadOffset: number;
  spawnTimer: number;
  spawnInterval: number;
  baseSpeed: number;
  lastTime: number;
  invincible: number; // ms of invincibility remaining
  keys: Set<string>;
  colorIndex: number;
  laneChangeCooldown: number;
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bodyColor: string,
  roofColor: string,
  windowColor: string,
  isPlayer: boolean,
) {
  const hw = w / 2;
  const hh = h / 2;

  // Body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(x - hw, y - hh, w, h, 6);
  ctx.fill();

  // Roof / cabin
  ctx.fillStyle = roofColor;
  const roofW = w * 0.65;
  const roofH = h * 0.38;
  const roofX = x - roofW / 2;
  const roofY = y - hh + h * 0.22;
  ctx.beginPath();
  ctx.roundRect(roofX, roofY, roofW, roofH, 4);
  ctx.fill();

  // Windshield
  ctx.fillStyle = windowColor;
  const winW = roofW * 0.75;
  const winH = roofH * 0.55;
  ctx.beginPath();
  ctx.roundRect(x - winW / 2, roofY + 3, winW, winH, 3);
  ctx.fill();

  // Wheels
  ctx.fillStyle = COLORS.playerWheel;
  const wheelW = 8;
  const wheelH = 14;
  const wOffX = hw - 2;
  const wFrontY = y + hh * 0.55;
  const wRearY = y - hh * 0.55;
  ctx.beginPath();
  ctx.roundRect(
    x - wOffX - wheelW / 2,
    wFrontY - wheelH / 2,
    wheelW,
    wheelH,
    3,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(
    x + wOffX - wheelW / 2,
    wFrontY - wheelH / 2,
    wheelW,
    wheelH,
    3,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x - wOffX - wheelW / 2, wRearY - wheelH / 2, wheelW, wheelH, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + wOffX - wheelW / 2, wRearY - wheelH / 2, wheelW, wheelH, 3);
  ctx.fill();

  // Headlights / taillights
  if (isPlayer) {
    // Taillights (top of player car = rear when driving upward)
    ctx.fillStyle = "rgba(255, 80, 80, 0.9)";
    ctx.beginPath();
    ctx.roundRect(x - hw + 4, y - hh + 2, 10, 6, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + hw - 14, y - hh + 2, 10, 6, 2);
    ctx.fill();
    // Headlights (bottom = front)
    ctx.fillStyle = "rgba(255, 240, 180, 0.95)";
    ctx.beginPath();
    ctx.roundRect(x - hw + 4, y + hh - 8, 10, 6, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + hw - 14, y + hh - 8, 10, 6, 2);
    ctx.fill();
  } else {
    // Enemy headlights (front = bottom)
    ctx.fillStyle = "rgba(255, 255, 180, 0.9)";
    ctx.beginPath();
    ctx.roundRect(x - hw + 4, y + hh - 8, 10, 5, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + hw - 14, y + hh - 8, 10, 5, 2);
    ctx.fill();
    // Taillights
    ctx.fillStyle = "rgba(255,50,50,0.8)";
    ctx.beginPath();
    ctx.roundRect(x - hw + 4, y - hh + 3, 8, 5, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + hw - 12, y - hh + 3, 8, 5, 2);
    ctx.fill();
  }
}

function drawRoad(ctx: CanvasRenderingContext2D, roadOffset: number) {
  // Side shoulders
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Road surface
  ctx.fillStyle = COLORS.roadSurface;
  ctx.fillRect(ROAD_LEFT, 0, ROAD_W, CANVAS_H);

  // Road edge lines
  ctx.strokeStyle = COLORS.roadEdge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ROAD_LEFT, 0);
  ctx.lineTo(ROAD_LEFT, CANVAS_H);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ROAD_RIGHT, 0);
  ctx.lineTo(ROAD_RIGHT, CANVAS_H);
  ctx.stroke();

  // Guardrails
  ctx.fillStyle = COLORS.guardrail;
  ctx.fillRect(ROAD_LEFT - 12, 0, 10, CANVAS_H);
  ctx.fillRect(ROAD_RIGHT + 2, 0, 10, CANVAS_H);

  // Guardrail stripes
  const stripeH = 40;
  const stripeOffset = roadOffset % (stripeH * 2);
  ctx.fillStyle = COLORS.guardrailStripe;
  for (
    let y = -stripeH * 2 + stripeOffset;
    y < CANVAS_H + stripeH;
    y += stripeH * 2
  ) {
    ctx.fillRect(ROAD_LEFT - 12, y, 10, stripeH);
    ctx.fillRect(ROAD_RIGHT + 2, y, 10, stripeH);
  }

  // Lane dashes
  ctx.strokeStyle = COLORS.laneDash;
  ctx.lineWidth = 2;
  ctx.setLineDash([30, 20]);
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const lx = ROAD_LEFT + lane * LANE_W;
    ctx.lineDashOffset = -roadOffset;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx, CANVAS_H);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  score: number,
  speed: number,
  lives: number,
) {
  // HUD background
  ctx.fillStyle = COLORS.hud;
  ctx.beginPath();
  ctx.roundRect(8, 8, CANVAS_W - 16, 52, 8);
  ctx.fill();

  // Score
  ctx.fillStyle = COLORS.hudAccent;
  ctx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("SCORE", 20, 26);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 18px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(String(score), 20, 48);

  // Speed
  const kmh = Math.round(speed / 60);
  ctx.fillStyle = COLORS.hudAccent;
  ctx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SPEED", CANVAS_W / 2, 26);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 18px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`${kmh} km/h`, CANVAS_W / 2, 48);

  // Lives
  ctx.fillStyle = COLORS.hudAccent;
  ctx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("LIVES", CANVAS_W - 20, 26);
  ctx.textAlign = "left";
  const heartSize = 14;
  const startX = CANVAS_W - 20 - 3 * (heartSize + 4);
  for (let i = 0; i < 3; i++) {
    ctx.font = `${heartSize}px serif`;
    ctx.fillStyle = i < lives ? COLORS.heart : COLORS.heartEmpty;
    ctx.fillText("♥", startX + i * (heartSize + 4), 50);
  }
  ctx.textAlign = "left";
}

export default function GameCanvas({
  onGameOver,
  onScoreUpdate,
  gameState,
  onStateChange,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameStateRef>({
    state: "START",
    playerLane: 1,
    playerY: CANVAS_H - 100,
    playerSpeed: 240,
    targetLane: 1,
    score: 0,
    lives: 3,
    obstacles: [],
    roadOffset: 0,
    spawnTimer: 0,
    spawnInterval: 2000,
    baseSpeed: 240,
    lastTime: 0,
    invincible: 0,
    keys: new Set(),
    colorIndex: 0,
    laneChangeCooldown: 0,
  });
  const rafRef = useRef<number>(0);
  const gameStateRef = useRef<GameState>(gameState);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Sync gameState prop into ref
  useEffect(() => {
    gameStateRef.current = gameState;
    gsRef.current.state = gameState;
  }, [gameState]);

  const resetGame = useCallback(() => {
    const gs = gsRef.current;
    gs.playerLane = 1;
    gs.targetLane = 1;
    gs.playerY = CANVAS_H - 100;
    gs.playerSpeed = 240;
    gs.score = 0;
    gs.lives = 3;
    gs.obstacles = [];
    gs.roadOffset = 0;
    gs.spawnTimer = 0;
    gs.spawnInterval = 2000;
    gs.baseSpeed = 240;
    gs.lastTime = 0;
    gs.invincible = 0;
    gs.colorIndex = 0;
    gs.laneChangeCooldown = 0;
  }, []);

  const loop = useCallback(
    (timestamp: number) => {
      const gs = gsRef.current;
      if (gs.state !== "PLAYING") {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      if (!gs.lastTime) gs.lastTime = timestamp;
      const dt = Math.min((timestamp - gs.lastTime) / 1000, 0.05); // cap at 50ms
      gs.lastTime = timestamp;

      // Input: lane changes
      if (gs.laneChangeCooldown > 0) gs.laneChangeCooldown -= dt * 1000;

      if (gs.laneChangeCooldown <= 0) {
        if (
          (gs.keys.has("ArrowLeft") || gs.keys.has("a") || gs.keys.has("A")) &&
          gs.targetLane > 0
        ) {
          gs.targetLane--;
          gs.laneChangeCooldown = 220;
        } else if (
          (gs.keys.has("ArrowRight") || gs.keys.has("d") || gs.keys.has("D")) &&
          gs.targetLane < LANE_COUNT - 1
        ) {
          gs.targetLane++;
          gs.laneChangeCooldown = 220;
        }
      }

      // Accelerate / brake
      if (gs.keys.has("ArrowUp") || gs.keys.has("w") || gs.keys.has("W")) {
        gs.playerSpeed = Math.min(gs.playerSpeed + 60 * dt, gs.baseSpeed * 2);
      } else if (
        gs.keys.has("ArrowDown") ||
        gs.keys.has("s") ||
        gs.keys.has("S")
      ) {
        gs.playerSpeed = Math.max(gs.playerSpeed - 80 * dt, gs.baseSpeed * 0.3);
      } else {
        // Ease back to base speed
        gs.playerSpeed += (gs.baseSpeed - gs.playerSpeed) * dt * 2;
      }

      // Smooth lane transition
      const targetX = getLaneX(gs.targetLane);
      const currentX = getLaneX(gs.playerLane);
      const lerpX = currentX + (targetX - currentX) * dt * 8;
      // find closest lane from lerp
      let closestLane = gs.playerLane;
      let closestDist = Math.abs(lerpX - currentX);
      for (let i = 0; i < LANE_COUNT; i++) {
        const d = Math.abs(lerpX - getLaneX(i));
        if (d < closestDist) {
          closestDist = d;
          closestLane = i;
        }
      }
      gs.playerLane = closestLane;

      // Road scroll
      gs.roadOffset = (gs.roadOffset + gs.playerSpeed * dt) % (CANVAS_H * 2);

      // Score
      gs.score += Math.round(gs.playerSpeed * dt * 0.5);
      onScoreUpdate(gs.score);

      // Gradually increase base speed
      gs.baseSpeed += dt * 3;
      gs.spawnInterval = Math.max(800, gs.spawnInterval - dt * 30);

      // Spawn obstacles
      gs.spawnTimer -= dt * 1000;
      if (gs.spawnTimer <= 0) {
        gs.spawnTimer = gs.spawnInterval + Math.random() * 500;
        const lane = Math.floor(Math.random() * LANE_COUNT);
        gs.obstacles.push({
          x: getLaneX(lane),
          y: -CAR_H,
          lane,
          color:
            COLORS.obstacleColors[gs.colorIndex % COLORS.obstacleColors.length],
          speed: gs.playerSpeed * (0.3 + Math.random() * 0.3),
        });
        gs.colorIndex++;
      }

      // Move obstacles
      gs.obstacles = gs.obstacles
        .map((obs) => ({
          ...obs,
          y: obs.y + (gs.playerSpeed - obs.speed) * dt,
        }))
        .filter((obs) => obs.y < CANVAS_H + CAR_H * 2);

      // Collision detection (AABB)
      if (gs.invincible > 0) {
        gs.invincible -= dt * 1000;
      } else {
        const px = getLaneX(gs.targetLane);
        const py = gs.playerY;
        for (const obs of gs.obstacles) {
          const dx = Math.abs(obs.x - px);
          const dy = Math.abs(obs.y - py);
          if (dx < CAR_W * 0.8 && dy < CAR_H * 0.8) {
            gs.lives--;
            gs.invincible = 1500;
            // Push obstacle away
            obs.y = py + CAR_H * 1.5;
            if (gs.lives <= 0) {
              gs.state = "GAME_OVER";
              onStateChange("GAME_OVER");
              onGameOver({ score: gs.score });
            }
            break;
          }
        }
      }

      // Draw
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawRoad(ctx, gs.roadOffset);

      // Draw obstacles
      for (const obs of gs.obstacles) {
        drawCar(
          ctx,
          obs.x,
          obs.y,
          CAR_W,
          CAR_H,
          obs.color,
          "rgba(0,0,0,0.35)",
          COLORS.obstacleWindow,
          false,
        );
      }

      // Draw player (flash when invincible)
      const showPlayer =
        gs.invincible <= 0 || Math.floor(gs.invincible / 120) % 2 === 0;
      if (showPlayer) {
        const px = getLaneX(gs.targetLane);
        drawCar(
          ctx,
          px,
          gs.playerY,
          CAR_W,
          CAR_H,
          COLORS.playerBody,
          COLORS.playerRoof,
          COLORS.playerWindow,
          true,
        );
        // Speed boost trail
        if (gs.playerSpeed > gs.baseSpeed * 1.2) {
          ctx.strokeStyle = "rgba(255, 122, 26, 0.5)";
          ctx.lineWidth = 3;
          for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.moveTo(px - CAR_W / 3, gs.playerY + CAR_H / 2 + i * 10);
            ctx.lineTo(px + CAR_W / 3, gs.playerY + CAR_H / 2 + i * 10);
            ctx.stroke();
          }
        }
      }

      drawHUD(ctx, gs.score, gs.playerSpeed, gs.lives);

      rafRef.current = requestAnimationFrame(loop);
    },
    [onGameOver, onScoreUpdate, onStateChange],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)
      ) {
        e.preventDefault();
      }
      gsRef.current.keys.add(e.key);

      // Pause toggle
      if (e.key === "Escape" || e.key === "p" || e.key === "P") {
        const cur = gameStateRef.current;
        if (cur === "PLAYING") onStateChange("PAUSED");
        else if (cur === "PAUSED") onStateChange("PLAYING");
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      gsRef.current.keys.delete(e.key);
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKeyUp);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [loop, onStateChange]);

  // Touch / swipe support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const MIN_SWIPE = 30;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!touchStartRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < MIN_SWIPE && absDy < MIN_SWIPE) {
        // Tap: left half → left, right half → right
        const rect = canvas.getBoundingClientRect();
        const relX = t.clientX - rect.left;
        const key = relX < rect.width / 2 ? "ArrowLeft" : "ArrowRight";
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        );
        setTimeout(() => {
          window.dispatchEvent(
            new KeyboardEvent("keyup", { key, bubbles: true }),
          );
        }, 100);
        return;
      }

      if (absDx >= absDy) {
        // Horizontal swipe
        const key = dx < 0 ? "ArrowLeft" : "ArrowRight";
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        );
        setTimeout(() => {
          window.dispatchEvent(
            new KeyboardEvent("keyup", { key, bubbles: true }),
          );
        }, 100);
      } else {
        // Vertical swipe
        const key = dy < 0 ? "ArrowUp" : "ArrowDown";
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        );
        setTimeout(() => {
          window.dispatchEvent(
            new KeyboardEvent("keyup", { key, bubbles: true }),
          );
        }, 300);
      }

      touchStartRef.current = null;
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  // Expose resetGame via ref pattern — call from parent via effect
  useEffect(() => {
    if (
      gameState === "PLAYING" &&
      gsRef.current.score === 0 &&
      gsRef.current.lives === 3
    ) {
      resetGame();
      gsRef.current.lastTime = 0;
    }
  }, [gameState, resetGame]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="block rounded-xl"
      style={{ imageRendering: "pixelated", touchAction: "none" }}
      tabIndex={0}
    />
  );
}
