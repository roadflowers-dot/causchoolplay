// 게임들이 함께 쓰는 작은 도우미: 화면 크기 맞추기, 최고 점수, 게임 루프, 안내 화면
window.Kit = (function () {
  var FONT = 'system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

  function canvas(W, H) {
    var cv = document.getElementById("c");
    var ctx = cv.getContext("2d");
    var s = 1, ox = 0, oy = 0;
    function fit() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(1, cv.clientWidth * dpr);
      cv.height = Math.max(1, cv.clientHeight * dpr);
      s = Math.min(cv.width / W, cv.height / H);
      ox = (cv.width - W * s) / 2;
      oy = (cv.height - H * s) / 2;
    }
    window.addEventListener("resize", fit);
    fit();
    return {
      cv: cv,
      ctx: ctx,
      // 그리기 시작: 바깥은 bg 색으로 채우고, 게임 좌표(W×H)로 맞춥니다
      begin: function (bg) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.setTransform(s, 0, 0, s, ox, oy);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.clip();
      },
      end: function () { ctx.restore(); },
      // 마우스/손가락 위치를 게임 좌표로 바꿉니다
      pos: function (e) {
        var r = cv.getBoundingClientRect();
        var k = cv.width / r.width;
        return { x: ((e.clientX - r.left) * k - ox) / s, y: ((e.clientY - r.top) * k - oy) / s };
      },
    };
  }

  // 새 기록을 사이트(순위표)에 알려 줍니다
  function report(n) {
    try { if (window.parent !== window) window.parent.postMessage({ type: "score", value: n }, window.location.origin); } catch (e) {}
  }

  function best(key) {
    var v = 0;
    try { v = Number(localStorage.getItem(key)) || 0; } catch (e) {}
    if (v > 0) report(v);
    return {
      get: function () { return v; },
      set: function (n) { v = n; try { localStorage.setItem(key, String(n)); } catch (e) {} report(n); },
      add: function (n) { this.set(v + n); },
    };
  }

  // AI 와 겨루는 게임의 난이도 고르기
  var LEVELS = [
    { label: "쉬움", pts: 1, color: "#51cf66" },
    { label: "보통", pts: 2, color: "#fcc419" },
    { label: "어려움", pts: 3, color: "#ff6b6b" },
  ];
  function levelRect(i, W, H) { return { x: W / 2 - 290 + i * 200, y: H / 2 + 50, w: 180, h: 70 }; }
  function levelMenu(ctx, W, H, title, lines) {
    ctx.fillStyle = "rgba(8, 10, 30, .72)";
    ctx.fillRect(0, 0, W, H);
    text(ctx, title, W / 2, H / 2 - 110, 54, "center");
    for (var i = 0; i < lines.length; i++) text(ctx, lines[i], W / 2, H / 2 - 62 + i * 32, 22, "center", "#fff", false);
    text(ctx, "난이도를 골라요 (숫자 키 1 · 2 · 3)", W / 2, H / 2 + 30, 20, "center", "rgba(255,255,255,.75)", false);
    LEVELS.forEach(function (l, i) {
      var r = levelRect(i, W, H);
      ctx.fillStyle = l.color;
      ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 18); ctx.fill();
      text(ctx, l.label, r.x + r.w / 2, r.y + 36, 26, "center", "#1b2142");
      text(ctx, "이기면 +" + l.pts + "점", r.x + r.w / 2, r.y + 58, 15, "center", "rgba(27,33,66,.75)", false);
    });
  }
  function levelAt(p, W, H) {
    for (var i = 0; i < LEVELS.length; i++) {
      var r = levelRect(i, W, H);
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i;
    }
    return -1;
  }
  function levelKey(e) { return { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code] ?? -1; }

  // 둥근 버튼 하나 (예: "다시 하기")
  function button(ctx, r, label) {
    ctx.fillStyle = "rgba(255,255,255,.16)";
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fill();
    text(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 7, 20, "center");
  }
  function inside(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }

  function loop(step) {
    var last = performance.now();
    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.033);
      last = now;
      step(dt);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function text(ctx, str, x, y, size, align, color, bold) {
    ctx.font = (bold === false ? "" : "bold ") + size + "px " + FONT;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = color || "#fff";
    ctx.fillText(str, x, y);
  }

  // 화면 가운데 안내 (시작 전, 게임 끝)
  function overlay(ctx, W, H, title, lines, dim) {
    if (dim !== false) {
      ctx.fillStyle = "rgba(8, 10, 30, .62)";
      ctx.fillRect(0, 0, W, H);
    }
    var top = H / 2 - (lines.length * 36) / 2 - 10;
    text(ctx, title, W / 2, top, 54, "center");
    for (var i = 0; i < lines.length; i++) text(ctx, lines[i], W / 2, top + 52 + i * 36, 24, "center", "#fff", false);
  }

  function hud(ctx, W, left, right) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = 6;
    text(ctx, left, 24, 42, 26, "left");
    text(ctx, right, W - 24, 42, 26, "right");
    ctx.restore();
  }

  return { canvas: canvas, best: best, loop: loop, text: text, overlay: overlay, hud: hud,
    LEVELS: LEVELS, levelMenu: levelMenu, levelAt: levelAt, levelKey: levelKey, button: button, inside: inside };
})();
