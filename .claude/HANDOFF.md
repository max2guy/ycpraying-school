# ycpraying-school — Codex Handoff (v1.2.4)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: `489dc5c` — feat: 일일미션 제출자 이름 입력 기능 추가 (v1.2.4)
- 그 직전 커밋: `bad7444` — fix: 관리자 로그인 실패 시 상세 오류 메시지 표시
- 워킹트리 클린 (모두 커밋됨). `.claude/launch.json`만 untracked (로컬 dev 서버 설정, 커밋 대상 아님)
- Firebase Hosting 배포 완료 ✅ (`https://ycpraying-school.web.app`, `script.js?v=101` 배포 및 브라우저 실사용 검증됨)
- Cloud Functions 미배포 (Blaze 플랜 필요, 이전 세션부터 유지되는 상태)

## 방금 수정한 내용 (이번 세션)

### 1. 관리자 로그인 실패 시 상세 오류 메시지 표시 (`bad7444`)
- **문제**: `checkAdmin()`의 `.catch(() => alert("비밀번호 오류"))`가 모든 실패 원인을 "비밀번호 오류" 한 가지로 뭉뚱그려서, 실제 원인(예: Firebase Auth 설정 문제, 네트워크 오류 등)을 진단할 수 없었음
- **해결**: `script.js`의 `checkAdmin()` catch 콜백을 `err => alert("로그인 실패 (" + err.code + ")\n" + err.message)`로 교체 — Firebase 오류 코드/메시지를 그대로 노출

### 2. 일일미션 제출자 이름 입력 기능 (`0c4adb0`)
- **문제**: 앱은 완전 익명 접속(`mySessionId`)이라 미션 인증사진을 누가 올렸는지 알 수 없었음. 기존 코드는 `globalNodes.find(n => n.sessionId === mySessionId)`로 등록 멤버와 매칭을 시도했지만, 어떤 코드도 멤버 노드에 `sessionId`를 할당하지 않아 **항상 실패하는 죽은 코드**였고, 결과적으로 모든 제출이 `memberName: '멤버'`로 저장됐음
- **사용자 요청 (원문)**: "현재 앱에 접속시에 누구나 익명으로 접속이 되기 때문에, 인증샷을 올릴 때에는 이름을 적던지 해서 누가 올린 것인지 알 수 있어야 한다. 한번 이름을 적은 기기에서는 자동입력되게 하던지(두번째 업로드시 이름을 바꾸었다면 최근 이름으로 유지)"
- **해결**:
  - `index.html`: `.mission-upload-section`에 `#mission-name-input` 텍스트 입력 필드 추가 (기존 `.profile-name-input` 클래스 재사용, 새 CSS 없음)
  - `script.js`의 `openMissionPopup()`: 팝업을 열 때 `localStorage.getItem('missionMemberName')` 값으로 입력창 프리필
  - `script.js`의 `submitMission()`: 이름 미입력 시 `✍️ 이름을 입력해주세요!` alert로 제출 차단, 입력된 이름을 `localStorage.setItem('missionMemberName', ...)`으로 저장 후 RTDB `memberName` 필드에 사용. 죽은 `globalNodes.find(n => n.sessionId ...)` 코드 완전 제거
  - `editMissionSubmission()`(재제출)은 별도 수정 없이 그대로 동작 — 재제출 시에도 입력창에 직전 이름이 남아있고 수정 가능함을 브라우저에서 확인
- **브라우저 실사용 검증 완료** (로컬 `http.server` + 실제 RTDB REST API 확인): 이름 미입력 차단, 제출 성공 시 `memberName` 저장, 팝업 재오픈 시 자동 채우기, 완료 멤버 목록에 이름 표시, 재제출 시 이름 유지/수정 — 모두 정상 확인 후 테스트 데이터는 삭제함
- **설계/계획 문서**: [docs/superpowers/specs/2026-07-16-mission-submitter-name-design.md](../docs/superpowers/specs/2026-07-16-mission-submitter-name-design.md), [docs/superpowers/plans/2026-07-16-mission-submitter-name.md](../docs/superpowers/plans/2026-07-16-mission-submitter-name.md)
- **의도적으로 범위 제외한 것** (스펙 문서에 명시): 등록 멤버와의 실제 매칭, 이름 중복 검증, 관리자의 사후 이름 수정 기능

### 캐시 버전
- `index.html`: `script.js?v=101`
- `sw.js`: `CACHE_NAME='yc-school-v11'`, 버전 주석 `101 (v1.2.4)`

## 프로젝트 개요
- **프레임워크:** 순수 HTML/JS/CSS PWA (no build step)
- **DB:** Firebase Realtime Database, region `asia-southeast1` (`/members`, `/messages`, `/presence`, `/centerNode`, `/fcmTokens`, `/missions/{date}/{sessionId}`)
- **그래프:** D3.js v7 force simulation (S1 방식: 태양계 없음)
- **호스팅:** Firebase Hosting (`ycpraying-school.web.app`)
- **인증:** Firebase Anonymous Auth (완전 익명, 등록 멤버와 세션 매칭 불가 — 위 "다음으로 할 수 있는 작업" 참고)
- **알림:** FCM (Cloud Functions 미배포 — Blaze 플랜 업그레이드 후 가능)

## 주요 파일
| 파일 | 역할 |
|---|---|
| `index.html` | PWA 진입점, `#mission-name-input`(미션 이름 입력 필드) 포함 |
| `script.js` | 전체 앱 로직. `MISSION_SCHEDULE`, `getTodayMission()`, `openMissionPopup()`(이름 프리필), `submitMission()`(이름 검증/저장), `editMissionSubmission()`, `checkAdmin()`(상세 오류 메시지) |
| `sw.js` | Service Worker, `CACHE_NAME='yc-school-v11'` |
| `database.rules.json` | `missions: {".read":true, "$date":{"$sessionId":{".write":true}}}` — set/remove 모두 허용 |
| `functions/index.js` | S1용 Cloud Functions 4개 (미배포) |
| `docs/superpowers/specs/`, `docs/superpowers/plans/` | superpowers 워크플로우 설계/계획 문서 (브레인스토밍 → 계획 → 실행) |

## 다음으로 할 수 있는 작업
1. `missions/2026-07-12`(구버전 테스트, `user_1783863291040`)의 낡은 테스트 데이터 정리 여부 — 사용자가 이전에 "삭제하지 않음"을 선택했으나 정식 오픈(2026-07-20) 전에 재확인 필요할 수 있음
2. 익명 세션과 등록 멤버를 실제로 매칭하는 기능(현재는 자유 텍스트 이름 입력으로 대체) — 스펙 문서에서 의도적으로 범위 제외했으므로 필요 시 별도 브레인스토밍 필요
3. 이름 중복/오타에 대한 검증 로직 (현재는 완전 자유 입력, 관리자 확인으로 대응 중)
4. Cloud Functions 배포 (Blaze 플랜 업그레이드 필요, 이전 세션부터 대기 중)

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
