const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const { summarizePushResponse } = require('./push-result');
admin.initializeApp();

const APP_URL = 'https://ycpraying-school.web.app/';

/* ── 전체 FCM 토큰 수집 (특정 senderId 제외 가능) ── */
async function getAllTokens(excludeSessionId) {
    const snap = await admin.database().ref('fcmTokens').once('value');
    const result = [];
    snap.forEach(child => {
        if (child.key === excludeSessionId) return;
        const d = child.val();
        if (d && d.token) result.push({ token: d.token, sessionId: child.key });
    });
    return result;
}

/* ── 멀티캐스트 발송 + 만료 토큰 자동 정리 ── */
async function sendPush(tokenDatas, title, body, extraData = {}) {
    if (!tokenDatas.length) {
        console.log('[FCM]', JSON.stringify({
            type: extraData.type || 'unknown',
            recipients: 0
        }));
        return;
    }
    const tokens = tokenDatas.map(t => t.token);

    const message = {
        tokens,
        data: { title, body, ...extraData },
        webpush: {
            notification: {
                title, body,
                icon:  APP_URL + 'notification-icon.svg',
                badge: APP_URL + 'notification-badge.png'
            },
            fcmOptions: { link: APP_URL }
        }
    };

    const resp = await admin.messaging().sendEachForMulticast(message);
    const summary = summarizePushResponse(resp);
    console.log('[FCM]', JSON.stringify({
        type: extraData.type || 'unknown',
        recipients: tokenDatas.length,
        ...summary
    }));

    // 만료/무효 토큰 삭제
    const removes = [];
    resp.responses.forEach((r, i) => {
        if (!r.success && r.error) {
            const code = r.error.code;
            if (code === 'messaging/invalid-registration-token' ||
                code === 'messaging/registration-token-not-registered') {
                removes.push(admin.database().ref(`fcmTokens/${tokenDatas[i].sessionId}`).remove());
            }
        }
    });
    if (removes.length) await Promise.all(removes);
}

/* ── 1. 새 기도 멤버 추가 ── */
exports.onNewMember = functions
    .region('asia-northeast3')
    .database.ref('members/{memberId}')
    .onCreate(async snap => {
        const member = snap.val();
        if (!member || !member.name) return null;
        const tokenDatas = await getAllTokens(null);
        await sendPush(tokenDatas,
            '🙏 새 기도 멤버',
            `${member.name}님이 기도 네트워크에 참여했습니다.`,
            { type: 'new_member' }
        );
        return null;
    });

/* ── 2. 새 채팅 메시지 ── */
exports.onNewChatMessage = functions
    .region('asia-northeast3')
    .database.ref('messages/{msgId}')
    .onCreate(async snap => {
        const msg = snap.val();
        if (!msg || !msg.text) return null;
        const tokenDatas = await getAllTokens(msg.senderId);
        const preview = msg.text.length > 50 ? msg.text.slice(0, 50) + '…' : msg.text;
        await sendPush(tokenDatas,
            '💬 새 채팅 메시지',
            preview,
            { type: 'chat' }
        );
        return null;
    });

/* ── 3. 전체 업데이트 알림 브로드캐스트 (appConfig/broadcastPush 트리거) ── */
exports.onBroadcastTrigger = functions
    .region('asia-northeast3')
    .database.ref('appConfig/broadcastPush')
    .onWrite(async change => {
        const data = change.after.val();
        if (!data || !data.message) return null;

        const tokenDatas = await getAllTokens(null);
        await sendPush(tokenDatas,
            data.title || '📢 공지',
            data.message,
            { type: 'broadcast' }
        );

        // 트리거 초기화 (재발송 방지)
        await change.after.ref.set(null);
        return null;
    });

/* ── 4. 새 기도제목 / 새 답글 (prayerEvents 트리거) ── */
exports.onNewPrayerEvent = functions
    .region('asia-northeast3')
    .database.ref('prayerEvents/{eventId}')
    .onCreate(async snap => {
        const ev = snap.val();
        if (!ev || !ev.type) return null;

        let title, body;
        if (ev.type === 'new_prayer') {
            title = `🙏 ${ev.memberName}님의 새 기도제목`;
            const preview = ev.content.length > 50 ? ev.content.slice(0, 50) + '…' : ev.content;
            body = preview;
        } else if (ev.type === 'new_reply') {
            title = `💬 ${ev.memberName}님 기도제목에 응원 댓글`;
            const preview = ev.content.length > 50 ? ev.content.slice(0, 50) + '…' : ev.content;
            body = preview;
        } else {
            return null;
        }

        const tokenDatas = await getAllTokens(ev.senderId);
        await sendPush(tokenDatas, title, body, { type: ev.type });

        // 처리 후 이벤트 삭제 (중복 알림 방지)
        await snap.ref.remove();
        return null;
    });

/* ── Guess Who? 정답 공개 및 서버 채점 ── */
exports.revealGuessWhoResults = functions
    .region('asia-northeast3')
    .https.onCall(async (_data, context) => {
        if (!context.auth || context.auth.token.email !== 'admin@church.com') {
            throw new functions.https.HttpsError('permission-denied', '관리자만 정답을 공개할 수 있습니다.');
        }

        const db = admin.database();
        const [participantsSnap, answersSnap, candidatesSnap, gameSnap] = await Promise.all([
            db.ref('guessWhoParticipants').once('value'),
            db.ref('guessWhoAnswers').once('value'),
            db.ref('guessWhoCandidates').once('value'),
            db.ref('guessWhoGame').once('value')
        ]);
        if ((gameSnap.val() || {}).status === 'RESULT_REVEALED') {
            throw new functions.https.HttpsError('failed-precondition', '이미 정답이 공개되었습니다.');
        }

        const participants = participantsSnap.val() || {};
        const answers = answersSnap.val() || {};
        const candidates = candidatesSnap.val() || {};
        const aliasOwners = Object.entries(participants).reduce((acc, [sessionId, participant]) => {
            if (participant && participant.aliasName && participant.candidateId) acc[participant.aliasName] = { sessionId, ...participant };
            return acc;
        }, {});
        const allAliases = Object.keys(aliasOwners);
        const results = {};

        Object.entries(answers).forEach(([playerId, answerData]) => {
            const player = participants[playerId];
            if (!player || !answerData || !answerData.submitted) return;
            const questionAliases = allAliases.filter(alias => alias !== player.aliasName);
            const items = questionAliases.map(alias => {
                const selectedId = (answerData.answers || {})[alias] || '';
                const correctId = aliasOwners[alias].candidateId;
                return {
                    aliasName: alias,
                    selectedName: selectedId === 'unknown' || !selectedId ? '모르겠어요' : ((candidates[selectedId] || {}).name || '미선택'),
                    correctName: (candidates[correctId] || {}).name || '알 수 없음',
                    correct: selectedId === correctId
                };
            });
            results[playerId] = { score: items.filter(item => item.correct).length, total: questionAliases.length, items };
        });

        const leaderboard = Object.entries(results)
            .map(([playerId, result]) => ({ playerId, name: (participants[playerId] || {}).realName || '참가자', score: result.score }))
            .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ko'));
        const topScore = leaderboard.length ? leaderboard[0].score : 0;
        const winners = leaderboard.filter(item => item.score === topScore);

        await Promise.all([
            db.ref('guessWhoResults').set(results),
            db.ref('guessWhoGame').set({
                status: 'RESULT_REVEALED',
                resultRevealedAt: admin.database.ServerValue.TIMESTAMP,
                leaderboard,
                winners
            })
        ]);
        return { winnerCount: winners.length, topScore };
    });
