(() => {
  const C = 56, OX = (960 - C * 8) / 2, OY = 46;
  const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  const GLYPH = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
  const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]], ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const ALL = [...DIAG, ...ORTH];

  // 판은 64칸 배열. 0번이 왼쪽 위(a8). 대문자 = 흰색(나), 소문자 = 검은색(AI)
  const white = (ch) => ch >= "A" && ch <= "Z";
  const colorOf = (ch) => (white(ch) ? "w" : "b");
  const kind = (ch) => ch.toLowerCase();
  const other = (c) => (c === "w" ? "b" : "w");
  const on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

  function initial() {
    return {
      b: [..."rnbqkbnr", ..."pppppppp", ...Array(32).fill(""), ..."PPPPPPPP", ..."RNBQKBNR"],
      turn: "w", castle: { K: true, Q: true, k: true, q: true }, ep: -1,
    };
  }

  // sq 칸을 by 색이 공격하고 있는지
  function attacked(s, sq, by) {
    const b = s.b, r = sq >> 3, c = sq & 7;
    const pr = by === "w" ? r + 1 : r - 1; // 그 칸을 공격하는 폰이 서 있을 줄
    for (const dc of [-1, 1]) if (on(pr, c + dc) && b[pr * 8 + c + dc] === (by === "w" ? "P" : "p")) return true;
    for (const [dr, dc] of KNIGHT) if (on(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === (by === "w" ? "N" : "n")) return true;
    for (const [dr, dc] of ALL) {
      let rr = r + dr, cc = c + dc, dist = 1;
      const diag = dr !== 0 && dc !== 0;
      while (on(rr, cc)) {
        const p = b[rr * 8 + cc];
        if (p) {
          if (colorOf(p) === by) {
            const t = kind(p);
            if (t === "q" || (diag ? t === "b" : t === "r") || (t === "k" && dist === 1)) return true;
          }
          break;
        }
        rr += dr; cc += dc; dist++;
      }
    }
    return false;
  }

  // 규칙상 갈 수 있는 수 (자기 왕이 위험해지는지는 아직 따지지 않음)
  function gen(s, color) {
    const b = s.b, out = [];
    const add = (from, to, extra) => out.push({ from, to, cap: b[to], ...extra });
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq];
      if (!p || colorOf(p) !== color) continue;
      const r = sq >> 3, c = sq & 7, t = kind(p);
      if (t === "p") {
        const d = color === "w" ? -1 : 1, start = color === "w" ? 6 : 1, lastRow = color === "w" ? 0 : 7;
        if (on(r + d, c) && !b[(r + d) * 8 + c]) {
          add(sq, (r + d) * 8 + c, r + d === lastRow ? { promo: true } : null);
          if (r === start && !b[(r + 2 * d) * 8 + c]) add(sq, (r + 2 * d) * 8 + c, { double: true });
        }
        for (const dc of [-1, 1]) {
          if (!on(r + d, c + dc)) continue;
          const to = (r + d) * 8 + c + dc;
          if (b[to] && colorOf(b[to]) !== color) add(sq, to, r + d === lastRow ? { promo: true } : null);
          else if (to === s.ep) add(sq, to, { enPassant: true });
        }
      } else if (t === "n" || t === "k") {
        for (const [dr, dc] of t === "n" ? KNIGHT : ALL) {
          if (!on(r + dr, c + dc)) continue;
          const to = (r + dr) * 8 + c + dc;
          if (!b[to] || colorOf(b[to]) !== color) add(sq, to);
        }
        if (t === "k") {
          // 캐슬링: 왕과 룩이 움직인 적 없고, 사이가 비었고, 왕이 지나는 칸이 공격받지 않을 때
          const row = color === "w" ? 7 : 0, foe = other(color);
          if (sq === row * 8 + 4 && !attacked(s, sq, foe)) {
            if (s.castle[color === "w" ? "K" : "k"] && !b[sq + 1] && !b[sq + 2] && kind(b[sq + 3] || "") === "r"
              && !attacked(s, sq + 1, foe) && !attacked(s, sq + 2, foe)) add(sq, sq + 2, { castle: "k" });
            if (s.castle[color === "w" ? "Q" : "q"] && !b[sq - 1] && !b[sq - 2] && !b[sq - 3] && kind(b[sq - 4] || "") === "r"
              && !attacked(s, sq - 1, foe) && !attacked(s, sq - 2, foe)) add(sq, sq - 2, { castle: "q" });
          }
        }
      } else {
        for (const [dr, dc] of t === "b" ? DIAG : t === "r" ? ORTH : ALL) {
          let rr = r + dr, cc = c + dc;
          while (on(rr, cc)) {
            const to = rr * 8 + cc;
            if (!b[to]) add(sq, to);
            else { if (colorOf(b[to]) !== color) add(sq, to); break; }
            rr += dr; cc += dc;
          }
        }
      }
    }
    return out;
  }

  function apply(s, m) {
    const b = s.b.slice(), p = b[m.from], color = colorOf(p);
    const castle = { ...s.castle };
    b[m.to] = m.promo ? (color === "w" ? "Q" : "q") : p; // 폰이 끝까지 가면 퀸이 돼요
    b[m.from] = "";
    if (m.enPassant) b[m.to + (color === "w" ? 8 : -8)] = "";
    if (m.castle === "k") { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = ""; }
    if (m.castle === "q") { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = ""; }
    if (p === "K") castle.K = castle.Q = false;
    if (p === "k") castle.k = castle.q = false;
    for (const sq of [m.from, m.to]) {
      if (sq === 63) castle.K = false; if (sq === 56) castle.Q = false;
      if (sq === 7) castle.k = false; if (sq === 0) castle.q = false;
    }
    return { b, turn: other(color), castle, ep: m.double ? (m.from + m.to) / 2 : -1 };
  }

  const kingSq = (s, color) => s.b.indexOf(color === "w" ? "K" : "k");
  const inCheck = (s, color) => { const k = kingSq(s, color); return k < 0 || attacked(s, k, other(color)); };
  const legal = (s) => gen(s, s.turn).filter((m) => !inCheck(apply(s, m), s.turn));

  // 판의 점수 (검은색 = AI 기준): 기물 가치 + 가운데를 차지하면 조금 더
  function evaluate(s) {
    let v = 0;
    for (let sq = 0; sq < 64; sq++) {
      const p = s.b[sq];
      if (!p) continue;
      const t = kind(p), r = sq >> 3, c = sq & 7;
      let x = VALUE[t];
      const center = 3.5 - Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5));
      if (t === "n" || t === "b") x += center * 10;
      else if (t === "p") x += (white(p) ? 6 - r : r - 1) * 6 + (c >= 2 && c <= 5 ? center * 4 : 0);
      else if (t === "q") x += center * 2;
      v += white(p) ? -x : x;
    }
    return v;
  }
  // 몇 수 앞까지 내다보기 (왕을 잡을 수 있는 수는 무조건 최고로 침)
  function search(s, depth, alpha, beta) {
    if (depth === 0) return s.turn === "b" ? evaluate(s) : -evaluate(s);
    const list = gen(s, s.turn);
    list.sort((p, q) => (q.cap ? VALUE[kind(q.cap)] : 0) - (p.cap ? VALUE[kind(p.cap)] : 0));
    let bestV = -Infinity;
    for (const m of list) {
      if (m.cap && kind(m.cap) === "k") return 100000 + depth;
      const v = -search(apply(s, m), depth - 1, -beta, -alpha);
      if (v > bestV) bestV = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return bestV === -Infinity ? 0 : bestV;
  }
  function aiPick(level) {
    const list = legal(st);
    const depth = [1, 2, 4][level], noise = [120, 20, 4][level];
    let bestM = list[0], bestV = -Infinity;
    for (const m of list) {
      const v = -search(apply(st, m), depth - 1, -Infinity, Infinity) + Math.random() * noise;
      if (v > bestV) { bestV = v; bestM = m; }
    }
    return bestM;
  }

  let st, sel, targets, lastMove, gen2 = 0, note;

  function afterMove(api) {
    const list = legal(st);
    const check = inCheck(st, st.turn);
    note = check ? "체크!" : "";
    if (!list.length) { api.finish(!check ? "draw" : st.turn === "b" ? "win" : "lose"); return false; }
    if (st.b.filter(Boolean).length === 2) { api.finish("draw"); return false; } // 왕만 남으면 비김
    return true;
  }
  function doMove(m, api) {
    st = apply(st, m);
    lastMove = m; sel = -1; targets = [];
    return afterMove(api);
  }

  Kit.versus({
    id: "chess-wins",
    title: "체스",
    lines: ["내 말(흰색)을 누르고, 갈 곳을 눌러요", "상대 왕이 도망칠 수 없게 만들면 이겨요 (체크메이트)"],
    start() { st = initial(); sel = -1; targets = []; lastMove = null; note = ""; gen2++; },
    click(p, api) {
      if (st.turn !== "w") return;
      const c = Math.floor((p.x - OX) / C), r = Math.floor((p.y - OY) / C);
      if (!on(r, c)) { sel = -1; targets = []; return; }
      const sq = r * 8 + c;
      const m = targets.find((t) => t.to === sq);
      if (m) {
        if (!doMove(m, api)) return;
        const g = gen2;
        setTimeout(() => {
          if (g !== gen2 || !api.playing) return;
          doMove(aiPick(api.level), api);
        }, 300);
      } else if (st.b[sq] && white(st.b[sq])) {
        sel = sq;
        targets = legal(st).filter((t) => t.from === sq);
      } else { sel = -1; targets = []; }
    },
    draw(ctx, api) {
      ctx.fillStyle = "#262335"; ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = "#5c4033";
      ctx.beginPath(); ctx.roundRect(OX - 12, OY - 12, C * 8 + 24, C * 8 + 24, 12); ctx.fill();
      const checked = api.playing && inCheck(st, st.turn) ? kingSq(st, st.turn) : -1;
      for (let sq = 0; sq < 64; sq++) {
        const r = sq >> 3, c = sq & 7, x = OX + c * C, y = OY + r * C;
        ctx.fillStyle = (r + c) % 2 ? "#b58863" : "#f0d9b5";
        ctx.fillRect(x, y, C, C);
        if (lastMove && (sq === lastMove.from || sq === lastMove.to)) { ctx.fillStyle = "rgba(255, 221, 87, .5)"; ctx.fillRect(x, y, C, C); }
        if (sq === sel) { ctx.fillStyle = "rgba(77, 171, 247, .6)"; ctx.fillRect(x, y, C, C); }
        if (sq === checked) { ctx.fillStyle = "rgba(255, 77, 79, .65)"; ctx.fillRect(x, y, C, C); }
        const p = st.b[sq];
        if (p) {
          ctx.font = "46px 'Segoe UI Symbol', 'Noto Sans Symbols2', 'DejaVu Sans', sans-serif";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          const g = GLYPH[kind(p)] + "︎"; // 그림 이모지가 아니라 글자 모양으로
          ctx.lineWidth = 3; ctx.lineJoin = "round";
          ctx.strokeStyle = white(p) ? "#2b2b2b" : "#f5f5f5";
          ctx.strokeText(g, x + C / 2, y + C / 2 + 2);
          ctx.fillStyle = white(p) ? "#ffffff" : "#1e1e1e";
          ctx.fillText(g, x + C / 2, y + C / 2 + 2);
        }
      }
      for (const t of targets) {
        const x = OX + (t.to & 7) * C + C / 2, y = OY + (t.to >> 3) * C + C / 2;
        ctx.fillStyle = "rgba(34, 139, 230, .75)";
        ctx.beginPath(); ctx.arc(x, y, t.cap || t.enPassant ? 12 : 8, 0, 7); ctx.fill();
      }
      if (api.playing) Kit.text(ctx, st.turn === "w" ? "내 차례 (흰색)" : "AI가 생각 중…", 20, 110, 18, "left", "#ffd43b");
      if (note) Kit.text(ctx, note, 20, 150, 26, "left", "#ff8787");
    },
  });
})();
