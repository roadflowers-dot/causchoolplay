// 게시물: 글 · 사진 · 파일, 반응, 댓글, 신고. 모두 실시간으로 보여 줍니다.
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch, query, orderBy, limit,
  onSnapshot, serverTimestamp, increment, deleteField, Bytes,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db, setAvatar, el } from "./firebase.js";
import { profileOf, onProfiles } from "./profiles.js";

const $ = (id) => document.getElementById(id);

// 첨부 파일은 Firestore 문서에 직접 저장합니다(무료 요금제). 문서 하나가 1MB까지라 파일 하나는 900KB까지입니다.
const MAX_FILE_BYTES = 900 * 1024;
const MAX_FILES = 5;
const IMAGE_TYPES = /^image\/(png|jpeg|gif|webp)$/;
export const REACTIONS = [
  { key: "heart", emoji: "❤️", label: "좋아요" },
  { key: "like", emoji: "👍", label: "최고" },
  { key: "laugh", emoji: "😂", label: "웃겨요" },
  { key: "wow", emoji: "😮", label: "놀라워요" },
  { key: "clap", emoji: "👏", label: "잘했어요" },
];

let state = null;
let unsubscribe = null;
let docs = [];
let pickedFiles = [];
const cards = new Map(); // 게시물 id → 카드 (화면을 통째로 다시 그리지 않아 쓰던 댓글이 지워지지 않아요)

export function start(appState) {
  state = appState;
  if (unsubscribe) { refresh(); return; }
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
  unsubscribe = onSnapshot(q, (snap) => {
    docs = snap.docs;
    refresh();
  }, (e) => {
    $("post-status").textContent = "게시물을 불러오지 못했어요. (" + e.code + ")";
  });
}

export function stop() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  docs = [];
  for (const c of cards.values()) c.destroy();
  cards.clear();
  $("post-list").replaceChildren();
  $("posts-empty").hidden = true;
}

onProfiles(() => { if (unsubscribe) refresh(); });

function refresh() {
  const list = $("post-list");
  const alive = new Set();
  docs.forEach((d, i) => {
    alive.add(d.id);
    let card = cards.get(d.id);
    if (!card) { card = createCard(d.id, d.data({ serverTimestamps: "estimate" })); cards.set(d.id, card); }
    card.update(d.data({ serverTimestamps: "estimate" }));
    if (list.children[i] !== card.root) list.insertBefore(card.root, list.children[i] || null);
  });
  for (const [id, card] of cards) {
    if (!alive.has(id)) { card.destroy(); card.root.remove(); cards.delete(id); }
  }
  $("posts-empty").hidden = docs.length > 0;
}

function formatSize(n) {
  return n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + "KB" : (n / 1024 / 1024).toFixed(1) + "MB";
}
function formatTime(ts) {
  return ts?.toDate ? ts.toDate().toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : "";
}

// 글 본문 (글 · 사진 · 파일). 관리 화면의 신고 목록에서도 씁니다.
export function renderPostBody(postId, p) {
  const box = el("div", "post-body");
  if (p.text) box.append(el("p", "post-text", p.text));
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
      loadFile(postId, f).then((url) => { im.src = url; a.href = url; }).catch(() => { im.alt = "사진을 불러오지 못했어요"; });
    }
    box.append(media);
  }
  if (others.length) {
    const list = el("div", "post-files");
    for (const f of others) {
      const a = el("a", "", "📎 " + f.name + " (" + formatSize(f.size) + ")");
      a.href = "#";
      a.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          const dl = el("a");
          dl.href = await loadFile(postId, f);
          dl.download = f.name;
          dl.click();
        } catch { alert("파일을 불러오지 못했어요."); }
      });
      list.append(a);
    }
    box.append(list);
  }
  return box;
}

