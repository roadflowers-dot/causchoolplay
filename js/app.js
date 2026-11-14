import {
  onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInAnonymously,
  linkWithPopup, signInWithCredential, signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { auth, db, configured, isGoogleUser, setAvatar, el } from "./firebase.js";
import { ownerEmailHash } from "./firebase-config.js";
import { games } from "./games.js";
import * as posts from "./posts.js";
import * as scores from "./scores.js";
import { setProfile } from "./profiles.js";

const $ = (id) => document.getElementById(id);

// 지금 로그인한 사람의 상태. 권한(admin)과 차단 여부는 서버(Firestore)에서 받아 온 값이며,
// 이 값을 브라우저에서 바꿔도 서버 규칙이 막기 때문에 실제 권한은 생기지 않습니다.
const state = { user: null, google: false, profile: null, admin: false };

const views = ["view-loading", "view-login", "view-banned", "view-app"];
function showView(id) {
  views.forEach((v) => { $(v).hidden = v !== id; });
}
function showError(node, msg) {
  node.textContent = msg || "";
  node.hidden = !msg;
}

function authMessage(e) {
  switch (e?.code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request": return "";
    case "auth/popup-blocked": return "팝업이 차단됐어요. 팝업을 허용하고 다시 눌러 주세요.";
    case "auth/operation-not-allowed": return "Firebase 콘솔에서 이 로그인 방법을 먼저 켜야 해요.";
    case "auth/unauthorized-domain": return "이 주소가 Firebase 승인된 도메인에 등록되지 않았어요.";
    case "auth/network-request-failed": return "인터넷 연결을 확인해 주세요.";
    default: return "문제가 생겼어요. 잠시 뒤 다시 시도해 주세요. (" + (e?.code || e?.message || "알 수 없음") + ")";
  }
}

// ───────── 화면 모드 (밝게 / 어둡게) ─────────
document.querySelectorAll(".theme-btn").forEach((b) => b.addEventListener("click", () => window.Theme.toggle()));
document.querySelectorAll("[data-theme-choice]").forEach((b) => {
  b.addEventListener("click", () => window.Theme.set(b.dataset.themeChoice));
});
function renderThemeChoice() {
  const { choice } = window.Theme.get();
  document.querySelectorAll("[data-theme-choice]").forEach((b) => {
    b.classList.toggle("active", b.dataset.themeChoice === choice);
  });
}
window.addEventListener("themechange", renderThemeChoice);
renderThemeChoice();

// ───────── 로그인 ─────────
$("btn-google").addEventListener("click", async () => {
  showError($("login-error"), "");
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (e) { showError($("login-error"), authMessage(e)); }
});
$("btn-guest").addEventListener("click", async () => {
  showError($("login-error"), "");
  try { await signInAnonymously(auth); }
  catch (e) { showError($("login-error"), authMessage(e)); }
});
document.querySelectorAll(".btn-logout").forEach((b) => b.addEventListener("click", () => signOut(auth)));

// 방문자 → 구글 계정으로 전환
document.querySelectorAll(".btn-upgrade").forEach((b) => b.addEventListener("click", async () => {
  showError($("acc-error"), "");
  try {
    await linkWithPopup(auth.currentUser, new GoogleAuthProvider());
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true); // 서버 규칙이 구글 로그인을 알아보도록 토큰 갱신
    await handleUser(auth.currentUser);
  } catch (e) {
    // 이미 가입한 구글 계정이면 그 계정으로 바로 로그인
    if (e?.code === "auth/credential-already-in-use") {
      const cred = GoogleAuthProvider.credentialFromError(e);
      if (cred) {
        try { await signInWithCredential(auth, cred); return; } catch (e2) { e = e2; }
      }
    }
    selectTab("account");
    showError($("acc-error"), authMessage(e));
  }
}));

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function googleInfo(user) {
  const g = user.providerData.find((p) => p.providerId === "google.com") || {};
  return {
    name: (user.displayName || g.displayName || "").trim().slice(0, 20) || "친구",
    email: user.email || g.email || "",
    photo: /^https:\/\//.test(user.photoURL || g.photoURL || "") ? (user.photoURL || g.photoURL) : "",
  };
}

