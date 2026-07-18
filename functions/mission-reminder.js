const SUBMITTABLE_MISSION_DATES = new Set([
    '2026-07-20', '2026-07-21', '2026-07-22',
    '2026-07-23', '2026-07-24', '2026-07-25'
]);

function isMissionReminderDate(date) {
    return SUBMITTABLE_MISSION_DATES.has(date);
}

function getIncompleteMissionTokens(tokenDatas, completions) {
    return tokenDatas.filter(({ sessionId }) => !completions?.[sessionId]);
}

module.exports = { getIncompleteMissionTokens, isMissionReminderDate };
