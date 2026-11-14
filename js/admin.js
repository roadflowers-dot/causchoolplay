// 관리 화면: 신고 처리, 회원 목록, 관리자 승급/해제, 계정 차단/해제.
// 이 파일은 관리자로 확인된 사람에게만 불러와집니다. 다른 사람이 이 코드를 직접 실행해도
// firestore.rules 가 관리자가 아닌 사람의 요청을 모두 거부합니다.
import {
  collection, doc, getDoc, updateDoc, onSnapshot, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db, setAvatar, el } from "./firebase.js";
import { profileOf, onProfiles } from "./profiles.js";
import { renderPostBody, deletePost, deleteComment } from "./posts.js";

let unsubUsers = null, unsubReports = null;
let users = [];
let reports = [];
let state = null;
let tabEl = null;
let listEl = null, searchEl = null, statusEl = null, reportsEl = null, reportsHead = null;
const emails = new Map();
const targets = new Map(); // 신고된 글 · 댓글 내용 (한 번만 받아 옵니다)

export function mount(container, appState, tab) {
  state = appState;
  tabEl = tab;
  const head = el("div", "page-head");
  head.append(el("h2", "display", "관리"), el("p", "muted", "신고된 글을 확인하고, 회원 권한을 바꾸거나 계정을 차단할 수 있어요."));

  reportsHead = el("h3", "section-title", "신고");
  reportsEl = el("div");

  const usersHead = el("h3", "section-title", "회원");
  const card = el("div", "card");
  const tools = el("div", "admin-tools field");
  searchEl = el("input");
  searchEl.type = "search";
  searchEl.placeholder = "닉네임이나 이메일로 찾기";
  searchEl.addEventListener("input", renderUsers);
  tools.append(searchEl);
  statusEl = el("p", "muted");
  listEl = el("div");
  card.append(tools, statusEl, listEl);
  container.replaceChildren(head, reportsHead, reportsEl, usersHead, card);

  unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
    users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    users.sort((a, b) => (a.role === "admin" ? 0 : 1) - (b.role === "admin" ? 0 : 1) || a.name.localeCompare(b.name, "ko"));
    renderUsers();
  }, (e) => { statusEl.textContent = "회원 목록을 불러오지 못했어요. (" + e.code + ")"; });

  unsubReports = onSnapshot(collection(db, "reports"), (snap) => {
    reports = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
    renderReports();
  }, (e) => { reportsEl.replaceChildren(el("p", "muted", "신고 목록을 불러오지 못했어요. (" + e.code + ")")); });
}

export function unmount() {
  if (unsubUsers) { unsubUsers(); unsubUsers = null; }
  if (unsubReports) { unsubReports(); unsubReports = null; }
  users = []; reports = [];
}

onProfiles(() => { if (unsubReports) renderReports(); });

// ───────── 신고 ─────────
function groups() {
  const map = new Map();
  for (const r of reports) {
    const key = r.postId + "/" + (r.commentId || "");
    if (!map.has(key)) map.set(key, { key, postId: r.postId, commentId: r.commentId || "", authorUid: r.authorUid, preview: r.preview, items: [] });
    map.get(key).items.push(r);
  }
  const time = (g) => Math.max(...g.items.map((r) => r.createdAt?.toMillis?.() || 0));
  return [...map.values()].sort((a, b) => time(b) - time(a));
}

// 신고된 글 · 댓글의 지금 내용을 받아 옵니다 (이미 지워졌으면 null)
function loadTarget(g) {
  if (!targets.has(g.key)) {
    const ref = g.commentId ? doc(db, "posts", g.postId, "comments", g.commentId) : doc(db, "posts", g.postId);
    targets.set(g.key, { loading: true, data: undefined });
    getDoc(ref)
      .then((s) => { targets.set(g.key, { data: s.exists() ? s.data() : null }); })
      .catch(() => { targets.set(g.key, { data: null }); })
      .finally(() => { if (unsubReports) renderReports(); });
  }
  return targets.get(g.key);
}

function renderReports() {
  const list = groups();
  reportsHead.textContent = "신고" + (list.length ? " " + list.length + "건" : "");
  const label = tabEl?.querySelector("span");
  if (label) label.textContent = list.length ? "관리 " + list.length : "관리";
  if (!list.length) {
    reportsEl.replaceChildren(el("div", "card muted", "들어온 신고가 없어요. 👍"));
    return;
  }
  reportsEl.replaceChildren(...list.map(renderReport));
}

