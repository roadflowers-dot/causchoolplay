(() => {
  const W = 960, H = 540;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("balloons-best");
  const COLORS = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#b197fc", "#f783ac"];

  let state = "ready"; // ready | play | over
  let items, parts, score, lives, time, spawnT, overAt;

  function newGame() { items = []; parts = []; score = 0; lives = 3; time = 0; spawnT = 0.3; }
  newGame();

  function spawn() {
    const storm = Math.random() < 0.16;
    const r = storm ? 34 : 30 + Math.random() * 14;
    items.push({ x: r + 20 + Math.random() * (W - 2 * r - 40), y: H + r, r, storm, color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vy: 90 + Math.random() * 60 + time * 3.2, sway: Math.random() * 6, });
  }
  function burst(b, color) {
    for (let i = 0; i < 12; i++) { const a = Math.random() * 6.28, v = 80 + Math.random() * 220; parts.push({ x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4, color }); }
  }
  function lose() {
    lives--;
    if (lives <= 0) { state = "over"; overAt = performance.now(); if (score > best.get()) best.set(score); }
  }
  k.cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); state = "play"; return;
    }
    const p = k.pos(e);
    // 위에 그려진(나중에 나온) 것부터 확인
    for (let i = items.length - 1; i >= 0; i--) {
      const b = items[i];
      if (Math.hypot(p.x - b.x, p.y - b.y) > b.r + 8) continue;
      items.splice(i, 1);
      if (b.storm) { burst(b, "#868e96"); lose(); } else { burst(b, b.color); score++; }
      return;
    }
  });
  addEventListener("keydown", (e) => {
    if ((e.code === "Space" || e.code === "Enter") && state !== "play" && !e.repeat) { e.preventDefault(); if (!(state === "over" && performance.now() - overAt < 600)) { newGame(); state = "play"; } }
  });

  function update(dt) {
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt; }
    parts = parts.filter((p) => p.life > 0);
    if (state !== "play") return;
    time += dt;
    spawnT -= dt;
    if (spawnT <= 0) { spawn(); spawnT = Math.max(0.32, 0.95 - time * 0.012); }
    for (const b of items) {
      b.y -= b.vy * dt; b.x += Math.sin(time * 2 + b.sway) * 20 * dt;
      if (b.y < -b.r && !b.gone) { b.gone = true; if (!b.storm) lose(); } // 풍선을 놓치면 하트가 줄어요
    }
    items = items.filter((b) => !b.gone);
  }
  function draw() {
    k.begin("#0e1124");
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#74c0fc"); sky.addColorStop(1, "#d0ebff");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (const b of items) {
      if (b.storm) {
        ctx.fillStyle = "#5c636e";
        ctx.beginPath(); ctx.arc(b.x - 16, b.y + 4, 18, 0, 7); ctx.arc(b.x + 2, b.y - 8, 22, 0, 7); ctx.arc(b.x + 20, b.y + 5, 16, 0, 7); ctx.fill();
        ctx.strokeStyle = "#ffe066"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(b.x + 2, b.y + 14); ctx.lineTo(b.x - 5, b.y + 26); ctx.lineTo(b.x + 5, b.y + 26); ctx.lineTo(b.x - 2, b.y + 38); ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(b.x, b.y + b.r * 1.15); ctx.quadraticCurveTo(b.x + 8, b.y + b.r * 1.7, b.x, b.y + b.r * 2.2); ctx.stroke();
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 0.88, b.r * 1.08, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(b.x - 6, b.y + b.r * 1.16); ctx.lineTo(b.x + 6, b.y + b.r * 1.16); ctx.lineTo(b.x, b.y + b.r * 1.0); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.45)";
        ctx.beginPath(); ctx.ellipse(b.x - b.r * 0.3, b.y - b.r * 0.4, b.r * 0.18, b.r * 0.28, -0.5, 0, 7); ctx.fill();
      }
    }
    for (const p of parts) { ctx.globalAlpha = Math.max(0, p.life * 2.5); ctx.fillStyle = p.color; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); }
    ctx.globalAlpha = 1;
    Kit.hud(ctx, W, "풍선 " + score + "개", "❤".repeat(Math.max(0, lives)) + "   최고 " + best.get() + "개");
    if (state === "ready") Kit.overlay(ctx, W, H, "풍선 팡팡", ["날아가는 풍선을 눌러 터뜨려요", "풍선을 놓치거나 먹구름을 누르면 하트가 줄어요", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "게임 끝!", ["풍선 " + score + "개  ·  최고 " + best.get() + "개", "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
