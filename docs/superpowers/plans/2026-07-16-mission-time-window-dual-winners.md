# 일일미션 제출시간 제한 + 듀얼 당첨자(1등+랜덤) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 일일미션 제출 가능 시각을 오전 7시~자정으로 제한하고, 시크릿기프트 당첨자를 1등(즉시 확정)+랜덤 1명(익일 확정)의 2명 체제로 확장하며, 1등 당첨 시 화려한 축하 팝업을 띄우고, 관리자가 카카오톡 선물 지급을 위해 당첨자 목록을 조회할 수 있게 한다.

**Architecture:** 순수 클라이언트(HTML/JS/CSS) + Firebase RTDB 트랜잭션만으로 구현 (Cloud Functions 없음). 1등은 기존과 동일하게 `_firstPlace` 트랜잭션으로 즉시 확정. 랜덤 당첨자는 `_randomWinner` 경로에 대해 점진적 저수지 표본추출(reservoir sampling, k=1) 트랜잭션을 매 제출마다 실행해, 자정에 제출 창이 닫히는 순간 자동으로 최종값이 확정되도록 한다. 랜덤 당첨자 본인에게는 확정된 다음날 앱 재접속 시 1회성 팝업으로 알림.

**Tech Stack:** 순수 HTML/CSS/JS, Firebase Realtime Database (`.transaction()`), 기존 `openLightbox`/`showWeatherToast`/`createFirework` 등 기존 유틸 재사용.

---

## 사전 확인된 코드 컨텍스트

- `getTodayKstDateStr()` (`script.js:137-139`) — KST 기준 날짜 계산 패턴, 새 헬퍼도 동일 패턴 사용
- `missionsRef = database.ref('missions')` (`script.js:124`)
- `mySessionId` (`script.js:158-160`)
- `openMissionPopup()` / `closeMissionPopup()` / `_showMissionCompleted()` (`script.js:1028-1084`)
- `submitMission()` (`script.js:1109-1141`), `editMissionSubmission()` (`script.js:1143-1159`)
- `_renderMissionMembers()` / `_updateGiftBanner()` (`script.js:1161-1194`)
- `createFirework(x, y)` (`script.js:1664-1677`)
- `escHtml()` — 기존 전역 헬퍼, `_renderMissionMembers`에서 이미 사용 중
- `firebase.auth().onAuthStateChanged` 관리자 토글 (`script.js:583-595`) — `#btn-broadcast-update` 표시/숨김 패턴
- `index.html:147-150` 시크릿기프트 배너, `index.html:166-180` 업로드 섹션, `index.html:182-186` 완료 섹션
- `index.html:316-321` 설정 모달 관리자 전용 버튼(`#btn-broadcast-update`) 패턴
- `style.css:447-455` `#admin-modal`/`.admin-box` 패턴 (신규 모달에 재사용), `style.css:698-699` `.mission-gift-banner`

---

### Task 1: KST 시간 헬퍼 추가

**Files:**
- Modify: `script.js:137-140` (근처에 추가)

- [ ] **Step 1: `getKstHour()`, `isMissionSubmitWindowOpen()`, `_getPrevKstDateStr()` 추가**

`script.js`의 `getTodayKstDateStr()` 바로 아래에 추가:

```js
function getKstHour() {
    return new Date(Date.now() + 9 * 3600 * 1000).getUTCHours();
}
function isMissionSubmitWindowOpen() {
    return getKstHour() >= 7; // 07:00~23:59 허용, 00:00~06:59 차단
}
function _getPrevKstDateStr(dateStr) {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}
```

- [ ] **Step 2: 브라우저 콘솔에서 동작 확인**

`preview_start`로 로컬 서버 열고 `javascript_tool`로 다음 실행:
```js
[getKstHour(), isMissionSubmitWindowOpen(), _getPrevKstDateStr('2026-07-20')]
```
기대값: `[현재 KST 시(0~23), true 또는 false, '2026-07-19']`

