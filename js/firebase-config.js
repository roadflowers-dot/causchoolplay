// Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹) 에서 복사한 값입니다.
// (이 값들은 비밀 키가 아니라서 GitHub에 올려도 괜찮습니다. 보안은 firestore.rules 가 담당합니다.)
export const firebaseConfig = {
  apiKey: "AIzaSyCmM0Oo0Yas3Arh-ppg-k4kf9bR9XF8GKM",
  authDomain: "causchoolplay.firebaseapp.com",
  projectId: "causchoolplay",
  storageBucket: "causchoolplay.firebasestorage.app",
  messagingSenderId: "786931717152",
  appId: "1:786931717152:web:d87bca6f31ace524f95845",
};

// 사이트 주인(첫 관리자) 이메일의 SHA-256 값. 이메일 자체는 적지 않습니다.
// 실제 권한 검사는 firestore.rules 가 하며, 이 값은 화면 처리용입니다.
export const ownerEmailHash = "a74afa58f75b50e5740dd656a4e57c01c4659511c4ce88703db3f3267ef63d86";

// 내 컴퓨터에서 Firebase 에뮬레이터로 시험할 때만 true 로 바꿉니다.
export const localEmulators = false;
