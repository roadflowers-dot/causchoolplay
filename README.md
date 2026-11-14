# 중대부초 놀이터

중대부초 학생들이 게임과 취미 생활을 함께 즐기는 웹사이트입니다.
빌드 과정이 없는 정적 사이트이며 Firebase(로그인 · Firestore · Storage)를 사용합니다.

## 구성

| 화면 | 설명 |
| --- | --- |
| 로그인 | 구글 로그인 또는 방문자(익명)로 입장 |
| 게임 | `js/games.js` 목록의 게임을 사이트 안에서 실행 |
| 게시물 | 구글 로그인 사용자 전용. 글 · 사진 · 파일을 올리면 실시간으로 모두에게 표시 |
| 계정 | 내 계정 정보, 방문자 → 구글 계정 전환, 로그아웃 |

```
index.html            화면 구조
css/style.css         디자인
js/app.js             로그인 · 탭 · 게시물 로직
js/firebase-config.js Firebase 프로젝트 설정 (직접 입력)
js/games.js           게임 목록
games/star-run/       별똥별 달리기 (오리지널 게임)
firestore.rules       게시물 보안 규칙
storage.rules         첨부 파일 보안 규칙
firebase.json         Firebase 배포 설정
```

## Firebase 연결 방법

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트를 만들고 웹 앱을 추가합니다.
2. 웹 앱 설정 값을 `js/firebase-config.js`에 붙여 넣습니다.
3. **Authentication → 로그인 방법**에서 `Google`과 `익명`을 켭니다.
4. **Firestore Database**와 **Storage**를 만듭니다. (Storage는 Blaze 요금제가 필요합니다.)
5. 보안 규칙과 사이트를 배포합니다.

```bash
firebase deploy
```

다른 곳(GitHub Pages 등)에 배포한다면 **Authentication → 설정 → 승인된 도메인**에 그 주소를 추가해야 합니다.

## 내 컴퓨터에서 실행

```bash
python3 -m http.server 8000
```

그 뒤 브라우저에서 `http://localhost:8000` 을 엽니다.

## 게임 추가

`games/` 아래에 게임 폴더(`index.html` 포함)를 만들고 `js/games.js`에 항목을 추가하면 됩니다.
