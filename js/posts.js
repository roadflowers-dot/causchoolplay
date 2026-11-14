// 게시물: 글 · 사진 · 파일을 올리고 실시간으로 보여 줍니다.
import {
  collection, doc, getDoc, writeBatch, query, orderBy, limit,
  onSnapshot, serverTimestamp, Bytes,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db, setAvatar, el } from "./firebase.js";

const $ = (id) => document.getElementById(id);

// 첨부 파일은 Firestore 문서에 직접 저장합니다(무료 요금제). 문서 하나가 1MB까지라 파일 하나는 900KB까지입니다.
const MAX_FILE_BYTES = 900 * 1024;
const MAX_FILES = 5;
const IMAGE_TYPES = /^image\/(png|jpeg|gif|webp)$/;

let state = null;
let unsubscribe = null;
let docs = [];
let pickedFiles = [];
let renderQueued = false;

export function start(appState) {
  state = appState;
  if (unsubscribe) { queueRender(); return; }
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
  unsubscribe = onSnapshot(q, (snap) => {
    docs = snap.docs;
    renderList();
  }, (e) => {
    $("post-status").textContent = "게시물을 불러오지 못했어요. (" + e.code + ")";
  });
}

export function stop() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  docs = [];
  $("post-list").replaceChildren();
  $("posts-empty").hidden = true;
}

// ───── 글쓴이 프로필 (닉네임 · 사진은 항상 최신 것으로 보여 줍니다) ─────
const profiles = new Map();

export function setProfile(uid, profile) {
  const old = profiles.get(uid);
  profiles.set(uid, profile);
  if (!old || old.name !== profile.name || old.photoURL !== profile.photoURL) queueRender();
}

function authorOf(p) {
  const known = profiles.get(p.uid);
  if (known) return known;
  if (!profiles.has(p.uid)) {
    profiles.set(p.uid, null);
    getDoc(doc(db, "users", p.uid)).then((snap) => {
      if (snap.exists()) { profiles.set(p.uid, snap.data()); queueRender(); }
    }).catch(() => {});
  }
  return { name: p.name || "친구", photoURL: p.photoURL || "" };
}

function queueRender() {
  if (renderQueued || !unsubscribe) return;
  renderQueued = true;
  queueMicrotask(() => { renderQueued = false; if (unsubscribe) renderList(); });
}

function renderList() {
  $("post-list").replaceChildren(...docs.map(renderPost));
  $("posts-empty").hidden = docs.length > 0;
}

function formatSize(n) {
  return n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + "KB" : (n / 1024 / 1024).toFixed(1) + "MB";
}

function renderPost(d) {
  const p = d.data({ serverTimestamps: "estimate" });
  const author = authorOf(p);
  const card = el("article", "card post");

  const head = el("div", "post-head");
  const img = el("img");
  img.alt = "";
  const fb = el("span", "avatar-fallback");
  setAvatar(img, fb, author.photoURL, author.name);
  const who = el("div", "who");
  const when = p.createdAt?.toDate
    ? p.createdAt.toDate().toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })
    : "";
  who.append(el("strong", "", author.name), el("span", "", when));
  head.append(img, fb, who);

  const mine = p.uid === state.user?.uid;
  if (mine || state.admin) {
    const del = el("button", "del", mine ? "삭제" : "삭제 (관리자)");
    del.addEventListener("click", () => removePost(d.id, p));
    head.append(del);
  }
  card.append(head);

  if (p.text) card.append(el("p", "post-text", p.text));

  const files = Array.isArray(p.files) ? p.files : [];
  const images = files.filter((f) => IMAGE_TYPES.test(f.type));
  const others = files.filter((f) => !images.includes(f));
  if (images.length) {
    const media = el("div", "post-media");
    for (const f of images) {
      const a = el("a");
      a.target = "_blank"; a.rel = "noopener";
      const im = el("img");
      im.alt = f.name;
      a.append(im);
      media.append(a);
      loadFile(d.id, f).then((url) => { im.src = url; a.href = url; }).catch(() => { im.alt = "사진을 불러오지 못했어요"; });
    }
    card.append(media);
  }
  if (others.length) {
    const box = el("div", "post-files");
    for (const f of others) {
      const a = el("a", "", "📎 " + f.name + " (" + formatSize(f.size) + ")");
      a.href = "#";
      a.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          const dl = el("a");
          dl.href = await loadFile(d.id, f);
          dl.download = f.name;
          dl.click();
        } catch { alert("파일을 불러오지 못했어요."); }
      });
      box.append(a);
    }
    card.append(box);
  }
  return card;
}

