(() => {
  const W = 960, H = 540, COLS = 13, ROWS = 7, C = 62, OX = (W - COLS * C) / 2, OY = 76, TIME = 90;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("escape-best");
  const DIRS = { up: [0, -1, 0], right: [1, 0, 1], down: [0, 1, 2], left: [-1, 0, 3] }; // [dx, dy, 벽 번호]

  let state = "ready"; // ready | play | over
  let walls, px, py, vx, vy, score, left, overAt;

  // 길을 파 나가며 미로를 만들어요 (모든 칸이 이어져 있어요)
  function build() {
    walls = Array.from({ length: COLS * ROWS }, () => [true, true, true, true]);
    const seen = new Set([0]), stack = [[0, 0]];
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const opts = Object.values(DIRS).filter(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < COLS && y + dy < ROWS && !seen.has((y + dy) * COLS + x + dx));
      if (!opts.length) { stack.pop(); continue; }
      const [dx, dy, w] = opts[Math.floor(Math.random() * opts.length)];
      walls[y * COLS + x][w] = false;
      walls[(y + dy) * COLS + x + dx][(w + 2) % 4] = false;
      seen.add((y + dy) * COLS + x + dx);
      stack.push([x + dx, y + dy]);
    }
    px = vx = 0; py = vy = 0;
  }
  function newGame() { score = 0; left = TIME; build(); }
  newGame();

  const open = (x, y, d) => !walls[y * COLS + x][DIRS[d][2]];
  // 한 번 누르면 갈림길이 나올 때까지 쭉 가요
  function go(d) {
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); state = "play"; return;
    }
    const [dx, dy] = DIRS[d];
    const side = d === "up" || d === "down" ? ["left", "right"] : ["up", "down"];
    let moved = false;
    while (open(px, py, d)) {
      px += dx; py += dy; moved = true;
      if (px === COLS - 1 && py === ROWS - 1) { score++; left += 4; build(); return; }
      if (side.some((s) => open(px, py, s))) break;
    }
    return moved;
  }
  const KEYS = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
  addEventListener("keydown", (e) => {
    if (KEYS[e.code]) { e.preventDefault(); if (!e.repeat) go(KEYS[e.code]); }
    else if ((e.code === "Space" || e.code === "Enter") && state !== "play") { e.preventDefault(); go("right"); }
  });
  let down = null;
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); down = { x: e.clientX, y: e.clientY }; if (state !== "play") { go("right"); down = null; } });
  k.cv.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.hypot(dx, dy) < 26) return;
    go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    down = null;
  });
  addEventListener("pointerup", () => { down = null; });

  function update(dt) {
    vx += (px - vx) * Math.min(1, dt * 18); vy += (py - vy) * Math.min(1, dt * 18);
    if (state !== "play") return;
    left -= dt;
    if (left <= 0) { left = 0; state = "over"; overAt = performance.now(); if (score > best.get()) best.set(score); }
  }
  function draw() {
    k.begin("#0e1124");
    ctx.fillStyle = "#1f2544"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#2c3463"; ctx.beginPath(); ctx.roundRect(OX - 8, OY - 8, COLS * C + 16, ROWS * C + 16, 12); ctx.fill();
    // 도착 깃발
    const gx = OX + (COLS - 1) * C + C / 2, gy = OY + (ROWS - 1) * C + C / 2;
    ctx.fillStyle = "#ffd43b"; ctx.beginPath(); ctx.arc(gx, gy, 18, 0, 7); ctx.fill();
    Kit.text(ctx, "🏁", gx, gy + 9, 24, "center");
    ctx.strokeStyle = "#a5b4fc"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const w = walls[y * COLS + x], X = OX + x * C, Y = OY + y * C;
      if (w[0]) { ctx.moveTo(X, Y); ctx.lineTo(X + C, Y); }
      if (w[3]) { ctx.moveTo(X, Y); ctx.lineTo(X, Y + C); }
      if (x === COLS - 1 && w[1]) { ctx.moveTo(X + C, Y); ctx.lineTo(X + C, Y + C); }
      if (y === ROWS - 1 && w[2]) { ctx.moveTo(X, Y + C); ctx.lineTo(X + C, Y + C); }
    }
    ctx.stroke();
    const cx = OX + vx * C + C / 2, cy = OY + vy * C + C / 2;
    ctx.fillStyle = "#ff8787"; ctx.beginPath(); ctx.arc(cx, cy, 19, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx - 6, cy - 4, 5, 0, 7); ctx.arc(cx + 6, cy - 4, 5, 0, 7); ctx.fill();
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(cx - 5, cy - 3, 2.3, 0, 7); ctx.arc(cx + 7, cy - 3, 2.3, 0, 7); ctx.fill();
    Kit.hud(ctx, W, "탈출 " + score + "번   ⏱ " + Math.ceil(left) + "초", "최고 " + best.get() + "번");
    if (state === "ready") Kit.overlay(ctx, W, H, "미로 탈출", ["방향키·WASD 또는 화면을 밀어서 깃발까지 가요", "한 번 누르면 갈림길까지 쭉 가요 · 탈출하면 4초를 더 받아요", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "시간 끝!", ["탈출 " + score + "번  ·  최고 " + best.get() + "번", "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
