(() => {
  const W = 960, H = 540, TIME = 60, CX = 290, CY = 300, CR = 170;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("clock-best");
  const BTN = [0, 1, 2, 3].map((i) => ({ x: 540, y: 130 + i * 92, w: 340, h: 78 }));
  const COLORS = ["#74c0fc", "#8ce99a", "#ffe066", "#faa2c1"];

  let state = "ready"; // ready | play | over
  let score, left, q, flash, overAt;

  const label = (m) => { const h = Math.floor(m / 60) || 12, mm = m % 60; return h + "시" + (mm ? " " + mm + "분" : " 정각"); };
  function ask() {
    // 정각 → 30분 → 5분 단위로 점점 어려워져요
    const step = score < 4 ? 60 : score < 9 ? 30 : score < 16 ? 15 : 5;
    const prev = q ? q.ans : -1;
    let ans; do { ans = (Math.floor(Math.random() * (720 / step)) * step) % 720; } while (ans === prev);
    const opts = new Set([ans]);
    const tricks = [(ans + 60) % 720, (ans + 660) % 720, (Math.floor((ans % 60) / 5) * 60 + Math.floor(ans / 60) * 5) % 720]; // 시침·분침을 바꿔 읽은 답
    for (const t of tricks) if (opts.size < 4 && Math.random() < 0.6) opts.add(t);
    while (opts.size < 4) opts.add((Math.floor(Math.random() * (720 / step)) * step) % 720);
    q = { ans, opts: [...opts].sort(() => Math.random() - 0.5) };
  }
  function newGame() { score = 0; left = TIME; flash = null; q = null; ask(); }
  newGame();

  function pick(i) {
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); state = "play"; return;
    }
    if (i < 0) return;
    if (q.opts[i] === q.ans) { score++; flash = { ok: true, t: 0.25 }; ask(); }
    else { left -= 3; flash = { ok: false, t: 0.35 }; }
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
  function hand(angle, len, width, color) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.sin(angle) * len, CY - Math.cos(angle) * len); ctx.stroke();
  }
  function draw() {
    k.begin("#0e1124");
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#364fc7"); bg.addColorStop(1, "#5f3dc4");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    if (flash) { ctx.fillStyle = flash.ok ? "rgba(105,219,124,.25)" : "rgba(255,107,107,.3)"; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = "#ffd43b"; ctx.beginPath(); ctx.arc(CX, CY, CR + 12, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(CX, CY, CR, 0, 7); ctx.fill();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * 6.2832, r1 = CR - (i % 5 ? 8 : 16);
      ctx.strokeStyle = "#495057"; ctx.lineWidth = i % 5 ? 1.5 : 4;
      ctx.beginPath(); ctx.moveTo(CX + Math.sin(a) * r1, CY - Math.cos(a) * r1); ctx.lineTo(CX + Math.sin(a) * (CR - 2), CY - Math.cos(a) * (CR - 2)); ctx.stroke();
    }
    for (let n = 1; n <= 12; n++) { const a = (n / 12) * 6.2832; Kit.text(ctx, String(n), CX + Math.sin(a) * (CR - 38), CY - Math.cos(a) * (CR - 38) + 11, 30, "center", "#1b2142"); }
    hand(((q.ans % 720) / 720) * 6.2832, CR * 0.5, 12, "#e03131");   // 짧은 바늘 = 시
    hand(((q.ans % 60) / 60) * 6.2832, CR * 0.78, 7, "#1971c2");     // 긴 바늘 = 분
    ctx.fillStyle = "#1b2142"; ctx.beginPath(); ctx.arc(CX, CY, 9, 0, 7); ctx.fill();
    BTN.forEach((b, i) => {
      ctx.fillStyle = COLORS[i]; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 20); ctx.fill();
      Kit.text(ctx, label(q.opts[i]), b.x + b.w / 2, b.y + 51, 34, "center", "#1b2142");
      Kit.text(ctx, String(i + 1), b.x + 22, b.y + 28, 16, "center", "rgba(27,33,66,.45)");
    });
    Kit.hud(ctx, W, "정답 " + score + "개   ⏱ " + Math.ceil(left) + "초", "최고 " + best.get() + "개");
    if (state === "ready") Kit.overlay(ctx, W, H, "시계 읽기", ["시계가 가리키는 시각을 골라요 (빨간 짧은 바늘 = 시, 파란 긴 바늘 = 분)", "버튼을 누르거나 숫자 키 1~4 · 틀리면 3초가 줄어요", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "시간 끝!", ["정답 " + score + "개  ·  최고 " + best.get() + "개", "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
