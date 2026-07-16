# 일일미션 인증사진 제출자 이름 입력 기능 — 설계

## 배경 / 문제

앱은 익명 접속(`mySessionId`, localStorage에 저장된 `user_<timestamp>` 형태) 구조라 미션 인증사진을 올려도 "누가 올렸는지" 알 수 없다.

기존 `submitMission()`은 `globalNodes.find(n => n.sessionId === mySessionId)`로 등록된 멤버 노드를 찾아 이름을 쓰려 했지만, 코드베이스 전체에서 멤버 노드에 `sessionId`가 실제로 기록되는 곳이 없어 이 매칭은 항상 실패한다. 결과적으로 모든 제출이 기본값 `'멤버'`로 저장되어 왔다.

## 요구사항

- 사진 제출 시 이름을 직접 입력할 수 있어야 한다.
- 한번 입력한 이름은 해당 기기에 기억되어 다음 제출 때 자동으로 채워져야 한다.
- 자동으로 채워진 이름은 그때그때 수정 가능해야 한다 (수정 시 최신 이름으로 갱신되어 유지).

## 설계

### UI (`index.html`)

`.mission-upload-section`([index.html:161](index.html:161)) 안, 업로드 placeholder 위에 이름 입력 필드를 추가한다. 기존 프로필 이름 수정 필드(`#edit-profile-name`)와 동일한 `.profile-name-input` 스타일을 재사용한다.

```html
<input type="text" id="mission-name-input" class="profile-name-input" placeholder="이름을 입력해주세요" maxlength="20" style="margin-bottom:10px">
```

### 로직 (`script.js`)

**`openMissionPopup()`** — 팝업을 열 때 `mission-name-input`에 `localStorage.getItem('missionMemberName')` 값을 채운다 (없으면 빈 문자열).

**`submitMission()`**:
1. 이름 입력값을 `trim()`. 비어있으면 `alert('✍️ 이름을 입력해주세요!')` 후 중단 — 기존 사진 미선택 시 막는 패턴과 동일.
2. 값이 있으면 `localStorage.setItem('missionMemberName', name)`.
3. RTDB에 저장하는 `memberName` 필드를 이 입력값으로 교체.
4. 기존 `globalNodes.find(n => n.sessionId === mySessionId)` 조회 로직(항상 실패하던 죽은 코드)은 제거한다.

**`editMissionSubmission()`(다시 제출하기)** — 별도 처리 불필요. 입력창은 팝업이 열려있는 동안 최근 이름 값을 그대로 유지한다.

### 데이터

- 새 localStorage 키: `missionMemberName` (문자열).
- RTDB `missions/{date}/{sessionId}/memberName`은 기존과 동일한 필드/타입, 값의 출처만 변경됨. 스키마 변경 없음.

### 에러 처리

- 이름 미입력: 사진 미선택과 동일하게 `alert` + 제출 중단.
- 그 외 신규 에러 케이스 없음 (기존 `.catch(err => alert('제출 실패: ' + err.message))` 유지).

## 검증 계획

1. 브라우저에서 미션 팝업 최초 진입 시 이름 입력창이 빈 채로 보임을 확인.
2. 이름 미입력 상태로 제출 시도 → 차단 alert 확인.
3. 이름 입력 후 제출 → RTDB `missions/{date}/{sessionId}`에 입력한 이름이 `memberName`으로 저장됨을 확인.
4. 팝업을 닫았다 다시 열었을 때(또는 새로고침 후) 입력창에 방금 쓴 이름이 자동으로 채워짐을 확인 (localStorage 유지).
5. 이름을 수정하고 "다시 제출하기"로 재제출 → 새 이름으로 갱신되어 저장됨을 확인.
6. 멤버 완료 현황 목록(`_renderMissionMembers`)에 입력한 이름이 정상 표시됨을 확인.

## 범위 밖 (Out of scope)

- 등록된 멤버(구역원) 목록과의 매칭/검증 로직 — 이번 기능은 자유 입력 방식만 다룬다.
- 이름 중복/실명 검증 등의 정책적 처리.
- 관리자가 이름을 사후에 수정하는 기능.
