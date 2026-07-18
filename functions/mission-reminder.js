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

function pickRandomMissionWinner(completions, previousWinnerSessionId, random = Math.random) {
    const firstPlaceSessionId = completions?._firstPlace?.sessionId;
    const entrants = Object.entries(completions || {}).filter(([sessionId, data]) =>
        !sessionId.startsWith('_') && data?.memberName && sessionId !== firstPlaceSessionId && sessionId !== previousWinnerSessionId
    );
    if (!entrants.length) return null;
    const [sessionId, data] = entrants[Math.floor(random() * entrants.length)];
    return { sessionId, memberName: data.memberName };
}

module.exports = { getIncompleteMissionTokens, isMissionReminderDate, pickRandomMissionWinner };
