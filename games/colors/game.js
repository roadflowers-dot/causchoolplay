(() => {
  const W = 960, H = 540, TIME = 45;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("colors-best");
  const INK = [{ name: "빨강", c: "#ff5252" }, { name: "파랑", c: "#4d96ff" }, { name: "초록", c: "#3ecf6e" }, { name: "노랑", c: "#ffd43b" }];
  const BTN = INK.map((_, i) => ({ x: 70 + i * 210, y: 380, w: 190, h: 100 }));

  let state = "ready"; // ready | play | over
  let score, left, word, ink, flash, overAt;

  function next() {
    const prev = ink;
    word = Math.floor(Math.random() * 4);
    do { ink = Math.floor(Math.random() * 4); } while (ink === word || ink === prev); // 글자와 색은 항상 달라요
  }
  function newGame() { score = 0; left = TIME; flash = null; ink = -1; next(); }
  newGame();

  function pick(i) {
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); state = "play"; return;
    }
    if (i < 0) return;
    if (i === ink) { score++; flash = { ok: true, t: 0.2 }; next(); }
    else { left -= 2; flash = { ok: false, t: 0.3 }; }
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
    ctx.fillStyle = "#1c1f33"; ctx.fillRect(0, 0, W, H);
    if (flash) { ctx.fillStyle = flash.ok ? "rgba(105,219,124,.2)" : "rgba(255,107,107,.3)"; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.beginPath(); ctx.roundRect(130, 70, 700, 12, 6); ctx.fill();
    ctx.fillStyle = left > 8 ? "#69db7c" : "#ff6b6b"; ctx.beginPath(); ctx.roundRect(130, 70, Math.max(12, 700 * left / TIME), 12, 6); ctx.fill();

    Kit.text(ctx, "글자의 ‘색깔’을 골라요", W / 2, 140, 24, "center", "rgba(255,255,255,.7)", false);
    Kit.text(ctx, INK[word].name, W / 2, 290, 150, "center", INK[ink].c);
    BTN.forEach((b, i) => {
      ctx.fillStyle = "#f1f3ff"; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 22); ctx.fill();
      Kit.text(ctx, INK[i].name, b.x + b.w / 2, b.y + 64, 40, "center", "#1b2142");
      Kit.text(ctx, String(i + 1), b.x + 20, b.y + 28, 16, "center", "rgba(27,33,66,.45)");
    });
    Kit.hud(ctx, W, "정답 " + score + "개   ⏱ " + Math.ceil(left) + "초", "최고 " + best.get() + "개");
    if (state === "ready") Kit.overlay(ctx, W, H, "색깔 헷갈려", ["글자가 뜻하는 색이 아니라, 글자가 ‘칠해진 색’을 골라요", "버튼을 누르거나 숫자 키 1~4 · 틀리면 2초가 줄어요", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "시간 끝!", ["정답 " + score + "개  ·  최고 " + best.get() + "개", "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
