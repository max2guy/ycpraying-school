# 일일미션 기도문 작성 + 시크릿기프트(1등 표시) 설계

## 배경

일일미션(7일 필사 인증, `MISSION_SCHEDULE`)은 현재 사진 인증과 제출자 이름만 받는다. 두 가지를 추가한다.

1. **기도문 작성**: 사진 인증과 함께 그날의 기도문을 텍스트로 남긴다.
2. **시크릿기프트(1등 표시)**: 매일 가장 먼저 인증사진+기도문을 제출한 1인에게 "시크릿기프트"(편의점 상품권 1,000원, 앱 내에는 금액/내용 비공개) 당첨 배지를 부여하고 전체 멤버에게 알린다.

## 요구사항 요약

### 기도문 작성
- 사진 인증과 기도문은 **둘 다 필수** — 하나라도 비어 있으면 제출 불가
- 기도문은 **모든 멤버가 함께 볼 수 있음** — 사진 라이트박스에 캡션으로 표시
- 재제출("다시 제출하기") 시 직전에 적은 기도문을 입력창에 미리 채워 편집 편의 제공

### 시크릿기프트(1등 표시)
- 매일 가장 먼저 제출을 완료한 1인이 자동으로 "1등"이 됨 (동시 제출 시에도 정확히 1명만 선정)
- 당첨자는 앱 내에서 표시됨 (금액/상품 내용은 비공개, "시크릿기프트"라는 이름만 노출)
- **실제 푸시 알림 발송은 이번 스코프에서 보류** — 이 프로젝트(`ycpraying-school`)는 아직 Firebase Blaze 요금제로 업그레이드되지 않아 Cloud Functions가 배포되어 있지 않음(`firebase functions:list` 확인 결과 없음). 향후 Blaze 업그레이드 후 별도 작업으로 Cloud Function을 추가하면 바로 푸시가 나가도록, 데이터 구조만 지금 미리 준비해 둔다.

## 데이터 모델

`missions/{date}/{sessionId}`(기존)에 필드 추가:
```
{
  photoData: string,
  timestamp: number,
  day: number,
  memberName: string,
  prayerText: string   // 신규
}
```

`missions/{date}/_firstPlace`(신규, 세션이 아닌 특수 키):
```
{
  sessionId: string,
  memberName: string,
  timestamp: number
}
```
- 기존 RTDB rule(`missions/{date}/{sessionId}`에 대해 read:true, write:true)이 `$sessionId`를 와일드카드로 잡고 있으므로, `_firstPlace`도 동일 규칙으로 read/write 가능 — **규칙 변경 불필요** (별도 확인 필요 시 `database.rules.json` 검토)
- `_renderMissionMembers()`가 `Object.entries(completions)`로 멤버 목록을 순회할 때 `_firstPlace` 키는 멤버가 아니므로 반드시 제외하고 순회해야 함

## UI 설계

### 기도문 입력 (`.mission-upload-section`)
사진 업로드 영역과 제출 버튼 사이에 텍스트에어리어 추가:
```html
<textarea id="mission-prayer-input" class="simple-modal-input" rows="3" maxlength="300"
    placeholder="오늘의 기도문을 적어주세요 🙏" style="margin-top:10px"></textarea>
```
(`.simple-modal-input`은 기존 모달 텍스트에어리어 스타일 재사용 — 신규 CSS 불필요)

### 시크릿기프트 배너 (미션 팝업 진행 상황 영역 위)
```html
<div class="mission-gift-banner" id="mission-gift-banner" style="display:none">
    🎁 오늘의 시크릿기프트 당첨자: <span id="mission-gift-winner"></span>님
</div>
```
- 오늘 `_firstPlace`가 없으면 `display:none` 유지
- 있으면 당첨자 이름 채우고 표시

### 멤버 완료 그리드 배지
`_renderMissionMembers()`에서 해당 멤버가 `_firstPlace.sessionId`와 일치하면 칩에 `🎁` 배지를 추가로 붙임.

### 라이트박스 캡션 확장
`openLightbox(src, caption)`로 2번째 인자 추가:
- `#lightbox`에 `#lightbox-caption` div 추가 (하단 반투명 박스, `white-space:pre-wrap`)
- caption이 없으면(기존 캠프 포스터 등 호출부는 인자 생략) 캡션 영역 숨김 — 기존 호출부 전부 하위 호환
- 멤버 사진 클릭(`_openMissionMemberPhoto`), 본인 완료 사진(`mission-done-img`) 클릭 시 각각 해당 제출의 `prayerText`를 caption으로 전달

## 로직 설계

