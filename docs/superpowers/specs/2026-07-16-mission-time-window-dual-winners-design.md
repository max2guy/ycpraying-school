# 일일미션 제출시간 제한 + 듀얼 당첨자(1등+랜덤) 설계

## 배경

기존 일일미션 시크릿기프트는 "그날 첫 제출자(1등)" 1명만 당첨되는 구조였다. 요청사항:

1. 1등 당첨 시 축하 연출이 약함 → 더 화려하게, 팝업 메시지 추가
2. 선물은 카카오톡으로 전달된다는 안내 문구 필요
3. 미션 제출 가능 시각을 오전 7시~자정으로 제한 (안내문구 포함)
4. 당첨자를 1등 1명 + 랜덤 1명, 총 2명으로 확대
   - 1등과 랜덤 당첨자는 중복 불가
   - 랜덤 당첨자는 연속 2일 당첨 불가
   - (추가) 관리자가 실제 카카오톡 선물을 지급할 수 있도록 당첨자 목록을 조회할 수 있어야 함

## A. 제출 가능 시간 제한 (오전 7시 ~ 자정, KST)

- `getTodayKstDateStr()`와 동일한 패턴으로 `getKstHour()` 헬퍼 추가 (`new Date(Date.now()+9*3600*1000).getUTCHours()`)
- `openMissionPopup()`: 이미 제출 완료한 사용자는 시간과 무관하게 완료 화면(`mission-done-section`) 노출. 미제출 사용자가 07시 이전에 열람하면 업로드 섹션(`mission-upload-section`) 대신 신규 안내 카드(`mission-time-blocked`)를 표시: "⏰ 미션 인증은 오전 7시부터 자정까지 가능해요"
- `submitMission()` 최상단에도 동일 시간 체크 추가 (팝업을 열어둔 채 경계 시각을 넘는 경우 대비한 이중 방어). 범위 밖이면 alert 후 return.
- 자정 이후 제출이 원천 차단되므로, 그날의 랜덤 당첨자 추첨(B 항목)은 자정 시점 값이 자동으로 최종값이 된다 — 별도 마감 처리 불필요.

## B. 당첨자 2명 체제

### 1등 (변경 없음)
- 기존 `_firstPlace` 트랜잭션 그대로 유지 (그날 첫 제출자, 실시간 즉시 확정).

### 랜덤 1명 (신규)
- RTDB 경로: `missions/{date}/_randomWinner` = `{ sessionId, memberName, timestamp, count }`
- 매 제출마다(`submitMission()` 성공 후) 아래 순서로 처리:
  1. 방금 완료된 `_firstPlace` 트랜잭션 결과에서 `snapshot.val().sessionId === mySessionId`이면(=내가 오늘 1등이면) 랜덤 추첨 자체를 스킵 (1등과 중복 방지)
  2. 그렇지 않으면, 전날 날짜(KST 기준 -1일)의 `missions/{prevDate}/_randomWinner.memberName`을 1회 조회(`.once('value')`)
  3. 조회된 이름이 이번 제출자의 `memberName`(trim)과 동일하면 이번 추첨에서 이번 제출자를 제외 (연속 2일 당첨 방지) — 세션이 아닌 이름 기준 판별 (기존 시스템 전반이 익명 세션 대신 자유 입력 이름으로 사람을 구분하는 방식과 동일한 한계/전제를 따름)
  4. 제외 대상이 아니면 `_randomWinner`에 대해 **점진적 저수지 표본추출(reservoir sampling, k=1)** 트랜잭션 실행:
     ```js
     missionDateRef.child('_randomWinner').transaction(current => {
         const count = (current && current.count) || 0;
         const newCount = count + 1;
         if (Math.random() < 1 / newCount) {
             return { sessionId: mySessionId, memberName, timestamp: Date.now(), count: newCount };
         }
         return { ...current, count: newCount };
     });
     ```
     - 이 알고리즘은 최종적으로 그날 자격이 있는 전체 제출자 중에서 균등 확률로 1명을 뽑는 것과 수학적으로 동일한 결과를 보장한다(Algorithm R, reservoir size 1).
     - 실패는 조용히 무시(`.catch(() => {})`) — 보너스 기능이라 크리티컬하지 않음 (기존 `_firstPlace`와 동일한 철학).

## C. 발표/축하 연출

### 1등 — 즉시 화려하게
- `createFirework()`를 화면 여러 지점에서 짧은 시차를 두고 여러 번 호출해 컨페티를 확장 (예: 4~6회, 각기 다른 랜덤 좌표)
- 신규 축하 모달(`#mission-winner-popup`) 표시: "🎉 축하합니다! 오늘의 시크릿기프트 1등 당첨! 🎁" + "선물은 카카오톡으로 전달됩니다 💬" + 확인 버튼으로 닫기
- 배너(`mission-gift-banner`)에는 즉시 1등 이름 표시 (기존과 동일)

### 랜덤 — 익일 확정 발표
- 실시간 배너에는 이름을 노출하지 않고 "오늘의 랜덤 당첨자는 자정 이후 확정돼요" 안내만 표시 (당첨자가 중간에 바뀔 수 있어 확정 전 노출 시 오해 소지가 있기 때문)
- 자정이 지나 그날의 창이 닫히면 그 시점 값이 최종 확정값
- 확정된 당첨자 본인이 **다음에 앱을 다시 열 때**(오늘 이후 아무 시점) 감지 로직 실행:
  - 앱 로드 시 KST 기준 "어제 날짜"의 `_randomWinner`를 조회해 `sessionId === mySessionId`이고 아직 알림 받지 않았다면(로컬스토리지 플래그 `randomWinnerNotified_{date}` 없음) 1등과 동일한 스타일의 축하 팝업 노출: "🎉 어제의 시크릿기프트 랜덤 당첨! 선물은 카카오톡으로 전달됩니다 💬"
  - 노출 후 플래그 저장해 재노출 방지

## D. 관리자용 당첨자 목록 (신규)

- 설정 모달의 `#btn-broadcast-update`와 같은 패턴으로 관리자 전용 버튼 `#btn-gift-winners` 추가 (평소 `display:none`, `isAdmin` true일 때만 노출)
- 클릭 시 간단한 목록 모달 표시: `missionsRef.once('value')`로 전체 `missions` 노드를 읽어 각 날짜 하위의 `_firstPlace`/`_randomWinner`만 추출, 날짜순으로 "7/20 — 1등: OOO · 랜덤: OOO" 형태로 렌더링
- 이 화면을 보고 관리자가 카카오톡으로 실제 선물 지급

## 제외 범위

- 실제 카카오톡 자동 전송/연동 (수동으로 관리자가 직접 지급 — 이미 기존 정책)
- 서버 사이드 스케줄링/Cloud Functions (Blaze 미적용 상태 유지, 클라이언트 로직만으로 해결)
- 익명 세션과 실제 회원 매칭 (기존 자유 텍스트 이름 입력 방식 유지)
