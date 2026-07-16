# 일일미션 기도문 작성 + 시크릿기프트(1등 표시) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 일일미션 제출 시 기도문 작성을 사진과 함께 필수로 받고, 매일 가장 먼저 제출한 1인을 "시크릿기프트" 당첨자로 앱 내에 표시한다.

**Architecture:** 기존 `missions/{date}/{sessionId}` 레코드에 `prayerText` 필드를 추가하고, 같은 `{date}` 아래 특수 키 `_firstPlace`를 RTDB 트랜잭션으로 race-safe하게 기록한다. 기존 `missionRef.on('value', ...)` 구독이 매번 전체 스냅샷(`_firstPlace` 포함)을 받으므로, 별도 구독 없이 `_renderMissionMembers()` 안에서 배너 갱신까지 함께 처리한다. `openLightbox(src, caption)`은 2번째 인자를 선택적으로 받아 기존 무캡션 호출부(캠프 포스터 등)와 하위 호환을 유지한다.

**Tech Stack:** 순수 HTML/CSS/JS (빌드 스텝 없음), Firebase Realtime Database (`asia-southeast1`), Firebase Hosting. 자동화 테스트 프레임워크 없음 — 브라우저 실사용으로 검증.

**참고 스펙:** [docs/superpowers/specs/2026-07-16-mission-prayer-and-gift-design.md](../specs/2026-07-16-mission-prayer-and-gift-design.md)

---

### Task 1: 라이트박스 캡션 + 시크릿기프트 배너 CSS 추가

**Files:**
- Modify: `style.css` (파일 끝, 695번 줄 `.mission-no-members` 규칙 뒤에 추가)
- Modify: `style.css:443` 부근 (`#lightbox img` 규칙 뒤에 캡션 스타일 추가)

- [ ] **Step 1: `#lightbox-caption` 스타일 추가**

`style.css:443` (`#lightbox img { ... }` 줄) 바로 뒤에 삽입:

```css
#lightbox-caption { display:none; position:absolute; left:0; right:0; bottom:0; max-width:95vw; margin:0 auto; background:rgba(0,0,0,0.65); color:#fff; font-size:0.85rem; line-height:1.6; padding:14px 18px; white-space:pre-wrap; text-align:left; box-sizing:border-box; }
#lightbox-caption.active { display:block; }
```

(`#lightbox`는 이미 `position:fixed`라 캡션의 `position:absolute` 기준이 됨 — `#lightbox` 자체 규칙은 수정 불필요)

- [ ] **Step 2: 시크릿기프트 배너 + 배지 스타일 추가**

`style.css:695` (`.mission-no-members { ... }` 줄) 바로 뒤에 추가:

```css
.mission-gift-banner { display:flex; align-items:center; justify-content:center; gap:6px; background:linear-gradient(135deg,#FFD86B,#FFB74D); color:#7A4A00; font-size:0.82rem; font-weight:800; padding:10px 14px; border-radius:var(--r-md); text-align:center; }
.mission-gift-badge { font-size:0.85rem; margin-left:2px; }
```

- [ ] **Step 3: 커밋**

```bash
git -C /Users/kimwoojung/Projects/ycpraying-school add style.css
git -C /Users/kimwoojung/Projects/ycpraying-school commit -m "style: 라이트박스 캡션/시크릿기프트 배너 CSS 추가"
```

---

### Task 2: index.html — 마크업 추가 (기도문 입력, 배너, 라이트박스 캡션)

**Files:**
- Modify: `index.html:59-61` (라이트박스)
- Modify: `index.html:145-147` (미션 팝업 상단, 배너 삽입)
- Modify: `index.html:172-173` (기도문 텍스트에어리어 삽입)
- Modify: `index.html:178` (완료 사진 onclick에 caption 전달)

- [ ] **Step 1: 라이트박스에 캡션 div 추가**

`index.html:59-61` 현재:
```html
    <div id="lightbox" onclick="closeLightbox()">
        <img id="lightbox-img" src="" alt="확대 이미지" onclick="event.stopPropagation()">
    </div>
```