- [ ] **Step 3: 커밋**

```bash
git add script.js
git commit -m "feat: KST 시간대 헬퍼 추가 (제출 가능 시각 판정용)"
```

---

### Task 2: 제출 시간 제한 안내 카드 마크업 + 스타일

**Files:**
- Modify: `index.html:165-166` 근처 (mission-scripture-card와 mission-upload-section 사이)
- Modify: `style.css:669-671` 근처

- [ ] **Step 1: index.html에 안내 카드 추가**

`index.html`의 `<!-- 사진 업로드 -->` 주석(`mission-upload-section` div) 바로 위에 삽입:

```html
                <!-- 제출 시간 제한 안내 -->
                <div class="mission-time-blocked" id="mission-time-blocked" style="display:none">
                    <span style="font-size:1.8rem">⏰</span>
                    <span>미션 인증은 오전 7시부터 자정까지 가능해요</span>
                </div>
```

- [ ] **Step 2: style.css에 스타일 추가**

`.mission-scripture-desc` 규칙 바로 아래에 추가:

```css
.mission-time-blocked { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; background:var(--glass); border:1.5px dashed var(--rose-border); border-radius:var(--r-md); padding:28px 16px; text-align:center; color:var(--text-dim); font-size:0.88rem; }
```

- [ ] **Step 3: 커밋**

```bash
git add index.html style.css
git commit -m "feat: 미션 제출 시간 제한 안내 카드 마크업/스타일 추가"
```

---

### Task 3: 팝업 오픈/완료/재제출 흐름에 시간 제한 반영

**Files:**
- Modify: `script.js:1028-1084` (`openMissionPopup`, `_showMissionCompleted`)
- Modify: `script.js:1143-1159` (`editMissionSubmission`)

- [ ] **Step 1: `openMissionPopup()`에 시간 게이트 반영**

기존 코드:
```js
    document.getElementById('mission-upload-placeholder').style.display = 'flex';
    document.getElementById('mission-photo-preview').style.display = 'none';
    document.getElementById('mission-upload-section').style.display = 'block';
    document.getElementById('mission-done-section').style.display = 'none';
```
를 아래로 교체:
```js
    document.getElementById('mission-upload-placeholder').style.display = 'flex';
    document.getElementById('mission-photo-preview').style.display = 'none';
    document.getElementById('mission-done-section').style.display = 'none';
    const windowOpen = isMissionSubmitWindowOpen();
    document.getElementById('mission-upload-section').style.display = windowOpen ? 'block' : 'none';
    document.getElementById('mission-time-blocked').style.display = windowOpen ? 'none' : 'flex';
```

- [ ] **Step 2: `_showMissionCompleted()`에 안내 카드 숨김 추가**

기존:
```js
function _showMissionCompleted(photoData, prayerText) {
    document.getElementById('mission-upload-section').style.display = 'none';
    document.getElementById('mission-done-section').style.display = 'flex';
```
를 아래로 교체:
```js
function _showMissionCompleted(photoData, prayerText) {
    document.getElementById('mission-upload-section').style.display = 'none';
    document.getElementById('mission-time-blocked').style.display = 'none';
    document.getElementById('mission-done-section').style.display = 'flex';
```

- [ ] **Step 3: `editMissionSubmission()`에 시간 게이트 추가**

함수 최상단에 추가:
```js
function editMissionSubmission() {
    if (!isMissionSubmitWindowOpen()) { alert('⏰ 미션 인증은 오전 7시부터 자정까지만 다시 제출할 수 있어요.'); return; }
    if (!confirm('제출한 인증을 취소하고 사진을 다시 선택할까요?')) return;
```
그리고 `.then(() => { ... document.getElementById('mission-upload-section').style.display = 'block'; ...` 블록에 한 줄 추가:
```js
        document.getElementById('mission-upload-section').style.display = 'block';
        document.getElementById('mission-time-blocked').style.display = 'none';
```

