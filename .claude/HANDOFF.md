# ycpraying-school — Codex Handoff (v1.2.5)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: `b48e7d0` — chore: 캐시 버전 v1.2.5로 갱신
- 워킹트리 클린 (모두 커밋됨). `.claude/launch.json`만 untracked (로컬 dev 서버 설정, 커밋 대상 아님)
- Firebase Hosting 배포 완료 ✅ (`https://ycpraying-school.web.app`, `script.js?v=102` 배포 및 브라우저 실사용 검증됨)
- Cloud Functions 미배포 (Blaze 플랜 필요, 이전 세션부터 유지되는 상태)
- 로컬 main이 origin/main보다 21개 커밋 앞서 있음 (push 여부는 아직 사용자 미결정 — 다음 세션에서 재확인 필요)

## 방금 수정한 내용 (이번 세션)

### 일일미션 기도문 작성 + 시크릿기프트(1등 표시) 기능
- **요청 배경**: 미션 인증사진만 올리던 기존 흐름에 기도문 작성을 필수화하고, 그날 가장 먼저 인증한 사람에게 앱 내에서만 보이는 "시크릿기프트"(실제로는 1,000원 상당의 편의점 상품권 — 금액/내용은 앱에 노출하지 않음) 배지를 부여. 실제 푸시 알림은 Blaze 플랜 업그레이드 전까지 범위 제외.
- **RTDB 구조 변경**: `missions/{date}/{sessionId}`에 `prayerText` 필드 추가. 형제 키로 `missions/{date}/_firstPlace` = `{sessionId, memberName, timestamp}` 추가. `database.rules.json`은 `$date` 하위 와일드카드 `.write:true`가 이미 커버하므로 규칙 변경 없음.
- **1등 판정 (race-safe)**: `missionDateRef.child('_firstPlace').transaction(current => current === null ? {...} : undefined)` — RTDB 트랜잭션으로 동시 제출에도 정확히 한 명만 당첨되도록 보장. 실패는 조용히 무시(`.catch(() => {})`), 보너스 기능이라 크리티컬하지 않음.
- **주요 변경 파일**:
  - `style.css`: `#lightbox-caption`(라이트박스 하단 캡션 오버레이), `.mission-gift-banner`/`.mission-gift-badge`(배너/배지 스타일) 추가
  - `index.html`: `#lightbox-caption` 요소, `#mission-gift-banner` 배너, `#mission-prayer-input` textarea 추가. `script.js?v=102`로 갱신
  - `script.js`:
    - `openLightbox(src, caption)` — 캡션 인자 추가(하위호환: `caption` 생략 시 기존과 동일 동작)
    - `_missionSubmittedPrayerText` 상태 변수 추가, `openMissionPopup()`/`_showMissionCompleted()`에서 기도문 초기화·프리필
    - `submitMission()` — 기도문 미입력 시 `🙏 기도문을 적어주세요!` alert로 제출 차단. 저장 성공 후 `_firstPlace` 트랜잭션 시도
    - `editMissionSubmission()` — 재제출 시 직전 기도문을 textarea에 프리필
    - `_renderMissionMembers()` — `_firstPlace` 필터링, 당첨자 칩에 🎁 배지 표시, `_updateGiftBanner()`로 배너 갱신
    - `_openMissionMemberPhoto()` — 라이트박스 호출 시 `prayerText`를 캡션으로 전달
  - `sw.js`: 버전 주석 102(v1.2.5), `CACHE_NAME='yc-school-v12'`
- **설계/계획 문서**: [docs/superpowers/specs/2026-07-16-ycpraying-school-design.md](../docs/superpowers/specs/2026-07-16-ycpraying-school-design.md), [docs/superpowers/plans/2026-07-16-mission-prayer-and-gift.md](../docs/superpowers/plans/2026-07-16-mission-prayer-and-gift.md)
- **브라우저 실사용 검증 완료** (로컬 `http.server` + 실제 프로덕션 RTDB, 검증 후 테스트 데이터 삭제):
  - 기도문 미입력 시 제출 차단
  - 사진+이름+기도문 정상 제출 → RTDB에 `prayerText` 저장, `_firstPlace` 트랜잭션으로 1등 기록
  - 배너("🎁 오늘의 시크릿기프트 당첨자: OOO님")와 멤버 칩 🎁 배지 정상 표시
  - 완료 멤버 칩 클릭 → 라이트박스에 사진+기도문 캡션 함께 표시
  - 두 번째 세션의 `_firstPlace` 트랜잭션은 `committed:false`로 실패, 최초 당첨자 유지 확인
  - "다시 제출하기" 클릭 시 직전 기도문이 입력창에 프리필
  - 캠프 포스터 이미지 클릭 → 캡션 없이 기존과 동일하게 라이트박스 동작 (회귀 없음)
- **의도적으로 범위 제외한 것**: 실제 푸시 알림(Blaze 플랜 필요), 시크릿기프트 금액/실물 내용의 앱 내 노출

### 캐시 버전
- `index.html`: `script.js?v=102`
- `sw.js`: `CACHE_NAME='yc-school-v12'`, 버전 주석 `102 (v1.2.5)`

## 프로젝트 개요
- **프레임워크:** 순수 HTML/JS/CSS PWA (no build step)
- **DB:** Firebase Realtime Database, region `asia-southeast1` (`/members`, `/messages`, `/presence`, `/centerNode`, `/fcmTokens`, `/missions/{date}/{sessionId}`, `/missions/{date}/_firstPlace`)
- **그래프:** D3.js v7 force simulation (S1 방식: 태양계 없음)
- **호스팅:** Firebase Hosting (`ycpraying-school.web.app`)
- **인증:** Firebase Anonymous Auth (완전 익명, 등록 멤버와 세션 매칭 불가)
- **알림:** FCM (Cloud Functions 미배포 — Blaze 플랜 업그레이드 후 가능)

## 주요 파일
| 파일 | 역할 |
|---|---|
| `index.html` | PWA 진입점. `#mission-name-input`, `#mission-prayer-input`, `#mission-gift-banner`, `#lightbox-caption` 포함 |
| `script.js` | 전체 앱 로직. `MISSION_SCHEDULE`, `getTodayMission()`, `openMissionPopup()`, `submitMission()`(기도문 검증+1등 트랜잭션), `editMissionSubmission()`(기도문 프리필), `_renderMissionMembers()`(배지/배너), `openLightbox(src, caption)`, `checkAdmin()` |
| `sw.js` | Service Worker, `CACHE_NAME='yc-school-v12'` |
| `database.rules.json` | `missions: {".read":true, "$date":{"$sessionId":{".write":true}}}` — `_firstPlace`도 `$date` 하위 키라 규칙 변경 불필요 |
| `functions/index.js` | S1용 Cloud Functions 4개 (미배포) |
| `docs/superpowers/specs/`, `docs/superpowers/plans/` | superpowers 워크플로우 설계/계획 문서 |

## 다음으로 할 수 있는 작업
1. 로컬 커밋 21개를 origin에 push할지 여부 — 사용자에게 아직 확인받지 못함, 다음 세션에서 먼저 물어볼 것
2. 익명 세션과 등록 멤버를 실제로 매칭하는 기능 (현재는 자유 텍스트 이름 입력으로 대체)
3. 이름/기도문 중복·오타에 대한 검증 로직 (현재는 완전 자유 입력)
4. Cloud Functions 배포 및 실제 푸시 알림 활성화 (Blaze 플랜 업그레이드 필요)
5. 시크릿기프트 당첨 이력 관리(관리자 화면에서 지난 당첨자 확인 등) — 필요 시 별도 브레인스토밍

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