변경:
```html
    <div id="lightbox" onclick="closeLightbox()">
        <img id="lightbox-img" src="" alt="확대 이미지" onclick="event.stopPropagation()">
        <div id="lightbox-caption" onclick="event.stopPropagation()"></div>
    </div>
```

- [ ] **Step 2: 시크릿기프트 배너를 진행 상황 섹션 위에 추가**

`index.html:145-147` 현재:
```html
            <div class="mission-popup-scroll">
                <!-- 진행 상황 -->
                <div class="mission-progress-section">
```

변경:
```html
            <div class="mission-popup-scroll">
                <!-- 시크릿기프트 배너 -->
                <div class="mission-gift-banner" id="mission-gift-banner" style="display:none">
                    🎁 오늘의 시크릿기프트 당첨자: <span id="mission-gift-winner"></span>님
                </div>
                <!-- 진행 상황 -->
                <div class="mission-progress-section">
```

- [ ] **Step 3: 기도문 텍스트에어리어를 파일 입력과 제출 버튼 사이에 추가**

`index.html:172-173` 현재:
```html
                    <input type="file" id="mission-file-input" accept="image/*" capture="environment" style="display:none" onchange="handleMissionPhotoSelect(event)">
                    <button class="mission-submit-btn" id="mission-submit-btn" onclick="submitMission()">✅ 인증 제출하기</button>
```

변경:
```html
                    <input type="file" id="mission-file-input" accept="image/*" capture="environment" style="display:none" onchange="handleMissionPhotoSelect(event)">
                    <textarea id="mission-prayer-input" class="simple-modal-input" rows="3" maxlength="300" placeholder="오늘의 기도문을 적어주세요 🙏" style="margin-top:10px"></textarea>
                    <button class="mission-submit-btn" id="mission-submit-btn" onclick="submitMission()">✅ 인증 제출하기</button>
```

- [ ] **Step 4: 완료 사진 클릭 시 기도문을 라이트박스 캡션으로 전달**

`index.html:178` 현재:
```html
                    <img id="mission-done-img" src="" alt="제출한 인증 사진" class="mission-done-photo" onclick="openLightbox(this.src)">
```

변경:
```html
                    <img id="mission-done-img" src="" alt="제출한 인증 사진" class="mission-done-photo" onclick="openLightbox(this.src, this.dataset.caption)">
```

- [ ] **Step 5: 커밋**

```bash
git -C /Users/kimwoojung/Projects/ycpraying-school add index.html
git -C /Users/kimwoojung/Projects/ycpraying-school commit -m "feat: 일일미션 기도문 입력란/시크릿기프트 배너/라이트박스 캡션 마크업 추가"
```

---

### Task 3: script.js — `openLightbox`/`closeLightbox`에 캡션 지원 추가

**Files:**
- Modify: `script.js:1733-1742`

- [ ] **Step 1: `openLightbox` 시그니처 확장**

`script.js:1733-1742` 현재:
```javascript
function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = src;
    img.style.transform = '';
    lb.classList.add('active');
}
function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
}
```

변경:
```javascript
function openLightbox(src, caption) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const captionEl = document.getElementById('lightbox-caption');
    img.src = src;
    img.style.transform = '';
    if (caption) {
        captionEl.textContent = caption;
        captionEl.classList.add('active');
    } else {
        captionEl.textContent = '';
        captionEl.classList.remove('active');
    }
    lb.classList.add('active');
}
function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
}
```

(기존 무인자 호출부 — 캠프 포스터 3곳, `mission-preview-img` — 는 `caption`이 `undefined`이므로 else 분기를 타서 캡션이 숨겨진 채로 그대로 동작함)

- [ ] **Step 2: 커밋**

```bash
git -C /Users/kimwoojung/Projects/ycpraying-school add script.js
git -C /Users/kimwoojung/Projects/ycpraying-school commit -m "feat: openLightbox에 선택적 캡션 인자 추가"
```

