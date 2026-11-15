(() => {
  const W = 960, H = 540, N = 3, C = 128, GAP = 8, OX = (W - (N * C + (N - 1) * GAP)) / 2, OY = 84, TIME = 120;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("slide-best");
  const COLORS = ["#ff8787", "#ffa94d", "#ffd43b", "#8ce99a", "#66d9e8", "#74c0fc", "#b197fc", "#f783ac"];

  let state = "ready"; // ready | play | over
  let tiles, score, left, moves, overAt, cheer;

  const blank = () => tiles.indexOf(0);
  const neighbors = (i) => [i - N, i + N, i % N ? i - 1 : -1, i % N < N - 1 ? i + 1 : -1].filter((j) => j >= 0 && j < N * N);
  const solved = () => tiles.every((v, i) => v === (i + 1) % (N * N));
  // 다 맞춘 상태에서 거꾸로 섞기 때문에 항상 풀 수 있어요
  function shuffle() {
    tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    let prev = -1;
    for (let n = 0; n < 16 + score * 4; n++) {
      const b = blank(), opts = neighbors(b).filter((j) => j !== prev);
      const j = opts[Math.floor(Math.random() * opts.length)];
      tiles[b] = tiles[j]; tiles[j] = 0; prev = b;
    }
    if (solved()) shuffle();
    moves = 0;
  }
  function newGame() { score = 0; left = TIME; cheer = 0; shuffle(); }
  newGame();

  function slide(i) {
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); state = "play"; return;
    }
    const b = blank();
    if (i < 0 || !neighbors(b).includes(i)) return;
    tiles[b] = tiles[i]; tiles[i] = 0; moves++;
    if (solved()) { score++; left += 10; cheer = 1; shuffle(); }
  }
  k.cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const p = k.pos(e);
    const x = Math.floor((p.x - OX) / (C + GAP)), y = Math.floor((p.y - OY) / (C + GAP));
    slide(state === "play" ? (x >= 0 && y >= 0 && x < N && y < N ? y * N + x : -1) : 0);
  });
  addEventListener("keydown", (e) => {
    // 방향키: 그 방향으로 타일을 밀어요 (빈칸의 반대쪽 타일이 움직임)
    const b = blank(), from = { ArrowUp: b + N, ArrowDown: b - N, ArrowLeft: b % N < N - 1 ? b + 1 : -1, ArrowRight: b % N ? b - 1 : -1 }[e.code];
    if (from !== undefined) { e.preventDefault(); if (state !== "play") slide(0); else if (from >= 0 && from < N * N) slide(from); }
    else if ((e.code === "Space" || e.code === "Enter") && state !== "play" && !e.repeat) { e.preventDefault(); slide(0); }
  });

  function update(dt) {
    cheer = Math.max(0, cheer - dt);
    if (state !== "play") return;
    left -= dt;
    if (left <= 0) { left = 0; state = "over"; overAt = performance.now(); if (score > best.get()) best.set(score); }
  }
  function draw() {
    k.begin("#0e1124");
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#2b2d42"); bg.addColorStop(1, "#5f3dc4");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.roundRect(OX - 12, OY - 12, N * C + (N - 1) * GAP + 24, N * C + (N - 1) * GAP + 24, 20); ctx.fill();
    tiles.forEach((v, i) => {
      if (!v) return;
      const x = OX + (i % N) * (C + GAP), y = OY + Math.floor(i / N) * (C + GAP);
      ctx.fillStyle = COLORS[v - 1]; ctx.beginPath(); ctx.roundRect(x, y, C, C, 18); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.beginPath(); ctx.roundRect(x + 10, y + 8, C - 20, 8, 4); ctx.fill();
      Kit.text(ctx, String(v), x + C / 2, y + C / 2 + 24, 66, "center", "#1b2142");
    });
    // 완성 모양 미리 보기
    Kit.text(ctx, "이렇게 맞춰요", 800, 200, 16, "center", "rgba(255,255,255,.7)", false);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = COLORS[i]; ctx.beginPath(); ctx.roundRect(755 + (i % 3) * 31, 214 + Math.floor(i / 3) * 31, 28, 28, 6); ctx.fill(); Kit.text(ctx, String(i + 1), 769 + (i % 3) * 31, 234 + Math.floor(i / 3) * 31, 16, "center", "#1b2142"); }
    if (cheer > 0) Kit.text(ctx, "완성! +10초", 150, 280, 28, "center", "#8ce99a");
    Kit.hud(ctx, W, "완성 " + score + "개   ⏱ " + Math.ceil(left) + "초", "최고 " + best.get() + "개");
    if (state === "ready") Kit.overlay(ctx, W, H, "숫자 밀기", ["빈칸 옆의 타일을 눌러 밀어서 1부터 8까지 순서대로 맞춰요", "하나 완성할 때마다 10초를 더 받아요 · 방향키로도 밀 수 있어요", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "시간 끝!", ["완성 " + score + "개  ·  최고 " + best.get() + "개", "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
