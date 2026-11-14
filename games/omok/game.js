(() => {
  const N = 15, C = 32, OX = (960 - (N - 1) * C) / 2, OY = 46;
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  let b, turn, last, gen = 0, winLine;

  const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? -1 : b[y * N + x]);

  // (x, y)에 c 색 돌을 놓았다고 할 때 그 자리의 가치
  function lineScore(x, y, c) {
    let total = 0;
    for (const [dx, dy] of DIRS) {
      let n = 1, open = 0, i = 1;
      while (at(x + dx * i, y + dy * i) === c) { n++; i++; }
      if (at(x + dx * i, y + dy * i) === 0) open++;
      i = 1;
      while (at(x - dx * i, y - dy * i) === c) { n++; i++; }
      if (at(x - dx * i, y - dy * i) === 0) open++;
      if (n >= 5) total += 1000000;
      else if (open === 0) continue;
      else if (n === 4) total += open === 2 ? 100000 : 10000;
      else if (n === 3) total += open === 2 ? 5000 : 500;
      else if (n === 2) total += open === 2 ? 200 : 50;
      else total += open === 2 ? 10 : 2;
    }
    return total;
  }
  function five(i, c) {
    const x = i % N, y = Math.floor(i / N);
    for (const [dx, dy] of DIRS) {
      let a = 0, z = 0;
      while (at(x + dx * (a + 1), y + dy * (a + 1)) === c) a++;
      while (at(x - dx * (z + 1), y - dy * (z + 1)) === c) z++;
      if (a + z + 1 >= 5) return [x - dx * z, y - dy * z, x + dx * a, y + dy * a];
    }
    return null;
  }
  // 돌 근처의 빈칸만 후보로 봅니다
  function candidates() {
    const out = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (b[y * N + x]) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) if (at(x + dx, y + dy) > 0) { near = true; break; }
      if (near) out.push({ x, y, i: y * N + x });
    }
    return out.length ? out : [{ x: 7, y: 7, i: 7 * N + 7 }];
  }
  function aiPick(level) {
    const defend = [0.55, 1, 1][level];
    const list = candidates().map((c) => ({ ...c, s: lineScore(c.x, c.y, 2) * 1.05 + lineScore(c.x, c.y, 1) * defend }));
    list.sort((p, q) => q.s - p.s);
    if (level === 0 && Math.random() < 0.45) return list[Math.floor(Math.random() * Math.min(5, list.length))].i;
    if (level < 2 || list[0].s >= 100000) return list[0].i;
    // 어려움: 내가 둔 다음 상대의 가장 좋은 수까지 따져 봅니다
    let bestI = list[0].i, bestV = -Infinity;
    for (const c of list.slice(0, 8)) {
      b[c.i] = 2;
      let opp = 0;
      for (const o of candidates()) opp = Math.max(opp, lineScore(o.x, o.y, 1) + lineScore(o.x, o.y, 2) * 0.4);
      b[c.i] = 0;
      const v = c.s - opp * 0.55;
      if (v > bestV) { bestV = v; bestI = c.i; }
    }
    return bestI;
  }

  function place(i, c, api) {
    b[i] = c; last = i;
    const w = five(i, c);
    if (w) { winLine = w; api.finish(c === 1 ? "win" : "lose"); }
    else if (!b.includes(0)) api.finish("draw");
  }

  Kit.versus({
    id: "omok-wins",
    title: "오목",
    lines: ["검은 돌을 번갈아 놓아 다섯 개를 먼저 한 줄로 이으면 이겨요"],
    start() { b = Array(N * N).fill(0); turn = 1; last = -1; winLine = null; gen++; },
    click(p, api) {
      if (turn !== 1) return;
      const x = Math.round((p.x - OX) / C), y = Math.round((p.y - OY) / C);
      if (at(x, y) !== 0) return;
      place(y * N + x, 1, api);
      if (!api.playing) return;
      turn = 2;
      const g = gen;
      setTimeout(() => {
        if (g !== gen || !api.playing) return;
        place(aiPick(api.level), 2, api);
        turn = 1;
      }, 350);
    },
    draw(ctx, api) {
      ctx.fillStyle = "#2a2140"; ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = "#e3b565";
      ctx.beginPath(); ctx.roundRect(OX - 24, OY - 24, (N - 1) * C + 48, (N - 1) * C + 48, 12); ctx.fill();
      ctx.strokeStyle = "#7a5520"; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        ctx.moveTo(OX, OY + i * C); ctx.lineTo(OX + (N - 1) * C, OY + i * C);
        ctx.moveTo(OX + i * C, OY); ctx.lineTo(OX + i * C, OY + (N - 1) * C);
      }
      ctx.stroke();
      ctx.fillStyle = "#7a5520";
      for (const [x, y] of [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]]) { ctx.beginPath(); ctx.arc(OX + x * C, OY + y * C, 4, 0, 7); ctx.fill(); }

      for (let i = 0; i < N * N; i++) {
        if (!b[i]) continue;
        const x = OX + (i % N) * C, y = OY + Math.floor(i / N) * C;
        const g = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, 14);
        if (b[i] === 1) { g.addColorStop(0, "#666"); g.addColorStop(1, "#111"); }
        else { g.addColorStop(0, "#fff"); g.addColorStop(1, "#cfd3dc"); }
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
        if (i === last) { ctx.fillStyle = "#ff4d4f"; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
      }
      if (winLine) {
        ctx.strokeStyle = "#ff4d4f"; ctx.lineWidth = 5; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(OX + winLine[0] * C, OY + winLine[1] * C); ctx.lineTo(OX + winLine[2] * C, OY + winLine[3] * C); ctx.stroke();
      }
      if (api.playing) Kit.text(ctx, turn === 1 ? "내 차례 (검은 돌)" : "AI가 생각 중…", 20, 110, 18, "left", "#ffd43b");
    },
  });
})();
