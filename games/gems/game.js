(() => {
  const W = 960, H = 540, N = 8, C = 56, OX = (W - N * C) / 2, OY = 70, TIME = 60;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("gems-best");
  const COLORS = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#b197fc", "#ffa94d"];

  let state = "ready"; // ready | play | over
  let g, sel, score, left, busy, stepT, chain, flash, overAt;

  const rnd = () => Math.floor(Math.random() * COLORS.length);
  // 세 개 이상 이어진 보석 찾기
  function matches() {
    const hit = new Set();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = g[y * N + x];
      if (v < 0) continue;
      if (x < N - 2 && g[y * N + x + 1] === v && g[y * N + x + 2] === v) { hit.add(y * N + x); hit.add(y * N + x + 1); hit.add(y * N + x + 2); }
      if (y < N - 2 && g[(y + 1) * N + x] === v && g[(y + 2) * N + x] === v) { hit.add(y * N + x); hit.add((y + 1) * N + x); hit.add((y + 2) * N + x); }
    }
    return hit;
  }
  function swap(a, b) { const t = g[a]; g[a] = g[b]; g[b] = t; }
  function hasMove() {
    for (let i = 0; i < N * N; i++) for (const j of [i % N < N - 1 ? i + 1 : -1, i + N < N * N ? i + N : -1]) {
      if (j < 0) continue;
      swap(i, j); const ok = matches().size > 0; swap(i, j);
      if (ok) return true;
    }
    return false;
  }
  function fill() {
    do {
      g = Array.from({ length: N * N }, rnd);
      while (matches().size) for (const i of matches()) g[i] = rnd();
    } while (!hasMove());
  }
  function newGame() { fill(); sel = -1; score = 0; left = TIME; busy = false; chain = 0; flash = new Set(); }
  newGame();

  function drop() {
    for (let x = 0; x < N; x++) {
      const col = [];
      for (let y = N - 1; y >= 0; y--) if (g[y * N + x] >= 0) col.push(g[y * N + x]);
      for (let y = N - 1; y >= 0; y--) g[y * N + x] = col.length ? col.shift() : rnd();
    }
  }
  function click(i) {
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); state = "play"; return;
    }
    if (busy || i < 0) return;
    if (sel < 0) { sel = i; return; }
    const near = Math.abs((sel % N) - (i % N)) + Math.abs(Math.floor(sel / N) - Math.floor(i / N)) === 1;
    if (!near) { sel = i; return; }
    swap(sel, i);
    if (matches().size) { busy = true; stepT = 0; chain = 0; }
    else swap(sel, i); // 맞는 줄이 없으면 제자리로
    sel = -1;
  }
  k.cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const p = k.pos(e), x = Math.floor((p.x - OX) / C), y = Math.floor((p.y - OY) / C);
    click(state === "play" ? (x >= 0 && y >= 0 && x < N && y < N ? y * N + x : -1) : 0);
  });
  addEventListener("keydown", (e) => { if ((e.code === "Space" || e.code === "Enter") && state !== "play" && !e.repeat) { e.preventDefault(); click(0); } });

  function update(dt) {
    if (state !== "play") return;
    left -= dt;
    if (busy) {
      stepT -= dt;
      if (stepT <= 0) {
        if (flash.size) { for (const i of flash) g[i] = -1; flash = new Set(); drop(); stepT = 0.16; }
        else {
          const m = matches();
          if (m.size) { chain++; score += m.size * 10 * chain; flash = m; stepT = 0.2; }
          else { busy = false; if (!hasMove()) fill(); }
        }
      }
    }
    if (left <= 0 && !busy) { left = 0; state = "over"; overAt = performance.now(); if (score > best.get()) best.set(score); }
  }
  function draw() {
    k.begin("#0e1124");
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#1a1a40"); bg.addColorStop(1, "#4a148c");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.roundRect(OX - 8, OY - 8, N * C + 16, N * C + 16, 14); ctx.fill();
    for (let i = 0; i < N * N; i++) {
      const v = g[i]; if (v < 0) continue;
      const x = OX + (i % N) * C + C / 2, y = OY + Math.floor(i / N) * C + C / 2, r = flash.has(i) ? 26 : 21;
      if (i === sel) { ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.beginPath(); ctx.roundRect(x - C / 2 + 2, y - C / 2 + 2, C - 4, C - 4, 10); ctx.fill(); }
      ctx.fillStyle = flash.has(i) ? "#fff" : COLORS[v];
      ctx.beginPath();
      const sides = [0, 4, 6, 3, 5, 8][v]; // 색마다 모양도 달라요
      if (!sides) ctx.arc(x, y, r, 0, 7);
      else for (let s = 0; s < sides; s++) { const a = (s / sides) * 6.283 - Math.PI / 2 + (sides === 4 ? Math.PI / 4 : 0); ctx.lineTo(x + Math.cos(a) * r * 1.08, y + Math.sin(a) * r * 1.08); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.arc(x - 6, y - 7, 5, 0, 7); ctx.fill();
    }
    if (busy && chain > 1) Kit.text(ctx, chain + "연쇄!", 130, 280, 34, "center", "#ffd43b");
    Kit.hud(ctx, W, "점수 " + score + "   ⏱ " + Math.max(0, Math.ceil(left)) + "초", "최고 " + best.get());
    if (state === "ready") Kit.overlay(ctx, W, H, "보석 맞추기", ["보석 하나를 누르고 바로 옆 보석을 누르면 자리가 바뀌어요", "같은 보석 세 개 이상을 한 줄로 맞추면 사라져요", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "시간 끝!", ["점수 " + score + "  ·  최고 " + best.get(), "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