---

### Task 4: script.js — 상태 변수 추가 및 `_showMissionCompleted` 확장

**Files:**
- Modify: `script.js:1023-1025` (상태 변수)
- Modify: `script.js:1071-1075` (`_showMissionCompleted`)

- [ ] **Step 1: `_missionSubmittedPrayerText` 상태 변수 추가**

`script.js:1023-1025` 현재:
```javascript
let _missionPhotoData = null;
let _missionPopupListener = null;
let _missionCompletionsCache = {};
```

변경:
```javascript
let _missionPhotoData = null;
let _missionPopupListener = null;
let _missionCompletionsCache = {};
let _missionSubmittedPrayerText = '';
```

- [ ] **Step 2: `_showMissionCompleted`에 `prayerText` 인자 추가**

`script.js:1071-1075` 현재:
```javascript
function _showMissionCompleted(photoData) {
    document.getElementById('mission-upload-section').style.display = 'none';
    document.getElementById('mission-done-section').style.display = 'flex';
    if (photoData) document.getElementById('mission-done-img').src = photoData;
}
```

변경:
```javascript
function _showMissionCompleted(photoData, prayerText) {
    document.getElementById('mission-upload-section').style.display = 'none';
    document.getElementById('mission-done-section').style.display = 'flex';
    const img = document.getElementById('mission-done-img');
    if (photoData) img.src = photoData;
    img.dataset.caption = prayerText || '';
}
```

- [ ] **Step 3: 커밋**

```bash
git -C /Users/kimwoojung/Projects/ycpraying-school add script.js
git -C /Users/kimwoojung/Projects/ycpraying-school commit -m "feat: 미션 완료 사진에 기도문 캡션 데이터 저장"
```

---

### Task 5: script.js — `openMissionPopup()`에 기도문 초기화/프리필 반영

**Files:**
- Modify: `script.js:1027-1064`

- [ ] **Step 1: 팝업 오픈 시 기도문 입력창 초기화 + 기존 제출 조회 시 프리필값 캐싱**

`script.js:1049-1055` 현재:
```javascript
    document.getElementById('mission-name-input').value = localStorage.getItem('missionMemberName') || '';

    // 해당 일차 이미 완료했는지 확인 (실제 날짜가 아닌 미션 스케줄의 날짜를 키로 사용)
    const missionRef = missionsRef.child(mission.date);
    missionRef.child(mySessionId).once('value').then(snap => {
        if (snap.exists()) _showMissionCompleted(snap.val().photoData);
    });
```

변경:
```javascript
    document.getElementById('mission-name-input').value = localStorage.getItem('missionMemberName') || '';
    document.getElementById('mission-prayer-input').value = '';
    _missionSubmittedPrayerText = '';

    // 해당 일차 이미 완료했는지 확인 (실제 날짜가 아닌 미션 스케줄의 날짜를 키로 사용)
    const missionRef = missionsRef.child(mission.date);
    missionRef.child(mySessionId).once('value').then(snap => {
        if (snap.exists()) {
            const v = snap.val();
            _missionSubmittedPrayerText = v.prayerText || '';
            _showMissionCompleted(v.photoData, v.prayerText);
        }
    });
```

- [ ] **Step 2: 커밋**

```bash
git -C /Users/kimwoojung/Projects/ycpraying-school add script.js
git -C /Users/kimwoojung/Projects/ycpraying-school commit -m "feat: 미션 팝업 오픈 시 기도문 입력 초기화 및 기존 제출 프리필 캐싱"
```

---

### Task 6: script.js — `submitMission()`에 기도문 검증/저장 + 1등 트랜잭션 추가

**Files:**
- Modify: `script.js:1100-1123`

- [ ] **Step 1: 기도문 필수 검증, 저장 필드 추가, 저장 후 `_firstPlace` 트랜잭션 시도**

`script.js:1100-1123` 현재:
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

