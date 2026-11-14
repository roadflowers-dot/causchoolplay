(() => {
  const COLS = 7, ROWS = 6, C = 66, OX = (960 - COLS * C) / 2, OY = 100;
  const ORDER = [3, 2, 4, 1, 5, 0, 6]; // 가운데 줄부터 살펴보면 더 빨리 좋은 수를 찾아요
  // 네 칸이 한 줄이 되는 모든 경우
  const WINDOWS = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const cells = [];
      for (let i = 0; i < 4; i++) {
        const rr = r + dr * i, cc = c + dc * i;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
        cells.push(rr * COLS + cc);
      }
      if (cells.length === 4) WINDOWS.push(cells);
    }
  }
  let b, turn, gen = 0, winLine, hover, falling;

  const rowFor = (bd, c) => { for (let r = ROWS - 1; r >= 0; r--) if (!bd[r * COLS + c]) return r; return -1; };
  const won = (bd, p) => WINDOWS.find((w) => bd[w[0]] === p && bd[w[1]] === p && bd[w[2]] === p && bd[w[3]] === p);
  const full = (bd) => bd.every(Boolean);

  function evaluate(bd) {
    let s = 0;
    for (let r = 0; r < ROWS; r++) if (bd[r * COLS + 3] === 2) s += 3; else if (bd[r * COLS + 3] === 1) s -= 3;
    for (const w of WINDOWS) {
      let a = 0, p = 0;
      for (const i of w) { if (bd[i] === 2) a++; else if (bd[i] === 1) p++; }
      if (a && p) continue;
      if (a === 3) s += 50; else if (a === 2) s += 6;
      if (p === 3) s -= 60; else if (p === 2) s -= 6;
    }
    return s;
  }
  function search(bd, depth, alpha, beta, me) {
    if (won(bd, 2)) return 100000 + depth;
    if (won(bd, 1)) return -100000 - depth;
    if (depth === 0 || full(bd)) return evaluate(bd);
    let bestV = me ? -Infinity : Infinity;
    for (const c of ORDER) {
      const r = rowFor(bd, c);
      if (r < 0) continue;
      bd[r * COLS + c] = me ? 2 : 1;
      const v = search(bd, depth - 1, alpha, beta, !me);
      bd[r * COLS + c] = 0;
      if (me) { bestV = Math.max(bestV, v); alpha = Math.max(alpha, v); }
      else { bestV = Math.min(bestV, v); beta = Math.min(beta, v); }
      if (alpha >= beta) break;
    }
    return bestV;
  }
  function aiPick(level) {
    const open = ORDER.filter((c) => rowFor(b, c) >= 0);
    if (level === 0 && Math.random() < 0.35) return open[Math.floor(Math.random() * open.length)];
    const depth = [2, 4, 6][level];
    let bestC = open[0], bestV = -Infinity;
    for (const c of open) {
      const r = rowFor(b, c);
      b[r * COLS + c] = 2;
      const v = search(b, depth - 1, -Infinity, Infinity, false) + Math.random() * 0.5;
      b[r * COLS + c] = 0;
      if (v > bestV) { bestV = v; bestC = c; }
    }
    return bestC;
  }
  function drop(c, p, api) {
    const r = rowFor(b, c);
    if (r < 0) return false;
    b[r * COLS + c] = p;
    falling = { i: r * COLS + c, y: -C };
    const w = won(b, p);
    if (w) { winLine = w; api.finish(p === 1 ? "win" : "lose"); }
    else if (full(b)) api.finish("draw");
    return true;
  }
  function play(c, api) {
    if (turn !== 1 || c < 0 || c >= COLS || !drop(c, 1, api) || !api.playing) return;
    turn = 2;
    const g = gen;
    setTimeout(() => {
      if (g !== gen || !api.playing) return;
      drop(aiPick(api.level), 2, api);
      turn = 1;
    }, 450);
  }

  Kit.versus({
    id: "four-wins",
    title: "사목",
    lines: ["줄을 골라 말을 떨어뜨려요", "가로·세로·대각선으로 네 개를 먼저 이으면 이겨요"],
    start() { b = Array(COLS * ROWS).fill(0); turn = 1; winLine = null; hover = 3; falling = null; gen++; },
    move(p) { hover = Math.max(0, Math.min(COLS - 1, Math.floor((p.x - OX) / C))); },
    click(p, api) { play(Math.floor((p.x - OX) / C), api); },
    onKey(e, api) {
      if (e.code === "ArrowLeft") { e.preventDefault(); hover = Math.max(0, hover - 1); }
      else if (e.code === "ArrowRight") { e.preventDefault(); hover = Math.min(COLS - 1, hover + 1); }
      else if ((e.code === "Space" || e.code === "Enter" || e.code === "ArrowDown") && !e.repeat) { e.preventDefault(); play(hover, api); }
    },
    update(dt) { if (falling) { falling.y += dt * 1500; } },
    draw(ctx, api) {
      const bg = ctx.createLinearGradient(0, 0, 0, 540);
      bg.addColorStop(0, "#16213e"); bg.addColorStop(1, "#0f3460");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 960, 540);
      if (api.playing && turn === 1) {
        ctx.fillStyle = "#ff6b6b";
        ctx.beginPath(); ctx.arc(OX + hover * C + C / 2, OY - 34, 24, 0, 7); ctx.fill();
      }
      ctx.fillStyle = "#3d5af1";
      ctx.beginPath(); ctx.roundRect(OX - 10, OY - 10, COLS * C + 20, ROWS * C + 20, 18); ctx.fill();
      for (let i = 0; i < COLS * ROWS; i++) {
        const x = OX + (i % COLS) * C + C / 2;
        let y = OY + Math.floor(i / COLS) * C + C / 2;
        ctx.fillStyle = "#101a3a";
        ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill();
        if (!b[i]) continue;
        if (falling && falling.i === i) { if (OY + falling.y < y) y = Math.max(OY - 34, OY + falling.y); else falling = null; }
        ctx.fillStyle = b[i] === 1 ? "#ff6b6b" : "#ffd43b";
        ctx.beginPath(); ctx.arc(x, y, 25, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.25)";
        ctx.beginPath(); ctx.arc(x - 7, y - 8, 8, 0, 7); ctx.fill();
      }
      if (winLine) {
        const c = (i) => [OX + (i % COLS) * C + C / 2, OY + Math.floor(i / COLS) * C + C / 2];
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 8; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(...c(winLine[0])); ctx.lineTo(...c(winLine[3])); ctx.stroke();
      }
      if (api.playing) Kit.text(ctx, turn === 1 ? "내 차례 (빨강)" : "AI가 생각 중…", 20, 110, 18, "left", "#ffd43b");
    },
  });
})();