- [ ] **Step 4: 브라우저에서 확인**

`javascript_tool`로 시간을 강제로 바꿀 수 없으므로, `isMissionSubmitWindowOpen`을 임시로 오버라이드해 검증:
```js
window.isMissionSubmitWindowOpen = () => false;
openMissionPopup();
document.getElementById('mission-time-blocked').style.display; // 'flex' 기대
```
그리고 다시:
```js
window.isMissionSubmitWindowOpen = () => true;
openMissionPopup();
document.getElementById('mission-upload-section').style.display; // 'block' 기대
```
(주의: 이건 window 전역에 재정의가 가능한 함수 선언이라 가능 — 검증 후 페이지 새로고침으로 원상복구)

- [ ] **Step 5: 커밋**

```bash
git add script.js
git commit -m "feat: 미션 팝업/재제출에 제출 가능 시간(7시~자정) 게이트 적용"
```

---

### Task 4: submitMission() 시간 가드 + 1등 당첨 분기

**Files:**
- Modify: `script.js:1109-1141`

- [ ] **Step 1: 시간 가드 추가 + 1등 결과에 따른 분기**

`submitMission()` 전체를 아래로 교체:

```js
function submitMission() {
    if (!isMissionSubmitWindowOpen()) { alert('⏰ 미션 인증은 오전 7시부터 자정까지만 제출할 수 있어요.'); return; }
    if (!_missionPhotoData) { alert('📷 필사 인증 사진을 먼저 선택해주세요!'); return; }
    const memberName = document.getElementById('mission-name-input').value.trim();
    if (!memberName) { alert('✍️ 이름을 입력해주세요!'); return; }
    const prayerText = document.getElementById('mission-prayer-input').value.trim();
    if (!prayerText) { alert('🙏 기도문을 적어주세요!'); return; }
    const mission = getTodayMission();
    if (!mission) return;
    const btn = document.getElementById('mission-submit-btn');
    btn.disabled = true; btn.textContent = '⏳ 제출 중...';
    localStorage.setItem('missionMemberName', memberName);
    const missionDateRef = missionsRef.child(mission.date);
    missionDateRef.child(mySessionId).set({
        photoData: _missionPhotoData,
        timestamp: Date.now(),
        day: mission.day,
        memberName: memberName,
        prayerText: prayerText
    }).then(() => {
        _missionSubmittedPrayerText = prayerText;
        _showMissionCompleted(_missionPhotoData, prayerText);
        const showPlainCelebration = () => {
            const rect = btn.getBoundingClientRect();
            createFirework(rect.left + rect.width / 2, rect.top + rect.height / 2);
            showWeatherToast('🎉 미션 완료!', '오늘도 은혜로운 하루 되세요 🙏', 4000);
        };
        missionDateRef.child('_firstPlace').transaction(current => {
            if (current === null) return { sessionId: mySessionId, memberName: memberName, timestamp: Date.now() };
            return undefined;
        }).then(result => {
            const iWonFirstPlace = result.committed && result.snapshot.val() && result.snapshot.val().sessionId === mySessionId;
            if (iWonFirstPlace) {
                _showWinnerCelebration('오늘의 시크릿기프트 1등 당첨! 🎁');
            } else {
                showPlainCelebration();
                _attemptRandomWinnerDraw(mission.date, memberName);
            }
        }).catch(() => { showPlainCelebration(); });
    }).catch(err => {
        alert('제출 실패: ' + err.message);
        btn.disabled = false; btn.textContent = '✅ 인증 제출하기';
    });
}
```

(`_showWinnerCelebration`과 `_attemptRandomWinnerDraw`는 Task 5, 6에서 정의 — 이 시점엔 아직 없으므로 Step 2에서 바로 이어서 구현)