function createCard(id, first) {
  const root = el("article", "card post");
  let post = first;

  // 머리: 글쓴이, 시간, 신고/삭제
  const head = el("div", "post-head");
  const img = el("img"); img.alt = "";
  const fb = el("span", "avatar-fallback");
  const who = el("div", "who");
  const nameEl = el("strong");
  const timeEl = el("span");
  who.append(nameEl, timeEl);
  const reportBtn = el("button", "del", "🚩 신고");
  reportBtn.addEventListener("click", () => report({ postId: id, commentId: "", authorUid: post.uid, preview: post.text || "(사진·파일)" }));
  const delBtn = el("button", "del");
  delBtn.addEventListener("click", async () => {
    if (!confirm("이 게시물을 삭제할까요?")) return;
    try { await deletePost(id, post); } catch (e) { alert("삭제하지 못했어요. (" + e.code + ")"); }
  });
  head.append(img, fb, who, reportBtn, delBtn);

  // 반응 + 댓글 버튼
  const bar = el("div", "post-bar");
  const reactBtns = REACTIONS.map((r) => {
    const b = el("button", "react");
    b.title = r.label;
    const count = el("b");
    b.append(el("span", "", r.emoji), count);
    b.addEventListener("click", () => toggleReaction(id, post, r.key));
    bar.append(b);
    return { key: r.key, b, count };
  });
  const commentBtn = el("button", "react comment-toggle");
  bar.append(commentBtn);

  // 댓글 (열었을 때만 불러옵니다)
  const commentBox = el("div", "comments");
  commentBox.hidden = true;
  const commentList = el("div", "comment-list");
  const form = el("form", "comment-form");
  const input = el("input");
  input.type = "text"; input.maxLength = 500; input.placeholder = "댓글을 남겨 보세요"; input.autocomplete = "off";
  const send = el("button", "btn btn-primary btn-small", "등록");
  send.type = "submit";
  form.append(input, send);
  commentBox.append(commentList, form);

  let unsubComments = null;
  let comments = [];
  function renderComments() {
    commentList.replaceChildren(...comments.map((c) => renderComment(id, post, c)));
    if (!comments.length) commentList.append(el("p", "muted comment-empty", "첫 댓글을 남겨 보세요."));
  }
  commentBtn.addEventListener("click", () => {
    commentBox.hidden = !commentBox.hidden;
    if (!commentBox.hidden && !unsubComments) {
      const q = query(collection(db, "posts", id, "comments"), orderBy("createdAt", "asc"), limit(100));
      unsubComments = onSnapshot(q, (snap) => { comments = snap.docs; renderComments(); }, () => {});
    }
    if (!commentBox.hidden) input.focus();
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    send.disabled = true;
    try {
      const batch = writeBatch(db);
      batch.set(doc(collection(db, "posts", id, "comments")), {
        uid: state.user.uid, name: state.profile.name, text, createdAt: serverTimestamp(),
      });
      batch.update(doc(db, "posts", id), { commentCount: increment(1) });
      await batch.commit();
      input.value = "";
    } catch (err) {
      alert("댓글을 올리지 못했어요. (" + (err.code || err.message) + ")");
    } finally {
      send.disabled = false;
    }
  });

  root.append(head, renderPostBody(id, first), bar, commentBox);

  return {
    root,
    update(p) {
      post = p;
      const author = profileOf(p.uid, p.name, p.photoURL);
      setAvatar(img, fb, author.photoURL, author.name);
      nameEl.textContent = author.name;
      timeEl.textContent = formatTime(p.createdAt);
      const mine = p.uid === state.user?.uid;
      reportBtn.hidden = mine;
      delBtn.hidden = !(mine || state.admin);
      delBtn.textContent = mine ? "삭제" : "삭제 (관리자)";

      const reactions = p.reactions || {};
      const myKey = reactions[state.user?.uid];
      const counts = {};
      for (const k of Object.values(reactions)) counts[k] = (counts[k] || 0) + 1;
      for (const r of reactBtns) {
        r.count.textContent = counts[r.key] || "";
        r.b.classList.toggle("on", myKey === r.key);
      }
      commentBtn.textContent = "💬 댓글" + (p.commentCount > 0 ? " " + p.commentCount : "");
      if (unsubComments) renderComments(); // 관리자 여부 · 닉네임이 바뀌었을 수 있어요
    },
    destroy() { if (unsubComments) { unsubComments(); unsubComments = null; } },
  };
}