// 구글로 처음 들어온 사람은 회원 정보를 만들어 둡니다. (권한은 서버 규칙이 정합니다)
async function ensureUserDoc(user) {
  const info = googleInfo(user);
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const owner = !!info.email && (await sha256Hex(info.email.toLowerCase())) === ownerEmailHash;
  const emailRef = doc(db, "userEmails", user.uid);
  if (!snap.exists()) {
    const batch = writeBatch(db);
    batch.set(ref, {
      name: info.name,
      photoURL: info.photo,
      role: owner ? "admin" : "user",
      banned: false,
      createdAt: serverTimestamp(),
    });
    if (info.email) batch.set(emailRef, { email: info.email });
    await batch.commit();
    return;
  }
  if (owner && (snap.data().role !== "admin" || snap.data().banned)) {
    await updateDoc(ref, { role: "admin", banned: false });
  }
  if (info.email) setDoc(emailRef, { email: info.email }).catch(() => {});
}

let unsubMe = null;
let session = 0;

function teardown() {
  if (unsubMe) { unsubMe(); unsubMe = null; }
  posts.stop();
  unmountAdmin();
  closeGame();
  state.profile = null;
  state.admin = false;
  pendingPhoto = undefined;
  shownName = null;
}

async function handleUser(user) {
  const mine = ++session;
  teardown();
  state.user = user;
  state.google = isGoogleUser(user);
  if (!user) { showView("view-login"); return; }

  if (!state.google) {
    state.profile = { name: "방문자", photoURL: "" };
    render();
    selectTab("games");
    showView("view-app");
    return;
  }

  try {
    await ensureUserDoc(user);
  } catch (e) {
    if (mine !== session) return;
    showError($("login-error"), "회원 정보를 준비하지 못했어요. 잠시 뒤 다시 시도해 주세요. (" + (e.code || e.message) + ")");
    await signOut(auth);
    return;
  }
  if (mine !== session) return;

  // 내 회원 정보가 바뀌면(닉네임, 관리자 승급, 차단 등) 바로 화면에 반영
  let first = true;
  unsubMe = onSnapshot(doc(db, "users", user.uid), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    // 권한과 차단 여부는 서버가 확인해 준 값만 믿습니다.
    // (브라우저에서 억지로 바꾼 값은 서버가 거부하기 전까지 잠깐 보일 수 있어서 무시합니다)
    if (snap.metadata.hasPendingWrites && state.profile) {
      data.role = state.profile.role;
      data.banned = state.profile.banned;
    }
    state.profile = data;
    state.admin = state.profile.role === "admin" && !state.profile.banned;
    if (state.profile.banned) {
      posts.stop();
      unmountAdmin();
      showView("view-banned");
      return;
    }
    render();
    if (first) { selectTab("games"); first = false; }
    showView("view-app");
  }, (e) => {
    showError($("login-error"), "회원 정보를 불러오지 못했어요. (" + e.code + ")");
    signOut(auth);
  });
}

if (!configured) {
  showView("view-login");
  $("btn-google").disabled = true;
  $("btn-guest").disabled = true;
  showError($("login-error"), "아직 Firebase가 연결되지 않았어요. js/firebase-config.js 에 프로젝트 설정을 넣어 주세요.");
} else {
  onAuthStateChanged(auth, handleUser);
}

// ───────── 계정 표시 ─────────
let shownName = null;
let pendingPhoto; // undefined = 바꾸지 않음, 문자열 = 새 사진(빈 문자열은 사진 없음)

function render() {
  const p = state.profile;
  const info = state.google ? googleInfo(state.user) : null;
  $("me-name").textContent = p.name;
  setAvatar($("me-photo"), $("me-avatar"), p.photoURL, p.name);
  $("acc-name").textContent = p.name;
  $("acc-email").textContent = state.google ? info.email : "방문자는 이메일이 없어요";
  $("acc-type").textContent = state.google ? "구글 계정" : "방문자";
  $("acc-admin").hidden = !state.admin;
  setAvatar($("acc-photo"), $("acc-avatar"), pendingPhoto ?? p.photoURL, p.name);
  $("acc-upgrade").hidden = state.google;
  $("profile-form").hidden = !state.google;
  if (state.google && shownName !== p.name) {
    $("profile-name").value = p.name;
    shownName = p.name;
  }

  $("posts-locked").hidden = state.google;
  $("posts-area").hidden = !state.google;
  if (state.google) {
    setProfile(state.user.uid, p);
    posts.start(state);
  } else {
    posts.stop();
  }

  if (state.admin) mountAdmin(); else unmountAdmin();
}

