(() => {
  const W = 960, H = 540, PY = H - 44;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("bricks-best");
  const COLORS = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#b197fc", "#f783ac", "#63e6be"];

  let state = "ready"; // ready | play | over
  let paddle, ball, bricks, score, lives, level, sparks;
  const keys = {};

  function buildLevel() {
    bricks = [];
    const rows = Math.min(3 + level, 8), cols = 12, bw = 68, bh = 22, gap = 6;
    const left = (W - (cols * bw + (cols - 1) * gap)) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // 단계가 오를수록 벽돌 사이에 빈칸 무늬가 생겨요
        if (level > 1 && (r + c + level) % 7 === 0) continue;
        bricks.push({ x: left + c * (bw + gap), y: 66 + r * (bh + gap), w: bw, h: bh, color: COLORS[r % COLORS.length] });
      }
    }
  }
  function resetBall() {
    ball = { x: paddle.x, y: PY - 10, vx: 0, vy: 0, r: 9, stuck: true };
  }
  function newGame() {
    score = 0; lives = 3; level = 1; sparks = [];
    paddle = { x: W / 2, w: 130 };
    buildLevel();
    resetBall();
  }
  newGame();

  function launch() {
    const sp = 360 + level * 35;
    const a = (Math.random() - 0.5) * 0.7;
    ball.vx = Math.sin(a) * sp;
    ball.vy = -Math.cos(a) * sp;
    ball.stuck = false;
  }
  function press() {
    if (state === "over") { newGame(); state = "play"; return; }
    state = "play";
    if (ball.stuck) launch();
  }

  addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); if (!e.repeat) press(); }
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") e.preventDefault();
  });
  addEventListener("keyup", (e) => { keys[e.code] = false; });
  k.cv.addEventListener("pointermove", (e) => { paddle.x = k.pos(e).x; });
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); paddle.x = k.pos(e).x; press(); });

  function burst(b) {
    for (let i = 0; i < 8; i++) {
      sparks.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, life: 0.45, color: b.color });
    }
  }

  function stepBall(dt) {
    const px = ball.x, py = ball.y;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
    if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
    if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

    // 막대: 맞은 위치에 따라 튕기는 방향이 달라져요
    if (ball.vy > 0 && ball.y + ball.r >= PY && py + ball.r <= PY + 6 && Math.abs(ball.x - paddle.x) <= paddle.w / 2 + ball.r) {
      const t = Math.max(-1, Math.min(1, (ball.x - paddle.x) / (paddle.w / 2)));
      const sp = Math.hypot(ball.vx, ball.vy);
      ball.vx = Math.sin(t * 1.1) * sp;
      ball.vy = -Math.cos(t * 1.1) * sp;
      ball.y = PY - ball.r;
    }

    for (let i = 0; i < bricks.length; i++) {
      const b = bricks[i];
      if (ball.x + ball.r < b.x || ball.x - ball.r > b.x + b.w || ball.y + ball.r < b.y || ball.y - ball.r > b.y + b.h) continue;
      // 직전 위치가 벽돌의 위아래 바깥이었으면 세로로, 아니면 가로로 튕겨요
      if (py + ball.r <= b.y || py - ball.r >= b.y + b.h) ball.vy = -ball.vy; else ball.vx = -ball.vx;
      ball.x = px; ball.y = py;
      burst(b);
      bricks.splice(i, 1);
      score += 10;
      break;
    }

    if (ball.y - ball.r > H) {
      lives--;
      if (lives <= 0) {
        state = "over";
        if (score > best.get()) best.set(score);
      } else {
        resetBall();
      }
    }
  }

  function update(dt) {
    const move = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    paddle.x += move * 640 * dt;
    paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, paddle.x));
    for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
    sparks = sparks.filter((s) => s.life > 0);
    if (state !== "play") { if (ball.stuck) ball.x = paddle.x; return; }
    if (ball.stuck) { ball.x = paddle.x; return; }
    for (let i = 0; i < 3 && state === "play" && !ball.stuck; i++) stepBall(dt / 3);
    if (!bricks.length) {
      level++;
      score += 100;
      buildLevel();
      resetBall();
    }
  }

  function draw() {
    k.begin("#0e1124");
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#1a1f4d"); bg.addColorStop(1, "#2b2060");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    for (const b of bricks) {
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 6); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.28)";
      ctx.beginPath(); ctx.roundRect(b.x + 4, b.y + 3, b.w - 8, 5, 3); ctx.fill();
    }
    for (const s of sparks) {
      ctx.globalAlpha = Math.max(0, s.life * 2.2);
      ctx.fillStyle = s.color; ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#f1f3ff";
    ctx.beginPath(); ctx.roundRect(paddle.x - paddle.w / 2, PY, paddle.w, 16, 8); ctx.fill();
    ctx.fillStyle = "#8089ff";
    ctx.beginPath(); ctx.roundRect(paddle.x - paddle.w / 2 + 10, PY + 5, paddle.w - 20, 6, 3); ctx.fill();

    ctx.fillStyle = "#ffd257";
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill();

    Kit.hud(ctx, W, "점수 " + score + "   " + level + "단계", "❤".repeat(Math.max(0, lives)) + "   최고 " + best.get());

    if (state === "ready") Kit.overlay(ctx, W, H, "알록달록 벽돌깨기", ["마우스·손가락·← → 키로 막대를 움직여요", "화면을 누르거나 스페이스 키로 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "게임 끝!", ["점수 " + score + "  ·  최고 " + best.get(), "다시 하려면 눌러요"]);
    else if (ball.stuck) Kit.text(ctx, "눌러서 공을 보내요", W / 2, H / 2 + 60, 24, "center", "rgba(255,255,255,.85)", false);
    k.end();
  }

  Kit.loop((dt) => { update(dt); draw(); });
})();
