(() => {
  const C = 132, OX = (960 - C * 3) / 2, OY = 78;
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  let b, turn, gen = 0, winLine;

  const winner = (bd) => { for (const l of LINES) if (bd[l[0]] && bd[l[0]] === bd[l[1]] && bd[l[1]] === bd[l[2]]) return l; return null; };
  const empties = (bd) => bd.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  const finishing = (bd, c) => empties(bd).find((i) => { bd[i] = c; const w = winner(bd); bd[i] = 0; return w; });

  // 끝까지 다 따져 보는 완벽한 수 (어려움)
  function minimax(bd, c) {
    const w = winner(bd);
    if (w) return { v: bd[w[0]] === 2 ? 10 : -10 };
    const free = empties(bd);
    if (!free.length) return { v: 0 };
    let bestMove = { v: c === 2 ? -99 : 99 };
    for (const i of free) {
      bd[i] = c;
      const r = minimax(bd, 3 - c);
      bd[i] = 0;
      if (c === 2 ? r.v > bestMove.v : r.v < bestMove.v) bestMove = { v: r.v, i };
    }
    return bestMove;
  }
  function aiPick(level) {
    const free = empties(b);
    const rand = () => free[Math.floor(Math.random() * free.length)];
    if (level === 2) return minimax(b.slice(), 2).i;
    const win = finishing(b, 2), block = finishing(b, 1);
    if (level === 0) return win !== undefined && Math.random() < 0.6 ? win : rand();
    if (win !== undefined) return win;
    if (block !== undefined) return block;
    return b[4] === 0 && Math.random() < 0.7 ? 4 : rand();
  }
  function place(i, c, api) {
    b[i] = c;
    const w = winner(b);
    if (w) { winLine = w; api.finish(c === 1 ? "win" : "lose"); }
    else if (!empties(b).length) api.finish("draw");
  }

  Kit.versus({
    id: "tictactoe-wins",
    title: "삼목",
    lines: ["○를 번갈아 놓아 세 개를 먼저 한 줄로 이으면 이겨요", "‘어려움’은 실수를 하지 않아요. 비기기만 해도 대단해요!"],
    start() { b = Array(9).fill(0); turn = 1; winLine = null; gen++; },
    click(p, api) {
      if (turn !== 1) return;
      const x = Math.floor((p.x - OX) / C), y = Math.floor((p.y - OY) / C);
      if (x < 0 || y < 0 || x > 2 || y > 2 || b[y * 3 + x]) return;
      place(y * 3 + x, 1, api);
      if (!api.playing) return;
      turn = 2;
      const g = gen;
      setTimeout(() => {
        if (g !== gen || !api.playing) return;
        place(aiPick(api.level), 2, api);
        turn = 1;
      }, 450);
    },
    onKey(e, api) {
      // 숫자 키패드 모양 (7 8 9 / 4 5 6 / 1 2 3)
      const map = { Digit7: 0, Digit8: 1, Digit9: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit1: 6, Digit2: 7, Digit3: 8, Numpad7: 0, Numpad8: 1, Numpad9: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5, Numpad1: 6, Numpad2: 7, Numpad3: 8 };
      if (e.code in map && !e.repeat) this.click({ x: OX + (map[e.code] % 3) * C + 5, y: OY + Math.floor(map[e.code] / 3) * C + 5 }, api);
    },
    draw(ctx, api) {
      const bg = ctx.createLinearGradient(0, 0, 960, 540);
      bg.addColorStop(0, "#0f3460"); bg.addColorStop(1, "#533483");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 960, 540);
      for (let i = 0; i < 9; i++) {
        const x = OX + (i % 3) * C, y = OY + Math.floor(i / 3) * C;
        ctx.fillStyle = "rgba(255,255,255,.1)";
        ctx.beginPath(); ctx.roundRect(x + 6, y + 6, C - 12, C - 12, 18); ctx.fill();
        ctx.lineWidth = 12; ctx.lineCap = "round";
        if (b[i] === 1) {
          ctx.strokeStyle = "#4dabf7";
          ctx.beginPath(); ctx.arc(x + C / 2, y + C / 2, 36, 0, 7); ctx.stroke();
        } else if (b[i] === 2) {
          ctx.strokeStyle = "#ff8787";
          ctx.beginPath(); ctx.moveTo(x + 34, y + 34); ctx.lineTo(x + C - 34, y + C - 34); ctx.moveTo(x + C - 34, y + 34); ctx.lineTo(x + 34, y + C - 34); ctx.stroke();
        }
      }
      if (winLine) {
        const c = (i) => [OX + (i % 3) * C + C / 2, OY + Math.floor(i / 3) * C + C / 2];
        ctx.strokeStyle = "#ffd43b"; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(...c(winLine[0])); ctx.lineTo(...c(winLine[2])); ctx.stroke();
      }
      if (api.playing) Kit.text(ctx, turn === 1 ? "내 차례 (○)" : "AI 차례…", 20, 110, 18, "left", "#ffd43b");
    },
  });
})();
