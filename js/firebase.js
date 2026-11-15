// Firebase 연결. 다른 파일들은 여기서 auth 와 db 를 가져다 씁니다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig, localEmulators } from "./firebase-config.js";

export const configured = !firebaseConfig.apiKey.startsWith("YOUR_");

export let auth = null;
export let db = null;

if (configured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  // 개발용: 내 컴퓨터에서 Firebase 에뮬레이터로 시험할 때만 켜집니다.
  if (localEmulators && ["localhost", "127.0.0.1"].includes(location.hostname)) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
}

// 구글이나 애플로 로그인한 사람이 정식 회원입니다 (방문자는 제외)
export const MEMBER_PROVIDERS = ["google.com", "apple.com"];
export const isMember = (u) => !!u && u.providerData.some((p) => MEMBER_PROVIDERS.includes(p.providerId));

// 프로필 사진과 이름 첫 글자 표시
export function setAvatar(imgEl, fallbackEl, photo, name) {
  if (photo) {
    imgEl.referrerPolicy = "no-referrer";
    imgEl.src = photo;
  } else {
    imgEl.removeAttribute("src");
  }
  imgEl.hidden = !photo;
  fallbackEl.hidden = !!photo;
  fallbackEl.textContent = (name || "?").trim().charAt(0).toUpperCase();
}

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
