(() => {
  const W = 960, H = 540;
  const COLS = 6, ROWS = 4, CW = 118, CH = 100, GAP = 12;
  const LEFT = (W - (COLS * CW + (COLS - 1) * GAP)) / 2, TOP = 76;
  const FACES = ["🐶", "🐱", "🦊", "🐼", "🐸", "🐵", "🦁", "🐰", "🐧", "🐙", "🦄", "🐝"];
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("memory-best"); // 가장 적게 뒤집은 횟수 (0 = 기록 없음)

  let state = "ready"; // ready | play | won
  let cards, open, moves, found, time, waitT;

  function newGame() {
    const deck = [...FACES, ...FACES];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    cards = deck.map((face, i) => ({
      face, up: false, done: false, flip: 0, pop: 0,
      x: LEFT + (i % COLS) * (CW + GAP), y: TOP + Math.floor(i / COLS) * (CH + GAP),
    }));
    open = []; moves = 0; found = 0; time = 0; waitT = 0;
  }
  newGame();

  function closePair() {
    for (const c of open) c.up = false;
    open = [];
    waitT = 0;
  }

  function click(p) {
    if (state === "won") { newGame(); state = "play"; return; }
    if (state === "ready") { state = "play"; return; }
    if (waitT > 0) closePair(); // 기다리지 않고 바로 다음 카드를 눌러도 돼요
    const c = cards.find((c) => p.x >= c.x && p.x <= c.x + CW && p.y >= c.y && p.y <= c.y + CH);
    if (!c || c.up || c.done) return;
    c.up = true;
    open.push(c);
    if (open.length < 2) return;
    moves++;
    if (open[0].face === open[1].face) {
      for (const o of open) { o.done = true; o.pop = 1; }
      open = [];
      found++;
      if (found === FACES.length) {
        state = "won";
        if (!best.get() || moves < best.get()) best.set(moves);
      }
    } else {
      waitT = 0.9;
    }
  }
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); click(k.pos(e)); });
  addEventListener("keydown", (e) => {
    if ((e.code === "Space" || e.code === "Enter") && state !== "play") { e.preventDefault(); click({ x: -1, y: -1 }); }
  });

  function update(dt) {
    if (state === "play") time += dt;
    if (waitT > 0) { waitT -= dt; if (waitT <= 0) closePair(); }
    for (const c of cards) {
      const target = c.up || c.done ? 1 : 0;
      c.flip += Math.max(-dt * 7, Math.min(dt * 7, target - c.flip));
      c.pop = Math.max(0, c.pop - dt * 3);
    }
  }

  function draw() {
    k.begin("#0e1124");
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#3b2a7a"); bg.addColorStop(1, "#7a3b8f");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    for (const c of cards) {
      // flip 0 → 뒷면, 1 → 앞면. 가운데(0.5)에서 납작해지며 뒤집혀요
      const front = c.flip > 0.5;
      const sx = Math.max(0.04, Math.abs(c.flip * 2 - 1)) * (1 + c.pop * 0.12);
      ctx.save();
      ctx.translate(c.x + CW / 2, c.y + CH / 2);
      ctx.scale(sx, 1 + c.pop * 0.12);
      ctx.globalAlpha = c.done && c.pop === 0 ? 0.55 : 1;
      ctx.fillStyle = front ? "#ffffff" : "#ffc531";
      ctx.beginPath(); ctx.roundRect(-CW / 2, -CH / 2, CW, CH, 14); ctx.fill();
      if (front) {
        ctx.font = "58px serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#000";
        ctx.fillText(c.face, 0, 4);
      } else {
        ctx.fillStyle = "#ffe08a";
        ctx.beginPath(); ctx.roundRect(-CW / 2 + 10, -CH / 2 + 10, CW - 20, CH - 20, 9); ctx.fill();
        Kit.text(ctx, "?", 0, 18, 50, "center", "#c98a00");
      }
      ctx.restore();
    }

    const sec = Math.floor(time);
    Kit.hud(ctx, W, "뒤집기 " + moves + "번   " + Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"),
      best.get() ? "최고 " + best.get() + "번" : "짝 " + found + "/" + FACES.length);

    if (state === "ready") Kit.overlay(ctx, W, H, "짝 맞추기", ["카드를 두 장씩 뒤집어 같은 그림을 찾아요", "적게 뒤집을수록 좋아요", "화면을 눌러 시작!"]);
    else if (state === "won") Kit.overlay(ctx, W, H, "모두 찾았어요! 🎉", [moves + "번 만에 성공  ·  최고 " + best.get() + "번", "다시 하려면 눌러요"]);
    k.end();
  }

  Kit.loop((dt) => { update(dt); draw(); });
})();
