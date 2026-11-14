(() => {
  const W = 960, H = 540, PX = 220, GROUND = H - 36;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("plane-best");
  const PENCILS = ["#ffd43b", "#ff8787", "#74c0fc", "#8ce99a", "#b197fc"];

  let state = "ready"; // ready | play | over
  let plane, gates, score, speed, spawnX, time, overAt;

  function newGame() {
    plane = { y: H / 2 - 30, vy: 0 };
    gates = [];
    score = 0; speed = 230; spawnX = 0; time = 0;
  }
  newGame();

  function flap() {
    if (state === "over") {
      if (performance.now() - overAt < 500) return;
      newGame();
    }
    state = "play";
    plane.vy = -430;
  }
  addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); if (!e.repeat) flap(); }
  });
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); flap(); });

  function end() {
    state = "over";
    overAt = performance.now();
    if (score > best.get()) best.set(score);
  }

  function update(dt) {
    time += dt;
    if (state === "ready") { plane.y = H / 2 - 30 + Math.sin(time * 3) * 10; return; }
    plane.vy += 1250 * dt;
    plane.y += plane.vy * dt;
    if (state === "over") { plane.y = Math.min(plane.y, GROUND - 10); return; }

    speed += dt * 3;
    spawnX -= speed * dt;
    if (spawnX <= 0) {
      const gap = Math.max(130, 178 - score * 1.5);
      const mid = 90 + gap / 2 + Math.random() * (GROUND - 180 - gap);
      gates.push({ x: W + 40, top: mid - gap / 2, bottom: mid + gap / 2, color: PENCILS[Math.floor(Math.random() * PENCILS.length)], passed: false });
      spawnX = 300;
    }
    for (const g of gates) {
      g.x -= speed * dt;
      if (!g.passed && g.x + 30 < PX) { g.passed = true; score++; }
      if (Math.abs(g.x - PX) < 30 + 16 && (plane.y - 9 < g.top || plane.y + 9 > g.bottom)) end();
    }
    gates = gates.filter((g) => g.x > -60);
    if (plane.y > GROUND - 10 || plane.y < -40) end();
  }

  // 연필 기둥: base 에서 시작해 tip 쪽이 뾰족해요
  function pencil(x, base, tip, color) {
    const sign = Math.sign(tip - base), neck = tip - sign * 34;
    const top = Math.min(base, neck), len = Math.abs(neck - base);
    ctx.fillStyle = color;
    ctx.fillRect(x - 30, top, 60, len);
    ctx.fillStyle = "rgba(0,0,0,.12)";
    ctx.fillRect(x + 10, top, 20, len);
    ctx.fillStyle = "#f3d9b1";
    ctx.beginPath(); ctx.moveTo(x - 30, neck); ctx.lineTo(x + 30, neck); ctx.lineTo(x, tip); ctx.fill();
    ctx.fillStyle = "#343a40";
    ctx.beginPath(); ctx.moveTo(x - 10, tip - sign * 11); ctx.lineTo(x + 10, tip - sign * 11); ctx.lineTo(x, tip); ctx.fill();
  }

  function draw() {
    k.begin("#0e1124");
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#74c0fc"); sky.addColorStop(1, "#e7f5ff");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.8)";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 260 - time * 24) % 1300 + 1300) % 1300 - 150, y = 70 + (i * 67) % 200;
      ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.arc(x + 30, y - 12, 32, 0, 7); ctx.arc(x + 64, y, 24, 0, 7); ctx.fill();
    }

    for (const g of gates) {
      pencil(g.x, -10, g.top, g.color);
      pencil(g.x, GROUND, g.bottom, g.color);
    }
    // 공책 바닥
    ctx.fillStyle = "#fff9db"; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.strokeStyle = "#a5d8ff"; ctx.lineWidth = 2;
    for (let y = GROUND + 10; y < H; y += 12) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = "#ff8787"; ctx.fillRect(0, GROUND, W, 3);

    // 종이비행기
    ctx.save();
    ctx.translate(PX, plane.y);
    ctx.rotate(Math.max(-0.5, Math.min(1.1, plane.vy / 600)));
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(-22, -14); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#dee2e6";
    ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(-22, 12); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#adb5bd";
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-8, 14); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
    ctx.restore();

    Kit.hud(ctx, W, "통과 " + score + "개", "최고 " + best.get() + "개");
    if (state === "ready") Kit.overlay(ctx, W, H, "종이비행기", ["화면을 누르거나 스페이스 키를 누르면 위로 떠올라요", "연필 사이를 부딪히지 않고 지나가요", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "앗, 부딪혔어요!", ["통과 " + score + "개  ·  최고 " + best.get() + "개", "다시 하려면 눌러요"]);
    k.end();
  }

  Kit.loop((dt) => { update(dt); draw(); });
})();