// 첨부 파일 내용은 posts/{글}/files/{파일} 문서에 들어 있어요. 한 번 받은 파일은 다시 받지 않아요.
const fileCache = new Map();
function loadFile(postId, f) {
  const key = postId + "/" + f.id;
  if (!fileCache.has(key)) {
    const job = getDoc(doc(db, "posts", postId, "files", f.id)).then((snap) => {
      if (!snap.exists()) throw new Error("missing");
      // 사진이 아닌 파일은 브라우저가 열지 않고 내려받기만 하도록 형식을 가립니다.
      const type = IMAGE_TYPES.test(f.type) ? f.type : "application/octet-stream";
      return URL.createObjectURL(new Blob([snap.data().data.toUint8Array()], { type }));
    });
    job.catch(() => fileCache.delete(key));
    fileCache.set(key, job);
  }
  return fileCache.get(key);
}

async function removePost(id, p) {
  if (!confirm("이 게시물을 삭제할까요?")) return;
  try {
    const batch = writeBatch(db);
    for (const f of p.files || []) batch.delete(doc(db, "posts", id, "files", f.id));
    batch.delete(doc(db, "posts", id));
    await batch.commit();
  } catch (e) {
    alert("삭제하지 못했어요. (" + e.code + ")");
  }
}

// 큰 사진은 크기를 줄여서 900KB 안에 들어가게 만들어요. (움직이는 GIF는 그대로 둡니다)
async function shrinkImage(file) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size <= 300 * 1024) return file;
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { return file; }
  let side = 1600, quality = 0.82, out = null;
  for (let i = 0; i < 6; i++) {
    const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    const g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(bmp, 0, 0, c.width, c.height);
    out = await new Promise((res) => c.toBlob(res, "image/jpeg", quality));
    if (out && out.size <= MAX_FILE_BYTES) break;
    side = Math.round(side * 0.75);
    quality -= 0.08;
  }
  if (!out || out.size >= file.size) return file;
  return new File([out], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

function renderPicked() {
  $("post-files-preview").replaceChildren(...pickedFiles.map((f, i) => {
    const chip = el("button", "chip", f.name + " ✕");
    chip.type = "button";
    chip.title = "누르면 빠져요";
    chip.addEventListener("click", () => { pickedFiles.splice(i, 1); renderPicked(); });
    return chip;
  }));
}

$("post-files").addEventListener("change", async (e) => {
  const status = $("post-status");
  status.textContent = "";
  const chosen = [...e.target.files];
  e.target.value = "";
  for (const raw of chosen) {
    if (pickedFiles.length >= MAX_FILES) { status.textContent = "파일은 한 번에 " + MAX_FILES + "개까지 올릴 수 있어요."; break; }
    const f = await shrinkImage(raw);
    if (f.size > MAX_FILE_BYTES) { status.textContent = "파일 하나는 900KB까지 올릴 수 있어요. (사진은 자동으로 줄여 줘요)"; continue; }
    pickedFiles.push(f);
  }
  renderPicked();
});

$("post-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = state?.user;
  if (!user) return;
  const text = $("post-text").value.trim();
  const status = $("post-status");
  if (!text && !pickedFiles.length) { status.textContent = "글이나 파일을 넣어 주세요."; return; }

  $("post-submit").disabled = true;
  status.textContent = "올리는 중…";
  try {
    // 글과 첨부 파일을 한꺼번에 저장해요. 하나라도 실패하면 아무것도 올라가지 않아요.
    const batch = writeBatch(db);
    const postRef = doc(collection(db, "posts"));
    const files = [];
    for (const f of pickedFiles) {
      const fileRef = doc(collection(postRef, "files"));
      batch.set(fileRef, { uid: user.uid, data: Bytes.fromUint8Array(new Uint8Array(await f.arrayBuffer())) });
      files.push({ id: fileRef.id, name: f.name, type: f.type || "", size: f.size });
    }
    batch.set(postRef, {
      uid: user.uid,
      name: state.profile.name,
      text,
      files,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    $("post-text").value = "";
    pickedFiles = [];
    renderPicked();
    status.textContent = "";
  } catch (err) {
    status.textContent = "올리지 못했어요. (" + (err.code || err.message) + ")";
  } finally {
    $("post-submit").disabled = false;
  }
});