- [ ] **Step 2: 커밋 전 Task 5, 6을 먼저 구현 (아래로 계속)**

이 Task는 Task 5·6과 함께 한 커밋으로 묶는다 (미정의 함수 참조 상태로 중간 커밋하지 않기 위함). Step 2는 생략하고 다음 Task로 진행.

---

### Task 5: 랜덤 당첨자 추첨 로직 (저수지 표본추출)

**Files:**
- Modify: `script.js` (Task 1 헬퍼들 근처 또는 `submitMission()` 바로 아래)

- [ ] **Step 1: `_attemptRandomWinnerDraw()` 추가**

`submitMission()` 함수 바로 뒤에 추가:

```js
function _attemptRandomWinnerDraw(date, memberName) {
    const missionDateRef = missionsRef.child(date);
    const prevDate = _getPrevKstDateStr(date);
    missionsRef.child(prevDate).child('_randomWinner').once('value').then(snap => {
        const prevWinnerName = snap.exists() ? snap.val().memberName : null;
        if (prevWinnerName && prevWinnerName === memberName) return; // 연속 2일 당첨 방지
        missionDateRef.child('_randomWinner').transaction(current => {
            const count = (current && current.count) || 0;
            const newCount = count + 1;
            if (Math.random() < 1 / newCount) {
                return { sessionId: mySessionId, memberName: memberName, timestamp: Date.now(), count: newCount };
            }
            return { ...current, count: newCount };
        }).catch(() => {});
    }).catch(() => {});
}
```

- [ ] **Step 2: 브라우저에서 저수지 표본추출 공정성 검증**

`javascript_tool`로 시뮬레이션 (실제 RTDB 대신 순수 로직만 반복 검증):
```js
(() => {
    const counts = {A:0,B:0,C:0,D:0};
    for (let trial = 0; trial < 20000; trial++) {
        let current = null;
        for (const name of ['A','B','C','D']) {
            const count = (current && current.count) || 0;
            const newCount = count + 1;
            if (Math.random() < 1/newCount) current = {memberName:name, count:newCount};
            else current = {...current, count:newCount};
        }
        counts[current.memberName]++;
    }
    return counts;
})();
```
기대값: A/B/C/D가 대략 균등(각 약 5000 ±300 내외)하게 분포 — 편향 없음을 확인.

- [ ] **Step 3: 실제 RTDB 트랜잭션 동작 검증 (테스트 데이터)**

로컬 프리뷰에서 실제 로그인/제출 없이 콘솔로 직접 트랜잭션 호출해 오늘 테스트 날짜(`missionTest` 파라미터로 접근한 미션의 date)에 대해 2회 연속 호출 후 `_randomWinner.count`가 2로 올라가는지 확인. 검증 후 해당 테스트 키(`_randomWinner`만, 다른 멤버 데이터 없는지 확인 후) 좁게 삭제.

- [ ] **Step 4: 커밋 전 Task 6까지 마저 구현 (아래로 계속)**

---

### Task 6: 당첨 축하 팝업 (마크업 + 스타일 + JS)

**Files:**
- Modify: `index.html` (`#mission-popup` 다음 위치에 신규 모달 추가)
- Modify: `style.css`
- Modify: `script.js` (`_showWinnerCelebration`, `closeMissionWinnerPopup` 추가)

- [ ] **Step 1: index.html에 팝업 마크업 추가**

`index.html`의 `<!-- 일일미션 팝업 -->` 블록(`</div>` 닫힘, 대략 196번째 줄) 바로 다음에 추가:

```html
    <!-- 시크릿기프트 당첨 축하 팝업 -->
    <div id="mission-winner-popup" onclick="closeMissionWinnerPopup()">
        <div class="winner-popup-box" onclick="event.stopPropagation()">
            <div class="winner-popup-emoji">🎉🎁🎉</div>
            <h3>축하합니다!</h3>
            <p id="winner-popup-message">오늘의 시크릿기프트 당첨!</p>
            <p class="winner-popup-note">선물은 카카오톡으로 전달됩니다 💬</p>
            <button class="submit-btn" onclick="closeMissionWinnerPopup()">확인</button>
        </div>
    </div>
```

