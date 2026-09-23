const rankRepository =
    require('../repositories/rankRepository');

console.log(
    '🔥 SERVICE LOAD REPOSITORY:',
    require.resolve('../repositories/rankRepository')
);

console.log(
    '🔥 SERVICE REPOSITORY EXPORTS:',
    Object.keys(rankRepository)
);


// =====================================================
// KIỂM TRA ID
// =====================================================

function positiveId(value, name) {

    const id = Number(value);

    console.log(
        '[RANK] Checking ' + name + ':',
        value
    );

    if (
        !Number.isInteger(id) ||
        id < 1
    ) {

        const error =
            new Error(
                name +
                ' must be a positive integer.'
            );

        error.statusCode = 400;

        throw error;
    }

    return id;
}


// =====================================================
// LẤY USER ID TỪ JWT
// =====================================================

function getAuthenticatedUserId(value) {

    const id = Number(value);

    console.log(
        '[RANK] Authenticated userId:',
        value
    );

    console.log(
        '[RANK] Parsed userId:',
        id
    );

    if (
        !Number.isInteger(id) ||
        id < 1
    ) {

        const error =
            new Error(
                'Invalid authenticated userId.'
            );

        error.statusCode = 401;

        throw error;
    }

    return id;
}


// =====================================================
// RANK HOME
// =====================================================

async function getRankHome(
    currentUserId,
    languageId
) {

    const userId =
        getAuthenticatedUserId(
            currentUserId
        );

    let parsedLanguageId = null;

    if (
        languageId !== undefined &&
        languageId !== null &&
        languageId !== '' &&
        languageId !== 'undefined' &&
        languageId !== 'null'
    ) {

        parsedLanguageId =
            positiveId(
                languageId,
                'Language id'
            );
    }

    console.log(
        '================================'
    );

    console.log(
        'RANK HOME'
    );

    console.log(
        'User ID:',
        userId
    );

    console.log(
        'Language ID:',
        parsedLanguageId
    );

    console.log(
        '================================'
    );

    return await rankRepository.getRankHome(
        userId,
        parsedLanguageId
    );
}


// =====================================================
// JOIN QUEUE
// =====================================================

async function joinQueue(
    currentUserId,
    payload
) {

    const userId =
        getAuthenticatedUserId(
            currentUserId
        );

    let languageId = null;

    if (
        payload !== null &&
        typeof payload === 'object'
    ) {

        languageId =
            payload.languageId;

    } else {

        languageId =
            payload;
    }

    const parsedLanguageId =
        positiveId(
            languageId,
            'Language id'
        );

    console.log(
        '================================'
    );

    console.log(
        'RANK JOIN QUEUE'
    );

    console.log(
        'User ID:',
        userId
    );

    console.log(
        'Language ID:',
        parsedLanguageId
    );

    console.log(
        '================================'
    );

    return await rankRepository.findOrJoinQueue(
        userId,
        parsedLanguageId
    );
}


// =====================================================
// UPDATE PLAYER HEARTBEAT
// =====================================================
//
// Frontend:
//
// POST /api/ranked/matches/:id/heartbeat
//
// Ví dụ:
//
// POST /api/ranked/matches/58/heartbeat
//
// Service kiểm tra userId + matchId
// rồi gọi Repository.
//
// =====================================================


// =====================================================
// CANCEL QUEUE
// =====================================================

async function cancelQueue(
    currentUserId
) {

    const userId =
        getAuthenticatedUserId(
            currentUserId
        );

    console.log(
        '================================'
    );

    console.log(
        'RANK CANCEL QUEUE'
    );

    console.log(
        'User ID:',
        userId
    );

    console.log(
        '================================'
    );

    return await rankRepository.cancelQueue(
        userId
    );
}


// =====================================================
// LEAVE RANKED
// =====================================================
//
// Giữ nguyên cách gọi cũ của bạn:
//
// rankRepository.leaveRanked(userId)
//
// Không tự thêm matchId để tránh lệch
// với Repository hiện tại.
//
// =====================================================

async function leaveRanked(
    currentUserId
) {

    const userId =
        getAuthenticatedUserId(
            currentUserId
        );

    console.log(
        '================================'
    );

    console.log(
        'RANK LEAVE'
    );

    console.log(
        'User ID:',
        userId
    );

    console.log(
        '================================'
    );

    return await rankRepository.leaveRanked(
        userId
    );
}


// =====================================================
// GET MATCH
// =====================================================

async function getMatch(
    currentUserId,
    matchId
) {

    const userId =
        getAuthenticatedUserId(
            currentUserId
        );

    const parsedMatchId =
        positiveId(
            matchId,
            'Match id'
        );

    console.log(
        '================================'
    );

    console.log(
        'RANK GET MATCH'
    );

    console.log(
        'User ID:',
        userId
    );

    console.log(
        'Match ID:',
        parsedMatchId
    );

    console.log(
        '================================'
    );

    return await rankRepository.getMatch(
        userId,
        parsedMatchId
    );
}


