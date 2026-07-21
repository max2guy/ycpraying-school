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

test('forced app updates clear caches before one guarded reload', () => {
  assert.match(appScript, /const FORCE_UPDATE_GUARD_KEY/);
  assert.match(appScript, /Promise\.all\(\[unregister, clearCaches\]\)\.finally\(\(\) => window\.location\.reload\(\)\)/);
});
