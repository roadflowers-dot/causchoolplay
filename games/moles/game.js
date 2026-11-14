(() => {
  const W = 960, H = 540, TIME = 45;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("moles-best");
  const HOLES = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) HOLES.push({ x: 240 + c * 240, y: 190 + r * 130, up: 0, kind: null, stay: 0, hit: 0 });
  // 숫자 키패드 모양과 같은 배치 (7 8 9 / 4 5 6 / 1 2 3)
  const KEYMAP = { Digit7: 0, Digit8: 1, Digit9: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit1: 6, Digit2: 7, Digit3: 8,
    Numpad7: 0, Numpad8: 1, Numpad9: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5, Numpad1: 6, Numpad2: 7, Numpad3: 8 };

  let state = "ready"; // ready | play | over
  let score, left, spawnT, pops, overAt, hammer;

  function newGame() {
    score = 0; left = TIME; spawnT = 0.5; pops = []; hammer = null;
    for (const h of HOLES) { h.up = 0; h.kind = null; h.stay = 0; h.hit = 0; }
  }
  newGame();

  function whack(i, x, y) {
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); state = "play";
      return;
    }
    const h = HOLES[i];
    hammer = { x: x ?? (h ? h.x : 0), y: y ?? (h ? h.y - 40 : 0), t: 0.15 };
    if (!h || !h.kind || h.hit > 0 || h.up < 0.35) return;
    const good = h.kind === "mole";
    score = Math.max(0, score + (good ? 10 : -20));
    pops.push({ x: h.x, y: h.y - 70, text: good ? "+10" : "-20", color: good ? "#fff" : "#ff6b6b", life: 0.7 });
    h.hit = 0.3;
    h.stay = 0;
  }
  k.cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const p = k.pos(e);
    const i = HOLES.findIndex((h) => Math.abs(p.x - h.x) < 85 && p.y > h.y - 100 && p.y < h.y + 30);
    whack(i, p.x, p.y);
  });
  addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.code in KEYMAP) { e.preventDefault(); whack(KEYMAP[e.code]); }
    else if ((e.code === "Space" || e.code === "Enter") && state !== "play") { e.preventDefault(); whack(-1); }
  });

  function update(dt) {
    for (const p of pops) { p.y -= 60 * dt; p.life -= dt; }
    pops = pops.filter((p) => p.life > 0);
    if (hammer) { hammer.t -= dt; if (hammer.t <= 0) hammer = null; }
    if (state !== "play") return;

    left -= dt;
    if (left <= 0) {
      left = 0; state = "over"; overAt = performance.now();
      if (score > best.get()) best.set(score);
      return;
    }
    const pace = 1 - left / TIME; // 0 → 1 로 점점 빨라져요
    spawnT -= dt;
    if (spawnT <= 0) {
      const free = HOLES.filter((h) => !h.kind);
      if (free.length) {
        const h = free[Math.floor(Math.random() * free.length)];
        h.kind = Math.random() < 0.18 ? "hedgehog" : "mole";
        h.stay = 1.3 - pace * 0.6;
        h.hit = 0;
      }
      spawnT = 0.75 - pace * 0.4 + Math.random() * 0.2;
    }
    for (const h of HOLES) {
      if (!h.kind) continue;
      if (h.hit > 0) h.hit -= dt;
      if (h.stay > 0) { h.up = Math.min(1, h.up + dt * 7); if (h.up >= 1) h.stay -= dt; }
      else { h.up -= dt * 6; if (h.up <= 0) { h.up = 0; h.kind = null; } }
    }
  }

  function drawCritter(h) {
    const rise = h.up * 78;
    ctx.save();
    ctx.beginPath(); ctx.rect(h.x - 90, h.y - 130, 180, 130); ctx.clip(); // 구멍 아래로는 안 보이게
    const y = h.y - rise + 32;
    if (h.kind === "mole") {
      ctx.fillStyle = "#8d5b3a";
      ctx.beginPath(); ctx.ellipse(h.x, y, 44, 50, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#f3c9a5";
      ctx.beginPath(); ctx.ellipse(h.x, y + 6, 24, 18, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#ff8fa3";
      ctx.beginPath(); ctx.ellipse(h.x, y - 2, 9, 6, 0, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = "#5c4a3d";
      for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(h.x + i * 10 - 8, y - 20); ctx.lineTo(h.x + i * 11, y - 62 + Math.abs(i) * 5); ctx.lineTo(h.x + i * 10 + 8, y - 20); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(h.x, y, 46, 46, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#f0d9b5";
      ctx.beginPath(); ctx.ellipse(h.x, y + 8, 30, 26, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#3a2a20";
      ctx.beginPath(); ctx.arc(h.x, y + 6, 5, 0, 7); ctx.fill();
    }
    ctx.fillStyle = "#1c120c";
    if (h.hit > 0) {
      ctx.lineWidth = 3; ctx.strokeStyle = "#1c120c";
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(h.x + s * 16 - 5, y - 21); ctx.lineTo(h.x + s * 16 + 5, y - 11); ctx.moveTo(h.x + s * 16 + 5, y - 21); ctx.lineTo(h.x + s * 16 - 5, y - 11); ctx.stroke(); }
    } else {
      ctx.beginPath(); ctx.arc(h.x - 16, y - 16, 4.5, 0, 7); ctx.arc(h.x + 16, y - 16, 4.5, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    k.begin("#0e1124");
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#9be15d"); sky.addColorStop(1, "#3fa34d");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    for (const h of HOLES) {
      ctx.fillStyle = "#3b2414";
      ctx.beginPath(); ctx.ellipse(h.x, h.y, 80, 26, 0, 0, 7); ctx.fill();
      if (h.kind) drawCritter(h);
      ctx.fillStyle = "#2f8a3b"; // 구멍 앞쪽 풀
      ctx.beginPath(); ctx.ellipse(h.x, h.y + 20, 92, 22, 0, 0, Math.PI); ctx.fill();
    }
    if (hammer) {
      ctx.save(); ctx.translate(hammer.x + 30, hammer.y - 20); ctx.rotate(-0.9 + (0.15 - hammer.t) * 6);
      ctx.fillStyle = "#b5651d"; ctx.fillRect(-5, -10, 10, 70);
      ctx.fillStyle = "#e63946"; ctx.beginPath(); ctx.roundRect(-34, -40, 68, 36, 8); ctx.fill();
      ctx.restore();
    }
    for (const p of pops) { ctx.globalAlpha = Math.min(1, p.life * 2); Kit.text(ctx, p.text, p.x, p.y, 30, "center", p.color); }
    ctx.globalAlpha = 1;

    Kit.hud(ctx, W, "점수 " + score + "   ⏱ " + Math.ceil(left) + "초", "최고 " + best.get());
    if (state === "ready") Kit.overlay(ctx, W, H, "두더지 잡기", ["튀어나온 두더지를 눌러요 (+10점)", "가시 돋친 고슴도치는 누르면 안 돼요 (−20점)", "마우스·손가락 또는 숫자 키 1~9 · 눌러서 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "시간 끝!", ["점수 " + score + "  ·  최고 " + best.get(), "다시 하려면 눌러요"]);
    k.end();
  }

  Kit.loop((dt) => { update(dt); draw(); });
})();
