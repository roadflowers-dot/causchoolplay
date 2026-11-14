(() => {
  const W = 960, H = 540, PH = 92, PW = 14, GOAL = 5, TOP = 80;
  let me, ai, ball, myPts, aiPts, pause, target;
  const keys = {};

  function serve(dir) {
    const a = (Math.random() - 0.5) * 0.9;
    ball = { x: W / 2, y: (TOP + H) / 2, vx: Math.cos(a) * 360 * dir, vy: Math.sin(a) * 360, r: 9 };
    pause = 0.8;
  }
  function bounce(paddleY, dir) {
    const t = Math.max(-1, Math.min(1, (ball.y - paddleY) / (PH / 2)));
    const sp = Math.min(900, Math.hypot(ball.vx, ball.vy) * 1.06);
    ball.vx = Math.cos(t * 1.0) * sp * dir;
    ball.vy = Math.sin(t * 1.0) * sp;
  }

  Kit.versus({
    id: "pingpong-wins",
    title: "탁구 대결",
    lines: ["마우스·손가락 또는 ↑ ↓ 키로 왼쪽 채를 움직여요", GOAL + "점을 먼저 따면 이겨요"],
    start() { me = ai = (TOP + H) / 2; myPts = aiPts = 0; target = null; serve(Math.random() < 0.5 ? 1 : -1); },
    move(p) { target = p.y; },
    click(p) { target = p.y; },
    onKey(e) { keys[e.code] = true; if (["ArrowUp", "ArrowDown"].includes(e.code)) { e.preventDefault(); target = null; } },
    onKeyUp(e) { keys[e.code] = false; },
    update(dt, api) {
      const mv = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
      if (mv) me += mv * 520 * dt;
      else if (target != null) me += Math.max(-900 * dt, Math.min(900 * dt, target - me));
      me = Math.max(TOP + PH / 2, Math.min(H - PH / 2, me));

      // AI: 공이 자기 쪽으로 올 때만 따라가고, 난이도에 따라 속도와 정확도가 달라요
      const speed = [210, 320, 440][api.level], miss = [46, 22, 6][api.level];
      const aim = ball.vx > 0 ? ball.y + Math.sin(performance.now() / 300) * miss : (TOP + H) / 2;
      ai += Math.max(-speed * dt, Math.min(speed * dt, aim - ai));
      ai = Math.max(TOP + PH / 2, Math.min(H - PH / 2, ai));

      if (pause > 0) { pause -= dt; return; }
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.y < TOP + ball.r) { ball.y = TOP + ball.r; ball.vy = Math.abs(ball.vy); }
      if (ball.y > H - ball.r) { ball.y = H - ball.r; ball.vy = -Math.abs(ball.vy); }
      if (ball.vx < 0 && ball.x - ball.r < 40 + PW && ball.x > 30 && Math.abs(ball.y - me) < PH / 2 + ball.r) { ball.x = 40 + PW + ball.r; bounce(me, 1); }
      if (ball.vx > 0 && ball.x + ball.r > W - 40 - PW && ball.x < W - 30 && Math.abs(ball.y - ai) < PH / 2 + ball.r) { ball.x = W - 40 - PW - ball.r; bounce(ai, -1); }
      if (ball.x < -20) { aiPts++; if (aiPts >= GOAL) api.finish("lose"); else serve(-1); }
      else if (ball.x > W + 20) { myPts++; if (myPts >= GOAL) api.finish("win"); else serve(1); }
    },
    draw(ctx) {
      ctx.fillStyle = "#12324a"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#1c7c54"; ctx.fillRect(0, TOP, W, H - TOP);
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 4;
      ctx.strokeRect(6, TOP + 6, W - 12, H - TOP - 12);
      ctx.setLineDash([14, 12]);
      ctx.beginPath(); ctx.moveTo(W / 2, TOP + 6); ctx.lineTo(W / 2, H - 6); ctx.stroke();
      ctx.setLineDash([]);
      Kit.text(ctx, String(myPts), W / 2 - 60, 60, 46, "center");
      Kit.text(ctx, String(aiPts), W / 2 + 60, 60, 46, "center");
      Kit.text(ctx, "나", W / 2 - 60, 20, 14, "center", "rgba(255,255,255,.7)", false);
      Kit.text(ctx, "AI", W / 2 + 60, 20, 14, "center", "rgba(255,255,255,.7)", false);
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath(); ctx.roundRect(40, me - PH / 2, PW, PH, 7); ctx.fill();
      ctx.fillStyle = "#4dabf7";
      ctx.beginPath(); ctx.roundRect(W - 40 - PW, ai - PH / 2, PW, PH, 7); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill();
    },
  });
})();