function renderComment(postId, post, d) {
  const c = d.data({ serverTimestamps: "estimate" });
  const author = profileOf(c.uid, c.name);
  const row = el("div", "comment");
  const img = el("img"); img.alt = "";
  const fb = el("span", "avatar-fallback");
  setAvatar(img, fb, author.photoURL, author.name);
  const body = el("div", "comment-body");
  const top = el("div", "comment-top");
  top.append(el("strong", "", author.name), el("span", "", formatTime(c.createdAt)));
  body.append(top, el("p", "post-text", c.text));
  row.append(img, fb, body);

  const mine = c.uid === state.user?.uid;
  if (!mine) {
    const rep = el("button", "del", "🚩");
    rep.title = "신고";
    rep.addEventListener("click", () => report({ postId, commentId: d.id, authorUid: c.uid, preview: c.text }));
    row.append(rep);
  }
  if (mine || state.admin) {
    const del = el("button", "del", "삭제");
    del.addEventListener("click", async () => {
      if (!confirm("이 댓글을 삭제할까요?")) return;
      try { await deleteComment(postId, d.id); } catch (e) { alert("삭제하지 못했어요. (" + e.code + ")"); }
    });
    row.append(del);
  }
  return row;
}

async function toggleReaction(postId, post, key) {
  const uid = state.user.uid;
  const mine = (post.reactions || {})[uid];
  try {
    await updateDoc(doc(db, "posts", postId), { ["reactions." + uid]: mine === key ? deleteField() : key });
  } catch (e) {
    alert("반응을 남기지 못했어요. (" + e.code + ")");
  }
}

// 신고는 한 사람이 같은 글 · 댓글에 한 번만 보낼 수 있어요
async function report(target) {
  const reason = prompt("어떤 점이 문제인지 적어 주세요. 관리자만 볼 수 있어요.", "");
  if (reason === null) return;
  const uid = state.user.uid;
  try {
    await setDoc(doc(db, "reports", target.postId + "_" + (target.commentId || "post") + "_" + uid), {
      postId: target.postId,
      commentId: target.commentId,
      authorUid: target.authorUid || "",
      preview: String(target.preview || "").slice(0, 200),
      reason: reason.trim().slice(0, 200),
      reporter: uid,
      createdAt: serverTimestamp(),
    });
    alert("신고했어요. 관리자가 확인할게요.");
  } catch (e) {
    alert(e.code === "permission-denied" ? "이미 신고한 글이에요." : "신고하지 못했어요. (" + e.code + ")");
  }
}

// 글과 함께 첨부 파일 · 댓글도 지웁니다 (댓글은 지울 권한이 있는 것만)
export async function deletePost(id, p) {
  const batch = writeBatch(db);
  for (const f of p.files || []) batch.delete(doc(db, "posts", id, "files", f.id));
  batch.delete(doc(db, "posts", id));
  await batch.commit();
  try {
    const snap = await getDocs(query(collection(db, "posts", id, "comments"), limit(200)));
    const uid = state?.user?.uid;
    const mineOrAdmin = snap.docs.filter((d) => state?.admin || d.data().uid === uid);
    if (mineOrAdmin.length) {
      const b2 = writeBatch(db);
      mineOrAdmin.forEach((d) => b2.delete(d.ref));
      await b2.commit();
    }
  } catch { /* 남은 댓글은 화면에 보이지 않아요 */ }
}

export async function deleteComment(postId, commentId) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "posts", postId, "comments", commentId));
  batch.update(doc(db, "posts", postId), { commentCount: increment(-1) });
  await batch.commit();
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
