# ycpraying-school — Codex Handoff (v1.3.0 + 미션 스케줄 조정)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: `e3d0ce1` — `feat: 사도행전 2장 전체 필사 배분 및 암송일 인증 UI 제거`
- 워킹트리 클린 (모두 커밋됨). `.claude/launch.json`만 untracked (로컬 dev 서버 설정, 커밋 대상 아님)
- Firebase Hosting 배포 완료 (`https://ycpraying-school.web.app`, 2026-07-16)
- origin/main에 push 완료 (v1.3.0 커밋들 + 이번 미션 스케줄 조정 커밋들 모두 반영)

## 방금 수정한 내용 (이번 세션 — 미션 스케줄 조정, v1.3.0 이후 후속 작업)

일일미션 `MISSION_SCHEDULE`을 사용자 피드백에 따라 3차례 조정했다 (커밋 순서대로):

1. **`5f95dc2`** — 토요일도 필사일이 되도록 2:14-42(29절)를 5/5/5/5/5/4로 6일 재배분 (기존엔 토요일이 "5일치 복습" 특수일이었음)
2. **`e80fb6f`** — 주일(7일차) 암송 구절 `desc`를 사도행전 2:17 전체 문장으로 확장 (기존엔 앞 구절만 표시)
3. **`e3d0ce1`** — 사용자가 "14~42절은 분량이 너무 적다"고 판단 → 사도행전 2장 전체(1~47절, 총 47절)를 6일로 재배분: 8/8/8/8/8/7절. 그리고 7일차(주일) 암송일에서 **인증/제출 UI를 완전히 제거**(`noSubmit:true` 플래그 신설)

### `noSubmit` 플래그 동작 (`script.js` `openMissionPopup()` ~line 1042)
- `mission.noSubmit === true`이면: 선물배너, 시간제한안내, 업로드섹션, 완료섹션, 멤버섹션을 모두 `display:none` 처리하고 Firebase `missionRef.on('value', ...)` 리스너를 아예 붙이지 않고 즉시 return
- 구절 라벨(`#mission-scripture-label`)도 `noSubmit` 여부에 따라 "오늘의 필사 구절" ↔ "오늘의 암송 구절"로 동적 전환
- `index.html`에 `#mission-scripture-label`, `#mission-members-section` id를 새로 추가해서 JS가 이 두 요소를 제어할 수 있게 함
- 검증: `?missionTest=1~7` 쿼리로 각 요일 팝업을 브라우저에서 직접 열어 스크린샷 확인 완료 (7일차: 인증 UI 전혀 없음, 3일차/6일차: 정상 제출 UI 유지, 콘솔 에러 없음)

### 최종 `MISSION_SCHEDULE` (2026-07-20 ~ 2026-07-26)
| 일차 | 날짜 | 범위 | 절수 | 비고 |
|---|---|---|---|---|
| 1일차 | 07-20 | 2:1-8 | 8절 | 필사+인증 |
| 2일차 | 07-21 | 2:9-16 | 8절 | 필사+인증 |
| 3일차 | 07-22 | 2:17-24 | 8절 | 필사+인증 |
| 4일차 | 07-23 | 2:25-32 | 8절 | 필사+인증 |
| 5일차 | 07-24 | 2:33-40 | 8절 | 필사+인증 |
| 6일차 | 07-25 | 2:41-47 | 7절 | 필사+인증 |
| 주일(7일차) | 07-26 | 2:17 암송 | - | **암송만, 인증 UI 없음** (`noSubmit:true`) |

### 캐시 버전 — 갱신 안 함
콘텐츠/조건분기 변경일 뿐이고 Service Worker는 동일 출처 리소스에 Network-First 전략을 쓰므로, 이번 3개 커밋 모두 `CACHE_NAME`/`?v=` 버전 갱신을 하지 않았다 (기존 `v=103`/`yc-school-v13` 그대로 유지).

---

## 이전 세션 작업 (v1.3.0)

일일미션에 **제출 가능 시간대 제한** + **듀얼 당첨자(1등 + 랜덤)** + **당첨 축하 강화** + **관리자용 당첨자 목록**을 추가했다. 관련 계획 문서: [docs/superpowers/plans/2026-07-16-mission-time-window-dual-winners.md](../docs/superpowers/plans/2026-07-16-mission-time-window-dual-winners.md)

