// 관리 화면: 회원 목록, 관리자 승급/해제, 계정 차단/해제.
// 이 파일은 관리자로 확인된 사람에게만 불러와집니다. 다른 사람이 이 코드를 직접 실행해도
// firestore.rules 가 관리자가 아닌 사람의 요청을 모두 거부합니다.
import {
  collection, doc, getDoc, updateDoc, onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db, setAvatar, el } from "./firebase.js";

let unsubscribe = null;
let users = [];
let state = null;
let listEl = null, searchEl = null, statusEl = null;
const emails = new Map();

export function mount(container, appState) {
  state = appState;
  const head = el("div", "page-head");
  head.append(el("h2", "display", "관리"), el("p", "muted", "회원 권한을 바꾸거나 계정을 차단할 수 있어요. 게시물은 게시물 탭에서 삭제해요."));

  const card = el("div", "card");
  const tools = el("div", "admin-tools field");
  searchEl = el("input");
  searchEl.type = "search";
  searchEl.placeholder = "닉네임이나 이메일로 찾기";
  searchEl.addEventListener("input", render);
  tools.append(searchEl);
  statusEl = el("p", "muted");
  listEl = el("div");
  card.append(tools, statusEl, listEl);
  container.replaceChildren(head, card);

  unsubscribe = onSnapshot(collection(db, "users"), (snap) => {
    users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    users.sort((a, b) => (a.role === "admin" ? 0 : 1) - (b.role === "admin" ? 0 : 1) || a.name.localeCompare(b.name, "ko"));
    render();
  }, (e) => { statusEl.textContent = "회원 목록을 불러오지 못했어요. (" + e.code + ")"; });
}

export function unmount() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  users = [];
}

// 이메일은 한 번 받아 두고 다시 씁니다. 아직 없으면 조금 뒤에 다시 찾아봅니다.
function emailOf(uid) {
  const hit = emails.get(uid);
  if (hit && (hit.value || hit.loading || Date.now() - hit.at < 15000)) return hit.value;
  const entry = { value: hit?.value || "", loading: true, at: Date.now() };
  emails.set(uid, entry);
  getDoc(doc(db, "userEmails", uid))
    .then((s) => { entry.value = s.exists() ? s.data().email : ""; })
    .catch(() => {})
    .finally(() => { entry.loading = false; entry.at = Date.now(); if (unsubscribe) render(); });
  return entry.value;
}

function render() {
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
