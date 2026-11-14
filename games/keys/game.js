(() => {
  const W = 960, H = 540;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("keys-best");
  const PAD = [
    { x: 250, y: 90, c: "#ff6b6b" }, { x: 490, y: 90, c: "#4dabf7" },
    { x: 250, y: 300, c: "#69db7c" }, { x: 490, y: 300, c: "#ffd43b" },
  ].map((p) => ({ ...p, w: 220, h: 190, glow: 0 }));

  let state = "ready"; // ready | show | input | over
  let seq, step, showI, showT, round, overAt, cheer;

  function newGame() { seq = []; round = 0; cheer = 0; nextRound(); }
  function nextRound() {
    seq.push(Math.floor(Math.random() * 4));
    state = "show"; showI = -1; showT = 0.7; step = 0;
  }
  function press(i) {
    if (state === "ready" || state === "over") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); return;
    }
    if (state !== "input" || i < 0) return;
    PAD[i].glow = 1;
    if (seq[step] !== i) {
      state = "over"; overAt = performance.now();
      if (round > best.get()) best.set(round);
      return;
    }
    step++;
    if (step === seq.length) { round++; cheer = 0.7; nextRound(); showT = 1.0; }
  }
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); const p = k.pos(e); press(state === "input" ? PAD.findIndex((b) => Kit.inside(p, b)) : 0); });
  addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const i = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad7: 0, Numpad8: 1, Numpad4: 2, Numpad5: 3, KeyQ: 0, KeyW: 1, KeyA: 2, KeyS: 3 }[e.code];
    if (i !== undefined) { e.preventDefault(); press(i); }
    else if ((e.code === "Space" || e.code === "Enter") && state !== "input" && state !== "show") { e.preventDefault(); press(0); }
  });

  function update(dt) {
    for (const p of PAD) p.glow = Math.max(0, p.glow - dt * 3.5);
    cheer = Math.max(0, cheer - dt);
    if (state !== "show") return;
    showT -= dt;
    if (showT > 0) return;
    showI++;
    if (showI >= seq.length) { state = "input"; return; }
    PAD[seq[showI]].glow = 1;
    showT = Math.max(0.28, 0.6 - seq.length * 0.02); // 길어질수록 조금씩 빨라져요
  }
  function draw() {
    k.begin("#0e1124");
    ctx.fillStyle = "#171a2e"; ctx.fillRect(0, 0, W, H);
    PAD.forEach((p, i) => {
      ctx.globalAlpha = 0.35 + p.glow * 0.65;
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 28); ctx.fill();
      ctx.globalAlpha = 1;
      if (p.glow > 0) { ctx.strokeStyle = "rgba(255,255,255," + p.glow + ")"; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 28); ctx.stroke(); }
      Kit.text(ctx, String(i + 1), p.x + 26, p.y + 38, 20, "center", "rgba(0,0,0,.35)");
    });
    const msg = state === "show" ? "잘 보세요…" : state === "input" ? "따라 눌러요! (" + step + "/" + seq.length + ")" : "";
    Kit.text(ctx, msg, 125, 280, 22, "center", "#ffd43b");
    if (cheer > 0) Kit.text(ctx, "좋아요! 👍", 835, 280, 26, "center", "#69db7c");
    Kit.hud(ctx, W, round + "단계 성공", "최고 " + best.get() + "단계");
    if (state === "ready") Kit.overlay(ctx, W, H, "기억 건반", ["불이 켜지는 순서를 잘 보고 그대로 따라 눌러요", "성공할 때마다 하나씩 길어져요 · 숫자 키 1~4", "눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "앗, 틀렸어요!", [round + "단계 성공  ·  최고 " + best.get() + "단계", "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