변경:
```javascript
function submitMission() {
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
        const rect = btn.getBoundingClientRect();
        createFirework(rect.left + rect.width / 2, rect.top + rect.height / 2);
        showWeatherToast('🎉 미션 완료!', '오늘도 은혜로운 하루 되세요 🙏', 4000);
        missionDateRef.child('_firstPlace').transaction(current => {
            if (current === null) return { sessionId: mySessionId, memberName: memberName, timestamp: Date.now() };
            return undefined;
        }).catch(() => {});
    }).catch(err => {
        alert('제출 실패: ' + err.message);
        btn.disabled = false; btn.textContent = '✅ 인증 제출하기';
    });
}
```

(`_firstPlace` 트랜잭션은 `.catch(() => {})`로 실패를 조용히 무시 — 스펙의 "1등 표시는 부가 기능, 실패해도 핵심 제출에 영향 없어야 함" 요구사항 반영)

- [ ] **Step 2: 커밋**

```bash
git -C /Users/kimwoojung/Projects/ycpraying-school add script.js
git -C /Users/kimwoojung/Projects/ycpraying-school commit -m "feat: 미션 제출 시 기도문 필수 저장 및 1등(시크릿기프트) 트랜잭션 추가"
```

---

### Task 7: script.js — `editMissionSubmission()`에 기도문 프리필 추가

**Files:**
- Modify: `script.js:1125-1140`

- [ ] **Step 1: 재제출 시 직전 기도문을 입력창에 프리필**

`script.js:1129-1138` 현재:
```javascript
    missionsRef.child(mission.date).child(mySessionId).remove().then(() => {
        _missionPhotoData = null;
        document.getElementById('mission-file-input').value = '';
        document.getElementById('mission-upload-placeholder').style.display = 'flex';
        document.getElementById('mission-photo-preview').style.display = 'none';
        document.getElementById('mission-upload-section').style.display = 'block';
        document.getElementById('mission-done-section').style.display = 'none';
        const submitBtn = document.getElementById('mission-submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ 인증 제출하기';
    }).catch(err => alert('삭제 실패: ' + err.message));
```

변경:
```javascript
    missionsRef.child(mission.date).child(mySessionId).remove().then(() => {
        _missionPhotoData = null;
        document.getElementById('mission-file-input').value = '';
        document.getElementById('mission-upload-placeholder').style.display = 'flex';
        document.getElementById('mission-photo-preview').style.display = 'none';
        document.getElementById('mission-upload-section').style.display = 'block';
        document.getElementById('mission-done-section').style.display = 'none';
        document.getElementById('mission-prayer-input').value = _missionSubmittedPrayerText || '';
        const submitBtn = document.getElementById('mission-submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ 인증 제출하기';
    }).catch(err => alert('삭제 실패: ' + err.message));
```

(`_firstPlace` 노드는 건드리지 않음 — 스펙의 범위 제외 항목)

- [ ] **Step 2: 커밋**

```bash
git -C /Users/kimwoojung/Projects/ycpraying-school add script.js
git -C /Users/kimwoojung/Projects/ycpraying-school commit -m "feat: 미션 재제출 시 직전 기도문 프리필"
```

---

### Task 8: script.js — `_renderMissionMembers()` 배지/배너 반영 및 `_openMissionMemberPhoto()` 캡션 전달

**Files:**
- Modify: `script.js:1142-1161` (`_renderMissionMembers`)
- Modify: `script.js:1171-1174` (`_openMissionMemberPhoto`)

- [ ] **Step 1: `_renderMissionMembers`에서 `_firstPlace` 필터링, 배지 추가, 배너 갱신 함수 신설**

