(() => {
  const W = 960, H = 540, TIME = 60;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("math-best");
  const BTN = [0, 1, 2, 3].map((i) => ({ x: 130 + (i % 2) * 360, y: 300 + Math.floor(i / 2) * 105, w: 340, h: 90 }));
  const COLORS = ["#4dabf7", "#69db7c", "#ffd43b", "#f783ac"];

  let state = "ready"; // ready | play | over
  let score, left, q, streak, flash, overAt, solved;

  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  function ask() {
    // 문제를 많이 풀수록 숫자가 커지고 곱셈이 나와요
    const lv = Math.min(4, Math.floor(solved / 5));
    const type = lv >= 2 && Math.random() < 0.4 ? "×" : Math.random() < 0.5 ? "+" : "−";
    let a, b, ans;
    if (type === "×") { a = rnd(2, 4 + lv); b = rnd(2, 9); ans = a * b; }
    else if (type === "+") { a = rnd(1, 9 + lv * 12); b = rnd(1, 9 + lv * 12); ans = a + b; }
    else { a = rnd(3, 12 + lv * 15); b = rnd(1, a - 1); ans = a - b; }
    const opts = new Set([ans]);
    while (opts.size < 4) { const o = ans + rnd(-10, 10); if (o >= 0 && o !== ans) opts.add(o); }
    q = { text: a + " " + type + " " + b, ans, opts: [...opts].sort(() => Math.random() - 0.5) };
  }
  function newGame() { score = 0; left = TIME; streak = 0; solved = 0; flash = null; ask(); }
  newGame();

  function pick(i) {
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); state = "play"; return;
    }
    if (i < 0) return;
    if (q.opts[i] === q.ans) {
      streak++; solved++;
      score += 10 + Math.min(10, streak - 1) * 2; // 연속으로 맞히면 보너스
      flash = { ok: true, t: 0.25 };
      ask();
    } else {
      streak = 0; left -= 3;
      flash = { ok: false, t: 0.35 };
    }
  }
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); const p = k.pos(e); pick(state === "play" ? BTN.findIndex((b) => Kit.inside(p, b)) : 0); });
  addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const i = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[e.code];
    if (i !== undefined) { e.preventDefault(); pick(i); }
    else if ((e.code === "Space" || e.code === "Enter") && state !== "play") { e.preventDefault(); pick(0); }
  });

  function update(dt) {
    if (flash) { flash.t -= dt; if (flash.t <= 0) flash = null; }
    if (state !== "play") return;
    left -= dt;
    if (left <= 0) { left = 0; state = "over"; overAt = performance.now(); if (score > best.get()) best.set(score); }
  }
  function draw() {
    k.begin("#0e1124");
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#1e3a5f"); bg.addColorStop(1, "#3b2a6b");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    if (flash) { ctx.fillStyle = flash.ok ? "rgba(105,219,124,.25)" : "rgba(255,107,107,.3)"; ctx.fillRect(0, 0, W, H); }

    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.roundRect(130, 70, 700, 12, 6); ctx.fill();
    ctx.fillStyle = left > 10 ? "#69db7c" : "#ff6b6b"; ctx.beginPath(); ctx.roundRect(130, 70, Math.max(12, 700 * left / TIME), 12, 6); ctx.fill();
    Kit.text(ctx, q.text + " = ?", W / 2, 210, 88, "center");
    if (streak >= 3) Kit.text(ctx, streak + "연속 정답! 🔥", W / 2, 262, 22, "center", "#ffd43b");
    BTN.forEach((b, i) => {
      ctx.fillStyle = COLORS[i]; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 20); ctx.fill();
      Kit.text(ctx, String(q.opts[i]), b.x + b.w / 2, b.y + 62, 50, "center", "#1b2142");
      Kit.text(ctx, String(i + 1), b.x + 22, b.y + 30, 18, "center", "rgba(27,33,66,.5)");
    });
    Kit.hud(ctx, W, "점수 " + score + "   ⏱ " + Math.ceil(left) + "초", "최고 " + best.get());
    if (state === "ready") Kit.overlay(ctx, W, H, "암산 달인", ["60초 동안 계산 문제를 최대한 많이 풀어요", "정답을 누르거나 숫자 키 1~4 · 틀리면 3초가 줄어요", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "시간 끝!", [solved + "문제 정답  ·  점수 " + score + "  ·  최고 " + best.get(), "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
