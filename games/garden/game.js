(() => {
  const W = 960, H = 540, PY = H - 70;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("garden-best");
  const ROW_COLORS = ["#e5383b", "#ff8a3d", "#9b5de5", "#2a9d8f"];

  let state = "ready"; // ready | play | over
  let player, drops, bugs, mud, parts, dir, speed, score, lives, wave, fireT, mudT, safeT, time;
  const keys = {};

  function buildWave() {
    bugs = [];
    const cols = 9, rows = Math.min(3 + Math.floor(wave / 2), 5);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) bugs.push({ x: 150 + c * 72, y: 80 + r * 50, color: ROW_COLORS[r % 4], pts: (rows - r) * 10 });
    dir = 1;
    speed = 34 + wave * 9;
    drops = []; mud = [];
  }
  function newGame() {
    player = { x: W / 2, target: null };
    parts = [];
    score = 0; lives = 3; wave = 1; fireT = 0; mudT = 1.5; safeT = 0; time = 0;
    buildWave();
  }
  newGame();

  function press() {
    if (state === "over") newGame();
    state = "play";
  }
  addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (["Space", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    if ((e.code === "Space" || e.code === "Enter") && !e.repeat && state !== "play") press();
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") player.target = null;
  });
  addEventListener("keyup", (e) => { keys[e.code] = false; });
  k.cv.addEventListener("pointermove", (e) => { player.target = k.pos(e).x; });
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); player.target = k.pos(e).x; if (state !== "play") press(); });

  function splash(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, v = 50 + Math.random() * 200;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3 + Math.random() * 0.3, color });
    }
  }
  function gameOver() {
    state = "over";
    if (score > best.get()) best.set(score);
  }

  function update(dt) {
    time += dt;
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    parts = parts.filter((p) => p.life > 0);
    if (state !== "play") return;
    safeT -= dt;

    const mv = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    if (mv) player.x += mv * 480 * dt;
    else if (player.target != null) player.x += Math.max(-800 * dt, Math.min(800 * dt, player.target - player.x));
    player.x = Math.max(30, Math.min(W - 30, player.x));

    fireT -= dt;
    if (fireT <= 0) { drops.push({ x: player.x, y: PY - 26 }); fireT = 0.42; }
    for (const d of drops) d.y -= 620 * dt;
    drops = drops.filter((d) => d.y > -10 && !d.dead);

    // 벌레 떼: 끝에 닿으면 한 칸 내려오고 방향을 바꿔요. 수가 줄수록 빨라져요
    const sp = speed * (1 + (1 - bugs.length / 45) * 1.6);
    let edge = false;
    for (const b of bugs) { b.x += dir * sp * dt; if (b.x > W - 40 || b.x < 40) edge = true; }
    if (edge) { dir = -dir; for (const b of bugs) { b.y += 22; b.x += dir * 4; } }

    for (const b of bugs) {
      for (const d of drops) {
        if (!d.dead && Math.abs(d.x - b.x) < 22 && Math.abs(d.y - b.y) < 18) { d.dead = true; b.dead = true; score += b.pts; splash(b.x, b.y, b.color, 10); break; }
      }
      if (!b.dead && b.y > PY - 40) { gameOver(); return; }
    }
    bugs = bugs.filter((b) => !b.dead);

    mudT -= dt;
    if (mudT <= 0 && bugs.length) {
      const b = bugs[Math.floor(Math.random() * bugs.length)];
      mud.push({ x: b.x, y: b.y + 14 });
      mudT = Math.max(0.5, 1.7 - wave * 0.15);
    }
    for (const m of mud) {
      m.y += (190 + wave * 14) * dt;
      if (safeT <= 0 && Math.abs(m.x - player.x) < 26 && Math.abs(m.y - PY) < 22) {
        m.dead = true; lives--; safeT = 1.2; splash(player.x, PY, "#8b5a2b", 16);
        if (lives <= 0) { gameOver(); return; }
      }
    }
    mud = mud.filter((m) => m.y < H && !m.dead);

    if (!bugs.length) { wave++; score += 100; buildWave(); }
  }

  function drawBug(b) {
    const wob = Math.sin(time * 8 + b.x * 0.05) * 3;
    ctx.strokeStyle = "#2b1d12"; ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(b.x + s * 10, b.y + 4); ctx.lineTo(b.x + s * 20, b.y + 10 + wob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x + s * 5, b.y - 12); ctx.lineTo(b.x + s * 9, b.y - 20); ctx.stroke();
    }
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 17, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#2b1d12";
    ctx.beginPath(); ctx.arc(b.x, b.y - 10, 8, 0, 7); ctx.fill();
    ctx.fillRect(b.x - 1, b.y - 6, 2, 19);
    ctx.beginPath(); ctx.arc(b.x - 8, b.y + 2, 2.6, 0, 7); ctx.arc(b.x + 8, b.y + 2, 2.6, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(b.x - 3, b.y - 11, 2, 0, 7); ctx.arc(b.x + 3, b.y - 11, 2, 0, 7); ctx.fill();
  }

  function draw() {
    k.begin("#0e1124");
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#8fd3ff"); sky.addColorStop(1, "#d8f5c2");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#7a4f2a"; ctx.fillRect(0, H - 44, W, 44);
    ctx.fillStyle = "#4caf50"; ctx.fillRect(0, H - 50, W, 10);
    // 텃밭 채소
    for (let i = 0; i < 12; i++) {
      const x = 44 + i * 80;
      ctx.fillStyle = "#2e8b3d";
      ctx.beginPath(); ctx.ellipse(x - 6, H - 54, 5, 12, -0.4, 0, 7); ctx.ellipse(x + 6, H - 54, 5, 12, 0.4, 0, 7); ctx.fill();
      ctx.fillStyle = "#ff8a3d";
      ctx.beginPath(); ctx.moveTo(x - 6, H - 44); ctx.lineTo(x + 6, H - 44); ctx.lineTo(x, H - 26); ctx.fill();
    }

    bugs.forEach(drawBug);
    ctx.fillStyle = "#1e90ff";
    for (const d of drops) { ctx.beginPath(); ctx.moveTo(d.x, d.y - 9); ctx.quadraticCurveTo(d.x + 7, d.y + 4, d.x, d.y + 7); ctx.quadraticCurveTo(d.x - 7, d.y + 4, d.x, d.y - 9); ctx.fill(); }
    ctx.fillStyle = "#6b4423";
    for (const m of mud) { ctx.beginPath(); ctx.arc(m.x, m.y, 7, 0, 7); ctx.fill(); }
    for (const p of parts) { ctx.globalAlpha = Math.max(0, p.life * 2.5); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 5, 5); }
    ctx.globalAlpha = 1;

    // 물뿌리개
    if (safeT <= 0 || Math.floor(safeT * 10) % 2) {
      const x = player.x;
      ctx.fillStyle = "#3d7ef0";
      ctx.beginPath(); ctx.roundRect(x - 22, PY - 12, 44, 30, 8); ctx.fill();
      ctx.fillRect(x - 4, PY - 28, 8, 18);
      ctx.fillStyle = "#6ea2ff";
      ctx.beginPath(); ctx.roundRect(x - 9, PY - 34, 18, 8, 4); ctx.fill();
      ctx.strokeStyle = "#3d7ef0"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x + 24, PY + 2, 10, -1.3, 1.3); ctx.stroke();
    }

    Kit.hud(ctx, W, "점수 " + score + "   " + wave + "번째 떼", "❤".repeat(Math.max(0, lives)) + "   최고 " + best.get());
    if (state === "ready") Kit.overlay(ctx, W, H, "텃밭 지키기", ["마우스·손가락·← → 키로 물뿌리개를 움직여요", "벌레가 채소에 닿기 전에 물로 쫓아내요", "화면을 누르거나 스페이스 키로 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "게임 끝!", ["점수 " + score + "  ·  최고 " + best.get(), "다시 하려면 눌러요"]);
    k.end();
  }

  Kit.loop((dt) => { update(dt); draw(); });
})();
