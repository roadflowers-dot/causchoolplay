(() => {
  const W = 960, H = 540, LANES = 4, LW = 104, RX = (W - LANES * LW) / 2, PY = H - 96;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("cars-best");
  const COLORS = ["#4dabf7", "#69db7c", "#ffd43b", "#b197fc", "#f783ac", "#ffa94d"];

  let state = "ready"; // ready | play | over
  let lane, x, cars, speed, score, spawnT, scroll, overAt, lastLane;
  const laneX = (l) => RX + l * LW + LW / 2;

  function newGame() { lane = 1; x = laneX(1); cars = []; speed = 300; score = 0; spawnT = 0.6; scroll = 0; lastLane = -1; }
  newGame();

  function steer(d) {
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); state = "play"; return;
    }
    lane = Math.max(0, Math.min(LANES - 1, lane + d));
  }
  addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); steer(-1); }
    else if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); steer(1); }
    else if ((e.code === "Space" || e.code === "Enter") && state !== "play") { e.preventDefault(); steer(0); }
  });
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); steer(state === "play" ? (k.pos(e).x < x ? -1 : 1) : 0); });

  function spawn() {
    // 항상 지나갈 길이 하나는 남도록, 한 번에 한두 대만 나와요
    let l; do { l = Math.floor(Math.random() * LANES); } while (l === lastLane);
    lastLane = l;
    cars.push({ lane: l, y: -80, color: COLORS[Math.floor(Math.random() * COLORS.length)], v: 0.45 + Math.random() * 0.25 });
    if (score > 15 && Math.random() < 0.3) { const l2 = (l + 2) % LANES; cars.push({ lane: l2, y: -80, color: COLORS[(l2 + score) % COLORS.length], v: 0.45 + Math.random() * 0.25 }); }
  }
  function update(dt) {
    if (state !== "play") return;
    speed += dt * 9;
    scroll = (scroll + speed * dt) % 80;
    x += Math.max(-900 * dt, Math.min(900 * dt, laneX(lane) - x));
    spawnT -= dt;
    if (spawnT <= 0) { spawn(); spawnT = Math.max(0.42, 190 / speed + Math.random() * 0.25); }
    for (const c of cars) {
      c.y += speed * c.v * dt + speed * 0.35 * dt;
      if (!c.passed && c.y > PY + 70) { c.passed = true; score++; }
      if (Math.abs(laneX(c.lane) - x) < 58 && Math.abs(c.y - PY) < 78) {
        state = "over"; overAt = performance.now();
        if (score > best.get()) best.set(score);
      }
    }
    cars = cars.filter((c) => c.y < H + 100);
  }
  function car(cx, cy, color, mine) {
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.roundRect(cx - 30, cy - 40, 66, 92, 14); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(cx - 32, cy - 46, 64, 92, 14); ctx.fill();
    ctx.fillStyle = "#1b2142";
    ctx.beginPath(); ctx.roundRect(cx - 23, cy + (mine ? -28 : 4), 46, 24, 7); ctx.fill();
    ctx.fillStyle = mine ? "#fff3bf" : "#ff6b6b";
    ctx.fillRect(cx - 26, cy + (mine ? -46 : 40), 12, 6); ctx.fillRect(cx + 14, cy + (mine ? -46 : 40), 12, 6);
    ctx.fillStyle = "#222";
    for (const sx of [-36, 30]) for (const sy of [-32, 20]) ctx.fillRect(cx + sx, cy + sy, 6, 20);
  }
  function draw() {
    k.begin("#0e1124");
    ctx.fillStyle = "#3a9d5d"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#2f8a4f";
    for (let i = -1; i < 8; i++) { ctx.beginPath(); ctx.arc(120 + (i % 2) * 90, i * 80 + scroll, 26, 0, 7); ctx.arc(W - 150 + (i % 2) * 70, i * 80 + scroll + 30, 26, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#495057"; ctx.fillRect(RX - 14, 0, LANES * LW + 28, H);
    ctx.fillStyle = "#f8f9fa"; ctx.fillRect(RX - 14, 0, 6, H); ctx.fillRect(RX + LANES * LW + 8, 0, 6, H);
    ctx.fillStyle = "rgba(255,255,255,.65)";
    for (let l = 1; l < LANES; l++) for (let y = -80; y < H; y += 80) ctx.fillRect(RX + l * LW - 3, y + scroll, 6, 40);
    for (const c of cars) car(laneX(c.lane), c.y, c.color, false);
    car(x, PY, "#ff6b6b", true);
    Kit.hud(ctx, W, "추월 " + score + "대", "최고 " + best.get() + "대");
    if (state === "ready") Kit.overlay(ctx, W, H, "씽씽 자동차", ["← → 키 또는 화면 왼쪽·오른쪽을 눌러 차선을 바꿔요", "다른 차에 부딪히지 않고 많이 추월해요", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "쿵! 부딪혔어요", ["추월 " + score + "대  ·  최고 " + best.get() + "대", "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