- [ ] **Step 2: style.css에 스타일 추가**

`.mission-gift-badge` 규칙 다음에 추가:

```css
/* ── 시크릿기프트 당첨 축하 팝업 ── */
#mission-winner-popup { display:none; position:fixed; inset:0; background:rgba(120,50,90,0.65); z-index:4000; justify-content:center; align-items:center; }
#mission-winner-popup.active { display:flex; animation:fadeIn .2s; }
.winner-popup-box { background:var(--bg); border:2px solid #FFB74D; width:290px; padding:30px 24px; border-radius:var(--r-lg); text-align:center; box-shadow:var(--shadow-lg); }
.winner-popup-emoji { font-size:2.2rem; margin-bottom:10px; }
.winner-popup-box h3 { margin:0 0 10px; color:#7A4A00; font-size:1.15rem; font-weight:800; }
.winner-popup-box p { margin:0 0 8px; font-size:0.92rem; color:var(--text); line-height:1.6; }
.winner-popup-note { font-size:0.82rem !important; color:var(--text-dim) !important; }
.winner-popup-box .submit-btn { margin-top:14px; }
```

- [ ] **Step 3: script.js에 `_showWinnerCelebration()`/`closeMissionWinnerPopup()` 추가**

`_attemptRandomWinnerDraw()` 함수 뒤에 추가:

```js
function _showWinnerCelebration(message) {
    document.getElementById('winner-popup-message').textContent = message;
    const cw = window.innerWidth, ch = window.innerHeight;
    for (let i = 0; i < 5; i++) {
        setTimeout(() => createFirework(Math.random() * cw, ch * 0.3 + Math.random() * ch * 0.4), i * 220);
    }
    document.getElementById('mission-winner-popup').classList.add('active');
}
function closeMissionWinnerPopup() {
    document.getElementById('mission-winner-popup').classList.remove('active');
}
```

- [ ] **Step 4: 브라우저에서 Task 4~6 전체 흐름 검증**

1. 로컬 프리뷰에서 테스트용 세션으로 미션 제출 → 그날 첫 제출이면 화면 여러 지점에서 컨페티가 시차를 두고 터지고, "🎉 축하합니다! 오늘의 시크릿기프트 1등 당첨! 🎁 / 선물은 카카오톡으로 전달됩니다" 팝업이 뜨는지 확인
2. 두 번째 세션(시뮬레이션)으로 같은 날 제출 → 기존과 동일한 작은 불꽃 + "🎉 미션 완료!" 토스트만 뜨고, 당첨 팝업은 뜨지 않는지 확인 (`_attemptRandomWinnerDraw` 호출은 되지만 팝업 없음)
3. 검증 후 테스트 데이터 정리 (좁은 범위 삭제 — 특정 세션 키/`_firstPlace`/`_randomWinner`만, 날짜 노드 전체 삭제 금지)

- [ ] **Step 5: Task 4·5·6 통합 커밋**

```bash
git add script.js index.html style.css
git commit -m "feat: 1등 당첨 축하 팝업 강화 + 랜덤 당첨자 추첨(저수지 표본추출) 추가"
```

---

### Task 7: 랜덤 당첨자 익일 알림

**Files:**
- Modify: `script.js` (`initMissionButton` IIFE 근처)

- [ ] **Step 1: `_checkRandomWinnerNotification()` 추가**

`_showWinnerCelebration`/`closeMissionWinnerPopup` 정의부 뒤(또는 파일 내 적절한 위치)에 추가:

