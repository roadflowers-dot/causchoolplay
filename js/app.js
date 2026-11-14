import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  signInAnonymously, linkWithPopup, signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc, query, orderBy, limit,
  onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";
import { games } from "./games.js";

const $ = (id) => document.getElementById(id);
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 5;

const views = ["view-loading", "view-login", "view-app"];
function showView(id) {
  views.forEach((v) => { $(v).hidden = v !== id; });
}
function showError(el, msg) {
  el.textContent = msg || "";
  el.hidden = !msg;
}

// ---------- Firebase ----------
const configured = !firebaseConfig.apiKey.startsWith("YOUR_");
let auth, db, storage;
if (configured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

const isGoogleUser = (u) => !!u && u.providerData.some((p) => p.providerId === "google.com");

function authMessage(e) {
  switch (e?.code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request": return "";
    case "auth/popup-blocked": return "팝업이 차단됐어요. 팝업을 허용하고 다시 눌러 주세요.";
    case "auth/operation-not-allowed": return "Firebase 콘솔에서 이 로그인 방법을 먼저 켜야 해요.";
    case "auth/unauthorized-domain": return "이 주소가 Firebase 승인된 도메인에 등록되지 않았어요.";
    case "auth/credential-already-in-use": return "이미 가입된 구글 계정이에요. 로그아웃한 뒤 구글로 로그인해 주세요.";
    default: return "문제가 생겼어요. 잠시 뒤 다시 시도해 주세요. (" + (e?.code || e?.message || "알 수 없음") + ")";
  }
}

// ---------- 로그인 ----------
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
$("btn-logout").addEventListener("click", () => signOut(auth));

// 방문자 → 구글 계정으로 전환
document.querySelectorAll(".btn-upgrade").forEach((b) => b.addEventListener("click", async () => {
  showError($("acc-error"), "");
  try {
    const res = await linkWithPopup(auth.currentUser, new GoogleAuthProvider());
    await res.user.reload();
    await auth.currentUser.getIdToken(true); // 보안 규칙이 구글 로그인을 알아보도록 토큰 갱신
    renderUser(auth.currentUser);
  } catch (e) {
    selectTab("account");
    showError($("acc-error"), authMessage(e));
  }
}));

if (!configured) {
  showView("view-login");
  $("btn-google").disabled = true;
  $("btn-guest").disabled = true;
  showError($("login-error"), "아직 Firebase가 연결되지 않았어요. js/firebase-config.js 에 프로젝트 설정을 넣어 주세요.");
} else {
  onAuthStateChanged(auth, (user) => {
    stopPosts();
    if (!user) { showView("view-login"); return; }
    renderUser(user);
    showView("view-app");
  });
}

// ---------- 계정 표시 ----------
function setAvatar(imgEl, fallbackEl, photo, name) {
  if (photo) {
    imgEl.src = photo;
    imgEl.referrerPolicy = "no-referrer";
  }
  imgEl.hidden = !photo;
  fallbackEl.hidden = !!photo;
  fallbackEl.textContent = (name || "?").trim().charAt(0).toUpperCase();
}

function profileOf(user) {
  const g = user.providerData.find((p) => p.providerId === "google.com");
  return {
    name: user.displayName || g?.displayName || (isGoogleUser(user) ? "친구" : "방문자"),
    email: user.email || g?.email || "",
    photo: user.photoURL || g?.photoURL || "",
  };
}

function renderUser(user) {
  const google = isGoogleUser(user);
  const p = profileOf(user);
  $("me-name").textContent = p.name;
  setAvatar($("me-photo"), $("me-avatar"), p.photo, p.name);
  $("acc-name").textContent = p.name;
  $("acc-email").textContent = google ? p.email : "방문자는 이메일이 없어요";
  $("acc-type").textContent = google ? "구글 계정" : "방문자";
  setAvatar($("acc-photo"), $("acc-avatar"), p.photo, p.name);
  $("acc-upgrade").hidden = google;
  $("posts-locked").hidden = google;
  $("posts-area").hidden = !google;
  if (google) startPosts(); else stopPosts();
}

// ---------- 탭 ----------
function selectTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  ["games", "posts", "account"].forEach((n) => { $("tab-" + n).hidden = n !== name; });
}
document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => selectTab(t.dataset.tab)));
$("me-chip").addEventListener("click", () => selectTab("account"));

// ---------- 게임 ----------
for (const g of games) {
  const card = document.createElement("button");
  card.className = "game-card";
  const thumb = document.createElement("div");
  thumb.className = "game-thumb";
  thumb.style.background = g.color;
  thumb.textContent = g.emoji;
  const info = document.createElement("div");
  info.className = "game-info";
  const title = document.createElement("strong");
  title.textContent = g.title;
  const desc = document.createElement("span");
  desc.textContent = g.desc;
  info.append(title, desc);
  card.append(thumb, info);
  card.addEventListener("click", () => openGame(g));
  $("game-grid").append(card);
}
function openGame(g) {
  $("game-title").textContent = g.title;
  $("game-frame").src = g.url;
  $("game-list").hidden = true;
  $("game-player").hidden = false;
  $("game-frame").focus();
}
$("btn-game-back").addEventListener("click", () => {
  $("game-frame").src = "about:blank";
  $("game-player").hidden = true;
  $("game-list").hidden = false;
});
$("btn-game-full").addEventListener("click", () => {
  $("game-frame").requestFullscreen?.();
});

