(() => {
  const W = 960, H = 540, CELL = 30, COLS = W / CELL, ROWS = H / CELL;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("snake-best");

  let state = "ready"; // ready | play | over
  let snake, dir, queue, apple, score, tickT, overAt;

  function placeApple() {
    do {
      apple = { x: Math.floor(Math.random() * COLS), y: 1 + Math.floor(Math.random() * (ROWS - 1)) };
    } while (snake.some((s) => s.x === apple.x && s.y === apple.y));
  }
  function newGame() {
    snake = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
    dir = { x: 1, y: 0 };
    queue = [];
    score = 0;
    tickT = 0;
    placeApple();
  }
  newGame();

  function turn(x, y) {
    if (state === "over") {
      if (performance.now() - overAt > 500) { newGame(); state = "play"; }
      return;
    }
    state = "play";
    const last = queue.length ? queue[queue.length - 1] : dir;
    if ((last.x === x && last.y === y) || (last.x === -x && last.y === -y)) return; // 같은 방향·반대 방향은 무시
    if (queue.length < 2) queue.push({ x, y });
  }

  const KEYS = {
    ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
  };
  addEventListener("keydown", (e) => {
    if (KEYS[e.code]) { e.preventDefault(); turn(...KEYS[e.code]); }
    else if (e.code === "Space" && !e.repeat) { e.preventDefault(); turn(dir.x, dir.y); if (state === "ready") state = "play"; }
  });

  // 손가락으로 밀기
  let down = null;
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); down = { x: e.clientX, y: e.clientY }; });
  k.cv.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.hypot(dx, dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(Math.sign(dx), 0); else turn(0, Math.sign(dy));
    down = { x: e.clientX, y: e.clientY };
  });
  addEventListener("pointerup", () => {
    if (down && state !== "play") turn(dir.x, dir.y), state === "ready" && (state = "play");
    down = null;
  });

  function tick() {
    if (queue.length) dir = queue.shift();
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const grow = head.x === apple.x && head.y === apple.y;
    const body = grow ? snake : snake.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || body.some((s) => s.x === head.x && s.y === head.y)) {
      state = "over";
      overAt = performance.now();
      if (score > best.get()) best.set(score);
      return;
    }
    snake.unshift(head);
    if (grow) { score++; placeApple(); } else snake.pop();
  }

  function update(dt) {
    if (state !== "play") return;
    tickT += dt;
    const interval = Math.max(0.065, 0.15 - score * 0.003);
    while (tickT >= interval && state === "play") { tickT -= interval; tick(); }
  }

  function draw() {
    k.begin("#0e1124");
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.fillStyle = (x + y) % 2 ? "#a9dc6b" : "#b6e37a";
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
    // 사과
    const ax = apple.x * CELL + CELL / 2, ay = apple.y * CELL + CELL / 2;
    ctx.fillStyle = "#e5383b";
    ctx.beginPath(); ctx.arc(ax, ay + 2, 11, 0, 7); ctx.fill();
    ctx.fillStyle = "#2d8a4e";
    ctx.beginPath(); ctx.ellipse(ax + 5, ay - 10, 6, 3, -0.6, 0, 7); ctx.fill();

    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#2f6fdb" : i % 2 ? "#4a8cf0" : "#3f7fe6";
      ctx.beginPath(); ctx.roundRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, i === 0 ? 10 : 8); ctx.fill();
    });
    const h = snake[0], hx = h.x * CELL + CELL / 2, hy = h.y * CELL + CELL / 2;
    for (const side of [-1, 1]) {
      const ex = hx + dir.x * 5 + dir.y * side * 6, ey = hy + dir.y * 5 + dir.x * side * 6;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, ey, 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(ex + dir.x * 1.5, ey + dir.y * 1.5, 2.2, 0, 7); ctx.fill();
    }

    Kit.hud(ctx, W, "사과 " + score + "개", "최고 " + best.get() + "개");
    if (state === "ready") Kit.overlay(ctx, W, H, "꼬마 뱀", ["방향키·WASD로 움직이거나 화면을 밀어요", "벽과 내 몸에 부딪히지 않게 조심!", "아무 방향이나 눌러 시작"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "게임 끝!", ["사과 " + score + "개  ·  최고 " + best.get() + "개", "다시 하려면 눌러요"]);
    k.end();
  }

  Kit.loop((dt) => { update(dt); draw(); });
})();