### 1. 제출 가능 시간대 제한 (KST 07:00~자정)
- 커밋: `4bda528`(KST 헬퍼), `a81fe50`(안내 카드 마크업/스타일), `b22f524`(팝업/재제출 게이트 적용)
- `script.js`: `getKstHour()`, `isMissionSubmitWindowOpen()`, `_getPrevKstDateStr(dateStr)` 추가
- 07:00 이전에는 미션 팝업에 "아직 제출 시간이 아니에요" 안내 카드가 뜨고 제출/재제출이 막힘

### 2. 듀얼 당첨자 — 1등(기존) + 랜덤(신규, 저수지 표본추출)
- 커밋: `5bb18ef`(축하 팝업 강화 + 랜덤 당첨 로직), `ea26206`(재제출 시 중복참가/중복당첨 버그 수정), `c471eff`(익일 1회성 알림), `0dc932a`(인트로 화면 뒤에 가려지는 버그 수정)
- RTDB: `missions/{date}/_randomWinner` = `{sessionId, memberName, timestamp, count, entrants}` 추가 (기존 `_firstPlace`와 형제 키)
- 저수지 표본추출(reservoir sampling)로 그날 제출자 중 1명을 공정하게 랜덤 선정, 당일 1등과 중복 불가, 전날 랜덤 당첨자와 연속 2일 중복 불가
- 랜덤 당첨자는 **익일**에만 1회성 팝업으로 공개(그날 당일에는 비공개 — 공정성/서스펜스 목적)
- 버그 수정: 재제출(`editMissionSubmission`) 시 `entrants` 배열에 세션이 중복 추가되던 문제, 1등이 랜덤에도 중복 당첨될 수 있던 문제 — 둘 다 수정 완료
- 버그 수정: `_checkRandomWinnerNotification()` 호출 시점이 `enterApp()` 이전(인트로 화면 z-index 20000 뒤)이라 팝업(z-index 4000)이 가려지던 문제 → `enterApp()`의 `setTimeout` 콜백 내부로 이동

### 3. 당첨 축하 강화
- 멀티버스트 컨페티 + "선물은 카카오톡으로 전달됩니다" 안내 포함 팝업 모달(`#mission-winner-popup`)

### 4. 관리자용 당첨자 목록 모달
- 커밋: `2637515`
- `#btn-gift-winners` 버튼(관리자 로그인 시에만 노출) → `openGiftWinnersModal()`이 `missions` 전체를 조회해 날짜별 1등/랜덤 당첨자를 나열
- `escHtml`로 XSS 방지, `#gift-winners-modal` 마크업/스타일은 기존 `.admin-box`/`.color-close-btn` 패턴 재사용

### 5. 배너 UI 개편
- 커밋: `c2a3d44`
- 시크릿기프트 배너를 1줄 → 2줄 구조로 변경: 1행 "🎁 1등 당첨자: OOO님", 2행 "🎲 랜덤 당첨자는 자정 이후 확정돼요"
- `_renderMissionMembers()`는 `_firstPlace`, `_randomWinner` 둘 다 멤버 그리드에서 필터링

### 6. 캐시 버전 갱신
- 커밋: `e7b796f`
- `index.html`: `script.js?v=103`
- `sw.js`: 버전 주석 `103 (v1.3.0)`, `CACHE_NAME='yc-school-v13'`

### 검증 (직접 브라우저로 abbreviated 검증 — 사용자 요청으로 서브에이전트 왕복 생략)
- 콘솔 에러 없음 (로드 시, 앱 진입 시 모두)
- 미션 팝업 정상 오픈
- 새 2줄 배너가 실제 프로덕션 RTDB 데이터로 정상 렌더링 확인
- 관리자 당첨자 목록 모달이 실제 프로덕션 데이터(복수 날짜)로 정상 조회/렌더링 확인
- **주의**: 계획서 Task 11의 9단계 전체 시나리오(07시 이전 시간 게이트 카드, 멀티세션 재추첨 동작, 랜덤 당첨자 익일 알림 팝업의 RTDB 테스트 데이터 시딩 등)는 시간 단축을 위해 생략함 — 해당 경로들은 서브에이전트 코드 리뷰 단계에서 이미 로직 검증됨

