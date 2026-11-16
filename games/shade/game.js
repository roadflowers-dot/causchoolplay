(() => {
  const W = 960, H = 540, SIZE = 400, OX = (W - SIZE) / 2, OY = 96, START = 20;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("shade-best");

  let state = "ready"; // ready | play | over
  let level, left, n, odd, hue, diff, wrong, overAt;

  function board() {
    n = Math.min(7, 2 + Math.floor(level / 2));
    odd = Math.floor(Math.random() * n * n);
    hue = Math.floor(Math.random() * 360);
    diff = Math.max(4, 26 - level * 1.4); // 단계가 오를수록 색 차이가 줄어요
    wrong = -1;
  }
  function newGame() { level = 0; left = START; board(); }
  newGame();

  function pick(i) {
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); state = "play"; return;
    }
    if (i < 0) return;
    if (i === odd) { level++; left = Math.min(START, left + 2); board(); }
    else { wrong = i; left -= 3; }
  }
  k.cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const p = k.pos(e), c = SIZE / n, x = Math.floor((p.x - OX) / c), y = Math.floor((p.y - OY) / c);
    pick(state === "play" ? (x >= 0 && y >= 0 && x < n && y < n ? y * n + x : -1) : 0);
  });
  addEventListener("keydown", (e) => { if ((e.code === "Space" || e.code === "Enter") && state !== "play" && !e.repeat) { e.preventDefault(); pick(0); } });

  function update(dt) {
    if (state !== "play") return;
    left -= dt;
    if (left <= 0) { left = 0; state = "over"; overAt = performance.now(); if (level > best.get()) best.set(level); }
  }
  function draw() {
    k.begin("#0e1124");
    ctx.fillStyle = "#f1f3f5"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#dee2e6"; ctx.beginPath(); ctx.roundRect(OX, 62, SIZE, 12, 6); ctx.fill();
    ctx.fillStyle = left > 5 ? "#51cf66" : "#ff6b6b"; ctx.beginPath(); ctx.roundRect(OX, 62, Math.max(12, SIZE * left / START), 12, 6); ctx.fill();
    const c = SIZE / n;
    for (let i = 0; i < n * n; i++) {
      const x = OX + (i % n) * c, y = OY + Math.floor(i / n) * c;
      ctx.fillStyle = `hsl(${hue} 70% ${i === odd ? 52 + diff : 52}%)`;
      ctx.beginPath(); ctx.roundRect(x + 4, y + 4, c - 8, c - 8, Math.min(18, c / 5)); ctx.fill();
      if (i === wrong) { ctx.strokeStyle = "#e03131"; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(x + 4, y + 4, c - 8, c - 8, Math.min(18, c / 5)); ctx.stroke(); }
    }
    ctx.save(); ctx.shadowColor = "transparent";
    Kit.text(ctx, level + "단계", 24, 42, 26, "left", "#1b2142");
    Kit.text(ctx, "최고 " + best.get() + "단계", W - 24, 42, 26, "right", "#1b2142");
    ctx.restore();
    if (state === "ready") Kit.overlay(ctx, W, H, "다른 색 찾기", ["색이 살짝 다른 칸 하나를 찾아 눌러요", "맞히면 2초를 더 받고, 틀리면 3초가 줄어요", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "시간 끝!", [level + "단계  ·  최고 " + best.get() + "단계", "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
