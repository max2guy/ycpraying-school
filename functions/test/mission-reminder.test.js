const test = require('node:test');
const assert = require('node:assert/strict');
const { getIncompleteMissionTokens, isMissionReminderDate, pickRandomMissionWinner } = require('../mission-reminder');

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

test('random gift excludes first place and yesterday\'s random winner', () => {
    const completions = {
        first: { memberName: '평안이' },
        yesterday: { memberName: '은혜샘' },
        eligible: { memberName: '작은겨자씨' },
        _firstPlace: { sessionId: 'first' }
    };
    assert.deepEqual(pickRandomMissionWinner(completions, 'yesterday', () => 0), {
        sessionId: 'eligible', memberName: '작은겨자씨'
    });
});
