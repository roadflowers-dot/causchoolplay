(() => {
  const W = 960, H = 540, FLOOR = H - 40, G = 1500, BX = 150, R = 16;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("hoops-best");

  let state = "ready"; // ready | play | over
  let aim, ball, hoop, score, lives, drag, msg, overAt, by;

  function placeHoop() { hoop = { x: 600 + Math.random() * 230, y: 170 + Math.random() * 170, w: 78 }; }
  function reset() { ball = null; by = FLOOR - R - 60 - Math.random() * 60; }
  function newGame() { score = 0; lives = 3; aim = { a: 1.0, p: 820 }; msg = null; placeHoop(); reset(); }
  newGame();

  const vel = () => ({ vx: Math.cos(aim.a) * aim.p, vy: -Math.sin(aim.a) * aim.p });
  function shoot() {
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); state = "play"; return;
    }
    if (ball) return;
    const v = vel();
    ball = { x: BX, y: by, vx: v.vx, vy: v.vy, scored: false, t: 0 };
  }
  // 공에서 손가락을 끌어 방향과 세기를 정하고, 놓으면 던져요
  function setAim(p) {
    const dx = p.x - BX, dy = by - p.y;
    aim.a = Math.max(0.25, Math.min(1.45, Math.atan2(dy, Math.max(1, dx))));
    aim.p = Math.max(450, Math.min(1150, Math.hypot(dx, dy) * 3.2));
  }
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); if (state !== "play") { shoot(); return; } if (!ball) { drag = true; setAim(k.pos(e)); } });
  k.cv.addEventListener("pointermove", (e) => { if (drag && !ball) setAim(k.pos(e)); });
  addEventListener("pointerup", () => { if (drag) { drag = false; shoot(); } });
  addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "ArrowUp") aim.a = Math.min(1.45, aim.a + 0.03);
    else if (e.code === "ArrowDown") aim.a = Math.max(0.25, aim.a - 0.03);
    else if (e.code === "ArrowRight") aim.p = Math.min(1150, aim.p + 20);
    else if (e.code === "ArrowLeft") aim.p = Math.max(450, aim.p - 20);
    else if ((e.code === "Space" || e.code === "Enter") && !e.repeat) shoot();
  });

  function rimBounce(px, py) {
    const dx = ball.x - px, dy = ball.y - py, d = Math.hypot(dx, dy);
    if (d >= R + 4 || d === 0) return;
    const nx = dx / d, ny = dy / d, dot = ball.vx * nx + ball.vy * ny;
    if (dot < 0) { ball.vx = (ball.vx - 2 * dot * nx) * 0.6; ball.vy = (ball.vy - 2 * dot * ny) * 0.6; }
    ball.x = px + nx * (R + 4); ball.y = py + ny * (R + 4);
  }
  function done(made) {
    if (made) { score++; msg = { text: "골인! 🏀", t: 1 }; placeHoop(); }
    else { lives--; msg = { text: "아까워요!", t: 1 }; if (lives <= 0) { state = "over"; overAt = performance.now(); if (score > best.get()) best.set(score); } }
    reset();
  }
  function update(dt) {
    if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }
    if (state !== "play" || !ball) return;
    for (let i = 0; i < 3; i++) {
      const h = dt / 3, py = ball.y;
      ball.vy += G * h; ball.x += ball.vx * h; ball.y += ball.vy * h; ball.t += h;
      rimBounce(hoop.x, hoop.y); rimBounce(hoop.x + hoop.w, hoop.y);
      // 백보드
      const bx = hoop.x + hoop.w + 10;
      if (ball.vx > 0 && ball.x + R > bx && ball.x < bx + 12 && ball.y > hoop.y - 90 && ball.y < hoop.y + 14) { ball.x = bx - R; ball.vx = -ball.vx * 0.55; }
      // 위에서 아래로 림 사이를 지나가면 골
      if (!ball.scored && ball.vy > 0 && py <= hoop.y && ball.y > hoop.y && ball.x > hoop.x + 6 && ball.x < hoop.x + hoop.w - 6) ball.scored = true;
    }
    if (ball.y > FLOOR - R || ball.x > W + 40 || ball.x < -40 || ball.t > 5) done(ball.scored);
  }
  function draw() {
    k.begin("#0e1124");
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#ffe8cc"); bg.addColorStop(1, "#ffc078");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c2742f"; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    // 골대
    const bx = hoop.x + hoop.w + 10;
    ctx.fillStyle = "#868e96"; ctx.fillRect(bx + 12, hoop.y - 40, 10, FLOOR - hoop.y + 40);
    ctx.fillStyle = "#f8f9fa"; ctx.fillRect(bx, hoop.y - 90, 12, 104);
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(hoop.x + (hoop.w * i) / 4, hoop.y); ctx.lineTo(hoop.x + 14 + ((hoop.w - 28) * i) / 4, hoop.y + 46); ctx.stroke(); }
    ctx.strokeStyle = "#e8590c"; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hoop.x, hoop.y); ctx.lineTo(hoop.x + hoop.w + 10, hoop.y); ctx.stroke();
    // 날아갈 길 미리 보기
    if (state === "play" && !ball) {
      const v = vel(); ctx.fillStyle = "rgba(27,33,66,.35)";
      for (let t = 0.06; t < 0.55; t += 0.06) { ctx.beginPath(); ctx.arc(BX + v.vx * t, by + v.vy * t + 0.5 * G * t * t, 5, 0, 7); ctx.fill(); }
    }
    const x = ball ? ball.x : BX, y = ball ? ball.y : by;
    ctx.fillStyle = "#fd7e14"; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
    ctx.strokeStyle = "#7c3a0a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.moveTo(x - R, y); ctx.lineTo(x + R, y); ctx.moveTo(x, y - R); ctx.lineTo(x, y + R); ctx.stroke();
    if (msg) { ctx.globalAlpha = Math.min(1, msg.t * 2); Kit.text(ctx, msg.text, W / 2, 130, 40, "center", "#1b2142"); ctx.globalAlpha = 1; }
    Kit.hud(ctx, W, score + "골", "❤".repeat(Math.max(0, lives)) + "   최고 " + best.get() + "골");
    if (state === "ready") Kit.overlay(ctx, W, H, "농구 슛", ["화면을 누른 채 끌어 방향과 세기를 정하고, 놓으면 던져요", "키보드: ↑ ↓ 방향, ← → 세기, 스페이스 던지기 · 세 번 놓치면 끝", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "게임 끝!", [score + "골  ·  최고 " + best.get() + "골", "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
