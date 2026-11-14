(() => {
  const cv = document.getElementById("c");
  const ctx = cv.getContext("2d");
  const W = 960, H = 540, GROUND = 430, R = 22;
  const GRAVITY = 2600, JUMP = 900, PX = 180;

  let state = "ready"; // ready | play | dead
  let star, obstacles, sparks, speed, dist, nextGap, best, bgT, deadAt;
  try { best = Number(localStorage.getItem("star-run-best")) || 0; } catch { best = 0; }

  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = cv.clientWidth * dpr;
    cv.height = cv.clientHeight * dpr;
  }
  addEventListener("resize", fit);
  fit();

  function reset() {
    star = { y: GROUND - R, vy: 0, jumps: 0, rot: 0 };
    obstacles = [];
    sparks = [];
    speed = 380;
    dist = 0;
    nextGap = 500;
    bgT = 0;
  }
  reset();

  function spawn() {
    const kind = Math.random();
    const x = W + 60;
    if (kind < 0.45) {
      obstacles.push({ x, w: 34, h: 46, type: "cone" });
    } else if (kind < 0.75) {
      obstacles.push({ x, w: 50, h: 82, type: "cactus" });
    } else if (kind < 0.9) {
      obstacles.push({ x, w: 34, h: 46, type: "cone" }, { x: x + 44, w: 34, h: 46, type: "cone" });
    } else {
      obstacles.push({ x, w: 60, h: 34, type: "cloud", fly: 110 }); // 낮게 뜬 먹구름: 뛰지 말고 지나가기
    }
    nextGap = 330 + Math.random() * 300 + speed * 0.35;
  }

  function press() {
    if (state === "ready") { state = "play"; jump(); return; }
    if (state === "dead") {
      if (performance.now() - deadAt > 450) { reset(); state = "play"; }
      return;
    }
    jump();
  }
  function jump() {
    if (star.jumps < 2) {
      star.vy = -JUMP * (star.jumps ? 0.85 : 1);
      star.jumps++;
      for (let i = 0; i < 6; i++) sparks.push({ x: PX, y: star.y + R, vx: -80 - Math.random() * 160, vy: -Math.random() * 120, life: 0.5 });
    }
  }
  addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); if (!e.repeat) press(); }
  });
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); press(); });

  function hit(o) {
    const top = o.fly ? GROUND - o.fly - o.h : GROUND - o.h;
    const cx = Math.max(o.x + 5, Math.min(PX, o.x + o.w - 5));
    const cy = Math.max(top + 5, Math.min(star.y, top + o.h));
    const dx = PX - cx, dy = star.y - cy;
    return dx * dx + dy * dy < (R - 5) * (R - 5);
  }

  function update(dt) {
    bgT += dt;
    if (state !== "play") return;
    speed += dt * 7;
    dist += speed * dt;
    star.vy += GRAVITY * dt;
    star.y += star.vy * dt;
    if (star.y >= GROUND - R) { star.y = GROUND - R; star.vy = 0; star.jumps = 0; }
    star.rot += dt * (star.jumps ? 9 : 5);

    nextGap -= speed * dt;
    if (nextGap <= 0) spawn();
    for (const o of obstacles) o.x -= speed * dt;
    obstacles = obstacles.filter((o) => o.x + o.w > -20);
    for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
    sparks = sparks.filter((s) => s.life > 0);

    if (obstacles.some(hit)) {
      state = "dead";
      deadAt = performance.now();
      const score = Math.floor(dist / 10);
      if (score > best) { best = score; try { localStorage.setItem("star-run-best", String(best)); } catch {} }
    }
  }

  function drawStar(x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 ? r * 0.5 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = "#ffd84a";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#f29b1d";
    ctx.stroke();
    ctx.restore();
    // 얼굴은 돌지 않게
    ctx.fillStyle = "#4a2d00";
    ctx.beginPath(); ctx.arc(x - 5, y - 2, 2.5, 0, 7); ctx.arc(x + 5, y - 2, 2.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y + 3, 4, 0.1 * Math.PI, 0.9 * Math.PI); ctx.lineWidth = 1.8; ctx.strokeStyle = "#4a2d00"; ctx.stroke();
  }

  function drawObstacle(o) {
    const base = GROUND;
    if (o.type === "cone") {
      ctx.fillStyle = "#ff7a3d";
      ctx.beginPath(); ctx.moveTo(o.x + o.w / 2, base - o.h); ctx.lineTo(o.x + o.w, base); ctx.lineTo(o.x, base); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(o.x + o.w * 0.27, base - o.h * 0.55, o.w * 0.46, 7);
    } else if (o.type === "cactus") {
      ctx.fillStyle = "#3fbf7f";
      rr(o.x + 16, base - o.h, 18, o.h, 9);
      rr(o.x, base - o.h * 0.7, 12, 30, 6); rr(o.x, base - o.h * 0.45, 22, 10, 5);
      rr(o.x + 38, base - o.h * 0.85, 12, 34, 6); rr(o.x + 28, base - o.h * 0.55, 22, 10, 5);
    } else {
      const y = base - o.fly - o.h;
      ctx.fillStyle = "#8c96b8";
      ctx.beginPath();
      ctx.arc(o.x + 16, y + 20, 14, 0, 7); ctx.arc(o.x + 32, y + 14, 16, 0, 7); ctx.arc(o.x + 46, y + 21, 13, 0, 7);
      ctx.fill();
      ctx.strokeStyle = "#ffe14a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(o.x + 32, y + 30); ctx.lineTo(o.x + 26, y + 42); ctx.lineTo(o.x + 34, y + 42); ctx.lineTo(o.x + 28, y + 54); ctx.stroke();
    }
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }

  function draw() {
    const s = Math.min(cv.width / W, cv.height / H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0e1533";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(s, 0, 0, s, (cv.width - W * s) / 2, (cv.height - H * s) / 2);

    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, "#131c47"); sky.addColorStop(1, "#3a3f8f");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND);

    // 배경 별
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 40; i++) {
      const x = ((i * 137.5 - dist * 0.05) % W + W) % W;
      const y = (i * 71) % (GROUND - 80) + 20;
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(bgT * 2 + i);
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
    // 언덕
    ctx.fillStyle = "#2a2f73";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 300 - dist * 0.2) % 1500 + 1500) % 1500 - 250;
      ctx.beginPath(); ctx.ellipse(x, GROUND, 200, 70 + (i % 3) * 25, 0, Math.PI, 0); ctx.fill();
    }
    // 땅
    ctx.fillStyle = "#1f8a70"; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#35b891"; ctx.fillRect(0, GROUND, W, 8);
    ctx.fillStyle = "#18705b";
    for (let i = 0; i < 14; i++) {
      const x = ((i * 80 - dist) % 1120 + 1120) % 1120 - 80;
      ctx.fillRect(x, GROUND + 30 + (i % 3) * 22, 36, 6);
    }

    obstacles.forEach(drawObstacle);
    ctx.fillStyle = "#ffe89a";
    for (const p of sparks) { ctx.globalAlpha = p.life * 2; ctx.fillRect(p.x, p.y, 4, 4); }
    ctx.globalAlpha = 1;
    drawStar(PX, star.y, R, star.rot);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("점수 " + Math.floor(dist / 10), 24, 44);
    ctx.textAlign = "right";
    ctx.fillText("최고 " + best, W - 24, 44);

    ctx.textAlign = "center";
    if (state === "ready") {
      ctx.font = "bold 52px system-ui, sans-serif";
      ctx.fillText("별똥별 달리기", W / 2, 190);
      ctx.font = "24px system-ui, sans-serif";
      ctx.fillText("스페이스 키 또는 화면을 눌러 점프! (공중에서 한 번 더)", W / 2, 240);
      ctx.fillText("먹구름은 뛰지 말고 아래로 지나가요", W / 2, 276);
    } else if (state === "dead") {
      ctx.fillStyle = "rgba(10,14,40,.6)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 52px system-ui, sans-serif";
      ctx.fillText("아쉬워요!", W / 2, 210);
      ctx.font = "26px system-ui, sans-serif";
      ctx.fillText("점수 " + Math.floor(dist / 10) + "  ·  최고 " + best, W / 2, 256);
      ctx.fillText("다시 하려면 눌러요", W / 2, 296);
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
