const test = require('node:test');
const assert = require('node:assert/strict');
const { getIncompleteMissionTokens, isMissionReminderDate } = require('../mission-reminder');

test('reminder runs only on submit-enabled mission dates', () => {
    assert.equal(isMissionReminderDate('2026-07-20'), true);
    assert.equal(isMissionReminderDate('2026-07-25'), true);
    assert.equal(isMissionReminderDate('2026-07-26'), false);
    assert.equal(isMissionReminderDate('2026-07-19'), false);
});

test('reminder excludes users who completed the current mission', () => {
    const tokens = [{ sessionId: 'done' }, { sessionId: 'pending' }];
    assert.deepEqual(getIncompleteMissionTokens(tokens, { done: { timestamp: 1 }, _firstPlace: {} }), [{ sessionId: 'pending' }]);
});
