const SUBMITTABLE_MISSION_DATES = new Set([
    '2026-07-20', '2026-07-21', '2026-07-22',
    '2026-07-23', '2026-07-24', '2026-07-25'
]);

const MISSION_NOTIFICATIONS = {
    '2026-07-20': { day: '1일차', range: '사도행전 2:1-13 필사' },
    '2026-07-21': { day: '2일차', range: '사도행전 2:14-21 필사' },
    '2026-07-22': { day: '3일차', range: '사도행전 2:22-28 필사' },
    '2026-07-23': { day: '4일차', range: '사도행전 2:29-36 필사' },
    '2026-07-24': { day: '5일차', range: '사도행전 2:37-41 필사' },
    '2026-07-25': { day: '6일차', range: '사도행전 2:42-47 필사' },
    '2026-07-26': { day: '주일', range: '사도행전 2:17 암송' }
};

function isMissionReminderDate(date) {
    return SUBMITTABLE_MISSION_DATES.has(date);
}

function getMissionNotification(date) {
    return MISSION_NOTIFICATIONS[date] || null;
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

module.exports = { getIncompleteMissionTokens, getMissionNotification, isMissionReminderDate, pickRandomMissionWinner };
