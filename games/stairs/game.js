(() => {
  const W = 960, H = 540;
  const COLS = 9, SW = 88, SH = 50, LEFT = (W - COLS * SW) / 2, BASE_Y = 400;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("stairs-best");

  let state = "ready"; // ready | play | over
  let stairs, idx, cam, timer, score, face, hop, fall, overAt, wrongDir;

  function grow() {
    while (stairs.length < idx + 40) {
      const prev = stairs[stairs.length - 1];
      let d = Math.random() < 0.5 ? -1 : 1;
      // 같은 방향이 조금 더 이어지도록 해서 리듬이 생기게 해요
      if (stairs.length > 1 && Math.random() < 0.35) d = prev - stairs[stairs.length - 2];
      if (prev + d < 0 || prev + d >= COLS) d = -d;
      stairs.push(prev + d);
    }
  }
  function newGame() {
    stairs = [4];
    idx = 0; cam = 0; timer = 1; score = 0; face = 1; hop = 0; fall = null;
    grow();
    face = stairs[1] - stairs[0];
  }
  newGame();

  function step(dir) {
    if (state === "over") {
      if (performance.now() - overAt > 500) { newGame(); state = "play"; }
      return;
    }
    state = "play";
    face = dir;
    if (stairs[idx + 1] - stairs[idx] === dir) {
      idx++; score++; hop = 1;
      timer = Math.min(1, timer + 0.085);
      grow();
    } else {
      wrongDir = dir;
      end();
    }
  }
  function end() {
    state = "over";
    overAt = performance.now();
    fall = { x: 0, y: 0, vx: (wrongDir || face) * 150, vy: -260 };
    if (score > best.get()) best.set(score);
  }

  addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); step(-1); }
    if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); step(1); }
  });
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); step(k.pos(e).x < W / 2 ? -1 : 1); });

  function update(dt) {
    cam += (idx - cam) * Math.min(1, dt * 12);
    hop = Math.max(0, hop - dt * 6);
    if (state === "play") {
      timer -= dt * Math.min(0.6, 0.15 + score * 0.0022);
      if (timer <= 0) { timer = 0; wrongDir = 0; end(); }
    }
    if (fall) { fall.vy += 1500 * dt; fall.x += fall.vx * dt; fall.y += fall.vy * dt; }
  }

  const sx = (col) => LEFT + col * SW + SW / 2;
  const sy = (i) => BASE_Y - (i - cam) * SH;

  function cloud(x, y, w) {
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y, w, 22, 11);
    ctx.arc(x - w * 0.22, y + 4, 13, 0, 7);
    ctx.arc(x + w * 0.05, y, 16, 0, 7);
    ctx.arc(x + w * 0.27, y + 5, 11, 0, 7);
    ctx.fill();
  }

  function drawChick(x, y) {
    ctx.fillStyle = "#ffd43b";
    ctx.beginPath(); ctx.arc(x, y - 22, 22, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffb703";
    ctx.beginPath(); ctx.ellipse(x - face * 10, y - 16, 9, 12, face * 0.4, 0, 7); ctx.fill();
    ctx.fillStyle = "#ff7a3d";
    ctx.beginPath(); ctx.moveTo(x + face * 18, y - 26); ctx.lineTo(x + face * 32, y - 21); ctx.lineTo(x + face * 18, y - 16); ctx.fill();
    ctx.fillStyle = "#2b1d00";
    ctx.beginPath(); ctx.arc(x + face * 9, y - 28, 3.2, 0, 7); ctx.fill();
    ctx.fillStyle = "#ff7a3d";
    ctx.fillRect(x - 8, y - 3, 5, 5); ctx.fillRect(x + 3, y - 3, 5, 5);
  }

  function draw() {
    k.begin("#0e1124");
    // 높이 올라갈수록 하늘이 밤으로 바뀌어요
    const t = Math.min(1, cam / 150);
    const mix = (a, b) => Math.round(a + (b - a) * t);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, `rgb(${mix(92, 20)},${mix(200, 24)},${mix(255, 78)})`);
    sky.addColorStop(1, `rgb(${mix(198, 72)},${mix(190, 60)},${mix(255, 150)})`);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,.35)";
    for (let i = 0; i < 6; i++) {
      const y = ((i * 131 + cam * 9) % (H + 80)) - 40;
      ctx.beginPath(); ctx.ellipse((i * 211 + 90) % W, y, 70, 16, 0, 0, 7); ctx.fill();
    }

    const from = Math.max(0, Math.floor(cam) - 4), to = Math.min(stairs.length - 1, Math.floor(cam) + 9);
    for (let i = to; i >= from; i--) {
      const x = sx(stairs[i]), y = sy(i);
      ctx.fillStyle = "rgba(60,70,140,.18)";
      cloud(x + 3, y + 6, SW - 10);
      ctx.fillStyle = i === idx + 1 && state !== "over" ? "#fff7d6" : "#ffffff";
      cloud(x, y, SW - 10);
    }

    let px = sx(stairs[idx]), py = sy(idx) - Math.sin(hop * Math.PI) * 14;
    if (fall) { px += fall.x; py += fall.y; }
    drawChick(px, py);

    // 시간 막대
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath(); ctx.roundRect(W / 2 - 200, 62, 400, 14, 7); ctx.fill();
    ctx.fillStyle = timer > 0.3 ? "#69db7c" : "#ff6b6b";
    ctx.beginPath(); ctx.roundRect(W / 2 - 200, 62, Math.max(14, 400 * timer), 14, 7); ctx.fill();

    Kit.hud(ctx, W, score + "칸", "최고 " + best.get() + "칸");

    if (state === "ready") {
      Kit.overlay(ctx, W, H, "구름 계단", ["다음 구름이 있는 쪽을 눌러 올라가요", "← → 키 또는 화면 왼쪽·오른쪽", "시간 막대가 다 줄기 전에!"]);
    } else if (state === "over") {
      Kit.overlay(ctx, W, H, wrongDir === 0 ? "시간 끝!" : "앗, 떨어졌어요!", [score + "칸 올라갔어요  ·  최고 " + best.get() + "칸", "다시 하려면 눌러요"]);
    } else {
      Kit.text(ctx, "◀", 40, H - 30, 44, "left", "rgba(255,255,255,.55)");
      Kit.text(ctx, "▶", W - 40, H - 30, 44, "right", "rgba(255,255,255,.55)");
    }
    k.end();
  }

  Kit.loop((dt) => { update(dt); draw(); });
})();
