(() => {
  const W = 960, H = 540, COLS = 10, ROWS = 18, CELL = 26;
  const BX = (W - COLS * CELL) / 2, BY = 56;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("blocks-best");

  // 3칸·4칸·5칸짜리가 섞인 이 게임만의 조각들
  const SHAPES = [
    { c: "#4dabf7", m: [[1, 1, 1]] },
    { c: "#63e6be", m: [[1, 1, 1, 1]] },
    { c: "#ffd43b", m: [[1, 0], [1, 1]] },
    { c: "#ffa94d", m: [[1, 1], [1, 1]] },
    { c: "#b197fc", m: [[0, 1, 0], [1, 1, 1]] },
    { c: "#ff6b6b", m: [[1, 1, 0], [0, 1, 1]] },
    { c: "#69db7c", m: [[0, 1, 1], [1, 1, 0]] },
    { c: "#f783ac", m: [[1, 0, 0], [1, 1, 1]] },
    { c: "#74c0fc", m: [[0, 0, 1], [1, 1, 1]] },
    { c: "#e599f7", m: [[1, 0, 1], [1, 1, 1]] },
  ];
  // 화면 버튼 (휴대폰용)
  const BTN = [
    { id: "left", x: 60, y: 400, w: 100, h: 90, label: "◀" },
    { id: "right", x: 180, y: 400, w: 100, h: 90, label: "▶" },
    { id: "rotate", x: 680, y: 400, w: 100, h: 90, label: "⟳" },
    { id: "drop", x: 800, y: 400, w: 100, h: 90, label: "⤓" },
    { id: "down", x: 740, y: 300, w: 100, h: 80, label: "▼" },
  ];

  let state = "ready"; // ready | play | over
  let grid, piece, next, score, lines, level, fallT, flash;

  const rand = () => { const s = SHAPES[Math.floor(Math.random() * SHAPES.length)]; return { c: s.c, m: s.m.map((r) => r.slice()) }; };
  function spawn() {
    piece = next || rand();
    next = rand();
    piece.x = Math.floor((COLS - piece.m[0].length) / 2);
    piece.y = 0;
    if (hits(piece.m, piece.x, piece.y)) {
      state = "over";
      if (score > best.get()) best.set(score);
    }
  }
  function newGame() {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = 0; lines = 0; level = 1; fallT = 0; flash = 0; next = null;
    spawn();
  }
  newGame();

  function hits(m, px, py) {
    for (let y = 0; y < m.length; y++) {
      for (let x = 0; x < m[y].length; x++) {
        if (!m[y][x]) continue;
        const gx = px + x, gy = py + y;
        if (gx < 0 || gx >= COLS || gy >= ROWS || (gy >= 0 && grid[gy][gx])) return true;
      }
    }
    return false;
  }
  function move(dx) { if (!hits(piece.m, piece.x + dx, piece.y)) piece.x += dx; }
  function rotate() {
    const m = piece.m[0].map((_, i) => piece.m.map((r) => r[i]).reverse());
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!hits(m, piece.x + kick, piece.y)) { piece.m = m; piece.x += kick; return; }
    }
  }
  function lock() {
    piece.m.forEach((r, y) => r.forEach((v, x) => { if (v && piece.y + y >= 0) grid[piece.y + y][piece.x + x] = piece.c; }));
    const kept = grid.filter((r) => r.some((c) => !c));
    const cleared = ROWS - kept.length;
    if (cleared) {
      while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null));
      grid = kept;
      lines += cleared;
      score += [0, 100, 300, 500, 800][Math.min(cleared, 4)] * level;
      level = 1 + Math.floor(lines / 8);
      flash = 0.25;
    }
    spawn();
  }
  function stepDown() {
    if (!hits(piece.m, piece.x, piece.y + 1)) { piece.y++; return true; }
    lock();
    return false;
  }
  function hardDrop() {
    while (!hits(piece.m, piece.x, piece.y + 1)) { piece.y++; score += 1; }
    lock();
  }

  function act(id) {
    if (state !== "play") {
      if (state === "over") newGame();
      state = "play";
      return;
    }
    if (id === "left") move(-1);
    else if (id === "right") move(1);
    else if (id === "rotate") rotate();
    else if (id === "down") { if (stepDown()) score += 1; fallT = 0; }
    else if (id === "drop") { hardDrop(); fallT = 0; }
  }

  const KEYS = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "rotate", KeyW: "rotate", ArrowDown: "down", KeyS: "down", Space: "drop" };
  addEventListener("keydown", (e) => {
    const id = KEYS[e.code];
    if (!id) return;
    e.preventDefault();
    if (e.repeat && (id === "rotate" || id === "drop" || state !== "play")) return;
    act(id);
  });
  k.cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const p = k.pos(e);
    const b = BTN.find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
    act(b ? b.id : state === "play" ? "rotate" : "start");
  });

  function update(dt) {
    flash = Math.max(0, flash - dt);
    if (state !== "play") return;
    fallT += dt;
    const interval = Math.max(0.09, 0.75 - (level - 1) * 0.06);
    if (fallT >= interval) { fallT = 0; stepDown(); }
  }

  function cell(x, y, color, size) {
    const s = size || CELL;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(x + 1, y + 1, s - 2, s - 2, 5); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.3)";
    ctx.beginPath(); ctx.roundRect(x + 4, y + 4, s - 8, 4, 2); ctx.fill();
  }

  function draw() {
    k.begin("#0e1124");
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#1b2452"); bg.addColorStop(1, "#3a2466");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.roundRect(BX - 8, BY - 8, COLS * CELL + 16, ROWS * CELL + 16, 12); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.04)";
    for (let y = 0; y < ROWS; y++) for (let x = (y % 2); x < COLS; x += 2) ctx.fillRect(BX + x * CELL, BY + y * CELL, CELL, CELL);

    grid.forEach((r, y) => r.forEach((c, x) => { if (c) cell(BX + x * CELL, BY + y * CELL, c); }));

    if (state !== "ready") {
      // 떨어질 자리 미리 보기
      let gy = piece.y;
      while (!hits(piece.m, piece.x, gy + 1)) gy++;
      ctx.globalAlpha = 0.22;
      piece.m.forEach((r, y) => r.forEach((v, x) => { if (v) cell(BX + (piece.x + x) * CELL, BY + (gy + y) * CELL, piece.c); }));
      ctx.globalAlpha = 1;
      piece.m.forEach((r, y) => r.forEach((v, x) => { if (v) cell(BX + (piece.x + x) * CELL, BY + (piece.y + y) * CELL, piece.c); }));
    }
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 1.6})`; ctx.fillRect(BX, BY, COLS * CELL, ROWS * CELL); }

    // 왼쪽 정보
    Kit.text(ctx, "점수", 100, 100, 20, "left", "rgba(255,255,255,.7)", false);
    Kit.text(ctx, String(score), 100, 136, 34, "left");
    Kit.text(ctx, "줄 " + lines + "   " + level + "단계", 100, 176, 20, "left", "rgba(255,255,255,.85)", false);
    Kit.text(ctx, "최고 " + best.get(), 100, 206, 20, "left", "rgba(255,255,255,.85)", false);
    // 오른쪽: 다음 조각
    Kit.text(ctx, "다음", 700, 100, 20, "left", "rgba(255,255,255,.7)", false);
    if (next) next.m.forEach((r, y) => r.forEach((v, x) => { if (v) cell(700 + x * 24, 116 + y * 24, next.c, 24); }));

    for (const b of BTN) {
      ctx.fillStyle = "rgba(255,255,255,.12)";
      ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 18); ctx.fill();
      Kit.text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 + 15, 40, "center", "rgba(255,255,255,.85)");
    }

    if (state === "ready") Kit.overlay(ctx, W, H, "블록 쌓기", ["← → 이동, ↑ 돌리기, ↓ 내리기, 스페이스 한 번에 떨어뜨리기", "가로 한 줄을 꽉 채우면 사라져요", "화면을 누르거나 아무 키나 눌러 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "게임 끝!", ["점수 " + score + "  ·  최고 " + best.get(), "다시 하려면 눌러요"]);
    k.end();
  }

  Kit.loop((dt) => { update(dt); draw(); });
})();
