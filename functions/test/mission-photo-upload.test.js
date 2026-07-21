const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const functionsIndex = fs.readFileSync(path.join(root, 'functions', 'index.js'), 'utf8');

test('mission upload accepts up to three photos and preserves a legacy cover photo', () => {
  assert.match(script, /const MISSION_PHOTO_LIMIT = 3/);
  assert.match(html, /id="mission-gallery-input" accept="image\/\*" multiple/);
  assert.match(script, /photoData: _missionPhotoDataList\[0\]/);
  assert.match(script, /photoDataList: _missionPhotoDataList/);
  assert.match(script, /openMissionPhotoGallery\(getMissionPhotos\(data\), data\.prayerText\)/);
  assert.match(script, /showNextLightboxPhoto\(\)/);
  assert.match(script, /isSwipeCandidate && Math\.abs\(dx\) > 45/);
});

test('each mission range has a short background explanation', () => {
  const backgrounds = script.match(/background:'/g) || [];
  assert.equal(backgrounds.length, 7);
  assert.match(script, /function toggleMissionBackground\(\)/);
});

test('copying instructions explicitly require every verse in the assigned range', () => {
  assert.match(script, /1절부터 13절까지, 총 13절 전부/);
  assert.equal(/13절을 손으로 직접 필사/.test(script), false);
  assert.equal((script.match(/전부를 손으로 필사/g) || []).length, 6);
});

test('random gift winners receive a dice badge in the completed member list', () => {
  assert.match(script, /const randomWinnerUid = completions\._randomWinner/);
  assert.match(script, /mission-random-gift-badge/);
  assert.match(script, /🎲/);
});

test('gift banner shows the random winner below the first-place winner', () => {
  assert.match(script, /_updateGiftBanner\(completions\._firstPlace, completions\._randomWinner\)/);
  assert.match(script, /mission-gift-random-winner/);
  assert.match(html, /id="mission-gift-random-line"/);
});

test('mission alias is restored from the signed-in participant record', () => {
  assert.match(script, /function restoreMissionAliasFromParticipant\(\)/);
  assert.match(script, /guessWhoParticipantsRef\.child\(mySessionId\)\.once\('value'\)/);
  assert.match(script, /const MISSION_PARTICIPANT_KEY_STORAGE_KEY/);
  assert.match(script, /httpsCallable\('reclaimMissionIdentity'\)/);
  assert.match(functionsIndex, /\[`guessWhoParticipants\/\$\{currentSessionId\}`\]: \{ \.\.\.participant/);
  assert.match(functionsIndex, /\[`guessWhoParticipants\/\$\{previousSessionId\}`\]: null/);
});