// ---------- 게시물 ----------
let unsubscribePosts = null;
let pickedFiles = [];

function startPosts() {
  if (unsubscribePosts) return;
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
  unsubscribePosts = onSnapshot(q, (snap) => {
    const list = $("post-list");
    list.replaceChildren(...snap.docs.map(renderPost));
    $("posts-empty").hidden = snap.size > 0;
  }, (e) => {
    $("post-status").textContent = "게시물을 불러오지 못했어요. (" + e.code + ")";
  });
}
function stopPosts() {
  if (unsubscribePosts) { unsubscribePosts(); unsubscribePosts = null; }
  $("post-list").replaceChildren();
}

function formatSize(n) {
  return n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + "KB" : (n / 1024 / 1024).toFixed(1) + "MB";
}

function renderPost(d) {
  const p = d.data({ serverTimestamps: "estimate" });
  const el = document.createElement("article");
  el.className = "card post";

  const head = document.createElement("div");
  head.className = "post-head";
  const img = document.createElement("img");
  img.alt = "";
  const fb = document.createElement("span");
  fb.className = "avatar-fallback";
  setAvatar(img, fb, p.photoURL, p.name);
  const who = document.createElement("div");
  who.className = "who";
  const name = document.createElement("strong");
  name.textContent = p.name || "친구";
  const when = document.createElement("span");
  when.textContent = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : "";
  who.append(name, when);
  head.append(img, fb, who);

  if (p.uid === auth.currentUser?.uid) {
    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "삭제";
    del.addEventListener("click", () => removePost(d.id, p));
    head.append(del);
  }
  el.append(head);

  if (p.text) {
    const text = document.createElement("p");
    text.className = "post-text";
    text.textContent = p.text;
    el.append(text);
  }

  const files = Array.isArray(p.files) ? p.files : [];
  const images = files.filter((f) => /^image\/(png|jpeg|gif|webp)$/.test(f.type));
  const others = files.filter((f) => !images.includes(f));
  if (images.length) {
    const media = document.createElement("div");
    media.className = "post-media";
    for (const f of images) {
      const a = document.createElement("a");
      a.href = f.url; a.target = "_blank"; a.rel = "noopener";
      const im = document.createElement("img");
      im.src = f.url; im.alt = f.name; im.loading = "lazy";
      a.append(im);
      media.append(a);
    }
    el.append(media);
  }
  if (others.length) {
    const box = document.createElement("div");
    box.className = "post-files";
    for (const f of others) {
      const a = document.createElement("a");
      a.href = f.url; a.target = "_blank"; a.rel = "noopener";
      a.textContent = "📎 " + f.name + " (" + formatSize(f.size) + ")";
      box.append(a);
    }
    el.append(box);
  }
  return el;
}

async function removePost(id, p) {
  if (!confirm("이 게시물을 삭제할까요?")) return;
  try {
    await deleteDoc(doc(db, "posts", id));
    for (const f of p.files || []) {
      deleteObject(ref(storage, f.path)).catch(() => {});
    }
  } catch (e) {
    alert("삭제하지 못했어요. (" + e.code + ")");
  }
}

function renderPicked() {
  $("post-files-preview").replaceChildren(...pickedFiles.map((f, i) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.title = "누르면 빠져요";
    chip.textContent = f.name + " ✕";
    chip.addEventListener("click", () => { pickedFiles.splice(i, 1); renderPicked(); });
    return chip;
  }));
}

$("post-files").addEventListener("change", (e) => {
  const status = $("post-status");
  status.textContent = "";
  for (const f of e.target.files) {
    if (f.size > MAX_FILE_BYTES) { status.textContent = "파일 하나는 20MB까지 올릴 수 있어요."; continue; }
    if (pickedFiles.length >= MAX_FILES) { status.textContent = "파일은 한 번에 " + MAX_FILES + "개까지 올릴 수 있어요."; break; }
    pickedFiles.push(f);
  }
  e.target.value = "";
  renderPicked();
});

$("post-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  const text = $("post-text").value.trim();
  const status = $("post-status");
  if (!text && !pickedFiles.length) { status.textContent = "글이나 파일을 넣어 주세요."; return; }

  $("post-submit").disabled = true;
  const uploaded = [];
  try {
    for (let i = 0; i < pickedFiles.length; i++) {
      const f = pickedFiles[i];
      status.textContent = "올리는 중… (" + (i + 1) + "/" + pickedFiles.length + ")";
      const path = "posts/" + user.uid + "/" + Date.now() + "_" + i + "_" + f.name.replace(/[^\w.\-가-힣]/g, "_");
      const r = ref(storage, path);
      await uploadBytes(r, f, { contentType: f.type || "application/octet-stream" });
      uploaded.push({ name: f.name, type: f.type || "", size: f.size, path, url: await getDownloadURL(r) });
    }
    const p = profileOf(user);
    await addDoc(collection(db, "posts"), {
      uid: user.uid,
      name: p.name,
      photoURL: p.photo,
      text,
      files: uploaded,
      createdAt: serverTimestamp(),
    });
    $("post-text").value = "";
    pickedFiles = [];
    renderPicked();
    status.textContent = "";
  } catch (err) {
    for (const f of uploaded) deleteObject(ref(storage, f.path)).catch(() => {});
    status.textContent = "올리지 못했어요. (" + (err.code || err.message) + ")";
  } finally {
    $("post-submit").disabled = false;
  }
});
