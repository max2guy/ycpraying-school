# ycpraying-school — Codex Handoff (v1.0.0)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: 4902578 — feat: 연천장로교회 중고등부 수련회 기도회 앱 초기 구성
- **Firebase Hosting 배포 완료** ✅
- **Cloud Functions 미배포** (Blaze 플랜 필요)

## 방금 수정한 내용

### ycpraying(청년부)에서 중고등부 전용 앱으로 분리
- `ycpraying` 프로젝트를 `ycpraying-school`로 복사
- S2 코드 완전 제거: `s2-entry.js` 삭제, `switchSeason`, `S2Entry`, `SEASON_MUSIC[s2]`, s2 Firebase 경로 등 모두 제거
- Firebase 프로젝트 신규 생성: `ycpraying-school`
- Realtime Database: `ycpraying-school-default-rtdb.asia-southeast1.firebasedatabase.app`
- Hosting 배포: `https://ycpraying-school.web.app` ✅

### 타이틀 변경
- `<title>`: 연천장로교회 중고등부: 수련회를 위한 기도회
- `<h1>`: 연천장로교회 중고등부
- 부제: 수련회를 위한 기도회
- 그래프 중앙 노드: 연천장로교회\n중고등부\n수련회 기도회
- 기도 모드: 수련회를 위한\n우리 기도

## 프로젝트 개요
- **프레임워크:** 순수 HTML/JS/CSS PWA (no build step)
- **DB:** Firebase Realtime Database (`/members`, `/messages`, `/presence`, `/centerNode`, `/fcmTokens`)
- **그래프:** D3.js v7 force simulation (S1 방식: 태양계 없음)
- **호스팅:** Firebase Hosting (`ycpraying-school.web.app`)
- **인증:** Firebase Anonymous Auth
- **알림:** FCM (Cloud Functions 미배포 — Blaze 플랜 업그레이드 후 가능)

## 주요 파일
| 파일 | 역할 |
|---|---|
| `index.html` | PWA 진입점 (`script.js?v=91`) |
| `script.js` | 전체 앱 로직, CURRENT_VERSION='1.0.0', S1 전용 |
| `sw.js` | Service Worker, CACHE_NAME='yc-school-v1' |
| `functions/index.js` | S1용 Cloud Functions 4개 (미배포) |
| `firebase.json` | Hosting + Functions + Database 설정 |
| `.firebaserc` | 프로젝트: ycpraying-school |

## Firebase 설정
```js
const firebaseConfig = {
    apiKey: "AIzaSyCwQo19qhz6W-j_fKFef6OXSJhrRfOIwLE",
    authDomain: "ycpraying-school.firebaseapp.com",
    databaseURL: "https://ycpraying-school-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ycpraying-school",
    storageBucket: "ycpraying-school.firebasestorage.app",
    messagingSenderId: "306183429866",
    appId: "1:306183429866:web:22c833d483d69fccec0193"
};
```

## 다음으로 할 수 있는 작업

### 즉시 필요
1. `https://ycpraying-school.web.app` 접속하여 앱 동작 확인
2. 멤버 추가 테스트 (FAB 메뉴 > + 버튼)

### 선택 사항
3. **FCM 알림 활성화** (Blaze 플랜 업그레이드 필요):
   - Firebase 콘솔 > ycpraying-school > Blaze로 업그레이드
   - `firebase deploy --only functions --project ycpraying-school`
   - Firebase 콘솔 > 프로젝트 설정 > 클라우드 메시징 > 웹 푸시 인증서 생성
   - `script.js`의 `FCM_VAPID_KEY = ''` 에 생성된 키 입력 후 재배포
4. **타이틀 쉽게 변경**: `index.html`의 `<title>`, `<h1>`, `<p id="intro-subtitle">` 및 `script.js`의 `centerNode.name` 수정

## 빌드 & 배포
```bash
# Hosting 재배포
firebase deploy --only hosting --project ycpraying-school

# Database Rules 재배포
firebase deploy --only database --project ycpraying-school

# Functions 배포 (Blaze 플랜 필요)
firebase deploy --only functions --project ycpraying-school

# 로컬 테스트
python3 -m http.server 8080
```

## GitHub
- 저장소: https://github.com/max2guy/ycpraying-school
- 배포: Firebase Hosting (GitHub Pages 아님)