// =====================================================
// ANSWER QUESTION
// =====================================================
//
// QUAN TRỌNG:
//
// Dùng matchQuestionId
// KHÔNG dùng questionId.
//
// =====================================================

async function answerQuestion(
    currentUserId,
    matchId,
    payload
) {

    // -------------------------------------------------
    // KIỂM TRA BODY
    // -------------------------------------------------

    if (
        !payload ||
        typeof payload !== 'object'
    ) {

        const error =
            new Error(
                'Request body is required.'
            );

        error.statusCode = 400;

        throw error;
    }


    // -------------------------------------------------
    // USER ID
    // -------------------------------------------------

    const userId =
        getAuthenticatedUserId(
            currentUserId
        );


    // -------------------------------------------------
    // MATCH ID
    // -------------------------------------------------

    const parsedMatchId =
        positiveId(
            matchId,
            'Match id'
        );


    // -------------------------------------------------
    // MATCH QUESTION ID
    // -------------------------------------------------

    const parsedMatchQuestionId =
        positiveId(
            payload.matchQuestionId,
            'Match question id'
        );


    // -------------------------------------------------
    // ANSWER TEXT
    // -------------------------------------------------

    if (
        typeof payload.answerText !== 'string' ||
        payload.answerText.trim() === ''
    ) {

        const error =
            new Error(
                'answerText is required.'
            );

        error.statusCode = 400;

        throw error;
    }


    // -------------------------------------------------
    // ANSWER TIME
    // -------------------------------------------------

    let answerTimeMilliseconds = null;

    if (
        payload.answerTimeMilliseconds !== undefined &&
        payload.answerTimeMilliseconds !== null &&
        payload.answerTimeMilliseconds !== ''
    ) {

        const time =
            Number(
                payload.answerTimeMilliseconds
            );

        if (
            !Number.isFinite(time) ||
            time < 0
        ) {

            const error =
                new Error(
                    'answerTimeMilliseconds must be a valid non-negative number.'
                );

            error.statusCode = 400;

            throw error;
        }

        answerTimeMilliseconds =
            Math.trunc(time);
    }


    // -------------------------------------------------
    // DEBUG
    // -------------------------------------------------

    console.log(
        '================================'
    );

    console.log(
        'RANK ANSWER QUESTION'
    );

    console.log(
        'User ID:',
        userId
    );

    console.log(
        'Match ID:',
        parsedMatchId
    );

    console.log(
        'Match Question ID:',
        parsedMatchQuestionId
    );

    console.log(
        'Answer:',
        payload.answerText
    );

    console.log(
        'Answer Time:',
        answerTimeMilliseconds
    );

    console.log(
        '================================'
    );


    // -------------------------------------------------
    // REPOSITORY
    // -------------------------------------------------

    return await rankRepository.answerQuestion(
        userId,
        parsedMatchId,
        parsedMatchQuestionId,
        payload.answerText,
        answerTimeMilliseconds
    );
}


// =====================================================
// FINISH MATCH
// =====================================================
//
// Có 3 trường hợp:
//
// 1. Người đầu tiên Finish
//    -> WaitingForOpponent
//    -> Repository bắt đầu timer 30 giây
//
// 2. Người thứ hai Finish trong 30 giây
//    -> Chốt trận
//
// 3. Người thứ hai không Finish
//    -> Repository tự động Finish
//    -> Chốt trận
//
// =====================================================

async function finishMatch(
    currentUserId,
    matchId
) {

    const userId =
        getAuthenticatedUserId(
            currentUserId
        );

    const parsedMatchId =
        positiveId(
            matchId,
            'Match id'
        );

    console.log(
        '================================'
    );

    console.log(
        'RANK FINISH MATCH'
    );

    console.log(
        'User ID:',
        userId
    );

    console.log(
        'Match ID:',
        parsedMatchId
    );

    console.log(
        '================================'
    );

    return await rankRepository.finishMatch(
        userId,
        parsedMatchId
    );
}


// =====================================================
// GET MATCH RESULT
// =====================================================

async function getMatchResult(
    currentUserId,
    matchId
) {

    const userId =
        getAuthenticatedUserId(
            currentUserId
        );

    const parsedMatchId =
        positiveId(
            matchId,
            'Match id'
        );

    console.log(
        '================================'
    );

    console.log(
        'RANK MATCH RESULT'
    );

    console.log(
        'User ID:',
        userId
    );

    console.log(
        'Match ID:',
        parsedMatchId
    );

    console.log(
        '================================'
    );

    return await rankRepository.getMatchResult(
        userId,
        parsedMatchId
    );
}


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    getRankHome:
        getRankHome,

    joinQueue:
        joinQueue,

    cancelQueue:
        cancelQueue,

    leaveRanked:
        leaveRanked,

    getMatch:
        getMatch,


    answerQuestion:
        answerQuestion,

    finishMatch:
        finishMatch,

    getMatchResult:
        getMatchResult
};