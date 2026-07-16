# 일일미션 제출자 이름 입력 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 익명 접속 사용자가 일일미션 인증사진을 제출할 때 이름을 직접 입력하게 하고, 그 이름을 기기에 기억해 다음 제출 때 자동으로 채워준다.

**Architecture:** `.mission-upload-section`에 이름 입력 필드(`#mission-name-input`)를 추가하고, `openMissionPopup()`에서 `localStorage`의 마지막 이름으로 채운다. `submitMission()`은 이 입력값을 검증·저장하고 RTDB `memberName` 필드에 사용한다. 기존에 항상 실패하던 `globalNodes.find(n => n.sessionId === mySessionId)` 죽은 코드를 제거한다. 빌드 도구가 없는 순수 HTML/JS/CSS 프로젝트이므로 자동화 테스트 프레임워크 대신 브라우저 실사용 검증으로 확인한다.

**Tech Stack:** Vanilla JS, Firebase Realtime Database, localStorage, Firebase Hosting

**참고 스펙:** [docs/superpowers/specs/2026-07-16-mission-submitter-name-design.md](../specs/2026-07-16-mission-submitter-name-design.md)

---

### Task 1: 이름 입력 필드 HTML 추가

**Files:**
- Modify: `index.html:161-172`

- [ ] **Step 1: `.mission-upload-section`에 이름 입력 필드 추가**

`index.html`의 다음 블록:

```html
                <div class="mission-upload-section" id="mission-upload-section">
                    <div class="mission-upload-placeholder" id="mission-upload-placeholder" onclick="document.getElementById('mission-file-input').click()">
```

을 아래로 교체:

```html
                <div class="mission-upload-section" id="mission-upload-section">
                    <input type="text" id="mission-name-input" class="profile-name-input" placeholder="이름을 입력해주세요" maxlength="20" style="margin-bottom:10px">
                    <div class="mission-upload-placeholder" id="mission-upload-placeholder" onclick="document.getElementById('mission-file-input').click()">
```

- [ ] **Step 2: 파일 저장 확인**

`grep -n "mission-name-input" index.html` 실행 시 방금 추가한 줄이 출력되는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add index.html
git commit -m "feat: 일일미션 이름 입력 필드 UI 추가"
```

---

### Task 2: 팝업 열 때 저장된 이름 자동 채우기

**Files:**
- Modify: `script.js` (`openMissionPopup()` 함수, 기존 미션 조회 로직 바로 앞)

- [ ] **Step 1: `openMissionPopup()`에 이름 프리필 로직 추가**

`script.js`에서 다음 블록:

```javascript
    // 해당 일차 이미 완료했는지 확인 (실제 날짜가 아닌 미션 스케줄의 날짜를 키로 사용)
    const missionRef = missionsRef.child(mission.date);
```

바로 위에 추가:

```javascript
    document.getElementById('mission-name-input').value = localStorage.getItem('missionMemberName') || '';

```

- [ ] **Step 2: 코드 위치 확인**

`grep -n "mission-name-input" script.js`로 방금 추가한 줄이 `openMissionPopup()` 함수 내부(위쪽)에 있는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add script.js
git commit -m "feat: 미션 팝업 열 때 저장된 이름 자동 채우기"
```

---

### Task 3: 제출 시 이름 검증 및 저장, memberName 교체

**Files:**
- Modify: `script.js:1098-1120` (`submitMission()`)

- [ ] **Step 1: `submitMission()` 교체**

기존 코드:

```javascript
function submitMission() {
    if (!_missionPhotoData) { alert('📷 필사 인증 사진을 먼저 선택해주세요!'); return; }
    const mission = getTodayMission();
    if (!mission) return;
    const btn = document.getElementById('mission-submit-btn');
    btn.disabled = true; btn.textContent = '⏳ 제출 중...';
    const myMember = globalNodes.find(n => n.sessionId === mySessionId);
    const memberName = myMember ? myMember.name : '멤버';
    missionsRef.child(mission.date).child(mySessionId).set({
        photoData: _missionPhotoData,
        timestamp: Date.now(),
        day: mission.day,
        memberName: memberName
    }).then(() => {
        _showMissionCompleted(_missionPhotoData);
        const rect = btn.getBoundingClientRect();
        createFirework(rect.left + rect.width / 2, rect.top + rect.height / 2);
        showWeatherToast('🎉 미션 완료!', '오늘도 은혜로운 하루 되세요 🙏', 4000);
    }).catch(err => {
        alert('제출 실패: ' + err.message);
        btn.disabled = false; btn.textContent = '✅ 인증 제출하기';
    });
}
```

교체 후:

