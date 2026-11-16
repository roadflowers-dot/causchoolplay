(() => {
  const W = 960, H = 540, N = 12, C = 34, OX = 300, OY = 78;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("flood-best");
  const COLORS = ["#ff6b6b", "#ffd43b", "#51cf66", "#4dabf7", "#b197fc", "#ff922b"];

  let state = "ready"; // ready | play | over
  let g, moves, limit, level, colors, overAt, pulse;
  const btn = (i) => ({ x: 60 + (i % 2) * 105, y: 170 + Math.floor(i / 2) * 100, w: 92, h: 86 });

  function board() {
    colors = level >= 4 ? 6 : 5;
    limit = Math.max(colors === 6 ? 22 : 18, (colors === 6 ? 27 : 23) - Math.floor(level / 2));
    g = Array.from({ length: N * N }, () => Math.floor(Math.random() * colors));
    moves = 0; pulse = 0;
  }
  function newGame() { level = 1; board(); }
  newGame();

  // 왼쪽 위에서 이어진 같은 색 칸 모두
  function region() {
    const c = g[0], seen = new Set([0]), stack = [0];
    while (stack.length) {
      const i = stack.pop(), x = i % N, y = Math.floor(i / N);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = (y + dy) * N + x + dx;
        if (x + dx < 0 || y + dy < 0 || x + dx >= N || y + dy >= N || seen.has(j) || g[j] !== c) continue;
        seen.add(j); stack.push(j);
      }
    }
    return seen;
  }
  function pick(c) {
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); state = "play"; return;
    }
    if (c < 0 || c >= colors || c === g[0]) return;
    for (const i of region()) g[i] = c;
    moves++; pulse = 1;
    if (region().size === N * N) { if (level > best.get()) best.set(level); level++; board(); }
    else if (moves >= limit) { state = "over"; overAt = performance.now(); }
  }
  k.cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const p = k.pos(e);
    if (state !== "play") { pick(0); return; }
    let c = -1;
    for (let i = 0; i < colors; i++) if (Kit.inside(p, btn(i))) c = i;
    const x = Math.floor((p.x - OX) / C), y = Math.floor((p.y - OY) / C);
    if (c < 0 && x >= 0 && y >= 0 && x < N && y < N) c = g[y * N + x]; // 판 위의 색을 직접 눌러도 돼요
    pick(c);
  });
  addEventListener("keydown", (e) => {
    const i = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5 }[e.code];
    if (i !== undefined && !e.repeat) { e.preventDefault(); pick(state === "play" ? i : 0); }
    else if ((e.code === "Space" || e.code === "Enter") && state !== "play" && !e.repeat) { e.preventDefault(); pick(0); }
  });

  function draw() {
    pulse = Math.max(0, pulse - 0.06);
    k.begin("#0e1124");
    ctx.fillStyle = "#20223a"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.beginPath(); ctx.roundRect(OX - 10, OY - 10, N * C + 20, N * C + 20, 14); ctx.fill();
    const mine = region();
    for (let i = 0; i < N * N; i++) {
      ctx.fillStyle = COLORS[g[i]];
      ctx.fillRect(OX + (i % N) * C, OY + Math.floor(i / N) * C, C, C);
      if (mine.has(i) && pulse > 0) { ctx.fillStyle = `rgba(255,255,255,${pulse * 0.4})`; ctx.fillRect(OX + (i % N) * C, OY + Math.floor(i / N) * C, C, C); }
    }
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.strokeRect(OX + 2, OY + 2, C - 4, C - 4);
    for (let i = 0; i < colors; i++) {
      const b = btn(i);
      ctx.fillStyle = COLORS[i]; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 18); ctx.fill();
      Kit.text(ctx, String(i + 1), b.x + 18, b.y + 26, 16, "center", "rgba(0,0,0,.4)");
    }
    Kit.text(ctx, "남은 횟수", 830, 230, 18, "center", "rgba(255,255,255,.7)", false);
    Kit.text(ctx, String(limit - moves), 830, 300, 70, "center", limit - moves <= 3 ? "#ff8787" : "#fff");
    Kit.hud(ctx, W, level + "단계", "최고 " + best.get() + "단계");
    if (state === "ready") Kit.overlay(ctx, W, H, "색 물들이기", ["왼쪽 위 칸에서 시작해 판 전체를 한 가지 색으로 만들어요", "색을 고르면 이어진 칸이 모두 그 색으로 바뀌어요 · 횟수 안에 끝내기!", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "횟수를 다 썼어요", [(level - 1) + "단계 성공  ·  최고 " + best.get() + "단계", "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop(() => draw());
})();
