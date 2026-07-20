const test = require('node:test');
const assert = require('node:assert/strict');
const { uniqueRecipientTokens } = require('../fcm-token-utils');

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
