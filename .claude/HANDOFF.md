# ycpraying-school — Codex Handoff (v1.2.1)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: `018f9dd` — feat: 수련회 사전 일일미션 기능 추가 (필사+암송 인증) (v1.1.0)
- **현재 워킹트리에 커밋되지 않은 변경사항 있음** (아래 "방금 수정한 내용" 참고) — `index.html`, `script.js`, `style.css`, `sw.js`
- Firebase Hosting 배포 완료 ✅ (커밋되지 않은 변경사항도 이미 `firebase deploy`로 배포됨 — 배포된 `script.js?v=98`이 로컬 소스와 일치함을 확인함)
- Cloud Functions 미배포 (Blaze 플랜 필요)

## 방금 수정한 내용 (이번 세션)

### 1. 일일미션 버튼 위치 변경 (좌상단 → 하단 중앙)
- `style.css`의 `.mission-btn`: `top:138px; left:28px` → `bottom:104px; left:50%; transform:translateX(-50%)` + pulse 애니메이션 추가
- 모바일 미디어쿼리도 하단 중앙 기준으로 조정 (`bottom:calc(92px + env(safe-area-inset-bottom))`)

### 2. 미션 날짜 게이팅 제거 (7/20 이전에도 열람/인증 가능하도록)
- 원래는 실제 시스템 날짜가 스케줄(`MISSION_SCHEDULE`, 2026-07-20~26)과 정확히 일치할 때만 동작 → 앱 정식 공개일(7/20) 전에는 미리 확인/테스트가 불가능했음
- **사용자 요청**: "20일날 오픈 안해도됨 앱도 20일에 공개하는거니까 지금부터 열어도 됨"
- `getTodayMission()`에 클램핑 로직 추가: 오늘이 스케줄 시작일 이전이면 1일차, 이후면 마지막 날(7일차)을 반환 → 항상 유효한 미션 객체 반환
- **중요**: RTDB 저장 키를 `getTodayKstDateStr()`(실제 시스템 날짜)가 아니라 `mission.date`(스케줄 자체의 날짜 필드)로 변경 — 그래야 사전 테스트 제출이 실제 날짜(예: 7/12)가 아닌 진짜 미션 날짜(예: 7/20) 밑에 저장되어, 나중에 정식 오픈 때도 같은 위치의 데이터가 이어짐
- 이 변경으로 `openMissionPopup()`, `submitMission()`의 `missionsRef.child(...)` 경로가 모두 `mission.date` 기준으로 통일됨

### 3. 미션 제출 삭제/재제출 기능 추가 (실수로 올린 사진 수정용)
- **사용자 요청**: "실수로 올린거 삭제하고 수정하고 이런게 필요한데..."
- 완료 화면에 `✏️ 다시 제출하기` 버튼 추가 (`index.html`의 `.mission-done-section` 안)
- `editMissionSubmission()` 함수 신규 추가 (`script.js`): `confirm()` 확인 후 `missionsRef.child(mission.date).child(mySessionId).remove()` → 성공 시 업로드 화면으로 복귀
- 기존 코드베이스에 이미 9곳 이상 존재하는 `confirm()` 기반 파괴적 액션 패턴과 동일하게 구현

### 4. 미션 제출 성공 효과를 "이스터에그" 재사용에서 전용 효과로 교체
- **문제**: 기존 `submitMission()` 성공 콜백이 `triggerHeartRain()`을 호출했는데, 이 함수는 원래 접속자 수 5회 클릭 시 발동하는 **숨겨진 이스터에그 토글**(`isHeartRain`)이다. 재사용 시 문제:
  - "이스터에그 발견! 🎁" 이라는 문구가 미션 완료와 전혀 안 맞음
  - `centerNode.icon`/`centerNode.name`을 전역으로 바꾸는 **토글**이라 그래프를 보는 다른 모든 접속자에게도 영향을 줌 (미션 완료는 개인 행위인데 전체 공유 상태를 건드림)
  - 토글이므로 이미 켜져 있으면 미션 제출 시 오히려 꺼져버리는 등 상태가 예측 불가능
