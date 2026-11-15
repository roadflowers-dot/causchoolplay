(() => {
  const W = 960, H = 540, N = 5, C = 82, GAP = 8, OX = (W - (N * C + (N - 1) * GAP)) / 2, OY = 78, TIME = 30;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("numbers-best");

  let state = "ready"; // ready | play | over
  let cells, next, top, left, overAt, wrong;

  function newGame() {
    const nums = Array.from({ length: N * N }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    cells = nums.map((n) => ({ n, pop: 0 }));
    next = 1; top = N * N; left = TIME; wrong = -1;
  }
  newGame();

  function tap(i) {
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); state = "play"; return;
    }
    if (i < 0) return;
    if (cells[i].n === next) { next++; top++; cells[i] = { n: top, pop: 1 }; } // 누른 자리에는 더 큰 새 숫자가 나와요
    else { wrong = i; left -= 1; setTimeout(() => { if (wrong === i) wrong = -1; }, 250); }
  }
  k.cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const p = k.pos(e);
    const x = Math.floor((p.x - OX) / (C + GAP)), y = Math.floor((p.y - OY) / (C + GAP));
    tap(state === "play" ? (x >= 0 && y >= 0 && x < N && y < N ? y * N + x : -1) : 0);
  });
  addEventListener("keydown", (e) => { if ((e.code === "Space" || e.code === "Enter") && state !== "play" && !e.repeat) { e.preventDefault(); tap(0); } });

  function update(dt) {
    for (const c of cells) c.pop = Math.max(0, c.pop - dt * 4);
    if (state !== "play") return;
    left -= dt;
    if (left <= 0) { left = 0; state = "over"; overAt = performance.now(); if (next - 1 > best.get()) best.set(next - 1); }
  }
  function draw() {
    k.begin("#0e1124");
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0b7285"); bg.addColorStop(1, "#364fc7");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    cells.forEach((c, i) => {
      const x = OX + (i % N) * (C + GAP), y = OY + Math.floor(i / N) * (C + GAP), s = 1 - c.pop * 0.25;
      ctx.save(); ctx.translate(x + C / 2, y + C / 2); ctx.scale(s, s);
      ctx.fillStyle = i === wrong ? "#ff8787" : "#f8f9fa";
      ctx.beginPath(); ctx.roundRect(-C / 2, -C / 2, C, C, 16); ctx.fill();
      Kit.text(ctx, String(c.n), 0, 13, 36, "center", "#1b2142");
      ctx.restore();
    });
    Kit.text(ctx, "다음 숫자", 110, 230, 20, "center", "rgba(255,255,255,.75)", false);
    Kit.text(ctx, String(next), 110, 300, 70, "center", "#ffd43b");
    Kit.hud(ctx, W, (next - 1) + "개   ⏱ " + Math.ceil(left) + "초", "최고 " + best.get() + "개");
    if (state === "ready") Kit.overlay(ctx, W, H, "숫자 빨리 누르기", ["1부터 차례대로 숫자를 눌러요", TIME + "초 동안 몇까지 갈 수 있을까요? · 틀리면 1초가 줄어요", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "시간 끝!", [(next - 1) + "개 성공  ·  최고 " + best.get() + "개", "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
