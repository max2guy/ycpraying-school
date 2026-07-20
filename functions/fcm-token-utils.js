function uniqueRecipientTokens(records, excludeSessionId) {
    const byToken = new Map();

    records.forEach(record => {
        if (!record || !record.token || !record.sessionId) return;
        const existing = byToken.get(record.token) || {
            token: record.token,
            sessionId: record.sessionId,
            updatedAt: record.updatedAt || 0,
            sessionIds: [],
            excluded: false
        };
        existing.sessionIds.push(record.sessionId);
        if (record.sessionId === excludeSessionId) existing.excluded = true;
        if ((record.updatedAt || 0) > existing.updatedAt) {
            existing.sessionId = record.sessionId;
            existing.updatedAt = record.updatedAt || 0;
        }
        byToken.set(record.token, existing);
    });

    return [...byToken.values()].filter(record => !record.excluded);
}

module.exports = { uniqueRecipientTokens };