`script.js:1142-1161` 현재:
```javascript
function _renderMissionMembers(completions) {
    _missionCompletionsCache = completions;
    const grid = document.getElementById('mission-members-grid');
    if (!grid) return;
    const entries = Object.entries(completions);
    if (entries.length === 0) {
        grid.innerHTML = '<div class="mission-no-members">아직 완료한 멤버가 없어요 🙏<br>첫 번째 주인공이 되어보세요!</div>';
        return;
    }
    grid.innerHTML = entries
        .sort((a, b) => (a[1].timestamp||0) - (b[1].timestamp||0))
        .map(([uid, data]) => {
            const name = escHtml(data.memberName || '멤버');
            const clickable = data.photoData ? `onclick="_openMissionMemberPhoto('${uid}')" style="cursor:pointer"` : '';
            const deleteBtn = isAdmin ? `<button class="mission-member-delete-btn" onclick="event.stopPropagation(); adminDeleteMissionSubmission('${uid}')" aria-label="인증 사진 삭제">×</button>` : '';
            return `<div class="mission-member-chip" ${clickable}>
                <span>✅</span><span class="mission-member-name">${name}</span>${deleteBtn}
            </div>`;
        }).join('');
}
```

변경:
```javascript
function _renderMissionMembers(completions) {
    _missionCompletionsCache = completions;
    _updateGiftBanner(completions._firstPlace);
    const grid = document.getElementById('mission-members-grid');
    if (!grid) return;
    const entries = Object.entries(completions).filter(([uid]) => uid !== '_firstPlace');
    if (entries.length === 0) {
        grid.innerHTML = '<div class="mission-no-members">아직 완료한 멤버가 없어요 🙏<br>첫 번째 주인공이 되어보세요!</div>';
        return;
    }
    const winnerUid = completions._firstPlace && completions._firstPlace.sessionId;
    grid.innerHTML = entries
        .sort((a, b) => (a[1].timestamp||0) - (b[1].timestamp||0))
        .map(([uid, data]) => {
            const name = escHtml(data.memberName || '멤버');
            const clickable = data.photoData ? `onclick="_openMissionMemberPhoto('${uid}')" style="cursor:pointer"` : '';
            const deleteBtn = isAdmin ? `<button class="mission-member-delete-btn" onclick="event.stopPropagation(); adminDeleteMissionSubmission('${uid}')" aria-label="인증 사진 삭제">×</button>` : '';
            const giftBadge = uid === winnerUid ? '<span class="mission-gift-badge">🎁</span>' : '';
            return `<div class="mission-member-chip" ${clickable}>
                <span>✅</span><span class="mission-member-name">${name}</span>${giftBadge}${deleteBtn}
            </div>`;
        }).join('');
}

function _updateGiftBanner(firstPlace) {
    const banner = document.getElementById('mission-gift-banner');
    if (!banner) return;
    if (firstPlace && firstPlace.memberName) {
        document.getElementById('mission-gift-winner').textContent = firstPlace.memberName;
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }
}
```

- [ ] **Step 2: `_openMissionMemberPhoto`에서 기도문을 캡션으로 전달**

`script.js:1171-1174` 현재:
```javascript
function _openMissionMemberPhoto(uid) {
    const data = _missionCompletionsCache[uid];
    if (data && data.photoData) openLightbox(data.photoData);
}
```

변경:
```javascript
function _openMissionMemberPhoto(uid) {
    const data = _missionCompletionsCache[uid];
    if (data && data.photoData) openLightbox(data.photoData, data.prayerText);
}
```

- [ ] **Step 3: 커밋**

```bash
git -C /Users/kimwoojung/Projects/ycpraying-school add script.js
git -C /Users/kimwoojung/Projects/ycpraying-school commit -m "feat: 멤버 그리드에 시크릿기프트 배지/배너 표시 및 라이트박스 캡션 연동"
```

---

### Task 9: 캐시 버전 갱신

**Files:**
- Modify: `index.html:23`
- Modify: `sw.js:1`
- Modify: `sw.js:40`

- [ ] **Step 1: `index.html`의 script.js 쿼리 버전 갱신**

`index.html:23` 현재:
```html
    <script src="script.js?v=101" defer></script>
```

변경:
```html
    <script src="script.js?v=102" defer></script>
```

- [ ] **Step 2: `sw.js` 버전 주석/캐시 이름 갱신**

`sw.js:1` 현재:
```javascript
// Service Worker Version 101 (v1.2.4)
```

