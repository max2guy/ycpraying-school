const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { uniqueRecipientTokens } = require('../fcm-token-utils');

const appScript = fs.readFileSync(path.join(__dirname, '../../script.js'), 'utf8');

test('sends one notification for repeated registrations of the same token', () => {
  const recipients = uniqueRecipientTokens([
    { token: 'same-device', sessionId: 'old', updatedAt: 1 },
    { token: 'same-device', sessionId: 'new', updatedAt: 2 },
    { token: 'another-device', sessionId: 'other', updatedAt: 1 }
  ]);

  assert.deepEqual(recipients, [
    { token: 'same-device', sessionId: 'new', updatedAt: 2, sessionIds: ['old', 'new'], excluded: false },
    { token: 'another-device', sessionId: 'other', updatedAt: 1, sessionIds: ['other'], excluded: false }
  ]);
});

test('does not notify the sender through an older duplicate registration', () => {
  const recipients = uniqueRecipientTokens([
    { token: 'same-device', sessionId: 'sender', updatedAt: 1 },
    { token: 'same-device', sessionId: 'stale', updatedAt: 2 },
    { token: 'recipient', sessionId: 'other', updatedAt: 1 }
  ], 'sender');

  assert.deepEqual(recipients.map(item => item.token), ['recipient']);
});

test('app refresh and forced updates preserve local participant identity', () => {
  assert.match(appScript, /const FORCE_UPDATE_GUARD_KEY/);
  assert.match(appScript, /닉네임과 인증 기록은 유지됩니다/);
  assert.doesNotMatch(appScript, /function forceRefresh\(\)[\s\S]{0,500}unregister/);
  assert.doesNotMatch(appScript, /function forceUpdateApp\(\)[\s\S]{0,500}caches\.keys/);
});