```js
function _checkRandomWinnerNotification() {
    const today = getTodayKstDateStr();
    const yesterday = _getPrevKstDateStr(today);
    const flagKey = 'randomWinnerNotified_' + yesterday;
    if (localStorage.getItem(flagKey)) return;
    missionsRef.child(yesterday).child('_randomWinner').once('value').then(snap => {
        if (!snap.exists()) return;
        const v = snap.val();
        if (v.sessionId !== mySessionId) return;
        localStorage.setItem(flagKey, '1');
        _showWinnerCelebration('어제의 시크릿기프트 랜덤 당첨! 🎁');
    }).catch(() => {});
}
```

- [ ] **Step 2: 앱 초기화 시 1회 호출**

`script.js:152-155`의 `initMissionButton` IIFE 바로 다음 줄에 추가:

```js
(function initMissionButton() {
    const btn = document.getElementById('mission-btn');
    if (btn) btn.style.display = 'flex';
})();
_checkRandomWinnerNotification();
```

- [ ] **Step 3: 브라우저에서 검증**

테스트 날짜의 `_randomWinner.sessionId`를 현재 세션의 `mySessionId`와 동일하게 RTDB에 임시로 심어두고 `localStorage.removeItem('randomWinnerNotified_...')` 후 페이지를 새로고침해 팝업이 뜨는지 확인. 재새로고침 시 다시 뜨지 않는지(플래그 저장) 확인. 검증 후 테스트로 심어둔 키만 좁게 삭제.

- [ ] **Step 4: 커밋**

```bash
git add script.js
git commit -m "feat: 랜덤 당첨자 익일 1회성 축하 알림 추가"
```

---

### Task 8: 배너 마크업 갱신 + 멤버 그리드에서 _randomWinner 키 제외

**Files:**
- Modify: `index.html:147-150`
- Modify: `style.css:698`
- Modify: `script.js:1166` (`_renderMissionMembers`)

- [ ] **Step 1: 배너 마크업 2줄 구조로 변경**

`index.html`의 기존:
```html
                <div class="mission-gift-banner" id="mission-gift-banner" style="display:none">
                    🎁 오늘의 시크릿기프트 당첨자: <span id="mission-gift-winner"></span>님
                </div>
```
를 아래로 교체:
```html
                <div class="mission-gift-banner" id="mission-gift-banner" style="display:none">
                    <div>🎁 1등 당첨자: <span id="mission-gift-winner"></span>님</div>
                    <div class="mission-gift-random-note">🎲 랜덤 당첨자는 자정 이후 확정돼요</div>
                </div>
```

- [ ] **Step 2: style.css 갱신**

`.mission-gift-banner` 규칙을 아래로 교체(컬럼 정렬로 변경):
```css
.mission-gift-banner { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; background:linear-gradient(135deg,#FFD86B,#FFB74D); color:#7A4A00; font-size:0.82rem; font-weight:800; padding:10px 14px; border-radius:var(--r-md); text-align:center; }
```
바로 다음 줄에 추가:
```css
.mission-gift-random-note { font-size:0.72rem; font-weight:600; opacity:0.85; }
```

- [ ] **Step 3: `_renderMissionMembers()`에서 `_randomWinner` 키 필터링**

기존:
```js
    const entries = Object.entries(completions).filter(([uid]) => uid !== '_firstPlace');
```
를 아래로 교체:
```js
    const entries = Object.entries(completions).filter(([uid]) => uid !== '_firstPlace' && uid !== '_randomWinner');
```

- [ ] **Step 4: 브라우저에서 확인**

