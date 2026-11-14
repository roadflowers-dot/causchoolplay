// 앱 설치: 홈 화면에 추가해서 앱처럼 열 수 있게 합니다.
const text = document.getElementById("install-text");
const buttons = document.querySelectorAll(".btn-install");
let prompt = null;

const standalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function render() {
  buttons.forEach((b) => { b.hidden = !prompt; });
  if (standalone()) text.textContent = "이미 앱으로 설치해서 쓰고 있어요.";
  else if (prompt) text.textContent = "홈 화면에 추가하면 앱처럼 바로 열 수 있어요.";
  else if (isIOS) text.textContent = "사파리 아래쪽의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 눌러요.";
  else text.textContent = "브라우저 주소창 오른쪽의 설치 아이콘이나, 메뉴(⋮)의 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 눌러요.";
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // 브라우저 기본 안내 대신 우리 버튼으로 설치
  prompt = e;
  render();
});
window.addEventListener("appinstalled", () => { prompt = null; render(); });

buttons.forEach((b) => b.addEventListener("click", async () => {
  if (!prompt) return;
  const p = prompt;
  prompt = null;
  p.prompt();
  await p.userChoice.catch(() => {});
  render();
}));

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
render();
