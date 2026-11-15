// 게임 순위표: 게임이 알려 준 최고 기록을 서버에 저장하고 상위 10명을 보여 줍니다.
import {
  collection, doc, getDoc, setDoc, deleteDoc, query, orderBy, limit, onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db, el } from "./firebase.js";
import { profileOf, onProfiles } from "./profiles.js";

const $ = (id) => document.getElementById(id);

let state = null;
let game = null;
let unsubscribe = null;
let rows = [];
let mine = null;       // 서버에 저장된 내 기록
let mineLoaded = false;
let pending = null;    // 내 기록을 불러오기 전에 도착한 점수

const better = (a, b) => (game.rank === "low" ? a < b : a > b);
const fmt = (n) => n.toLocaleString("ko-KR") + (game.unit || "점");

export function open(g, appState) {
  close();
  game = g;
  state = appState;
  $("rank-box").hidden = false;
  if (!state.member) {
    $("rank-note").textContent = "구글이나 애플로 로그인하면 내 기록이 순위표에 올라가요.";
    $("rank-list").replaceChildren();
    return;
  }
  $("rank-note").textContent = "불러오는 중…";
  const scores = collection(db, "games", g.id, "scores");
  unsubscribe = onSnapshot(query(scores, orderBy("score", g.rank === "low" ? "asc" : "desc"), limit(10)), (snap) => {
    rows = snap.docs;
    render();
  }, (e) => { $("rank-note").textContent = "순위를 불러오지 못했어요. (" + e.code + ")"; });

  const opened = g;
  getDoc(doc(scores, state.user.uid)).then((snap) => {
    if (game !== opened) return;
    mine = snap.exists() ? snap.data().score : null;
    mineLoaded = true;
    if (pending != null) { const v = pending; pending = null; submit(v); }
    render();
  }).catch(() => {});
}

export function close() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  game = null; rows = []; mine = null; mineLoaded = false; pending = null;
  $("rank-box").hidden = true;
}

onProfiles(() => { if (unsubscribe) render(); });

function render() {
  const list = $("rank-list");
  const uid = state.user.uid;
  list.replaceChildren(...rows.map((d, i) => {
    const s = d.data();
    const li = el("li", d.id === uid ? "mine" : "");
    li.append(el("span", "rank-no", ["🥇", "🥈", "🥉"][i] || String(i + 1)));
    li.append(el("span", "rank-name", profileOf(d.id, s.name).name));
    li.append(el("b", "", fmt(s.score)));
    if (state.admin) {
      const del = el("button", "del", "삭제");
      del.title = "이 기록 지우기 (관리자)";
      del.addEventListener("click", async () => {
        if (!confirm("이 기록을 순위표에서 지울까요?")) return;
        try { await deleteDoc(d.ref); if (d.id === uid) mine = null; } catch (e) { alert("지우지 못했어요. (" + e.code + ")"); }
      });
      li.append(del);
    }
    return li;
  }));
  $("rank-note").textContent = !rows.length
    ? "아직 기록이 없어요. 첫 번째 주인공이 되어 보세요!"
    : mine != null ? "내 최고 기록: " + fmt(mine) : "";
}

async function submit(value) {
  if (!game || !state?.member) return;
  const v = Math.floor(value);
  if (!(v > 0) || v > 10000000) return;
  if (!mineLoaded) { pending = pending == null || better(v, pending) ? v : pending; return; }
  if (mine != null && !better(v, mine)) return;
  const before = mine;
  mine = v;
  render();
  try {
    await setDoc(doc(db, "games", game.id, "scores", state.user.uid), {
      name: state.profile.name, score: v, updatedAt: serverTimestamp(),
    });
  } catch {
    mine = before; // 서버가 거절하면 원래대로
  }
}

// 게임 화면(iframe)이 보내는 점수만 받습니다
window.addEventListener("message", (e) => {
  if (e.origin !== location.origin || e.source !== $("game-frame").contentWindow) return;
  const d = e.data;
  if (d && d.type === "score" && typeof d.value === "number" && Number.isFinite(d.value)) submit(d.value);
});