- **해결**: `script.js`의 `submitMission()` 성공 콜백에서 `triggerHeartRain()` 제거 → 기존에 "아멘" 리액션(`toggleAmen`, 1403행)에서 쓰던 **1회성 불꽃 파티클** `createFirework(x, y)`를 제출 버튼 위치에서 발동 + `showWeatherToast('🎉 미션 완료!', '오늘도 은혜로운 하루 되세요 🙏', 4000)`로 교체. 전역 상태를 건드리지 않는 개인 전용 축하 효과.
- 브라우저에서 실제 제출 테스트로 검증 완료: 토스트 문구 정상 표시, centerNode 변경 없음, RTDB에도 정상 기록됨을 확인

### 캐시 버전
- `index.html`: `style.css?v=77`, `script.js?v=98`
- `sw.js`: `CACHE_NAME='yc-school-v8'`, 버전 주석 `98 (v1.2.1)`

## 이번 세션에서 있었던 이슈 (버그 아님, 참고용)
- 브라우저로 제출 테스트 중 `missions/2026-07-12`에 낡은 테스트 데이터(사용자가 직접 올린 구역/구역장 표 사진)가 남아있고, `missions/2026-07-20`은 비어있는 것처럼 보여 혼란이 있었음
- **원인 규명**: 배포된 `script.js`(v97)는 로컬 소스와 완전히 일치하며 정상 동작함. 다만 테스트에 쓰던 브라우저 탭이 한동안 구버전(v96, 날짜 게이팅 수정 전 코드)을 캐시에서 실행하고 있었고, 그때 제출된 데이터가 `missions/2026-07-12`(실제 날짜 기준 구버전 키)에 남은 것. v97로 새로고침 후 다시 제출하니 정확히 `missions/2026-07-20`에 기록됨을 REST API로 직접 확인함 → **코드에는 문제 없음**
- `missions/2026-07-12/user_1783863291040`(구버전 테스트)와 `missions/2026-07-20/user_1783863291040`(이번 세션 검증용 테스트) 둘 다 프로덕션 RTDB에 남아있음 — 사용자가 "삭제하지 않음"을 선택해서 그대로 둠. 정식 오픈(7/20) 전에 정리 필요할 수 있음

## 프로젝트 개요
- **프레임워크:** 순수 HTML/JS/CSS PWA (no build step)
- **DB:** Firebase Realtime Database, region `asia-southeast1` (`/members`, `/messages`, `/presence`, `/centerNode`, `/fcmTokens`, `/missions/{date}/{sessionId}`)
- **그래프:** D3.js v7 force simulation (S1 방식: 태양계 없음)
- **호스팅:** Firebase Hosting (`ycpraying-school.web.app`)
- **인증:** Firebase Anonymous Auth
- **알림:** FCM (Cloud Functions 미배포 — Blaze 플랜 업그레이드 후 가능)

## 주요 파일
| 파일 | 역할 |
|---|---|
| `index.html` | PWA 진입점 (`style.css?v=77`, `script.js?v=97`) |
| `script.js` | 전체 앱 로직. `MISSION_SCHEDULE`(127행), `getTodayMission()`(141행), `editMissionSubmission()`(submitMission 직후) |
| `sw.js` | Service Worker, `CACHE_NAME='yc-school-v7'` |
| `database.rules.json` | `missions: {".read":true, "$date":{"$sessionId":{".write":true}}}` — set/remove 모두 허용 |
| `functions/index.js` | S1용 Cloud Functions 4개 (미배포) |

## 다음으로 할 수 있는 작업
1. 워킹트리의 커밋되지 않은 변경사항(`index.html`, `script.js`, `style.css`, `sw.js`) 커밋 여부 확인 — 사용자 승인 필요
2. 정식 오픈(2026-07-20) 전에 `missions/2026-07-12` (구버전 테스트) 및 `missions/2026-07-20`의 초록색 테스트 이미지 정리 여부 결정
3. `editMissionSubmission()`의 실제 삭제(확인) 경로는 자동화 브라우저의 네이티브 `confirm()` 다이얼로그 제약으로 완전한 e2e 테스트는 못했음 (취소 경로는 검증 완료) — 코드 리뷰 수준으로만 검증됨

## 빌드 & 배포
```bash
# Hosting 재배포
firebase deploy --only hosting --project ycpraying-school

# Database Rules 재배포
firebase deploy --only database --project ycpraying-school

# 로컬 테스트
python3 -m http.server 8080
```

## GitHub
- 저장소: https://github.com/max2guy/ycpraying-school
- 배포: Firebase Hosting (GitHub Pages 아님)