미션 팝업을 열어 배너가 "🎁 1등 당첨자: OOO님" + "🎲 랜덤 당첨자는 자정 이후 확정돼요" 2줄로 보이는지, 멤버 그리드에 `_randomWinner`가 가짜 멤버 칩으로 잘못 렌더링되지 않는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add index.html style.css script.js
git commit -m "feat: 시크릿기프트 배너를 1등+랜덤 2줄 구조로 변경, 멤버 그리드에서 _randomWinner 키 제외"
```

---

### Task 9: 관리자용 당첨자 목록 모달

**Files:**
- Modify: `index.html:316-321` 근처(설정 모달 버튼), 신규 모달 마크업 추가
- Modify: `style.css`
- Modify: `script.js:583-595` (`onAuthStateChanged`), 신규 함수 추가

- [ ] **Step 1: 설정 모달에 관리자 전용 버튼 추가**

`index.html`의 `#btn-broadcast-update` 버튼 바로 다음에 추가:

```html
                <button class="setting-item" id="btn-gift-winners" onclick="openGiftWinnersModal(); closeSettingsModal();" aria-label="시크릿기프트 당첨자 목록" style="display:none;">
                    <span class="setting-icon-badge" style="background:linear-gradient(135deg,#FFD86B,#FFB74D);">
                        <span class="material-symbols-rounded" style="font-size:1.1rem;color:#fff;">redeem</span>
                    </span>
                    <span class="setting-text">시크릿기프트 당첨자 목록</span>
                </button>
```

- [ ] **Step 2: 당첨자 목록 모달 마크업 추가**

`#color-modal` 블록 바로 다음에 추가:

```html
    <!-- 시크릿기프트 당첨자 목록 (관리자 전용) -->
    <div id="gift-winners-modal" onclick="closeGiftWinnersModal()">
        <div class="admin-box" style="width:300px;max-height:70vh;overflow-y:auto;" onclick="event.stopPropagation()">
            <h3>🎁 당첨자 목록</h3>
            <div id="gift-winners-list" style="text-align:left;font-size:0.85rem;line-height:1.8;color:var(--text);"></div>
            <button class="color-close-btn" onclick="closeGiftWinnersModal()">닫기</button>
        </div>
    </div>
```

- [ ] **Step 3: style.css에 모달 표시 규칙 추가**

`#color-modal.active` 규칙 다음에 추가:

```css
/* ── 당첨자 목록 모달 ── */
#gift-winners-modal { display:none; position:fixed; inset:0; background:rgba(120,50,90,0.60); z-index:3000; justify-content:center; align-items:center; }
#gift-winners-modal.active { display:flex; animation:fadeIn .2s; }
```

- [ ] **Step 4: script.js에 목록 조회 함수 추가**

`adminDeleteMissionSubmission` 함수 근처(또는 파일 내 관리자 관련 함수들 근처)에 추가:

```js
function openGiftWinnersModal() {
    if (!isAdmin) return;
    const listEl = document.getElementById('gift-winners-list');
    listEl.textContent = '불러오는 중...';
    document.getElementById('gift-winners-modal').classList.add('active');
    missionsRef.once('value').then(snap => {
        const data = snap.val() || {};
        const dates = Object.keys(data).sort();
        if (dates.length === 0) { listEl.textContent = '당첨 기록이 없어요.'; return; }
        listEl.innerHTML = dates.map(date => {
            const d = data[date];
            const first = d._firstPlace ? escHtml(d._firstPlace.memberName) : '-';
            const random = d._randomWinner ? escHtml(d._randomWinner.memberName) : '-';
            return `<div>${escHtml(date)} — 1등: ${first} · 랜덤: ${random}</div>`;
        }).join('');
    }).catch(err => { listEl.textContent = '불러오기 실패: ' + err.message; });
}
function closeGiftWinnersModal() {
    document.getElementById('gift-winners-modal').classList.remove('active');
}
```

- [ ] **Step 5: `onAuthStateChanged`에 버튼 토글 추가**

`script.js:583-595`의 기존 콜백을 아래로 교체:

