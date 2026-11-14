(() => {
  const W = 960, H = 540, PW = 110;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("hop-best");

  let state = "ready"; // ready | play | over
  let me, plats, height, topY, target, overAt, time, lastX;
  const keys = {};

  // 새 발판은 바로 아래 발판에서 닿을 수 있는 거리에 놓고, 가끔 하나를 더 놓아요
  function addPlat() {
    const gap = 62 + Math.random() * 46 + Math.min(30, height / 400);
    topY -= gap;
    const moving = height > 600 && Math.random() < Math.min(0.45, height / 9000);
    lastX = Math.max(0, Math.min(W - PW, lastX + (Math.random() - 0.5) * 520));
    plats.push({ x: lastX, y: topY, vx: moving ? (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 70) : 0 });
    if (Math.random() < 0.55) plats.push({ x: Math.random() * (W - PW), y: topY - 10 + Math.random() * 20, vx: 0 });
  }
  function newGame() {
    me = { x: W / 2, y: H - 90, vy: -640, face: 1 };
    plats = [{ x: W / 2 - PW / 2, y: H - 50, vx: 0 }];
    height = 0; topY = H - 50; target = null; time = 0; lastX = W / 2 - PW / 2;
    while (topY > -40) addPlat();
  }
  newGame();

  function start() {
    if (state === "over" && performance.now() - overAt < 600) return;
    if (state !== "play") { newGame(); state = "play"; }
  }
  addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (["ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") target = null;
    if (!e.repeat && state !== "play") start();
  });
  addEventListener("keyup", (e) => { keys[e.code] = false; });
  k.cv.addEventListener("pointermove", (e) => { target = k.pos(e).x; });
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); target = k.pos(e).x; start(); });

  function update(dt) {
    time += dt;
    if (state !== "play") return;
    const mv = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    if (mv) { me.x += mv * 430 * dt; me.face = mv; }
    else if (target != null) { const d = Math.max(-560 * dt, Math.min(560 * dt, target - me.x)); me.x += d; if (Math.abs(d) > 0.5) me.face = Math.sign(d); }
    if (me.x < -20) me.x = W + 20; else if (me.x > W + 20) me.x = -20; // 화면 끝으로 나가면 반대쪽에서 나와요

    const prevY = me.y;
    me.vy += 1350 * dt;
    me.y += me.vy * dt;
    for (const p of plats) {
      if (p.vx) { p.x += p.vx * dt; if (p.x < 0 || p.x > W - PW) p.vx = -p.vx; }
      if (me.vy > 0 && prevY + 22 <= p.y && me.y + 22 >= p.y && me.x > p.x - 14 && me.x < p.x + PW + 14) { me.y = p.y - 22; me.vy = -660; }
    }
    // 위로 올라가면 화면이 따라 올라가요
    if (me.y < 220) {
      const d = 220 - me.y;
      me.y = 220; height += d; topY += d;
      for (const p of plats) p.y += d;
      plats = plats.filter((p) => p.y < H + 20);
      while (topY > -40) addPlat();
    }
    if (me.y > H + 40) {
      state = "over"; overAt = performance.now();
      const s = Math.floor(height / 10);
      if (s > best.get()) best.set(s);
    }
  }
  function draw() {
    k.begin("#0e1124");
    const t = Math.min(1, height / 6000);
    const mix = (a, b) => Math.round(a + (b - a) * t);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, `rgb(${mix(255, 40)},${mix(214, 30)},${mix(165, 90)})`);
    sky.addColorStop(1, `rgb(${mix(255, 110)},${mix(240, 80)},${mix(200, 160)})`);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (const p of plats) {
      ctx.fillStyle = p.vx ? "#4dabf7" : "#51cf66";
      ctx.beginPath(); ctx.roundRect(p.x, p.y, PW, 16, 8); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.beginPath(); ctx.roundRect(p.x + 8, p.y + 3, PW - 16, 4, 2); ctx.fill();
    }
    // 통통이 (동그란 젤리)
    const sq = Math.max(-0.18, Math.min(0.18, me.vy / 4000));
    ctx.fillStyle = "#ff922b";
    ctx.beginPath(); ctx.ellipse(me.x, me.y, 22 * (1 - sq), 22 * (1 + sq), 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(me.x + me.face * 7 - 6, me.y - 5, 5.5, 0, 7); ctx.arc(me.x + me.face * 7 + 6, me.y - 5, 5.5, 0, 7); ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(me.x + me.face * 9 - 6, me.y - 5, 2.5, 0, 7); ctx.arc(me.x + me.face * 9 + 6, me.y - 5, 2.5, 0, 7); ctx.fill();

    Kit.hud(ctx, W, "높이 " + Math.floor(height / 10) + "m", "최고 " + best.get() + "m");
    if (state === "ready") Kit.overlay(ctx, W, H, "통통 점프", ["통통이는 발판에 닿으면 저절로 뛰어올라요", "마우스·손가락·← → 키로 좌우로 움직여 더 높이!", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "떨어졌어요!", ["높이 " + Math.floor(height / 10) + "m  ·  최고 " + best.get() + "m", "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