### ⚠️ 알려진 이슈 — Browser 프리뷰 도구의 cwd 드리프트 버그
`preview_start{name:...}`가 이 프로젝트가 아닌 형제 저장소(`~/Projects/ycpraying`)의 서버 목록을 반환하는 경우가 있음(예: "python-server", "npx-serve" — 이 프로젝트의 `.claude/launch.json`에는 없는 이름들). 이런 증상이 보이면 Service Worker 캐시 문제로 착각하지 말고, `Bash`로 직접 `python3 -m http.server <PORT> & disown`를 이 프로젝트 디렉터리에서 실행한 뒤 `preview_start{url:"http://localhost:<PORT>"}`로 우회할 것. 반드시 `curl | grep`이나 `document.querySelector('script[src^="script.js"]').src`로 실제 서빙되는 파일 버전을 확인한 뒤 검증을 신뢰할 것.

## 프로젝트 개요
- **프레임워크:** 순수 HTML/JS/CSS PWA (no build step)
- **DB:** Firebase Realtime Database, region `asia-southeast1` (`/members`, `/messages`, `/presence`, `/centerNode`, `/fcmTokens`, `/missions/{date}/{sessionId}`, `/missions/{date}/_firstPlace`, `/missions/{date}/_randomWinner`)
- **그래프:** D3.js v7 force simulation (S1 방식: 태양계 없음)
- **호스팅:** Firebase Hosting (`ycpraying-school.web.app`)
- **인증:** Firebase Anonymous Auth (완전 익명, 등록 멤버와 세션 매칭 불가)
- **알림:** FCM (Cloud Functions 미배포 — Blaze 플랜 업그레이드 후 가능)
- **테스트:** 공식 테스트 스위트 없음. `node --check script.js` 등으로 구문 검증, 브라우저 실사용 수동 검증이 전부

## 주요 파일
| 파일 | 역할 |
|---|---|
| `index.html` | PWA 진입점. `#mission-name-input`, `#mission-prayer-input`, `#mission-gift-banner`(2줄), `#mission-winner-popup`, `#gift-winners-modal`, `#btn-gift-winners`, `#lightbox-caption` 포함. `script.js?v=103` |
| `script.js` | 전체 앱 로직. `MISSION_SCHEDULE`, `getKstHour()`/`isMissionSubmitWindowOpen()`/`_getPrevKstDateStr()`, `submitMission()`(1등 트랜잭션+랜덤 저수지 표본추출), `_checkRandomWinnerNotification()`(enterApp 내부에서 호출), `_renderMissionMembers()`(1등/랜덤 필터링+배너), `openGiftWinnersModal()`/`closeGiftWinnersModal()`(관리자 당첨자 목록), `openLightbox(src, caption)`, `checkAdmin()` |
| `sw.js` | Service Worker, 버전 주석 `103 (v1.3.0)`, `CACHE_NAME='yc-school-v13'` |
| `database.rules.json` | `missions: {".read":true, "$date":{"$sessionId":{".write":true}}}` — `_firstPlace`/`_randomWinner`도 `$date` 하위 키라 규칙 변경 불필요 |
| `functions/index.js` | S1용 Cloud Functions 4개 (미배포) |
| `docs/superpowers/specs/`, `docs/superpowers/plans/` | superpowers 워크플로우 설계/계획 문서 |

## 다음으로 할 수 있는 작업
1. 로컬 커밋들을 origin에 push할지 여부 — 사용자에게 아직 확인받지 못함, 다음 세션에서 먼저 물어볼 것
2. 계획서 Task 11의 abbreviated된 나머지 시나리오(07시 이전 게이트 카드 실사용, 멀티세션 재추첨, 랜덤 당첨자 익일 알림 팝업)를 실제 다음날 자연 발생 시 또는 RTDB 테스트 데이터로 재확인
3. 전체 구현에 대한 최종 코드 리뷰(서브에이전트) 및 `finishing-a-development-branch` 절차 — 사용자의 "너무 오래 걸리는데" 피드백으로 인해 다음 세션에서 생략 여부를 먼저 확인할 것
4. 익명 세션과 등록 멤버를 실제로 매칭하는 기능 (현재는 자유 텍스트 이름 입력으로 대체)
5. Cloud Functions 배포 및 실제 푸시 알림 활성화 (Blaze 플랜 업그레이드 필요)

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