```js
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        isAdmin = true;
        document.getElementById('body').classList.add('admin-mode');
        const btn = document.getElementById('btn-broadcast-update');
        if (btn) btn.style.display = '';
        const giftBtn = document.getElementById('btn-gift-winners');
        if (giftBtn) giftBtn.style.display = '';
    } else {
        isAdmin = false;
        document.getElementById('body').classList.remove('admin-mode');
        const btn = document.getElementById('btn-broadcast-update');
        if (btn) btn.style.display = 'none';
        const giftBtn = document.getElementById('btn-gift-winners');
        if (giftBtn) giftBtn.style.display = 'none';
    }
});
```

- [ ] **Step 6: 브라우저에서 검증**

관리자 로그인 후 설정 모달에 "시크릿기프트 당첨자 목록" 버튼이 보이는지, 클릭 시 날짜별 1등/랜덤 이름이 나열되는지 확인. 관리자가 아닌 상태에서는 버튼이 보이지 않는지 확인.

- [ ] **Step 7: 커밋**

```bash
git add index.html style.css script.js
git commit -m "feat: 관리자용 시크릿기프트 당첨자 목록 조회 기능 추가"
```

---

### Task 10: 캐시 버전 v1.3.0으로 갱신

**Files:**
- Modify: `index.html` (`script.js?v=102` → `?v=103`)
- Modify: `sw.js` (버전 주석, `CACHE_NAME`)

- [ ] **Step 1: index.html 갱신**

```html
    <script src="script.js?v=103" defer></script>
```

- [ ] **Step 2: sw.js 갱신**

```js
// Service Worker Version 103 (v1.3.0)
```
```js
const CACHE_NAME = 'yc-school-v13';
```

- [ ] **Step 3: 커밋**

```bash
git add index.html sw.js
git commit -m "chore: 캐시 버전 v1.3.0으로 갱신"
```

---

### Task 11: 브라우저 실사용 종합 검증

- [ ] **Step 1** 07시 이전(오버라이드) 상태에서 미션 팝업 → 안내 카드만 보이고 업로드 불가 확인
- [ ] **Step 2** 정상 시간대에 첫 제출 → 다발 컨페티 + "1등 당첨" 팝업("선물은 카카오톡으로 전달됩니다" 문구 포함) 확인
- [ ] **Step 3** 두 번째 제출(시뮬레이션 세션) → 1등 팝업 없이 기존과 동일한 작은 효과만, `_randomWinner` 트랜잭션이 시도되는지 확인 (RTDB에서 `_randomWinner.count` 증가 확인)
- [ ] **Step 4** 배너가 1등 이름은 즉시 보여주되 랜덤은 "자정 이후 확정" 문구만 보이는지 확인
- [ ] **Step 5** 멤버 그리드에 `_firstPlace`/`_randomWinner`가 가짜 멤버로 렌더링되지 않는지 확인
- [ ] **Step 6** 어제 날짜의 `_randomWinner.sessionId`를 현재 세션으로 임시 세팅 후 새로고침 → 익일 랜덤 당첨 팝업이 1회만 뜨는지 확인
- [ ] **Step 7** 관리자 모드에서 당첨자 목록 모달 동작 확인
- [ ] **Step 8** 기존 기능 회귀 확인: 기도문 필수 입력, 라이트박스 캡션, 재제출 프리필 등이 여전히 정상 동작하는지 확인
- [ ] **Step 9** 검증에 사용한 테스트 데이터를 좁은 범위로만 삭제 (날짜 노드 전체 삭제 금지 — 특정 테스트 키만)

---

### Task 12: Firebase 배포 + HANDOFF.md 갱신

- [ ] **Step 1** `firebase deploy --only hosting --project ycpraying-school` 실행
- [ ] **Step 2** `.claude/HANDOFF.md`를 v1.3.0 내용(제출시간 제한, 듀얼 당첨자, 축하 팝업, 관리자 당첨자 목록)으로 갱신
- [ ] **Step 3** 커밋

```bash
git add .claude/HANDOFF.md
git commit -m "docs: HANDOFF.md 갱신 (v1.3.0, 제출시간 제한+듀얼 당첨자)"
```