변경:
```javascript
// Service Worker Version 102 (v1.2.5)
```

`sw.js:40` 현재:
```javascript
const CACHE_NAME = 'yc-school-v11';
```

변경:
```javascript
const CACHE_NAME = 'yc-school-v12';
```

- [ ] **Step 3: 커밋**

```bash
git -C /Users/kimwoojung/Projects/ycpraying-school add index.html sw.js
git -C /Users/kimwoojung/Projects/ycpraying-school commit -m "chore: 캐시 버전 v1.2.5로 갱신"
```

---

### Task 10: 브라우저 실사용 검증

자동화 테스트가 없는 프로젝트이므로, 로컬 서버(`python3 -m http.server 8080`, `.claude/launch.json`의 `ycpraying-school` 설정 사용) + 실제 RTDB에 대해 아래 항목을 스펙 문서의 검증 계획대로 확인한다. 테스트에 사용한 데이터는 검증 후 RTDB에서 삭제한다.

- [ ] **Step 1:** 기도문 미입력 상태로 제출 시도 → `🙏 기도문을 적어주세요!` alert로 차단되는지 확인
- [ ] **Step 2:** 사진+이름+기도문 모두 입력 후 제출 → RTDB `missions/{date}/{sessionId}.prayerText` 저장 확인, 첫 제출이므로 `missions/{date}/_firstPlace`에도 해당 세션 정보가 기록됐는지 확인
- [ ] **Step 3:** 완료 멤버 목록에 🎁 배지 확인, 미션 팝업 상단 배너에 당첨자 이름 확인
- [ ] **Step 4:** 다른 멤버 칩 클릭 → 라이트박스에 사진과 기도문 캡션이 함께 표시되는지 확인
- [ ] **Step 5:** 본인 완료 사진(`mission-done-img`) 클릭 → 본인이 적은 기도문이 캡션으로 표시되는지 확인
- [ ] **Step 6:** 브라우저 개발자도구 콘솔 또는 두 번째 세션(다른 `mySessionId`, 예: 시크릿탭)으로 같은 날짜에 제출 → `_firstPlace`가 최초 제출자로 유지되고 갱신되지 않는지 확인 (트랜잭션 취소 동작 검증)
- [ ] **Step 7:** "다시 제출하기" 클릭 후 업로드 화면에 직전 기도문이 입력창에 프리필되는지 확인
- [ ] **Step 8:** 캠프 포스터 이미지(`camp-poster.jpg` 등) 클릭 → 캡션 없이 라이트박스가 기존과 동일하게 정상 동작하는지 회귀 확인
- [ ] **Step 9:** 검증에 사용한 테스트 미션 제출 데이터를 RTDB에서 정리(삭제)

---

### Task 11: Firebase Hosting 배포 및 HANDOFF.md 갱신

**Files:**
- Modify: `.claude/HANDOFF.md`

- [ ] **Step 1: Firebase Hosting 배포**

```bash
firebase deploy --only hosting --project ycpraying-school
```

- [ ] **Step 2: `.claude/HANDOFF.md`를 이번 세션 내용으로 갱신**

기존 v1.2.4 내용을 유지하되, 제목을 `(v1.2.5)`로, "현재 상태"의 최신 커밋 해시를 이번 세션 마지막 커밋으로, "방금 수정한 내용"에 기도문 입력 + 시크릿기프트 기능 설명(스펙/계획 문서 링크 포함, 범위 제외 항목 명시)을 새 섹션으로 추가하고, "다음으로 할 수 있는 작업"에 "실제 푸시 알림 발송(Blaze 업그레이드 후 Cloud Function 연동)"을 반영한다.

- [ ] **Step 3: 커밋**

```bash
git -C /Users/kimwoojung/Projects/ycpraying-school add .claude/HANDOFF.md
git -C /Users/kimwoojung/Projects/ycpraying-school commit -m "docs: HANDOFF.md 갱신 (v1.2.5, 기도문+시크릿기프트 기능)"
```
