(() => {
  const N = 8, C = 54, OX = (960 - N * C) / 2, OY = 60;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  // 자리마다의 가치: 모서리는 아주 좋고, 모서리 바로 옆은 나빠요
  const WEIGHT = [
    100, -20, 10, 5, 5, 10, -20, 100,
    -20, -50, -2, -2, -2, -2, -50, -20,
    10, -2, 1, 1, 1, 1, -2, 10,
    5, -2, 1, 0, 0, 1, -2, 5,
    5, -2, 1, 0, 0, 1, -2, 5,
    10, -2, 1, 1, 1, 1, -2, 10,
    -20, -50, -2, -2, -2, -2, -50, -20,
    100, -20, 10, 5, 5, 10, -20, 100,
  ];
  let b, turn, gen = 0, last, note;

  function flips(bd, i, c) {
    if (bd[i]) return [];
    const x = i % N, y = Math.floor(i / N), out = [];
    for (const [dx, dy] of DIRS) {
      const line = [];
      let cx = x + dx, cy = y + dy;
      while (cx >= 0 && cy >= 0 && cx < N && cy < N && bd[cy * N + cx] === 3 - c) { line.push(cy * N + cx); cx += dx; cy += dy; }
      if (line.length && cx >= 0 && cy >= 0 && cx < N && cy < N && bd[cy * N + cx] === c) out.push(...line);
    }
    return out;
  }
  function moves(bd, c) {
    const out = [];
    for (let i = 0; i < N * N; i++) { const f = flips(bd, i, c); if (f.length) out.push({ i, f }); }
    return out;
  }
  function put(bd, m, c) { bd[m.i] = c; for (const i of m.f) bd[i] = c; }
  const count = (bd, c) => bd.filter((v) => v === c).length;

  function evaluate(bd) {
    let s = 0;
    for (let i = 0; i < N * N; i++) if (bd[i] === 2) s += WEIGHT[i]; else if (bd[i] === 1) s -= WEIGHT[i];
    return s + (moves(bd, 2).length - moves(bd, 1).length) * 4;
  }
  function search(bd, depth, alpha, beta, c) {
    const list = moves(bd, c);
    if (depth === 0) return evaluate(bd);
    if (!list.length) {
      if (!moves(bd, 3 - c).length) return (count(bd, 2) - count(bd, 1)) * 1000; // 게임 끝
      return search(bd, depth - 1, alpha, beta, 3 - c); // 둘 곳이 없으면 쉬어요
    }
    let bestV = c === 2 ? -Infinity : Infinity;
    for (const m of list) {
      const next = bd.slice();
      put(next, m, c);
      const v = search(next, depth - 1, alpha, beta, 3 - c);
      if (c === 2) { bestV = Math.max(bestV, v); alpha = Math.max(alpha, v); }
      else { bestV = Math.min(bestV, v); beta = Math.min(beta, v); }
      if (alpha >= beta) break;
    }
    return bestV;
  }
  function aiPick(level) {
    const list = moves(b, 2);
    if (level === 0) return list[Math.floor(Math.random() * list.length)];
    let bestM = list[0], bestV = -Infinity;
    for (const m of list) {
      let v;
      if (level === 1) v = WEIGHT[m.i] + m.f.length;
      else { const next = b.slice(); put(next, m, 2); v = search(next, 3, -Infinity, Infinity, 1); }
      v += Math.random() * 0.5;
      if (v > bestV) { bestV = v; bestM = m; }
    }
    return bestM;
  }

  function end(api) {
    const me = count(b, 1), ai = count(b, 2);
    api.finish(me > ai ? "win" : me < ai ? "lose" : "draw");
  }
  function aiTurn(api) {
    turn = 2;
    const g = gen;
    setTimeout(() => {
      if (g !== gen || !api.playing) return;
      const m = aiPick(api.level);
      put(b, m, 2); last = m.i; note = "";
      if (moves(b, 1).length) turn = 1;
      else if (moves(b, 2).length) { note = "내가 둘 곳이 없어서 한 번 쉬어요"; aiTurn(api); }
      else end(api);
    }, 550);
  }

  Kit.versus({
    id: "reversi-wins",
    title: "리버시",
    lines: ["내 돌 사이에 낀 상대 돌을 모두 뒤집어요", "끝났을 때 돌이 더 많은 쪽이 이겨요"],
    start() {
      b = Array(N * N).fill(0);
      b[27] = 2; b[28] = 1; b[35] = 1; b[36] = 2;
      turn = 1; last = -1; note = ""; gen++;
    },
    click(p, api) {
      if (turn !== 1) return;
      const x = Math.floor((p.x - OX) / C), y = Math.floor((p.y - OY) / C);
      if (x < 0 || y < 0 || x >= N || y >= N) return;
      const f = flips(b, y * N + x, 1);
      if (!f.length) return;
      put(b, { i: y * N + x, f }, 1); last = y * N + x; note = "";
      if (moves(b, 2).length) aiTurn(api);
      else if (moves(b, 1).length) note = "AI가 둘 곳이 없어서 한 번 더 둬요";
      else end(api);
    },
    draw(ctx, api) {
      ctx.fillStyle = "#1b2a41"; ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = "#0b3d2c";
      ctx.beginPath(); ctx.roundRect(OX - 12, OY - 12, N * C + 24, N * C + 24, 14); ctx.fill();
      const hints = api.playing && turn === 1 ? new Set(moves(b, 1).map((m) => m.i)) : new Set();
      for (let i = 0; i < N * N; i++) {
        const x = OX + (i % N) * C, y = OY + Math.floor(i / N) * C;
        ctx.fillStyle = (i % N + Math.floor(i / N)) % 2 ? "#2d9d6b" : "#34ab76";
        ctx.fillRect(x + 1, y + 1, C - 2, C - 2);
        if (b[i]) {
          const g = ctx.createRadialGradient(x + C / 2 - 6, y + C / 2 - 7, 2, x + C / 2, y + C / 2, 22);
          if (b[i] === 1) { g.addColorStop(0, "#666"); g.addColorStop(1, "#111"); }
          else { g.addColorStop(0, "#fff"); g.addColorStop(1, "#cfd3dc"); }
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x + C / 2, y + C / 2, 21, 0, 7); ctx.fill();
          if (i === last) { ctx.fillStyle = "#ff4d4f"; ctx.beginPath(); ctx.arc(x + C / 2, y + C / 2, 5, 0, 7); ctx.fill(); }
        } else if (hints.has(i)) {
          ctx.fillStyle = "rgba(0,0,0,.25)";
          ctx.beginPath(); ctx.arc(x + C / 2, y + C / 2, 7, 0, 7); ctx.fill();
        }
      }
      Kit.text(ctx, "● 나  " + count(b, 1), 20, 150, 22, "left", "#fff");
      Kit.text(ctx, "○ AI  " + count(b, 2), 20, 182, 22, "left", "#fff");
      if (api.playing) Kit.text(ctx, turn === 1 ? "내 차례 (검은 돌)" : "AI가 생각 중…", 20, 110, 18, "left", "#ffd43b");
      if (note) Kit.text(ctx, note, 480, 524, 18, "center", "#ffd43b");
    },
  });
})();
