(() => {
  const W = 960, H = 540, SHOTS = 10, TX = 830, AX = 110;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("archery-best");
  const RINGS = [{ r: 1.0, c: "#f8f9fa", pts: 2 }, { r: 0.78, c: "#343a40", pts: 4 }, { r: 0.56, c: "#4dabf7", pts: 6 }, { r: 0.34, c: "#ff6b6b", pts: 8 }, { r: 0.14, c: "#ffd43b", pts: 10 }];

  let state = "ready"; // ready | play | over
  let ty, tdir, tspeed, tr, bowY, bdir, arrow, shot, score, msg, overAt;

  function setup() { tspeed = 150 + shot * 28; tr = Math.max(40, 78 - shot * 4); arrow = null; }
  function newGame() { shot = 0; score = 0; ty = H / 2; tdir = 1; bowY = H / 2; bdir = -1; msg = null; setup(); }
  newGame();

  function fire() {
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); state = "play"; return;
    }
    if (!arrow) arrow = { x: AX, y: bowY };
  }
  addEventListener("keydown", (e) => { if ((e.code === "Space" || e.code === "Enter" || e.code === "ArrowUp") && !e.repeat) { e.preventDefault(); fire(); } });
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); fire(); });

  function land(pts, text) {
    score += pts; shot++;
    msg = { text, t: 1 };
    if (shot >= SHOTS) { state = "over"; overAt = performance.now(); if (score > best.get()) best.set(score); }
    else setup();
  }
  function update(dt) {
    if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }
    if (state !== "play") return;
    ty += tdir * tspeed * dt;
    if (ty < 90 + tr) { ty = 90 + tr; tdir = 1; } else if (ty > H - 20 - tr) { ty = H - 20 - tr; tdir = -1; }
    // 활도 천천히 위아래로 움직여서 타이밍을 맞춰야 해요
    bowY += bdir * 90 * dt;
    if (bowY < 150) { bowY = 150; bdir = 1; } else if (bowY > H - 80) { bowY = H - 80; bdir = -1; }
    if (!arrow) return;
    arrow.x += 1150 * dt;
    // 과녁을 지나는 순간 한 번만 맞았는지 봐요
    if (!arrow.missed && arrow.x >= TX) {
      const d = Math.abs(arrow.y - ty) / tr;
      const ring = [...RINGS].reverse().find((r) => d <= r.r);
      if (ring) land(ring.pts, ring.pts === 10 ? "명중! +10" : "+" + ring.pts);
      else arrow.missed = true;
    } else if (arrow.x > W + 60) land(0, "빗나갔어요");
  }
  function draw() {
    k.begin("#0e1124");
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#c3fae8"); sky.addColorStop(1, "#d3f9d8");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#8ce99a"; ctx.fillRect(0, H - 40, W, 40);
    // 과녁
    ctx.fillStyle = "#8a5a2b"; ctx.fillRect(TX + 4, ty, 10, H - 40 - ty);
    for (const r of RINGS) { ctx.fillStyle = r.c; ctx.beginPath(); ctx.ellipse(TX, ty, tr * r.r * 0.45, tr * r.r, 0, 0, 7); ctx.fill(); }
    // 활
    ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(AX - 34, bowY, 54, -1.1, 1.1); ctx.stroke();
    ctx.strokeStyle = "#495057"; ctx.lineWidth = 2;
    const pull = arrow ? 0 : 16;
    ctx.beginPath(); ctx.moveTo(AX - 10, bowY - 48); ctx.lineTo(AX - 10 - pull, bowY); ctx.lineTo(AX - 10, bowY + 48); ctx.stroke();
    const ax = arrow ? arrow.x : AX + 40 - pull, ay = arrow ? arrow.y : bowY;
    if (state !== "over") {
      ctx.strokeStyle = "#5c3d1e"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ax - 70, ay); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.fillStyle = "#495057"; ctx.beginPath(); ctx.moveTo(ax + 12, ay); ctx.lineTo(ax - 4, ay - 7); ctx.lineTo(ax - 4, ay + 7); ctx.fill();
      ctx.fillStyle = "#ff6b6b"; ctx.beginPath(); ctx.moveTo(ax - 70, ay); ctx.lineTo(ax - 84, ay - 8); ctx.lineTo(ax - 60, ay); ctx.lineTo(ax - 84, ay + 8); ctx.fill();
    }
    if (msg) { ctx.globalAlpha = Math.min(1, msg.t * 2); Kit.text(ctx, msg.text, W / 2, 150, 44, "center", "#1b2142"); ctx.globalAlpha = 1; }
    Kit.hud(ctx, W, "점수 " + score + "   화살 " + Math.min(SHOTS, shot + (state === "play" ? 1 : 0)) + "/" + SHOTS, "최고 " + best.get());
    if (state === "ready") Kit.overlay(ctx, W, H, "과녁 맞히기", ["화살은 " + SHOTS + "발! 과녁 한가운데는 10점", "활과 과녁이 같은 높이일 때 화면이나 스페이스 키를 눌러요", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "다 쐈어요!", ["점수 " + score + "  ·  최고 " + best.get(), "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
