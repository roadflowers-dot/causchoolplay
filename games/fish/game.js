(() => {
  const W = 960, H = 540;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("fish-best");
  const COLORS = ["#ffa94d", "#ff8787", "#69db7c", "#b197fc", "#ffd43b", "#f783ac"];

  let state = "ready"; // ready | play | over
  let me, target, others, bubbles, score, lives, safeT, spawnT, time, overAt;
  const keys = {};

  function newGame() { me = { x: W / 2, y: H / 2, r: 16, face: 1 }; target = null; others = []; score = 0; lives = 3; safeT = 0; spawnT = 0.3; time = 0; }
  bubbles = Array.from({ length: 16 }, (_, i) => ({ x: (i * 97) % W, y: (i * 61) % H, r: 3 + (i % 4) * 2 }));
  newGame();
  function start() {
    if (state === "play" || (state === "over" && performance.now() - overAt < 600)) return;
    newGame(); state = "play";
  }
  addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (e.code.startsWith("Arrow") || e.code === "Space") { e.preventDefault(); if (e.code !== "Space") target = null; }
    if (!e.repeat) start();
  });
  addEventListener("keyup", (e) => { keys[e.code] = false; });
  k.cv.addEventListener("pointermove", (e) => { target = k.pos(e); });
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); target = k.pos(e); start(); });

  function spawn() {
    // 내 크기에 맞춰 먹을 수 있는 물고기와 피해야 할 큰 물고기가 섞여 나와요
    const big = Math.random() < Math.min(0.45, 0.2 + time * 0.006);
    const r = big ? me.r * (1.25 + Math.random() * 0.7) : me.r * (0.4 + Math.random() * 0.5);
    const dir = Math.random() < 0.5 ? 1 : -1;
    others.push({ x: dir > 0 ? -r * 2 : W + r * 2, y: 50 + Math.random() * (H - 90), r, dir, v: 70 + Math.random() * 110 + time * 1.2, c: COLORS[Math.floor(Math.random() * COLORS.length)], wob: Math.random() * 6 });
  }
  function update(dt) {
    time += dt;
    for (const b of bubbles) { b.y -= (20 + b.r * 6) * dt; if (b.y < -10) { b.y = H + 10; b.x = Math.random() * W; } }
    if (state !== "play") return;
    safeT -= dt;
    const mx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    const my = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
    if (mx || my) { me.x += mx * 330 * dt; me.y += my * 330 * dt; if (mx) me.face = mx; }
    else if (target) {
      const dx = target.x - me.x, dy = target.y - me.y, d = Math.hypot(dx, dy);
      if (d > 3) { const s = Math.min(d, 420 * dt); me.x += (dx / d) * s; me.y += (dy / d) * s; if (Math.abs(dx) > 4) me.face = Math.sign(dx); }
    }
    me.x = Math.max(me.r, Math.min(W - me.r, me.x)); me.y = Math.max(me.r + 30, Math.min(H - me.r, me.y));
    spawnT -= dt;
    if (spawnT <= 0) { spawn(); spawnT = Math.max(0.35, 0.8 - time * 0.006); }
    for (const o of others) {
      o.x += o.dir * o.v * dt; o.y += Math.sin(time * 2 + o.wob) * 14 * dt;
      if (Math.hypot(o.x - me.x, o.y - me.y) > (o.r + me.r) * 0.8) continue;
      if (o.r < me.r) { o.gone = true; score += Math.max(1, Math.round(o.r / 4)); me.r = Math.min(60, me.r + o.r * 0.045); }
      else if (safeT <= 0) {
        lives--; safeT = 1.5; me.r = Math.max(16, me.r * 0.8);
        if (lives <= 0) { state = "over"; overAt = performance.now(); if (score > best.get()) best.set(score); }
      }
    }
    others = others.filter((o) => !o.gone && o.x > -200 && o.x < W + 200);
  }
  function fish(x, y, r, face, color, eye) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x - face * r * 0.8, y); ctx.lineTo(x - face * r * 1.7, y - r * 0.7); ctx.lineTo(x - face * r * 1.7, y + r * 0.7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r * 0.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.beginPath(); ctx.ellipse(x, y + r * 0.25, r * 0.7, r * 0.3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + face * r * 0.55, y - r * 0.2, Math.max(2.5, r * 0.22), 0, 7); ctx.fill();
    ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(x + face * r * 0.62, y - r * 0.2, Math.max(1.2, r * 0.11), 0, 7); ctx.fill();
  }
  function draw() {
    k.begin("#0e1124");
    const sea = ctx.createLinearGradient(0, 0, 0, H);
    sea.addColorStop(0, "#22b8cf"); sea.addColorStop(1, "#0b4f8a");
    ctx.fillStyle = sea; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.25)";
    for (const b of bubbles) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#2f9e44";
    for (let i = 0; i < 9; i++) { const x = 40 + i * 115; ctx.beginPath(); ctx.ellipse(x + Math.sin(time + i) * 6, H - 20, 9, 46, Math.sin(time + i) * 0.15, 0, 7); ctx.fill(); }
    for (const o of others) fish(o.x, o.y, o.r, o.dir, o.r < me.r ? o.c : "#495057", o.r < me.r ? "#222" : "#e03131"); // 큰 물고기는 어두운 색
    if (state !== "over" && (safeT <= 0 || Math.floor(safeT * 10) % 2)) fish(me.x, me.y, me.r, me.face, "#4dabf7", "#222");
    Kit.hud(ctx, W, "점수 " + score, "❤".repeat(Math.max(0, lives)) + "   최고 " + best.get());
    if (state === "ready") Kit.overlay(ctx, W, H, "물고기 키우기", ["나보다 작은 물고기를 먹으면 몸이 커져요", "어두운 큰 물고기는 피해요 · 마우스·손가락·방향키로 헤엄쳐요", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "게임 끝!", ["점수 " + score + "  ·  최고 " + best.get(), "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
