(() => {
  const W = 960, H = 540, BH = 34, BASE = H - 70;
  const k = Kit.canvas(W, H), ctx = k.ctx;
  const best = Kit.best("tower-best");

  let state = "ready"; // ready | play | over
  let stack, cur, dir, speed, cam, falls, perfect, overAt, lo, hi;

  const hue = (i) => `hsl(${(200 + i * 14) % 360} 75% 62%)`;
  function next() {
    const top = stack[stack.length - 1];
    dir = stack.length % 2 ? 1 : -1;
    // 탑 양옆으로 일정한 거리 안에서만 왔다 갔다 해요
    lo = top.x - 330; hi = top.x + 330;
    cur = { x: dir > 0 ? lo : hi, w: top.w };
    speed = Math.min(620, 260 + stack.length * 11);
  }
  function newGame() { stack = [{ x: W / 2 - 130, w: 260 }]; falls = []; cam = 0; perfect = 0; next(); }
  newGame();

  function drop() {
    if (state !== "play") {
      if (state === "over" && performance.now() - overAt < 600) return;
      newGame(); state = "play"; return;
    }
    const top = stack[stack.length - 1];
    let l = Math.max(cur.x, top.x), r = Math.min(cur.x + cur.w, top.x + top.w);
    const y = BASE - stack.length * BH;
    if (r - l <= 0) {
      falls.push({ x: cur.x, w: cur.w, y, vy: 0, c: hue(stack.length) });
      state = "over"; overAt = performance.now();
      const s = stack.length - 1;
      if (s > best.get()) best.set(s);
      return;
    }
    if (Math.abs(cur.x - top.x) < 7) { l = top.x; r = top.x + top.w; perfect = 1; } // 거의 딱 맞으면 그대로!
    else {
      // 튀어나온 부분은 잘려서 떨어져요
      if (cur.x < top.x) falls.push({ x: cur.x, w: top.x - cur.x, y, vy: 0, c: hue(stack.length) });
      else falls.push({ x: top.x + top.w, w: cur.x + cur.w - top.x - top.w, y, vy: 0, c: hue(stack.length) });
    }
    stack.push({ x: l, w: r - l });
    next();
  }
  addEventListener("keydown", (e) => { if ((e.code === "Space" || e.code === "Enter" || e.code === "ArrowDown") && !e.repeat) { e.preventDefault(); drop(); } });
  k.cv.addEventListener("pointerdown", (e) => { e.preventDefault(); drop(); });

  function update(dt) {
    perfect = Math.max(0, perfect - dt * 1.5);
    for (const f of falls) { f.vy += 1400 * dt; f.y += f.vy * dt; }
    falls = falls.filter((f) => f.y - cam < H + 100);
    const want = Math.max(0, (stack.length - 7) * BH);
    cam += (want - cam) * Math.min(1, dt * 6);
    if (state !== "play") return;
    cur.x += dir * speed * dt;
    if (cur.x > hi) { cur.x = hi; dir = -1; } else if (cur.x < lo) { cur.x = lo; dir = 1; }
  }
  function block(x, y, w, c) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, w, BH - 2, 6); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.fillRect(x + 4, y + 4, Math.max(0, w - 8), 4);
  }
  function draw() {
    k.begin("#0e1124");
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#1e3c72"); sky.addColorStop(1, "#6dd5ed");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#2f9e44"; ctx.fillRect(0, BASE + BH + cam, W, H);
    stack.forEach((b, i) => block(b.x, BASE - i * BH + cam, b.w, hue(i)));
    for (const f of falls) block(f.x, f.y + cam, f.w, f.c);
    if (state === "play") block(cur.x, BASE - stack.length * BH + cam, cur.w, hue(stack.length));
    if (perfect > 0) { ctx.globalAlpha = perfect; Kit.text(ctx, "딱 맞았어요! ✨", W / 2, 150, 34, "center", "#fff3bf"); ctx.globalAlpha = 1; }
    Kit.hud(ctx, W, (stack.length - 1) + "층", "최고 " + best.get() + "층");
    if (state === "ready") Kit.overlay(ctx, W, H, "탑 쌓기", ["움직이는 블록이 아래 블록 위에 왔을 때 눌러요", "튀어나온 부분은 잘려 나가서 점점 좁아져요", "화면을 누르거나 스페이스 키로 시작!"]);
    else if (state === "over") Kit.overlay(ctx, W, H, "와르르!", [(stack.length - 1) + "층  ·  최고 " + best.get() + "층", "다시 하려면 눌러요"]);
    k.end();
  }
  Kit.loop((dt) => { update(dt); draw(); });
})();
