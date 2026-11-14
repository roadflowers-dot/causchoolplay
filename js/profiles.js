// 다른 회원의 닉네임 · 프로필 사진을 한 번만 받아 와서 여러 화면이 함께 씁니다.
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";

const cache = new Map(); // uid → { name, photoURL } | null(받는 중)
const listeners = new Set();
let queued = false;

function notify() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => { queued = false; listeners.forEach((fn) => fn()); });
}

// 프로필이 새로 도착하거나 바뀌면 fn 을 불러 줍니다
export function onProfiles(fn) { listeners.add(fn); }

export function setProfile(uid, profile) {
  const old = cache.get(uid);
  cache.set(uid, profile);
  if (!old || old.name !== profile.name || old.photoURL !== profile.photoURL) notify();
}

// 아직 모르는 회원이면 일단 fallback 을 돌려주고, 받아 오면 onProfiles 로 알려 줍니다
export function profileOf(uid, fallbackName, fallbackPhoto) {
  const known = cache.get(uid);
  if (known) return known;
  if (uid && !cache.has(uid)) {
    cache.set(uid, null);
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists()) { cache.set(uid, snap.data()); notify(); }
    }).catch(() => {});
  }
  return { name: fallbackName || "친구", photoURL: fallbackPhoto || "" };
}