function renderReport(g) {
  const card = el("div", "card report");
  const author = profileOf(g.authorUid, "알 수 없음");
  const top = el("div", "report-top");
  top.append(el("span", "badge badge-banned", g.commentId ? "댓글" : "게시물"), el("strong", "", author.name + " 님이 쓴 글"));
  card.append(top);

  const t = loadTarget(g);
  const content = el("div", "report-content");
  if (t.loading) content.append(el("p", "muted", "내용을 불러오는 중…"));
  else if (t.data === null) content.append(el("p", "muted", "이미 삭제된 글이에요."));
  else if (g.commentId) content.append(el("p", "post-text", t.data.text));
  else content.append(renderPostBody(g.postId, t.data));
  card.append(content);

  const why = el("ul", "report-reasons");
  for (const r of g.items) {
    const li = el("li");
    li.append(el("b", "", profileOf(r.reporter, "누군가").name + ": "), document.createTextNode(r.reason || "(이유를 적지 않았어요)"));
    why.append(li);
  }
  card.append(why);

  const acts = el("div", "row end");
  const keep = el("button", "btn btn-soft btn-small", t.data === null ? "신고 지우기" : "문제없음");
  keep.addEventListener("click", () => clearReports(g).catch((e) => alert("처리하지 못했어요. (" + e.code + ")")));
  acts.append(keep);
  if (t.data) {
    const del = el("button", "btn btn-danger btn-small", g.commentId ? "댓글 삭제" : "게시물 삭제");
    del.addEventListener("click", async () => {
      if (!confirm("신고된 " + (g.commentId ? "댓글" : "게시물") + "을 삭제할까요?")) return;
      try {
        if (g.commentId) await deleteComment(g.postId, g.commentId);
        else await deletePost(g.postId, t.data);
        await clearReports(g);
      } catch (e) { alert("삭제하지 못했어요. (" + e.code + ")"); }
    });
    acts.append(del);
  }
  card.append(acts);
  return card;
}

async function clearReports(g) {
  const batch = writeBatch(db);
  for (const r of g.items) batch.delete(doc(db, "reports", r.id));
  await batch.commit();
  targets.delete(g.key);
}

// ───────── 회원 ─────────
// 이메일은 한 번 받아 두고 다시 씁니다. 아직 없으면 조금 뒤에 다시 찾아봅니다.
function emailOf(uid) {
  const hit = emails.get(uid);
  if (hit && (hit.value || hit.loading || Date.now() - hit.at < 15000)) return hit.value;
  const entry = { value: hit?.value || "", loading: true, at: Date.now() };
  emails.set(uid, entry);
  getDoc(doc(db, "userEmails", uid))
    .then((s) => { entry.value = s.exists() ? s.data().email : ""; })
    .catch(() => {})
    .finally(() => { entry.loading = false; entry.at = Date.now(); if (unsubUsers) renderUsers(); });
  return entry.value;
}

function renderUsers() {
  const key = searchEl.value.trim().toLowerCase();
  const rows = users.filter((u) => {
    if (!key) return true;
    const mail = emails.get(u.uid)?.value || "";
    return u.name.toLowerCase().includes(key) || mail.toLowerCase().includes(key);
  });
  statusEl.textContent = "회원 " + users.length + "명" + (key ? " 중 " + rows.length + "명" : "");
  listEl.replaceChildren(...rows.map(renderRow));
}

function renderRow(u) {
  const row = el("div", "user-row");
  const img = el("img");
  img.alt = "";
  const fb = el("span", "avatar-fallback");
  setAvatar(img, fb, u.photoURL, u.name);

  const who = el("div", "who");
  const name = el("strong", "", u.name);
  const self = u.uid === state.user.uid;
  if (self) name.append(el("span", "badge", "나"));
  if (u.role === "admin") name.append(el("span", "badge badge-admin", "관리자"));
  if (u.banned) name.append(el("span", "badge badge-banned", "차단됨"));
  const mail = el("span", "mail", emailOf(u.uid));
  who.append(name, mail);
  row.append(img, fb, who);

  if (!self) {
    const acts = el("div", "acts");
    const roleBtn = el("button", "btn btn-soft btn-small", u.role === "admin" ? "관리자 해제" : "관리자로 올리기");
    roleBtn.addEventListener("click", () => change(u, { role: u.role === "admin" ? "user" : "admin" },
      u.role === "admin" ? u.name + " 님의 관리자 권한을 없앨까요?" : u.name + " 님을 관리자로 올릴까요?"));
    const banBtn = el("button", "btn btn-small " + (u.banned ? "btn-soft" : "btn-danger"), u.banned ? "차단 풀기" : "차단");
    banBtn.addEventListener("click", () => change(u, { banned: !u.banned },
      u.banned ? u.name + " 님의 차단을 풀까요?" : u.name + " 님의 계정을 차단할까요? 차단되면 사이트를 쓸 수 없어요."));
    acts.append(roleBtn, banBtn);
    row.append(acts);
  }
  return row;
}

async function change(u, data, question) {
  if (!confirm(question)) return;
  try {
    await updateDoc(doc(db, "users", u.uid), data);
  } catch (e) {
    alert("바꾸지 못했어요. (" + e.code + ")");
  }
}
