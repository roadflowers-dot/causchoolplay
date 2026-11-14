(() => {
  const W = 960, H = 540, T = 38;
  const MAP = [
    "#####################",
    "#.........#.........#",
    "#.###.###.#.###.###.#",
    "#.#...............#.#",
    "#.#.##.###-###.##.#.#",
    "#......#     #......#",
    "####.#.# ### #.#.####",
    "#......#     #......#",
    "#.#.##.###-###.##.#.#",
    "#.#...............#.#",
    "#.###.###.#.###.###.#",
    "#.........#.........#",
    "#####################",
  ];
  const COLS = MAP[0].length, ROWS = MAP.length;
  const OX = (W - COLS * T) / 2, OY = 44;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("maze-best");
  const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

  let state = "ready"; // ready | play | over
  let cheese, left, mouse, cats, score, lives, level, pauseT, time;

  const wall = (x, y) => y < 0 || y >= ROWS || x < 0 || x >= COLS || MAP[y][x] === "#";
  const mk = (x, y, speed, color) => ({ x, y, dx: 0, dy: 0, t: 0, speed, color, want: null, face: 1 });

  function fillCheese() {
    cheese = MAP.map((r) => [...r].map((c) => c === "."));
    left = cheese.flat().filter(Boolean).length;
  }
  function place() {
    mouse = mk(1, 11, 5.4);
    const sp = 3.3 + level * 0.3;
    cats = [mk(9, 5, sp, "#ff8a3d"), mk(11, 7, sp * 0.92, "#8d99ae"), mk(10, 5, sp * 0.85, "#f783ac")].slice(0, Math.min(3, 1 + level));
    pauseT = 1;
  }
  function newGame() {
    score = 0; lives = 3; level = 1; time = 0;
    fillCheese();
    place();
  }
  newGame();

  function want(dir) {
    if (state === "over") { newGame(); state = "play"; return; }
    state = "play";
    mouse.want = DIRS[dir];
  }
  const KEYS = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down" };
  addEventListener("keydown", (e) => { if (KEYS[e.code]) { e.preventDefault(); want(KEYS[e.code]); } });
  let down = null;
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); down = { x: e.clientX, y: e.clientY, moved: false }; });
  k.cv.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.hypot(dx, dy) < 22) return;
    want(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    down = { x: e.clientX, y: e.clientY, moved: true };
  });
  addEventListener("pointerup", () => {
    if (down && !down.moved && state !== "play") want("right");
    down = null;
  });

  // 칸 가운데에 도착할 때마다 choose 가 다음 방향을 정해요
  function advance(e, dt, choose) {
    let budget = e.speed * dt;
    while (budget > 0) {
      if (e.t === 0) {
        choose(e);
        if (!e.dx && !e.dy) return;
      }
      const stepLen = Math.min(budget, 1 - e.t);
      e.t += stepLen;
      budget -= stepLen;
      if (e.t >= 1) { e.x += e.dx; e.y += e.dy; e.t = 0; }
    }
  }
  function mouseChoose(m) {
    if (cheese[m.y][m.x]) { cheese[m.y][m.x] = false; left--; score += 10; }
    if (m.want && !wall(m.x + m.want[0], m.y + m.want[1])) { m.dx = m.want[0]; m.dy = m.want[1]; }
    else if (wall(m.x + m.dx, m.y + m.dy)) { m.dx = 0; m.dy = 0; }
    if (m.dx) m.face = m.dx;
  }
  function catChoose(c) {
    const opts = Object.values(DIRS).filter(([dx, dy]) => !wall(c.x + dx, c.y + dy) && !(dx === -c.dx && dy === -c.dy));
    if (!opts.length) { c.dx = -c.dx; c.dy = -c.dy; return; }
    let pick;
    if (Math.random() < 0.28) pick = opts[Math.floor(Math.random() * opts.length)];
    else pick = opts.reduce((a, b) => (Math.hypot(c.x + a[0] - mouse.x, c.y + a[1] - mouse.y) <= Math.hypot(c.x + b[0] - mouse.x, c.y + b[1] - mouse.y) ? a : b));
    c.dx = pick[0]; c.dy = pick[1];
    if (c.dx) c.face = c.dx;
  }
  const px = (e) => e.x + e.dx * e.t, py = (e) => e.y + e.dy * e.t;

  function update(dt) {
    time += dt;
    if (state !== "play") return;
    if (pauseT > 0) { pauseT -= dt; return; }
    advance(mouse, dt, mouseChoose);
    for (const c of cats) advance(c, dt, catChoose);
    if (cats.some((c) => Math.hypot(px(c) - px(mouse), py(c) - py(mouse)) < 0.62)) {
      lives--;
      if (lives <= 0) {
        state = "over";
        if (score > best.get()) best.set(score);
      } else place();
    } else if (left === 0) {
      level++; score += 200;
      fillCheese();
      place();
    }
  }

  const sx = (v) => OX + v * T + T / 2, sy = (v) => OY + v * T + T / 2;

  function drawMouse(x, y, f) {
    ctx.fillStyle = "#c9ccd6";
    ctx.beginPath(); ctx.arc(x - f * 7, y - 11, 7, 0, 7); ctx.arc(x + f * 4, y - 13, 7, 0, 7); ctx.fill();
    ctx.fillStyle = "#f4b6c2";
    ctx.beginPath(); ctx.arc(x - f * 7, y - 11, 3.5, 0, 7); ctx.arc(x + f * 4, y - 13, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = "#dfe2ea";
    ctx.beginPath(); ctx.ellipse(x, y, 13, 11, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(x + f * 5, y - 2, 2.2, 0, 7); ctx.fill();
    ctx.fillStyle = "#f4879a"; ctx.beginPath(); ctx.arc(x + f * 12, y + 2, 2.5, 0, 7); ctx.fill();
  }
  function drawCat(x, y, f, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x - 12, y - 6); ctx.lineTo(x - 9, y - 18); ctx.lineTo(x - 2, y - 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 12, y - 6); ctx.lineTo(x + 9, y - 18); ctx.lineTo(x + 2, y - 9); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x - 5 + f * 2, y - 2, 4, 0, 7); ctx.arc(x + 5 + f * 2, y - 2, 4, 0, 7); ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(x - 5 + f * 3.5, y - 2, 2, 0, 7); ctx.arc(x + 5 + f * 3.5, y - 2, 2, 0, 7); ctx.fill();
    ctx.fillStyle = "#ff9fb0"; ctx.beginPath(); ctx.arc(x + f * 2, y + 4, 2, 0, 7); ctx.fill();
  }

  function draw() {
    k.begin("#0e1124");
    ctx.fillStyle = "#2b2140"; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = MAP[y][x], X = OX + x * T, Y = OY + y * T;
        if (c === "#") {
          ctx.fillStyle = "#6c4bd1";
          ctx.beginPath(); ctx.roundRect(X + 2, Y + 2, T - 4, T - 4, 8); ctx.fill();
          ctx.fillStyle = "#8366e6";
          ctx.beginPath(); ctx.roundRect(X + 5, Y + 5, T - 10, 6, 3); ctx.fill();
        } else if (c === "-") {
          ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(X + 4, Y + T / 2 - 2, T - 8, 4);
        }
        if (cheese[y][x]) {
          ctx.fillStyle = "#ffd43b";
          ctx.beginPath(); ctx.moveTo(X + T / 2 - 7, Y + T / 2 + 5); ctx.lineTo(X + T / 2 + 7, Y + T / 2 + 5); ctx.lineTo(X + T / 2 + 7, Y + T / 2 - 5); ctx.fill();
          ctx.fillStyle = "#e8a800"; ctx.beginPath(); ctx.arc(X + T / 2 + 3, Y + T / 2 + 2, 1.6, 0, 7); ctx.fill();
        }
      }
    }
    for (const c of cats) drawCat(sx(px(c)), sy(py(c)), c.face, c.color);
    if (!(pauseT > 0 && Math.floor(time * 8) % 2 && state === "play")) drawMouse(sx(px(mouse)), sy(py(mouse)), mouse.face);

    Kit.hud(ctx, W, "점수 " + score + "   " + level + "단계", "❤".repeat(Math.max(0, lives)) + "   최고 " + best.get());
    if (state === "ready") Kit.overlay(ctx, W, H, "치즈 미로", ["방향키·WASD 또는 화면을 밀어서 움직여요", "고양이를 피해 치즈를 모두 먹어요", "아무 방향이나 눌러 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "게임 끝!", ["점수 " + score + "  ·  최고 " + best.get(), "다시 하려면 눌러요"]);
    k.end();
  }

  Kit.loop((dt) => { update(dt); draw(); });
})();
