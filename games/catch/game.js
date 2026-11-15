(() => {
  const W = 960, H = 540, BY = H - 62;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("catch-best");
  const FRUITS = [{ c: "#e5383b", leaf: true, pts: 1 }, { c: "#ff922b", leaf: false, pts: 1 }, { c: "#9b5de5", leaf: false, pts: 2 }];

  let state = "ready"; // ready | play | over
  let bx, target, items, pops, score, lives, time, spawnT, overAt;
  const keys = {};

  function newGame() { bx = W / 2; target = null; items = []; pops = []; score = 0; lives = 3; time = 0; spawnT = 0.4; }
  newGame();
  function start() {
    if (state === "play" || (state === "over" && performance.now() - overAt < 600)) return;
    newGame(); state = "play";
  }
  addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (["ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") target = null;
    if (!e.repeat) start();
  });
  addEventListener("keyup", (e) => { keys[e.code] = false; });
  k.cv.addEventListener("pointermove", (e) => { target = k.pos(e).x; });
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); target = k.pos(e).x; start(); });

  function spawn() {
    const roll = Math.random();
    const kind = roll < 0.17 ? "rock" : roll < 0.23 ? "star" : "fruit";
    items.push({ x: 40 + Math.random() * (W - 80), y: -30, vy: 150 + Math.random() * 70 + time * 4, kind, f: FRUITS[Math.floor(Math.random() * FRUITS.length)], spin: Math.random() * 6 });
  }
  function hurt() {
    lives--;
    if (lives <= 0) { state = "over"; overAt = performance.now(); if (score > best.get()) best.set(score); }
  }
  function update(dt) {
    for (const p of pops) { p.y -= 50 * dt; p.life -= dt; }
    pops = pops.filter((p) => p.life > 0);
    if (state !== "play") return;
    time += dt;
    const mv = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    if (mv) bx += mv * 620 * dt;
    else if (target != null) bx += Math.max(-1000 * dt, Math.min(1000 * dt, target - bx));
    bx = Math.max(60, Math.min(W - 60, bx));
    spawnT -= dt;
    if (spawnT <= 0) { spawn(); spawnT = Math.max(0.3, 0.9 - time * 0.011); }
    for (const it of items) {
      it.y += it.vy * dt; it.spin += dt * 2;
      if (it.y > BY - 14 && it.y < BY + 26 && Math.abs(it.x - bx) < 66) {
        it.gone = true;
        if (it.kind === "rock") { pops.push({ x: it.x, y: BY - 30, text: "아야!", color: "#ff6b6b", life: 0.7 }); hurt(); }
        else { const pts = it.kind === "star" ? 5 : it.f.pts; score += pts; pops.push({ x: it.x, y: BY - 30, text: "+" + pts, color: "#fff", life: 0.6 }); }
      } else if (it.y > H + 30) { it.gone = true; if (it.kind === "fruit") hurt(); } // 과일을 떨어뜨리면 하트가 줄어요
    }
    items = items.filter((it) => !it.gone);
  }
  function draw() {
    k.begin("#0e1124");
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#a5d8ff"); sky.addColorStop(1, "#e6fcf5");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#51cf66"; ctx.fillRect(0, H - 30, W, 30);
    for (const it of items) {
      if (it.kind === "rock") {
        ctx.fillStyle = "#868e96"; ctx.beginPath(); ctx.ellipse(it.x, it.y, 22, 18, it.spin, 0, 7); ctx.fill();
        ctx.fillStyle = "#adb5bd"; ctx.beginPath(); ctx.arc(it.x - 6, it.y - 5, 5, 0, 7); ctx.fill();
      } else if (it.kind === "star") {
        ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.spin); ctx.fillStyle = "#ffd43b"; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = (Math.PI / 5) * i, r = i % 2 ? 10 : 22; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      } else {
        ctx.fillStyle = it.f.c; ctx.beginPath(); ctx.arc(it.x, it.y, 20, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.beginPath(); ctx.arc(it.x - 7, it.y - 7, 5, 0, 7); ctx.fill();
        ctx.fillStyle = "#2f9e44"; ctx.beginPath(); ctx.ellipse(it.x + 5, it.y - 21, 7, 3.5, -0.6, 0, 7); ctx.fill();
      }
    }
    // 바구니
    ctx.fillStyle = "#b5651d";
    ctx.beginPath(); ctx.moveTo(bx - 62, BY); ctx.lineTo(bx + 62, BY); ctx.lineTo(bx + 46, BY + 44); ctx.lineTo(bx - 46, BY + 44); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#8a4b12"; ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(bx + i * 22, BY + 2); ctx.lineTo(bx + i * 17, BY + 42); ctx.stroke(); }
    ctx.fillStyle = "#d9822b"; ctx.beginPath(); ctx.roundRect(bx - 66, BY - 6, 132, 12, 6); ctx.fill();
    for (const p of pops) { ctx.globalAlpha = Math.min(1, p.life * 2); Kit.text(ctx, p.text, p.x, p.y, 26, "center", p.color); }
    ctx.globalAlpha = 1;
    Kit.hud(ctx, W, "점수 " + score, "❤".repeat(Math.max(0, lives)) + "   최고 " + best.get());
    if (state === "ready") Kit.overlay(ctx, W, H, "과일 받기", ["마우스·손가락·← → 키로 바구니를 움직여요", "과일과 별은 받고, 돌멩이는 피해요", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "게임 끝!", ["점수 " + score + "  ·  최고 " + best.get(), "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