### `submitMission()`
1. 사진 미선택 시 기존과 동일하게 alert 후 중단
2. 이름 미입력 시 기존과 동일하게 alert 후 중단
3. **신규**: 기도문(`#mission-prayer-input`) trim 값이 비어 있으면 `🙏 기도문을 적어주세요!` alert 후 중단
4. `missions/{date}/{sessionId}`에 `prayerText` 필드를 포함해 저장 (기존 필드 유지)
5. 저장 성공 후, **신규**: `missions/{date}/_firstPlace`에 트랜잭션 클레임 시도
   ```javascript
   missionsRef.child(mission.date).child('_firstPlace').transaction(current => {
       if (current === null) return { sessionId: mySessionId, memberName, timestamp: Date.now() };
       return undefined; // 이미 있으면 취소
   }).then(result => {
       if (result.committed) {
           // 이 세션이 1등 — UI는 _firstPlace의 실시간 구독(onValue)이 알아서 반영하므로 별도 처리 불필요
       }
   });
   ```
6. 기존 성공 콜백(폭죽 효과, 완료 토스트)은 그대로 유지

### `openMissionPopup()`
- 기존 이름 프리필 로직 아래에 기도문 관련 초기화 추가: 업로드 상태 초기화 시 `#mission-prayer-input`도 빈 값으로 리셋 (이름과 달리 기기 전체 기억 대상 아님)
- 기존 완료 여부 확인(`missionRef.child(mySessionId).once('value')`) 콜백에서 `snap.val().prayerText`를 캐시 변수(`_missionSubmittedPrayerText`)에 저장 — 재제출 프리필에 사용
- `_showMissionCompleted(photoData, prayerText)`로 시그니처 확장: 완료 사진의 `dataset.caption`에 prayerText 저장(라이트박스 캡션용)
- **신규**: `_firstPlace` 실시간 구독을 하나 추가(기존 멤버 목록 구독과 별개 또는 같은 `missionRef.on('value', ...)` 콜백 내부에서 `snap.val()._firstPlace`를 함께 읽어 배너 갱신) — 배너 텍스트 채우고 표시/숨김 처리

### `_renderMissionMembers(completions)`
- `Object.entries(completions)`에서 `_firstPlace` 키를 제외하고 순회하도록 필터 추가: `Object.entries(completions).filter(([uid]) => uid !== '_firstPlace')`
- 각 멤버 칩 렌더링 시 `uid === completions._firstPlace?.sessionId`면 배지(`🎁`) 추가
- `_openMissionMemberPhoto(uid)`가 `openLightbox(data.photoData, data.prayerText)`로 캡션 전달하도록 변경

### `editMissionSubmission()`
- 기존과 동일하게 RTDB에서 본인 제출 삭제
- **신규**: 업로드 화면 복귀 시 `#mission-prayer-input`에 `_missionSubmittedPrayerText`를 채워 재입력 편의 제공
- `_firstPlace` 노드는 건드리지 않음 (범위 제외 항목, 아래 참고)

### `adminDeleteMissionSubmission(uid)`
- 기존과 동일, 수정 없음

## 에러 처리
- 트랜잭션 실패(네트워크 오류 등)는 `.catch()`로 조용히 무시 — 1등 표시는 부가 기능이라 실패해도 사진/기도문 제출 자체(핵심 기능)에는 영향 없어야 함
- 기도문 300자 초과 입력은 `maxlength` 속성으로 브라우저 레벨에서 원천 차단

## 검증 계획 (브라우저 실사용, 자동화 테스트 없음)
1. 기도문 미입력 상태로 제출 시도 → 차단 alert 확인
2. 사진+이름+기도문 모두 입력 후 제출 → RTDB에 `prayerText` 저장 확인, 첫 제출이므로 `_firstPlace`에도 본인 정보 기록 확인
3. 완료 멤버 목록에 `🎁` 배지 확인, 미션 팝업 상단 배너에 당첨자 이름 확인
4. 멤버 칩 클릭 → 라이트박스에 사진+기도문 캡션 함께 표시 확인
5. 본인 완료 사진 클릭 → 본인이 적은 기도문이 캡션으로 표시 확인
6. 두 번째 테스트 세션(다른 `mySessionId`)으로 같은 날짜에 제출 → `_firstPlace`가 갱신되지 않고 최초 제출자로 유지되는지 확인 (트랜잭션 취소 동작 검증)
7. "다시 제출하기" 후 업로드 화면에 직전 기도문이 프리필되는지 확인
8. 기존 캠프 포스터 이미지 라이트박스가 caption 없이 정상 동작하는지(회귀 확인)

## 범위 제외
- 실제 푸시 알림 발송 (Blaze 업그레이드 + Cloud Function 추가는 별도 작업)
- 관리자가 1등 당첨자의 제출을 삭제했을 때 `_firstPlace` 자동 취소/재선정
- 기도문 내용 검열/신고 기능
- 7일 전체 기간의 "1등 누적 순위"(명예의 전당) — 매일 단위 표시만 해당