// ───────── 프로필 수정 ─────────
async function squarePhoto(file) {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement("canvas");
  c.width = c.height = 160;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 160, 160);
  g.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 160, 160);
  return c.toDataURL("image/jpeg", 0.85);
}
function previewPhoto(url, msg) {
  pendingPhoto = url;
  setAvatar($("acc-photo"), $("acc-avatar"), url, state.profile.name);
  $("profile-status").textContent = msg;
}
$("profile-photo").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try { previewPhoto(await squarePhoto(file), "저장을 누르면 바뀌어요."); }
  catch { $("profile-status").textContent = "이 사진은 쓸 수 없어요. 다른 사진을 골라 주세요."; }
});
$("profile-photo-reset").addEventListener("click", () => previewPhoto(googleInfo(state.user).photo, "저장을 누르면 바뀌어요."));
$("profile-photo-none").addEventListener("click", () => previewPhoto("", "저장을 누르면 바뀌어요."));

$("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = $("profile-status");
  const name = $("profile-name").value.trim();
  if (!name) { status.textContent = "닉네임을 적어 주세요."; return; }
  const data = { name };
  if (pendingPhoto !== undefined) data.photoURL = pendingPhoto;
  $("profile-save").disabled = true;
  try {
    await updateDoc(doc(db, "users", state.user.uid), data);
    pendingPhoto = undefined;
    status.textContent = "저장했어요!";
  } catch (err) {
    status.textContent = "저장하지 못했어요. (" + (err.code || err.message) + ")";
  } finally {
    $("profile-save").disabled = false;
  }
});

// ───────── 탭 ─────────
function selectTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== "tab-" + name; });
  window.scrollTo(0, 0);
}
$("tabs").addEventListener("click", (e) => {
  const t = e.target.closest(".tab");
  if (t) selectTab(t.dataset.tab);
});
$("me-chip").addEventListener("click", () => selectTab("account"));

// ───────── 관리 (관리자에게만 만들어지는 탭) ─────────
// 관리 화면은 HTML에 숨겨 두지 않고, 서버가 관리자라고 알려 준 사람에게만 만들어 붙입니다.
// 누군가 개발자 도구로 억지로 화면을 띄워도 서버 규칙이 모든 관리 동작을 거부합니다.
let adminTab = null, adminPanel = null, adminModule = null;

async function mountAdmin() {
  if (adminTab) return;
  adminTab = el("button", "tab");
  adminTab.dataset.tab = "admin";
  adminTab.setAttribute("role", "tab");
  adminTab.append(el("i", "", "🛡️"), el("span", "", "관리"));
  $("tabs").append(adminTab);
  adminPanel = el("section", "panel narrow");
  adminPanel.id = "tab-admin";
  adminPanel.hidden = true;
  $("main").append(adminPanel);
  const panel = adminPanel;
  try {
    adminModule = await import("./admin.js");
    if (adminPanel === panel) adminModule.mount(panel, state, adminTab);
  } catch {
    panel.textContent = "관리 화면을 불러오지 못했어요.";
  }
}
function unmountAdmin() {
  if (!adminTab) return;
  adminModule?.unmount();
  if (adminTab.classList.contains("active")) selectTab("games");
  adminTab.remove();
  adminPanel.remove();
  adminTab = adminPanel = null;
}

// ───────── 게임 ─────────
for (const g of games) {
  const card = el("button", "game-card");
  const thumb = el("div", "game-thumb");
  thumb.style.background = g.color;
  thumb.append(el("span", "", g.emoji));
  const info = el("div", "game-info");
  info.append(el("strong", "display", g.title), el("p", "", g.desc), el("span", "game-tag", g.tag));
  card.append(thumb, info);
  card.addEventListener("click", () => openGame(g));
  $("game-grid").append(card);
}
function openGame(g) {
  $("game-title").textContent = g.title;
  $("game-help").textContent = g.help;
  $("game-frame").src = g.url;
  scores.open(g, state);
  $("game-list").hidden = true;
  $("game-player").hidden = false;
  window.scrollTo(0, 0);
  $("game-frame").focus();
}
function closeGame() {
  scores.close();
  $("game-frame").src = "about:blank";
  $("game-player").hidden = true;
  $("game-list").hidden = false;
}
$("btn-game-back").addEventListener("click", closeGame);
$("btn-game-full").addEventListener("click", () => {
  $("game-frame").requestFullscreen?.();
});
$("game-frame").addEventListener("load", () => $("game-frame").focus());
