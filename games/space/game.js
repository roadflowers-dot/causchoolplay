(() => {
  const W = 960, H = 540, SHIP_Y = H - 78;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("space-best");

  let state = "ready"; // ready | play | over
  let ship, bullets, rocks, parts, score, lives, time, fireT, spawnT, safeT, overAt;
  const keys = {};
  const stars = Array.from({ length: 70 }, (_, i) => ({ x: (i * 137.5) % W, y: (i * 71.3) % H, z: 0.3 + (i % 5) * 0.18 }));

  function newGame() {
    ship = { x: W / 2, target: null };
    bullets = []; rocks = []; parts = [];
    score = 0; lives = 3; time = 0; fireT = 0; spawnT = 0.6; safeT = 0;
  }
  newGame();

  function press() {
    if (state === "ready") state = "play";
    else if (state === "over" && performance.now() - overAt > 500) { newGame(); state = "play"; }
  }
  addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(e.code)) e.preventDefault();
    if ((e.code === "Space" || e.code === "Enter") && !e.repeat) press();
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") ship.target = null;
  });
  addEventListener("keyup", (e) => { keys[e.code] = false; });
  k.cv.addEventListener("pointermove", (e) => { ship.target = k.pos(e).x; });
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); ship.target = k.pos(e).x; press(); });

  function spawnRock() {
    const r = 18 + Math.random() * 28;
    const hp = r > 38 ? 3 : r > 27 ? 2 : 1;
    rocks.push({
      x: r + Math.random() * (W - r * 2), y: -r, r, hp, max: hp,
      vx: (Math.random() - 0.5) * 60,
      vy: 80 + Math.random() * 70 + time * 2.2,
      rot: Math.random() * 6, spin: (Math.random() - 0.5) * 2,
      shape: Array.from({ length: 9 }, () => 0.78 + Math.random() * 0.3),
      hit: 0,
    });
  }
  function boom(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, v = 60 + Math.random() * 240;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.35, color });
    }
  }
  function loseLife() {
    lives--;
    safeT = 1.4;
    if (lives <= 0) {
      state = "over";
      overAt = performance.now();
      boom(ship.x, SHIP_Y, 40, "#ffb347");
      if (score > best.get()) best.set(score);
    }
  }

  function update(dt) {
    for (const s of stars) { s.y += s.z * 60 * dt; if (s.y > H) s.y -= H; }
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    parts = parts.filter((p) => p.life > 0);
    if (state !== "play") return;

    time += dt;
    safeT -= dt;
    const move = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    if (move) ship.x += move * 540 * dt;
    else if (ship.target != null) ship.x += Math.max(-900 * dt, Math.min(900 * dt, ship.target - ship.x));
    ship.x = Math.max(28, Math.min(W - 28, ship.x));

    fireT -= dt;
    if (fireT <= 0) { bullets.push({ x: ship.x, y: SHIP_Y - 26 }); fireT = 0.2; }
    for (const b of bullets) b.y -= 760 * dt;
    bullets = bullets.filter((b) => b.y > -20);

    spawnT -= dt;
    if (spawnT <= 0) { spawnRock(); spawnT = Math.max(0.3, 0.95 - time * 0.011); }

    for (const r of rocks) {
      r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.spin * dt; r.hit -= dt;
      if (r.x < r.r || r.x > W - r.r) r.vx = -r.vx;
      for (const b of bullets) {
        if (b.dead || Math.hypot(b.x - r.x, b.y - r.y) > r.r + 5) continue;
        b.dead = true; r.hp--; r.hit = 0.08;
        if (r.hp <= 0) { score += r.max * 10; boom(r.x, r.y, 10 + r.max * 5, "#c9d1ff"); break; }
      }
      if (r.hp > 0 && safeT <= 0 && Math.hypot(ship.x - r.x, SHIP_Y - r.y) < r.r + 20) {
        r.hp = 0; boom(r.x, r.y, 16, "#ff8a65"); loseLife();
      }
      // 놓친 운석은 지구에 떨어져요
      if (r.hp > 0 && r.y - r.r > H - 30) { r.hp = 0; boom(r.x, H - 30, 14, "#ff8a65"); loseLife(); }
    }
    bullets = bullets.filter((b) => !b.dead);
    rocks = rocks.filter((r) => r.hp > 0);
  }

  function drawShip(x, y) {
    ctx.fillStyle = Math.random() < 0.5 ? "#ffd257" : "#ff8a3d";
    ctx.beginPath(); ctx.moveTo(x - 8, y + 20); ctx.lineTo(x, y + 34 + Math.random() * 10); ctx.lineTo(x + 8, y + 20); ctx.fill();
    ctx.fillStyle = "#4b57f5";
    ctx.beginPath(); ctx.moveTo(x - 26, y + 22); ctx.lineTo(x - 10, y - 2); ctx.lineTo(x - 10, y + 22); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 26, y + 22); ctx.lineTo(x + 10, y - 2); ctx.lineTo(x + 10, y + 22); ctx.fill();
    ctx.fillStyle = "#f1f3ff";
    ctx.beginPath(); ctx.moveTo(x, y - 28); ctx.quadraticCurveTo(x + 15, y - 4, x + 12, y + 22); ctx.lineTo(x - 12, y + 22); ctx.quadraticCurveTo(x - 15, y - 4, x, y - 28); ctx.fill();
    ctx.fillStyle = "#5cc8ff";
    ctx.beginPath(); ctx.arc(x, y - 2, 6, 0, 7); ctx.fill();
  }

  function draw() {
    k.begin("#050814");
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#050814"); bg.addColorStop(1, "#131b4a");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    for (const s of stars) { ctx.globalAlpha = s.z; ctx.fillRect(s.x, s.y, 2, 2); }
    ctx.globalAlpha = 1;

    // 지구
    ctx.fillStyle = "#2f7de1";
    ctx.beginPath(); ctx.ellipse(W / 2, H + 250, 760, 280, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#3fbf7f";
    ctx.beginPath(); ctx.ellipse(250, H + 6, 110, 22, 0, 0, 7); ctx.ellipse(680, H + 2, 150, 20, 0, 0, 7); ctx.fill();

    ctx.fillStyle = "#ffe14a";
    for (const b of bullets) { ctx.beginPath(); ctx.roundRect(b.x - 3, b.y - 10, 6, 18, 3); ctx.fill(); }

    for (const r of rocks) {
      ctx.save();
      ctx.translate(r.x, r.y); ctx.rotate(r.rot);
      ctx.fillStyle = r.hit > 0 ? "#ffffff" : "#8d93b3";
      ctx.beginPath();
      r.shape.forEach((f, i) => { const a = (i / r.shape.length) * 6.283; ctx.lineTo(Math.cos(a) * r.r * f, Math.sin(a) * r.r * f); });
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,.18)";
      ctx.beginPath(); ctx.arc(-r.r * 0.25, -r.r * 0.15, r.r * 0.22, 0, 7); ctx.arc(r.r * 0.3, r.r * 0.25, r.r * 0.15, 0, 7); ctx.fill();
      ctx.restore();
    }
    for (const p of parts) { ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 5, 5); }
    ctx.globalAlpha = 1;

    if (state !== "over" && (safeT <= 0 || Math.floor(safeT * 10) % 2)) drawShip(ship.x, SHIP_Y);

    Kit.hud(ctx, W, "점수 " + score, "❤".repeat(Math.max(0, lives)) + "   최고 " + best.get());
    if (state === "ready") Kit.overlay(ctx, W, H, "우주 지킴이", ["마우스·손가락·← → 키로 우주선을 움직여요", "운석이 지구에 떨어지지 않게 막아요", "화면을 누르거나 스페이스 키로 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "게임 끝!", ["점수 " + score + "  ·  최고 " + best.get(), "다시 하려면 눌러요"]);
    k.end();
  }

  Kit.loop((dt) => { update(dt); draw(); });
})();
