(() => {
  const W = 960, H = 540, COLS = 12, ROWS = 8, C = 52, OX = (W - COLS * C) / 2, OY = 76;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("treasure-best");
  const NUM = ["", "#4dabf7", "#51cf66", "#ff6b6b", "#b197fc", "#ffa94d", "#22b8cf", "#f783ac", "#adb5bd"];
  const FLAG = { x: 20, y: 250, w: 120, h: 70 };

  let state = "ready"; // ready | play | over
  let traps, open, flags, placed, score, round, flagMode, overAt, hitAt;

  const around = (i) => {
    const x = i % COLS, y = Math.floor(i / COLS), out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && x + dx >= 0 && y + dy >= 0 && x + dx < COLS && y + dy < ROWS) out.push((y + dy) * COLS + x + dx);
    }
    return out;
  };
  const count = (i) => around(i).filter((j) => traps.has(j)).length;
  function board() { traps = new Set(); open = new Set(); flags = new Set(); placed = false; hitAt = -1; }
  function newGame() { score = 0; round = 1; flagMode = false; board(); }
  newGame();

  // 처음 누른 칸과 그 둘레에는 함정을 두지 않아요
  function place(first) {
    const safe = new Set([first, ...around(first)]);
    const n = Math.min(26, 10 + round * 2);
    while (traps.size < n) { const i = Math.floor(Math.random() * COLS * ROWS); if (!safe.has(i)) traps.add(i); }
    placed = true;
  }
  function reveal(i) {
    const stack = [i];
    while (stack.length) {
      const c = stack.pop();
      if (open.has(c) || flags.has(c)) continue;
      open.add(c); score++;
      if (count(c) === 0) stack.push(...around(c));
    }
  }
  function click(i, flag) {
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 700) return;
      newGame(); state = "play"; return;
    }
    if (i < 0 || open.has(i)) return;
    if (flag) { if (flags.has(i)) flags.delete(i); else flags.add(i); return; }
    if (flags.has(i)) return;
    if (!placed) place(i);
    if (traps.has(i)) {
      hitAt = i; state = "over"; overAt = performance.now();
      if (score > best.get()) best.set(score);
      return;
    }
    reveal(i);
    if (open.size === COLS * ROWS - traps.size) { score += 20; round++; board(); } // 다 찾으면 다음 판
  }
  const cell = (p) => { const x = Math.floor((p.x - OX) / C), y = Math.floor((p.y - OY) / C); return x >= 0 && y >= 0 && x < COLS && y < ROWS ? y * COLS + x : -1; };
  k.cv.addEventListener("contextmenu", (e) => e.preventDefault());
  k.cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const p = k.pos(e);
    if (state === "play" && Kit.inside(p, FLAG)) { flagMode = !flagMode; return; }
    click(state === "play" ? cell(p) : 0, e.button === 2 || flagMode);
  });
  addEventListener("keydown", (e) => {
    if (e.code === "KeyF" && state === "play") flagMode = !flagMode;
    else if ((e.code === "Space" || e.code === "Enter") && state !== "play" && !e.repeat) { e.preventDefault(); click(0); }
  });

  function draw() {
    k.begin("#0e1124");
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#f8e3a1"); bg.addColorStop(1, "#e9b872");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < COLS * ROWS; i++) {
      const x = OX + (i % COLS) * C, y = OY + Math.floor(i / COLS) * C;
      const shown = open.has(i) || (state === "over" && traps.has(i));
      ctx.fillStyle = shown ? (i === hitAt ? "#ff8787" : "#fff4d6") : (i % COLS + Math.floor(i / COLS)) % 2 ? "#c98f4a" : "#d39a55";
      ctx.beginPath(); ctx.roundRect(x + 2, y + 2, C - 4, C - 4, 8); ctx.fill();
      if (shown && traps.has(i)) Kit.text(ctx, "🕳️", x + C / 2, y + C / 2 + 10, 26, "center");
      else if (shown) { const n = count(i); if (n) Kit.text(ctx, String(n), x + C / 2, y + C / 2 + 10, 28, "center", NUM[n]); }
      else if (flags.has(i)) Kit.text(ctx, "🚩", x + C / 2, y + C / 2 + 10, 24, "center");
    }
    ctx.fillStyle = flagMode ? "#ff6b6b" : "rgba(0,0,0,.25)";
    ctx.beginPath(); ctx.roundRect(FLAG.x, FLAG.y, FLAG.w, FLAG.h, 16); ctx.fill();
    Kit.text(ctx, "🚩 깃발", FLAG.x + FLAG.w / 2, FLAG.y + 32, 20, "center");
    Kit.text(ctx, flagMode ? "켜짐" : "꺼짐", FLAG.x + FLAG.w / 2, FLAG.y + 56, 15, "center", "#fff", false);
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 4;
    Kit.text(ctx, "함정 " + (placed ? traps.size - flags.size : "?") + "개", 80, 220, 18, "center");
    ctx.restore();
    Kit.hud(ctx, W, "점수 " + score + "   " + round + "번째 섬", "최고 " + best.get());
    if (state === "ready") Kit.overlay(ctx, W, H, "보물 찾기", ["칸을 눌러 땅을 파요. 숫자는 둘레 8칸에 숨은 함정의 개수예요", "함정 같은 칸은 깃발(오른쪽 클릭 · F 키 · 깃발 버튼)로 표시해요", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "함정에 빠졌어요!", ["점수 " + score + "  ·  최고 " + best.get(), "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop(() => draw());
})();