```javascript
function submitMission() {
    if (!_missionPhotoData) { alert('📷 필사 인증 사진을 먼저 선택해주세요!'); return; }
    const memberName = document.getElementById('mission-name-input').value.trim();
    if (!memberName) { alert('✍️ 이름을 입력해주세요!'); return; }
    const mission = getTodayMission();
    if (!mission) return;
    const btn = document.getElementById('mission-submit-btn');
    btn.disabled = true; btn.textContent = '⏳ 제출 중...';
    localStorage.setItem('missionMemberName', memberName);
    missionsRef.child(mission.date).child(mySessionId).set({
        photoData: _missionPhotoData,
        timestamp: Date.now(),
        day: mission.day,
        memberName: memberName
    }).then(() => {
        _showMissionCompleted(_missionPhotoData);
        const rect = btn.getBoundingClientRect();
        createFirework(rect.left + rect.width / 2, rect.top + rect.height / 2);
        showWeatherToast('🎉 미션 완료!', '오늘도 은혜로운 하루 되세요 🙏', 4000);
    }).catch(err => {
        alert('제출 실패: ' + err.message);
        btn.disabled = false; btn.textContent = '✅ 인증 제출하기';
    });
}
```

- [ ] **Step 2: `globalNodes.find(n => n.sessionId ...)` 죽은 코드가 완전히 제거됐는지 확인**

`grep -n "n.sessionId" script.js` 실행 시 아무 결과도 나오지 않아야 함.

- [ ] **Step 3: 커밋**

```bash
git add script.js
git commit -m "feat: 미션 제출 시 입력된 이름 검증·저장, 죽은 sessionId 매칭 코드 제거"
```

---

### Task 4: 캐시 버전 갱신

**Files:**
- Modify: `index.html:23`
- Modify: `sw.js:1,40`

- [ ] **Step 1: `index.html`의 스크립트 버전 갱신**

`<script src="script.js?v=100" defer></script>` → `<script src="script.js?v=101" defer></script>`

- [ ] **Step 2: `sw.js`의 캐시 버전 갱신**

`sw.js:1`: `// Service Worker Version 100 (v1.2.3)` → `// Service Worker Version 101 (v1.2.4)`

`sw.js:40`: `const CACHE_NAME = 'yc-school-v10';` → `const CACHE_NAME = 'yc-school-v11';`

- [ ] **Step 3: 커밋**

```bash
git add index.html sw.js
git commit -m "chore: 캐시 버전 v101 (v1.2.4)로 갱신"
```

---

### Task 5: 브라우저 실사용 검증 및 배포

**Files:**
- 없음 (검증 전용 단계)

- [ ] **Step 1: 로컬 서버로 미리보기 실행**

`.claude/launch.json`에 정의된 dev 서버로 preview 오픈 (또는 `python3 -m http.server 8080` 후 브라우저로 접속).

- [ ] **Step 2: 이름 미입력 상태로 제출 시도**

미션 팝업 열기 → 사진만 선택하고 이름 입력창은 비운 채 제출 → `✍️ 이름을 입력해주세요!` alert가 뜨고 제출이 막히는지 확인.

- [ ] **Step 3: 이름 입력 후 제출**

이름 입력(예: "테스트멤버") → 제출 → `🎉 미션 완료!` 토스트 확인 → RTDB `missions/{date}/{sessionId}`에 `memberName: "테스트멤버"`로 저장됐는지 REST API(`https://ycpraying-school-default-rtdb.asia-southeast1.firebasedatabase.app/missions/<date>/<sessionId>.json`)로 확인.

- [ ] **Step 4: 자동 채우기 확인**

팝업 닫고 다시 열기 (또는 새로고침) → 이름 입력창에 방금 입력한 이름이 자동으로 채워져 있는지 확인.

- [ ] **Step 5: 멤버 완료 현황에 이름 표시 확인**

미션 팝업의 "오늘 완료한 멤버" 목록에 방금 입력한 이름이 정상 표시되는지 확인.

- [ ] **Step 6: 이름 수정 후 재제출 확인**

완료 화면에서 "✏️ 다시 제출하기" 클릭 → 업로드 화면으로 돌아왔을 때 이름 입력창에 직전 이름이 남아있는지 확인 → 이름을 다른 값으로 수정하고 사진 재선택 후 제출 → RTDB의 `memberName`이 새 이름으로 갱신됐는지 확인.

- [ ] **Step 7: Firebase Hosting 배포**

```bash
firebase deploy --only hosting --project ycpraying-school
```

- [ ] **Step 8: 사용자에게 배포 완료 보고, 실사용 확인 요청**

사용자가 직접 실제 서비스(`https://ycpraying-school.web.app`)에서 확인 후 이상 없으면 최종 커밋 여부를 알려달라고 안내한다. (이번 세션 앞서 대기 중인 v1.2.3 진단 변경 커밋 건도 함께 확인)
