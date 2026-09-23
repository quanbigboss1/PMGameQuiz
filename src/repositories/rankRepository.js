const { getPool } = require('../config/db');

const rankedHeartbeat = new Map();

const RANKED_OFFLINE_TIMEOUT = 15000;

// Timer 30 giây sau khi một người nộp
const rankedFinishTimers = new Map();
const RANKED_FINISH_TIMEOUT = 30 * 1000;


// ============================================================
// BASIC VALIDATION
// ============================================================
function startRankedFinishTimer(matchId, finishedUserId) {
    const key = Number(matchId);

    // Xóa timer cũ nếu có
    const oldTimer = rankedFinishTimers.get(key);

    if (oldTimer?.timer) {
        clearTimeout(oldTimer.timer);
    }

    // 30 giây kể từ lúc người đầu tiên nộp
    const deadline = Date.now() + RANKED_FINISH_TIMEOUT;

    const timer = setTimeout(async () => {
        try {
            await autoFinishRankedMatch(key);
        } catch (error) {
            console.error(
                `[RANKED] Auto finish match ${key} error:`,
                error
            );
        } finally {
            rankedFinishTimers.delete(key);
        }
    }, RANKED_FINISH_TIMEOUT);

    rankedFinishTimers.set(key, {
        matchId: key,
        finishedUserId: Number(finishedUserId),
        deadline,
        timer
    });

    console.log(
        `[RANKED] Match ${key}: user ${finishedUserId} submitted first.`
    );

    console.log(
        `[RANKED] Match ${key}: waiting 30 seconds for opponent.`
    );

    return {
        matchId: key,
        finishedUserId: Number(finishedUserId),
        deadline,
        remainingMilliseconds: RANKED_FINISH_TIMEOUT,
        remainingSeconds: 30
    };
}
function getRankedFinishTimer(matchId) {
    const timerInfo = rankedFinishTimers.get(Number(matchId));

    if (!timerInfo) {
        return null;
    }

    const remainingMilliseconds = Math.max(
        0,
        timerInfo.deadline - Date.now()
    );

    const remainingSeconds = Math.ceil(
        remainingMilliseconds / 1000
    );

    return {
        matchId: Number(matchId),
        finishedUserId: timerInfo.finishedUserId,
        deadline: timerInfo.deadline,
        remainingMilliseconds,
        remainingSeconds
    };
}
function toPositiveInt(value, name) {

    const number = Number(value);

    if (
        !Number.isInteger(number) ||
        number < 1
    ) {

        const error = new Error(
            `${name} must be a positive integer.`
        );

        error.statusCode = 400;

        throw error;
    }

    return number;
}


// ============================================================
// RANKED FINISH TIMER
// ============================================================

function stopRankedFinishTimer(matchId) {

    const parsedMatchId =
        Number(matchId);

    const timer =
        rankedFinishTimers.get(
            parsedMatchId
        );

    if (!timer) {
        return;
    }

    if (timer.timeoutHandle) {

        clearTimeout(
            timer.timeoutHandle
        );
    }

    rankedFinishTimers.delete(
        parsedMatchId
    );

    console.log(
        '🛑 RANKED TIMER STOPPED:',
        parsedMatchId
    );
}


function getRankedFinishTimer(matchId) {

    const parsedMatchId =
        Number(matchId);

    const timer =
        rankedFinishTimers.get(
            parsedMatchId
        );

    if (!timer) {
        return null;
    }

    const remainingMilliseconds =
        Math.max(
            0,
            timer.deadline - Date.now()
        );

    const remainingSeconds =
        Math.ceil(
            remainingMilliseconds / 1000
        );

    return {

        matchId:
            parsedMatchId,

        finishedUserId:
            Number(
                timer.finishedUserId
            ),

        deadline:
            timer.deadline,

        remainingMilliseconds,

        remainingSeconds
    };
}


function startRankedFinishTimer(
    matchId,
    finishedUserId
) {

    const parsedMatchId =
        Number(matchId);

    const parsedUserId =
        Number(finishedUserId);

    // --------------------------------------------------------
    // Xóa timer cũ nếu có
    // --------------------------------------------------------

    stopRankedFinishTimer(
        parsedMatchId
    );

    const deadline =
        Date.now() +
        RANKED_FINISH_TIMEOUT;


    // --------------------------------------------------------
    // TIMER THẬT
    // --------------------------------------------------------

    const timeoutHandle =
        setTimeout(
            async () => {

                try {

                    console.log(
                        '⏰ RANKED 30 SECOND TIMEOUT:',
                        {
                            matchId:
                                parsedMatchId,

                            finishedUserId:
                                parsedUserId
                        }
                    );

                    await autoFinishRankedMatch(
                        parsedMatchId,
                        parsedUserId
                    );

                } catch (error) {

                    console.error(
                        '❌ AUTO FINISH ERROR:',
                        error
                    );

                } finally {

                    rankedFinishTimers.delete(
                        parsedMatchId
                    );
                }

            },
            RANKED_FINISH_TIMEOUT
        );


    // --------------------------------------------------------
    // SAVE TIMER
    // --------------------------------------------------------

    rankedFinishTimers.set(
        parsedMatchId,
        {
            matchId:
                parsedMatchId,

            finishedUserId:
                parsedUserId,

            deadline,

            timeoutHandle
        }
    );


    console.log(
        '⏱️ RANKED 30 SECOND COUNTDOWN START:',
        {
            matchId:
                parsedMatchId,

            finishedUserId:
                parsedUserId,

            deadline
        }
    );


    return {

        matchId:
            parsedMatchId,

        finishedUserId:
            parsedUserId,

        deadline,

        remainingMilliseconds:
            RANKED_FINISH_TIMEOUT,

        remainingSeconds:
            30
    };
}


// ============================================================
// PLAYER HEARTBEAT
// ============================================================

function setRankedHeartbeat(
    userId,
    matchId
) {

    const key =
        `${matchId}:${userId}`;

    rankedHeartbeat.set(
        key,
        {
            userId,
            matchId,
            lastSeen: Date.now()
        }
    );
}


function removeRankedHeartbeat(
    userId,
    matchId
) {

    const key =
        `${matchId}:${userId}`;

    rankedHeartbeat.delete(
        key
    );
}


function getRankedHeartbeat(
    userId,
    matchId
) {

    const key =
        `${matchId}:${userId}`;

    return rankedHeartbeat.get(
        key
    );
}


// ============================================================
// CHECK OFFLINE PLAYERS
// ============================================================

async function checkOfflinePlayers() {

    const now =
        Date.now();

    const expired = [];

    for (
        const [
            key,
            heartbeat
        ]
        of rankedHeartbeat.entries()
    ) {

        if (
            now - heartbeat.lastSeen >
            RANKED_OFFLINE_TIMEOUT
        ) {

            expired.push(
                {
                    key,
                    userId:
                        heartbeat.userId,

                    matchId:
                        heartbeat.matchId
                }
            );
        }
    }


    for (
        const item
        of expired
    ) {

        try {

            console.log(
                '⚠️ PLAYER OFFLINE:',
                {
                    userId:
                        item.userId,

                    matchId:
                        item.matchId
                }
            );


            await forfeitOfflinePlayer(
                item.userId,
                item.matchId
            );

        } catch (error) {

            console.error(
                '❌ Offline forfeit error:',
                error
            );

        } finally {

            removeRankedHeartbeat(
                item.userId,
                item.matchId
            );
        }
    }
}


// ============================================================
// FORFEIT OFFLINE PLAYER
// ============================================================

async function forfeitOfflinePlayer(
    userId,
    matchId
) {

    userId =
        toPositiveInt(
            userId,
            'userId'
        );

    matchId =
        toPositiveInt(
            matchId,
            'matchId'
        );


    const pool =
        await getPool();

    const client =
        await pool.connect();


    try {

        await client.query(
            'BEGIN'
        );


        // ----------------------------------------------------
        // LOCK MATCH
        // ----------------------------------------------------

        const matchResult =
            await client.query(
                `
                SELECT
                    matchid,
                    seasonid,
                    matchstatus,
                    player1score,
                    player2score,
                    winneruserid,
                    loseruserid
                FROM matches
                WHERE matchid = $1
                FOR UPDATE
                `,
                [matchId]
            );


        if (
            matchResult.rows.length === 0
        ) {

            const error =
                new Error(
                    'Match not found.'
                );

            error.statusCode = 404;

            throw error;
        }


        const match =
            matchResult.rows[0];


        // ----------------------------------------------------
        // ALREADY FINISHED
        // ----------------------------------------------------

        if (
            String(
                match.matchstatus
            ).toLowerCase() === 'finished'
        ) {

            await client.query(
                'ROLLBACK'
            );

            stopRankedFinishTimer(
                matchId
            );

           return {

    success: true,

    matchId: Number(matchId),

    status: 'Finished',

    matchStatus: 'Finished',

    waiting: false,

    alreadyFinished: true,

    currentUserId:
        Number(userId),

    playerNumber:
        currentPlayer
            ? Number(
                currentPlayer.playernumber
            )
            : 0,

    player1UserId:
        player1
            ? Number(
                player1.userid
            )
            : 0,

    player2UserId:
        player2
            ? Number(
                player2.userid
            )
            : 0,

    winnerUserId:
        match.winneruserid !== null
            ? Number(
                match.winneruserid
            )
            : null,

    loserUserId:
        match.loseruserid !== null
            ? Number(
                match.loseruserid
            )
            : null,

    draw:
        match.winneruserid === null &&
        match.loseruserid === null,

    player1Score:
        Number(
            match.player1score || 0
        ),

    player2Score:
        Number(
            match.player2score || 0
        )
};
        }


        // ----------------------------------------------------
        // PLAYERS
        // ----------------------------------------------------

        const playersResult =
            await client.query(
                `
                SELECT
                    mp.matchplayerid,
                    mp.userid,
                    mp.playernumber,
                    mp.ratingbefore,
                    mp.ratingafter,
                    u.username
                FROM matchplayers mp
                LEFT JOIN users u
                    ON u.userid = mp.userid
                WHERE mp.matchid = $1
                ORDER BY mp.playernumber
                FOR UPDATE OF mp
                `,
                [matchId]
            );


        if (
            playersResult.rows.length !== 2
        ) {

            throw new Error(
                'Match must have exactly 2 players.'
            );
        }


        const player1 =
            playersResult.rows.find(
                player =>
                    Number(
                        player.playernumber
                    ) === 1
            );


        const player2 =
            playersResult.rows.find(
                player =>
                    Number(
                        player.playernumber
                    ) === 2
            );


        if (
            !player1 ||
            !player2
        ) {

            throw new Error(
                'Invalid player numbers.'
            );
        }


        // ----------------------------------------------------
        // CHECK OFFLINE PLAYER
        // ----------------------------------------------------

        const offlinePlayer =
            [
                player1,
                player2
            ].find(
                player =>
                    Number(
                        player.userid
                    ) ===
                    Number(userId)
            );


        if (!offlinePlayer) {

            const error =
                new Error(
                    'You are not a player in this match.'
                );

            error.statusCode = 403;

            throw error;
        }


        // ----------------------------------------------------
        // NẾU PLAYER ĐÃ SUBMIT
        // KHÔNG XỬ LÝ OFFLINE NỮA
        // ----------------------------------------------------

        if (
            offlinePlayer.ratingafter !== null &&
            offlinePlayer.ratingafter !== undefined
        ) {

            await client.query(
                'ROLLBACK'
            );

            return {

                success: true,

                matchId,

                status:
                    'WaitingForOpponent',

                alreadyFinished:
                    true
            };
        }


        // ----------------------------------------------------
        // WINNER / LOSER
        // ----------------------------------------------------

        const winner =
            Number(
                offlinePlayer.userid
            ) ===
            Number(player1.userid)
                ? player2
                : player1;


        const loser =
            offlinePlayer;


        // ----------------------------------------------------
        // OLD RATING
        // ----------------------------------------------------

        const loserOldRating =
            Number(
                loser.ratingbefore ||
                1000
            );


        const winnerOldRating =
            Number(
                winner.ratingbefore ||
                1000
            );


        // ----------------------------------------------------
        // NEW RATING
        // ----------------------------------------------------

        const winnerNewRating =
            Math.max(
                0,
                winnerOldRating + 25
            );


        const loserNewRating =
            Math.max(
                0,
                loserOldRating - 25
            );


        // ----------------------------------------------------
        // UPDATE MATCH PLAYERS
        // ----------------------------------------------------

        await client.query(
            `
            UPDATE matchplayers
            SET
                ratingafter =
                    CASE
                        WHEN userid = $1
                            THEN $3::integer

                        WHEN userid = $2
                            THEN $4::integer

                        ELSE ratingafter
                    END
            WHERE matchid = $5
            `,
            [
                winner.userid,
                loser.userid,
                winnerNewRating,
                loserNewRating,
                matchId
            ]
        );


        // ----------------------------------------------------
        // UPDATE RANK
        // ----------------------------------------------------

        await updatePlayerRankAfterMatch(
            client,
            winner.userid,
            match.seasonid,
            25,
            true,
            false,
            false
        );


        await updatePlayerRankAfterMatch(
            client,
            loser.userid,
            match.seasonid,
            -25,
            false,
            true,
            false
        );


        // ----------------------------------------------------
        // UPDATE MATCH
        // ----------------------------------------------------

        await client.query(
            `
            UPDATE matches
            SET
                matchstatus = 'Finished',
                winneruserid = $1,
                loseruserid = $2,
                finishedat = NOW()
            WHERE matchid = $3
            `,
            [
                winner.userid,
                loser.userid,
                matchId
            ]
        );


        // ----------------------------------------------------
        // RANK HISTORY
        // ----------------------------------------------------

        await insertRankHistory(
            client,
            winner.userid,
            match.seasonid,
            matchId,
            winnerOldRating,
            winnerNewRating,
            'Win'
        );


        await insertRankHistory(
            client,
            loser.userid,
            match.seasonid,
            matchId,
            loserOldRating,
            loserNewRating,
            'Loss'
        );


        // ----------------------------------------------------
        // COMMIT
        // ----------------------------------------------------

        await client.query(
            'COMMIT'
        );


        // ----------------------------------------------------
        // CLEANUP
        // ----------------------------------------------------

        stopRankedFinishTimer(
            matchId
        );


        removeRankedHeartbeat(
            player1.userid,
            matchId
        );


        removeRankedHeartbeat(
            player2.userid,
            matchId
        );


        return {

            success: true,

            matchId,

            status:
                'Finished',

            matchStatus:
                'Finished',

            waiting:
                false,

            forfeit:
                true,

            offlineUserId:
                Number(
                    loser.userid
                ),

            winnerUserId:
                Number(
                    winner.userid
                ),

            loserUserId:
                Number(
                    loser.userid
                ),

            player1Score:
                Number(
                    match.player1score || 0
                ),

            player2Score:
                Number(
                    match.player2score || 0
                )
        };


    } catch (error) {

        await client.query(
            'ROLLBACK'
        );

        console.error(
            '❌ forfeitOfflinePlayer error:',
            error
        );

        throw error;

    } finally {

        client.release();
    }
}


// ============================================================
// GET ACTIVE SEASON
// ============================================================

async function getActiveSeason(
    pool
) {

    const result =
        await pool.query(
            `
            SELECT
                seasonid AS "seasonId",
                seasonname AS "seasonName",
                startdate AS "startDate",
                enddate AS "endDate",
                isactive AS "isActive"
            FROM rankseasons
            WHERE isactive = TRUE
            ORDER BY seasonid DESC
            LIMIT 1
            `
        );


    if (
        result.rows.length === 0
    ) {

        throw new Error(
            'No active rank season found.'
        );
    }


    return result.rows[0];
}


// ============================================================
// GET RANK TIER
// ============================================================

async function getRankTier(
    pool,
    rankTierId
) {

    const result =
        await pool.query(
            `
            SELECT
                ranktierid AS "rankTierId",
                rankname AS "rankName",
                rankorder AS "rankOrder",
                minrating AS "minRating",
                maxrating AS "maxRating",
                iconurl AS "iconUrl",
                description AS "rankDescription"
            FROM ranktiers
            WHERE ranktierid = $1
            LIMIT 1
            `,
            [rankTierId]
        );


    return result.rows[0] || null;
}


// ============================================================
// FIND TIER BY RATING
// ============================================================

async function findRankTierByRating(
    client,
    rating
) {

    const result =
        await client.query(
            `
            SELECT
                ranktierid AS "rankTierId",
                rankname AS "rankName",
                rankorder AS "rankOrder",
                minrating AS "minRating",
                maxrating AS "maxRating",
                iconurl AS "iconUrl",
                description AS "rankDescription"
            FROM ranktiers
            WHERE minrating <= $1
              AND (
                    maxrating IS NULL
                    OR maxrating >= $1
                  )
            ORDER BY rankorder DESC
            LIMIT 1
            `,
            [rating]
        );


    return result.rows[0] || null;
}


// ============================================================
// GET RANK HOME
// ============================================================

async function getRankHome(
    userId,
    languageId = null
) {

    userId =
        toPositiveInt(
            userId,
            'userId'
        );


    if (
        languageId !== null &&
        languageId !== undefined &&
        languageId !== '' &&
        languageId !== 'null' &&
        languageId !== 'undefined'
    ) {

        languageId =
            toPositiveInt(
                languageId,
                'languageId'
            );

    } else {

        languageId = null;
    }


    const pool =
        await getPool();


    const season =
        await getActiveSeason(
            pool
        );


    // --------------------------------------------------------
    // PLAYER RANK
    // --------------------------------------------------------

    const rankResult =
        await pool.query(
            `
            SELECT
                pr.playerrankid AS "playerRankId",
                pr.userid AS "userId",
                pr.seasonid AS "seasonId",
                pr.ranktierid AS "rankTierId",

                pr.rating,
                pr.rankpoint AS "rankPoint",

                pr.wins,
                pr.losses,
                pr.draws,
                pr.totalmatches AS "totalMatches",

                pr.winstreak AS "winStreak",
                pr.bestwinstreak AS "bestWinStreak",
                pr.highestrating AS "highestRating",

                pr.placementmatches AS "placementMatches",
                pr.isplacementcompleted AS "isPlacementCompleted",

                pr.lastmatchat AS "lastMatchAt",

                rt.rankname AS "rankName",
                rt.rankorder AS "rankOrder",
                rt.minrating AS "minRating",
                rt.maxrating AS "maxRating",
                rt.iconurl AS "iconUrl",
                rt.description AS "rankDescription"

            FROM playerranks pr

            LEFT JOIN ranktiers rt
                ON rt.ranktierid = pr.ranktierid

            WHERE pr.userid = $1
              AND pr.seasonid = $2

            LIMIT 1
            `,
            [
                userId,
                season.seasonId
            ]
        );


    let playerRank =
        rankResult.rows[0] ||
        null;


    // --------------------------------------------------------
    // CREATE PLAYER RANK
    // --------------------------------------------------------

    if (!playerRank) {

        const insertRankResult =
            await pool.query(
                `
                INSERT INTO playerranks
                (
                    userid,
                    seasonid,
                    ranktierid,
                    rating,
                    rankpoint,
                    wins,
                    losses,
                    draws,
                    totalmatches,
                    winstreak,
                    bestwinstreak,
                    highestrating,
                    placementmatches,
                    isplacementcompleted
                )
                SELECT
                    $1,
                    $2,
                    rt.ranktierid,
                    1000,
                    1000,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1000,
                    0,
                    FALSE
                FROM ranktiers rt
                ORDER BY rt.rankorder ASC
                LIMIT 1

                RETURNING
                    playerrankid AS "playerRankId",
                    userid AS "userId",
                    seasonid AS "seasonId",
                    ranktierid AS "rankTierId",
                    rating,
                    rankpoint AS "rankPoint",
                    wins,
                    losses,
                    draws,
                    totalmatches AS "totalMatches",
                    winstreak AS "winStreak",
                    bestwinstreak AS "bestWinStreak",
                    highestrating AS "highestRating",
                    placementmatches AS "placementMatches",
                    isplacementcompleted AS "isPlacementCompleted",
                    lastmatchat AS "lastMatchAt"
                `,
                [
                    userId,
                    season.seasonId
                ]
            );


        playerRank =
            insertRankResult.rows[0] ||
            null;


        if (!playerRank) {

            throw new Error(
                'Cannot create player rank.'
            );
        }


        const tier =
            await getRankTier(
                pool,
                playerRank.rankTierId
            );


        if (tier) {

            Object.assign(
                playerRank,
                tier
            );
        }
    }


    // --------------------------------------------------------
    // QUEUE
    // --------------------------------------------------------

    const queueResult =
        await pool.query(
            `
            SELECT
                queueid AS "queueId",
                userid AS "userId",
                seasonid AS "seasonId",
                rating,
                ranktierid AS "rankTierId",
                languageid AS "languageId",
                queuestatus AS "queueStatus",
                searchrange AS "searchRange",
                joinedat AS "joinedAt",
                matchedat AS "matchedAt",
                cancelledat AS "cancelledAt"
            FROM matchmakingqueue
            WHERE userid = $1
              AND seasonid = $2
              AND queuestatus = 'Waiting'
            ORDER BY queueid DESC
            LIMIT 1
            `,
            [
                userId,
                season.seasonId
            ]
        );


    const queue =
        queueResult.rows[0] ||
        null;


    // --------------------------------------------------------
    // RECENT MATCHES
    // --------------------------------------------------------

    let recentMatchesQuery = `
        SELECT
            m.matchid AS "matchId",
            m.seasonid AS "seasonId",
            m.languageid AS "languageId",
            m.matchtype AS "matchType",
            m.matchstatus AS "matchStatus",

            m.totalquestions AS "totalQuestions",
            m.currentquestion AS "currentQuestion",

            m.player1score AS "player1Score",
            m.player2score AS "player2Score",

            m.winneruserid AS "winnerUserId",
            m.loseruserid AS "loserUserId",

            m.createdat AS "createdAt",
            m.startedat AS "startedAt",
            m.finishedat AS "finishedAt",

            mp.playernumber AS "playerNumber",
            mp.ratingbefore AS "ratingBefore",
            mp.ratingafter AS "ratingAfter",

            opponent.userid AS "opponentUserId",
            opponent.playernumber AS "opponentPlayerNumber",
            opponent.ratingbefore AS "opponentRatingBefore",
            opponent.ratingafter AS "opponentRatingAfter"

        FROM matches m

        INNER JOIN matchplayers mp
            ON mp.matchid = m.matchid
           AND mp.userid = $1

        LEFT JOIN matchplayers opponent
            ON opponent.matchid = m.matchid
           AND opponent.userid <> $1
    `;


    const recentParams = [
        userId
    ];


    if (
        languageId !== null
    ) {

        recentMatchesQuery += `
            WHERE m.languageid = $2
        `;

        recentParams.push(
            languageId
        );
    }


    recentMatchesQuery += `
        ORDER BY m.createdat DESC
        LIMIT 20
    `;


    const recentMatchesResult =
        await pool.query(
            recentMatchesQuery,
            recentParams
        );


    const recentMatches =
        recentMatchesResult.rows.map(
            match => {

                const playerNumber =
                    Number(
                        match.playerNumber
                    );


                const playerScore =
                    playerNumber === 1
                        ? Number(
                            match.player1Score || 0
                        )
                        : Number(
                            match.player2Score || 0
                        );


                const opponentScore =
                    playerNumber === 1
                        ? Number(
                            match.player2Score || 0
                        )
                        : Number(
                            match.player1Score || 0
                        );


                const isWinner =
                    match.winnerUserId !== null &&
                    Number(
                        match.winnerUserId
                    ) === userId;


                const isLoser =
                    match.loserUserId !== null &&
                    Number(
                        match.loserUserId
                    ) === userId;


                let result =
                    'Draw';


                if (isWinner) {

                    result =
                        'Win';

                } else if (isLoser) {

                    result =
                        'Loss';
                }


                return {

                    ...match,

                    playerScore,

                    opponentScore,

                    isWinner,

                    isLoser,

                    result
                };
            }
        );


    // --------------------------------------------------------
    // RANK PROGRESS
    // --------------------------------------------------------

    const rating =
        Number(
            playerRank.rating || 0
        );


    const minRating =
        Number(
            playerRank.minRating || 0
        );


    let maxRating = null;


    if (
        playerRank.maxRating !== null &&
        playerRank.maxRating !== undefined
    ) {

        maxRating =
            Number(
                playerRank.maxRating
            );
    }


    let rankProgress = 0;


    if (
        maxRating !== null &&
        maxRating > minRating
    ) {

        rankProgress =
            (
                (
                    rating -
                    minRating
                ) /
                (
                    maxRating -
                    minRating
                )
            ) * 100;


        rankProgress =
            Math.max(
                0,
                Math.min(
                    100,
                    rankProgress
                )
            );

    } else {

        rankProgress = 100;
    }


    // --------------------------------------------------------
    // NEXT RANK
    // --------------------------------------------------------

    const nextTierResult =
        await pool.query(
            `
            SELECT
                ranktierid AS "rankTierId",
                rankname AS "rankName",
                rankorder AS "rankOrder",
                minrating AS "minRating",
                maxrating AS "maxRating",
                iconurl AS "iconUrl",
                description AS "rankDescription"
            FROM ranktiers
            WHERE rankorder > $1
            ORDER BY rankorder ASC
            LIMIT 1
            `,
            [
                Number(
                    playerRank.rankOrder || 0
                )
            ]
        );


    const nextRank =
        nextTierResult.rows[0] ||
        null;


    return {

        season,

        playerRank: {

            ...playerRank,

            rating,

            rankPoint:
                Number(
                    playerRank.rankPoint ||
                    rating
                ),

            rankProgress:
                Math.round(
                    rankProgress * 100
                ) / 100,

            nextRank
        },

        queue,

        recentMatches
    };
}


// ============================================================
// ENSURE PLAYER RANK
// ============================================================

async function ensurePlayerRank(
    client,
    userId,
    seasonId
) {

    userId =
        toPositiveInt(
            userId,
            'userId'
        );


    seasonId =
        toPositiveInt(
            seasonId,
            'seasonId'
        );


    const existingResult =
        await client.query(
            `
            SELECT
                pr.*,
                rt.rankname
            FROM playerranks pr

            LEFT JOIN ranktiers rt
                ON rt.ranktierid =
                   pr.ranktierid

            WHERE pr.userid = $1
              AND pr.seasonid = $2

            LIMIT 1
            `,
            [
                userId,
                seasonId
            ]
        );


    if (
        existingResult.rows.length > 0
    ) {

        return existingResult.rows[0];
    }


    const insertResult =
        await client.query(
            `
            INSERT INTO playerranks
            (
                userid,
                seasonid,
                ranktierid,
                rating,
                rankpoint,
                wins,
                losses,
                draws,
                totalmatches,
                winstreak,
                bestwinstreak,
                highestrating,
                placementmatches,
                isplacementcompleted
            )
            SELECT
                $1,
                $2,
                rt.ranktierid,
                1000,
                1000,
                0,
                0,
                0,
                0,
                0,
                0,
                1000,
                0,
                FALSE
            FROM ranktiers rt
            ORDER BY rt.rankorder ASC
            LIMIT 1

            RETURNING *
            `,
            [
                userId,
                seasonId
            ]
        );


    if (
        insertResult.rows.length === 0
    ) {

        throw new Error(
            'Cannot create player rank.'
        );
    }


    return insertResult.rows[0];
}


// ============================================================
// FIND / JOIN QUEUE
// ============================================================

async function findOrJoinQueue(
    userId,
    languageId
) {

    userId =
        toPositiveInt(
            userId,
            'userId'
        );


    languageId =
        toPositiveInt(
            languageId,
            'languageId'
        );


    const pool =
        await getPool();


    const client =
        await pool.connect();


    try {

        await client.query(
            'BEGIN'
        );


        // ----------------------------------------------------
        // LANGUAGE
        // ----------------------------------------------------

        const languageResult =
            await client.query(
                `
                SELECT
                    languageid AS "languageId",
                    languagecode AS "languageCode",
                    languagename AS "languageName",
                    isactive AS "isActive"
                FROM languages
                WHERE languageid = $1
                  AND isactive = TRUE
                LIMIT 1
                `,
                [languageId]
            );


        if (
            languageResult.rows.length === 0
        ) {

            throw new Error(
                'Language not found or inactive.'
            );
        }


        const language =
            languageResult.rows[0];


        // ----------------------------------------------------
        // ACTIVE SEASON
        // ----------------------------------------------------

        const seasonResult =
            await client.query(
                `
                SELECT
                    seasonid AS "seasonId",
                    seasonname AS "seasonName",
                    startdate AS "startDate",
                    enddate AS "endDate",
                    isactive AS "isActive"
                FROM rankseasons
                WHERE isactive = TRUE
                ORDER BY seasonid DESC
                LIMIT 1
                `
            );


        if (
            seasonResult.rows.length === 0
        ) {

            throw new Error(
                'No active rank season found.'
            );
        }


        const season =
            seasonResult.rows[0];


        // ----------------------------------------------------
        // ENSURE RANK
        // ----------------------------------------------------

        const playerRank =
            await ensurePlayerRank(
                client,
                userId,
                season.seasonId
            );


        const rating =
            Number(
                playerRank.rating || 1000
            );


        const rankTierId =
            Number(
                playerRank.ranktierid
            );


        // ----------------------------------------------------
        // EXISTING QUEUE
        // ----------------------------------------------------

        const existingQueueResult =
            await client.query(
                `
                SELECT
                    queueid AS "queueId",
                    userid AS "userId",
                    seasonid AS "seasonId",
                    rating,
                    ranktierid AS "rankTierId",
                    languageid AS "languageId",
                    queuestatus AS "queueStatus",
                    searchrange AS "searchRange",
                    joinedat AS "joinedAt",
                    matchedat AS "matchedAt",
                    cancelledat AS "cancelledAt"
                FROM matchmakingqueue
                WHERE userid = $1
                  AND seasonid = $2
                  AND languageid = $3
                  AND queuestatus = 'Waiting'
                ORDER BY queueid DESC
                LIMIT 1
                FOR UPDATE
                `,
                [
                    userId,
                    season.seasonId,
                    languageId
                ]
            );


        let queue;


        // ----------------------------------------------------
        // CREATE QUEUE
        // ----------------------------------------------------

        if (
            existingQueueResult.rows.length > 0
        ) {

            queue =
                existingQueueResult.rows[0];

        } else {

            const searchRange =
                200;


            const queueInsertResult =
                await client.query(
                    `
                    INSERT INTO matchmakingqueue
                    (
                        userid,
                        seasonid,
                        rating,
                        ranktierid,
                        languageid,
                        queuestatus,
                        searchrange,
                        joinedat
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        'Waiting',
                        $6,
                        NOW()
                    )

                    RETURNING
                        queueid AS "queueId",
                        userid AS "userId",
                        seasonid AS "seasonId",
                        rating,
                        ranktierid AS "rankTierId",
                        languageid AS "languageId",
                        queuestatus AS "queueStatus",
                        searchrange AS "searchRange",
                        joinedat AS "joinedAt",
                        matchedat AS "matchedAt",
                        cancelledat AS "cancelledAt"
                    `,
                    [
                        userId,
                        season.seasonId,
                        rating,
                        rankTierId,
                        languageId,
                        searchRange
                    ]
                );


            queue =
                queueInsertResult.rows[0];
        }


        // ----------------------------------------------------
        // FIND OPPONENT
        // ----------------------------------------------------

        const opponentResult =
            await client.query(
                `
                SELECT
                    queueid AS "queueId",
                    userid AS "userId",
                    seasonid AS "seasonId",
                    rating,
                    ranktierid AS "rankTierId",
                    languageid AS "languageId",
                    queuestatus AS "queueStatus",
                    searchrange AS "searchRange",
                    joinedat AS "joinedAt"
                FROM matchmakingqueue
                WHERE seasonid = $1
                  AND languageid = $2
                  AND queuestatus = 'Waiting'
                  AND userid <> $3
                  AND ABS(
                        rating - $4
                      ) <= GREATEST(
                        searchrange,
                        $5
                      )
                ORDER BY
                    ABS(rating - $4),
                    joinedat ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
                `,
                [
                    season.seasonId,
                    languageId,
                    userId,
                    rating,
                    queue.searchRange
                ]
            );


        // ----------------------------------------------------
        // NO OPPONENT
        // ----------------------------------------------------

        if (
            opponentResult.rows.length === 0
        ) {

            await client.query(
                'COMMIT'
            );


            return {

                status:
                    'Waiting',

                matched:
                    false,

                queue
            };
        }


        const opponent =
            opponentResult.rows[0];


        // ----------------------------------------------------
        // MARK QUEUE MATCHED
        // ----------------------------------------------------

        await client.query(
            `
            UPDATE matchmakingqueue
            SET
                queuestatus = 'Matched',
                matchedat = NOW()
            WHERE queueid IN ($1, $2)
            `,
            [
                queue.queueId,
                opponent.queueId
            ]
        );


        // ----------------------------------------------------
        // CREATE MATCH
        // ----------------------------------------------------

        const matchInsertResult =
            await client.query(
                `
                INSERT INTO matches
                (
                    seasonid,
                    languageid,
                    matchtype,
                    matchstatus,
                    totalquestions,
                    currentquestion,
                    player1score,
                    player2score,
                    startedat
                )
                VALUES
                (
                    $1,
                    $2,
                    'Ranked',
                    'InProgress',
                    0,
                    0,
                    0,
                    0,
                    NOW()
                )

                RETURNING
                    matchid AS "matchId",
                    seasonid AS "seasonId",
                    languageid AS "languageId",
                    matchtype AS "matchType",
                    matchstatus AS "matchStatus",
                    totalquestions AS "totalQuestions",
                    currentquestion AS "currentQuestion",
                    player1score AS "player1Score",
                    player2score AS "player2Score",
                    startedat AS "startedAt",
                    createdat AS "createdAt"
                `,
                [
                    season.seasonId,
                    languageId
                ]
            );


        if (
            matchInsertResult.rows.length === 0
        ) {

            throw new Error(
                'Cannot create match.'
            );
        }


        const match =
            matchInsertResult.rows[0];


        // ----------------------------------------------------
        // INSERT PLAYERS
        // ----------------------------------------------------

        await client.query(
            `
            INSERT INTO matchplayers
            (
                matchid,
                userid,
                playernumber,
                ratingbefore,
                ratingafter
            )
            VALUES
            (
                $1,
                $2,
                1,
                $3,
                NULL
            ),
            (
                $1,
                $4,
                2,
                $5,
                NULL
            )
            `,
            [
                match.matchId,
                userId,
                rating,
                opponent.userId,
                Number(
                    opponent.rating || 1000
                )
            ]
        );


        // ----------------------------------------------------
        // CREATE MATCH QUESTIONS
        // ----------------------------------------------------

        const questionsInsertResult =
            await client.query(
                `
                INSERT INTO matchquestions
                (
                    matchid,
                    questionnumber,
                    questionid,
                    questiontext,
                    correctanswer
                )
                SELECT
                    $1,
                    ROW_NUMBER() OVER (
                        ORDER BY selected.questionid
                    ),
                    selected.questionid,
                    selected.questiontext,
                    selected.correctanswer
                FROM
                (
                    SELECT
                        qq.questionid,
                        qq.questiontext,
                        qa.answertext AS correctanswer

                    FROM quizquestions qq

                    INNER JOIN quizzes q
                        ON q.quizid = qq.quizid

                    INNER JOIN lessons l
                        ON l.lessonid = q.lessonid

                    INNER JOIN courses c
                        ON c.courseid = l.courseid

                    INNER JOIN quizanswers qa
                        ON qa.questionid = qq.questionid
                       AND qa.iscorrect = TRUE

                    WHERE c.languageid = $2

                    ORDER BY RANDOM()

                    LIMIT 10

                ) selected

                RETURNING
                    matchquestionid,
                    matchid,
                    questionnumber,
                    questionid,
                    questiontext,
                    correctanswer
                `,
                [
                    match.matchId,
                    languageId
                ]
            );


        const totalQuestions =
            questionsInsertResult.rows.length;


        if (
            totalQuestions === 0
        ) {

            throw new Error(
                'No quiz questions available for this language.'
            );
        }


        // ----------------------------------------------------
        // UPDATE TOTAL QUESTIONS
        // ----------------------------------------------------

        await client.query(
            `
            UPDATE matches
            SET
                totalquestions = $1
            WHERE matchid = $2
            `,
            [
                totalQuestions,
                match.matchId
            ]
        );


        // ----------------------------------------------------
        // COMMIT
        // ----------------------------------------------------

        await client.query(
            'COMMIT'
        );


        // ----------------------------------------------------
        // RETURN
        // ----------------------------------------------------

        return {

            status:
                'Matched',

            matched:
                true,

            match: {

                ...match,

                totalQuestions
            },

            player1: {

                userId,

                rating
            },

            player2: {

                userId:
                    opponent.userId,

                rating:
                    Number(
                        opponent.rating || 1000
                    )
            },

            language,

            questions:
                questionsInsertResult.rows.map(
                    row => ({

                        matchQuestionId:
                            row.matchquestionid,

                        questionId:
                            row.questionid,

                        questionNumber:
                            row.questionnumber,

                        questionText:
                            row.questiontext
                    })
                )
        };


    } catch (error) {

        await client.query(
            'ROLLBACK'
        );

        console.error(
            '❌ findOrJoinQueue error:',
            error
        );

        throw error;

    } finally {

        client.release();
    }
}


// ============================================================
// CANCEL QUEUE
// ============================================================

async function cancelQueue(
    userId
) {

    userId =
        toPositiveInt(
            userId,
            'userId'
        );


    const pool =
        await getPool();


    const result =
        await pool.query(
            `
            UPDATE matchmakingqueue
            SET
                queuestatus = 'Cancelled',
                cancelledat = NOW()
            WHERE userid = $1
              AND queuestatus = 'Waiting'
            RETURNING
                queueid AS "queueId",
                queuestatus AS "queueStatus",
                cancelledat AS "cancelledAt"
            `,
            [userId]
        );


    return {

        cancelled:
            result.rowCount > 0,

        queues:
            result.rows
    };
}


// ============================================================
// LEAVE RANKED
// ============================================================

async function leaveRanked(
    userId
) {

    userId =
        toPositiveInt(
            userId,
            'userId'
        );


    const pool =
        await getPool();


    await pool.query(
        `
        UPDATE matchmakingqueue
        SET
            queuestatus = 'Cancelled',
            cancelledat = NOW()
        WHERE userid = $1
          AND queuestatus = 'Waiting'
        `,
        [userId]
    );


    return {

        success:
            true
    };
}


// ============================================================
// GET MATCH
// ============================================================

async function getMatch(
    userId,
    matchId
) {

    userId =
        toPositiveInt(
            userId,
            'userId'
        );

    matchId =
        toPositiveInt(
            matchId,
            'matchId'
        );

    const pool =
        await getPool();


    // ========================================================
    // 1. LẤY MATCH
    // ========================================================

    const matchResult =
        await pool.query(
            `
            SELECT
                m.matchid AS "matchId",
                m.seasonid AS "seasonId",
                m.languageid AS "languageId",
                m.matchtype AS "matchType",
                m.matchstatus AS "matchStatus",

                m.totalquestions AS "totalQuestions",
                m.currentquestion AS "currentQuestion",

                m.player1score AS "player1Score",
                m.player2score AS "player2Score",

                m.winneruserid AS "winnerUserId",
                m.loseruserid AS "loserUserId",

                m.createdat AS "createdAt",
                m.startedat AS "startedAt",
                m.finishedat AS "finishedAt"

            FROM matches m

            WHERE m.matchid = $1

            LIMIT 1
            `,
            [matchId]
        );


    if (
        matchResult.rows.length === 0
    ) {

        return null;
    }


    const match =
        matchResult.rows[0];


    // ========================================================
    // 2. LẤY 2 PLAYER
    // ========================================================

    const playersResult =
        await pool.query(
            `
            SELECT
                mp.matchplayerid AS "matchPlayerId",
                mp.userid AS "userId",
                mp.playernumber AS "playerNumber",
                mp.ratingbefore AS "ratingBefore",
                mp.ratingafter AS "ratingAfter",

                u.username AS "username"

            FROM matchplayers mp

            LEFT JOIN users u
                ON u.userid = mp.userid

            WHERE mp.matchid = $1

            ORDER BY
                mp.playernumber ASC
            `,
            [matchId]
        );


    if (
        playersResult.rows.length !== 2
    ) {

        throw new Error(
            `Match ${matchId} must have exactly 2 players.`
        );
    }


    const player1 =
        playersResult.rows.find(
            player =>
                Number(
                    player.playerNumber
                ) === 1
        );


    const player2 =
        playersResult.rows.find(
            player =>
                Number(
                    player.playerNumber
                ) === 2
        );


    if (
        !player1 ||
        !player2
    ) {

        throw new Error(
            `Match ${matchId} does not have Player 1 and Player 2.`
        );
    }


    // ========================================================
    // 3. XÁC ĐỊNH USER HIỆN TẠI
    // ========================================================

    const currentPlayer =
        playersResult.rows.find(
            player =>
                Number(
                    player.userId
                ) === Number(userId)
        );


    if (!currentPlayer) {

        throw new Error(
            `User ${userId} is not a player of match ${matchId}.`
        );
    }


    const currentUserId =
        Number(userId);


    const playerNumber =
        Number(
            currentPlayer.playerNumber
        );


    const player1UserId =
        Number(
            player1.userId
        );


    const player2UserId =
        Number(
            player2.userId
        );


    console.log(
        '================================'
    );

    console.log(
        '🏁 MATCH PLAYER INFORMATION'
    );

    console.log(
        'Match ID:',
        matchId
    );

    console.log(
        'Current User ID:',
        currentUserId
    );

    console.log(
        'Player Number:',
        playerNumber
    );

    console.log(
        'Player 1 User ID:',
        player1UserId
    );

    console.log(
        'Player 2 User ID:',
        player2UserId
    );

    console.log(
        'Match Status:',
        match.matchStatus
    );

    console.log(
        '================================'
    );


    // ========================================================
    // 4. THÔNG TIN PLAYER 1
    // ========================================================

    const player1Data = {

        userId:
            Number(
                player1.userId
            ),

        playerNumber:
            Number(
                player1.playerNumber
            ),

        username:
            player1.username,

        ratingBefore:
            player1.ratingBefore !== null
                ? Number(
                    player1.ratingBefore
                )
                : null,

        ratingAfter:
            player1.ratingAfter !== null
                ? Number(
                    player1.ratingAfter
                )
                : null,

        score:
            Number(
                match.player1Score || 0
            )
    };


    // ========================================================
    // 5. THÔNG TIN PLAYER 2
    // ========================================================

    const player2Data = {

        userId:
            Number(
                player2.userId
            ),

        playerNumber:
            Number(
                player2.playerNumber
            ),

        username:
            player2.username,

        ratingBefore:
            player2.ratingBefore !== null
                ? Number(
                    player2.ratingBefore
                )
                : null,

        ratingAfter:
            player2.ratingAfter !== null
                ? Number(
                    player2.ratingAfter
                )
                : null,

        score:
            Number(
                match.player2Score || 0
            )
    };


    // ========================================================
    // 6. QUESTIONS + ANSWERS
    // ========================================================

    const questionsResult =
        await pool.query(
            `
            SELECT
                mq.matchquestionid AS "matchQuestionId",
                mq.questionid AS "questionId",
                mq.questionnumber AS "questionNumber",
                mq.questiontext AS "questionText",

                qa.answerid AS "answerId",
                qa.answertext AS "answerText",
                qa.answerorder AS "answerOrder"

            FROM matchquestions mq

            LEFT JOIN quizanswers qa
                ON qa.questionid =
                   mq.questionid

            WHERE mq.matchid = $1

            ORDER BY
                mq.questionnumber ASC,
                qa.answerorder ASC
            `,
            [matchId]
        );


    // ========================================================
    // 7. GROUP QUESTIONS
    // ========================================================

    const questions = [];


    for (
        const row
        of questionsResult.rows
    ) {

        let question =
            questions.find(
                item =>
                    Number(
                        item.matchQuestionId
                    ) ===
                    Number(
                        row.matchQuestionId
                    )
            );


        if (!question) {

            question = {

                matchQuestionId:
                    row.matchQuestionId,

                questionId:
                    row.questionId,

                questionNumber:
                    row.questionNumber,

                questionText:
                    row.questionText,

                answers: []
            };


            questions.push(
                question
            );
        }


        if (
            row.answerId !== null
        ) {

            question.answers.push({

                answerId:
                    row.answerId,

                answerText:
                    row.answerText,

                answerOrder:
                    row.answerOrder
            });
        }
    }


    // ========================================================
    // 8. TIMER
    // ========================================================

    const finishTimer =
        getRankedFinishTimer(
            matchId
        );


    // ========================================================
    // 9. RETURN
    // ========================================================

    return {

        // -----------------------------
        // MATCH
        // -----------------------------

        match,

        // -----------------------------
        // USER HIỆN TẠI
        // -----------------------------

        currentUserId,

        playerNumber,

        // -----------------------------
        // PLAYER ID
        // -----------------------------

        player1UserId,

        player2UserId,

        // -----------------------------
        // PLAYER DATA
        // -----------------------------

        player1:
            player1Data,

        player2:
            player2Data,

        // -----------------------------
        // QUESTIONS
        // -----------------------------

        questions,

        // -----------------------------
        // TIMER
        // -----------------------------

        finishTimer,

        waitingForOpponent:
            finishTimer !== null,

        remainingSeconds:
            finishTimer
                ? finishTimer.remainingSeconds
                : null
    };
}


// ============================================================
// ANSWER QUESTION
// ============================================================

async function answerQuestion(
    currentUserId,
    matchId,
    matchQuestionId,
    answerText,
    answerTimeMilliseconds = null
) {

    const userId =
        toPositiveInt(
            currentUserId,
            'userId'
        );


    const parsedMatchId =
        toPositiveInt(
            matchId,
            'matchId'
        );


    const parsedMatchQuestionId =
        toPositiveInt(
            matchQuestionId,
            'matchQuestionId'
        );


    if (
        typeof answerText !== 'string' ||
        answerText.trim() === ''
    ) {

        const error =
            new Error(
                'answerText is required.'
            );

        error.statusCode = 400;

        throw error;
    }


    const cleanAnswer =
        answerText.trim();


    const pool =
        await getPool();


    const client =
        await pool.connect();


    try {

        await client.query(
            'BEGIN'
        );


        // ----------------------------------------------------
        // CHECK MATCH
        // ----------------------------------------------------

        const matchResult =
            await client.query(
                `
                SELECT
                    matchid,
                    matchstatus,
                    player1score,
                    player2score
                FROM matches
                WHERE matchid = $1
                FOR UPDATE
                `,
                [parsedMatchId]
            );


        if (
            matchResult.rows.length === 0
        ) {

            const error =
                new Error(
                    'Match not found.'
                );

            error.statusCode = 404;

            throw error;
        }


        const match =
            matchResult.rows[0];


        // ----------------------------------------------------
        // FINISHED
        // ----------------------------------------------------

        if (
            String(
                match.matchstatus
            ).toLowerCase() === 'finished'
        ) {

            const error =
                new Error(
                    'This match has already finished.'
                );

            error.statusCode = 400;

            throw error;
        }


        // ----------------------------------------------------
        // CHECK PLAYER
        // ----------------------------------------------------

        const playerResult =
            await client.query(
                `
                SELECT
                    matchplayerid,
                    userid,
                    playernumber,
                    ratingbefore,
                    ratingafter
                FROM matchplayers
                WHERE matchid = $1
                  AND userid = $2
                FOR UPDATE
                `,
                [
                    parsedMatchId,
                    userId
                ]
            );


        if (
            playerResult.rows.length === 0
        ) {

            const error =
                new Error(
                    'You are not a player in this match.'
                );

            error.statusCode = 403;

            throw error;
        }


        const player =
            playerResult.rows[0];


        // ----------------------------------------------------
        // PLAYER ĐÃ SUBMIT
        // ----------------------------------------------------

        if (
            player.ratingafter !== null &&
            player.ratingafter !== undefined
        ) {

            const error =
                new Error(
                    'You have already submitted this match.'
                );

            error.statusCode = 400;

            throw error;
        }


        // ----------------------------------------------------
        // CHECK QUESTION
        // ----------------------------------------------------

        const questionResult =
            await client.query(
                `
                SELECT
                    matchquestionid,
                    matchid,
                    questionid,
                    questionnumber,
                    questiontext,
                    correctanswer
                FROM matchquestions
                WHERE matchquestionid = $1
                  AND matchid = $2
                FOR UPDATE
                `,
                [
                    parsedMatchQuestionId,
                    parsedMatchId
                ]
            );


        if (
            questionResult.rows.length === 0
        ) {

            const error =
                new Error(
                    'Match question not found.'
                );

            error.statusCode = 404;

            throw error;
        }


        const question =
            questionResult.rows[0];


        // ----------------------------------------------------
        // CHECK ANSWER
        // ----------------------------------------------------

        const correctAnswer =
            String(
                question.correctanswer ?? ''
            ).trim();


        const userAnswer =
            String(
                cleanAnswer
            ).trim();


        const isCorrect =
            userAnswer.localeCompare(
                correctAnswer,
                undefined,
                {
                    sensitivity:
                        'accent'
                }
            ) === 0;


        console.log(
            '========================================'
        );

        console.log(
            '🎯 ANSWER DEBUG'
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
            'Question ID:',
            question.questionid
        );

        console.log(
            'Question:',
            question.questiontext
        );

        console.log(
            'User Answer:',
            JSON.stringify(
                userAnswer
            )
        );

        console.log(
            'Correct Answer:',
            JSON.stringify(
                correctAnswer
            )
        );

        console.log(
            'Is Correct:',
            isCorrect
        );

        console.log(
            '========================================'
        );


        // ----------------------------------------------------
        // SCORE
        // ----------------------------------------------------

        const scoreIncrement =
            isCorrect
                ? 1
                : 0;


        let updatedMatch;


        if (
            Number(
                player.playernumber
            ) === 1
        ) {

            const updateResult =
                await client.query(
                    `
                    UPDATE matches
                    SET
                        player1score =
                            COALESCE(
                                player1score,
                                0
                            ) + $1
                    WHERE matchid = $2

                    RETURNING
                        matchid,
                        player1score,
                        player2score
                    `,
                    [
                        scoreIncrement,
                        parsedMatchId
                    ]
                );


            updatedMatch =
                updateResult.rows[0];

        } else {

            const updateResult =
                await client.query(
                    `
                    UPDATE matches
                    SET
                        player2score =
                            COALESCE(
                                player2score,
                                0
                            ) + $1
                    WHERE matchid = $2

                    RETURNING
                        matchid,
                        player1score,
                        player2score
                    `,
                    [
                        scoreIncrement,
                        parsedMatchId
                    ]
                );


            updatedMatch =
                updateResult.rows[0];
        }


        // ----------------------------------------------------
        // COMMIT
        // ----------------------------------------------------

        await client.query(
            'COMMIT'
        );


        return {

            success: true,

            matchId:
                parsedMatchId,

            matchQuestionId:
                Number(
                    question.matchquestionid
                ),

            questionId:
                Number(
                    question.questionid
                ),

            questionNumber:
                Number(
                    question.questionnumber
                ),

            isCorrect,

            scoreIncrement,

            answerTimeMilliseconds,

            playerNumber:
                Number(
                    player.playernumber
                ),

            player1Score:
                Number(
                    updatedMatch.player1score || 0
                ),

            player2Score:
                Number(
                    updatedMatch.player2score || 0
                ),

            matchStatus:
                match.matchstatus
        };


    } catch (error) {

        await client.query(
            'ROLLBACK'
        );

        console.error(
            '❌ answerQuestion error:',
            error
        );

        throw error;

    } finally {

        client.release();
    }
}


// ============================================================
// FINISH MATCH
// ============================================================

async function finishMatch(
    userId,
    matchId
) {

    userId =
        toPositiveInt(
            userId,
            'userId'
        );


    matchId =
        toPositiveInt(
            matchId,
            'matchId'
        );


    const pool =
        await getPool();


    const client =
        await pool.connect();


    try {

        await client.query(
            'BEGIN'
        );


        // ----------------------------------------------------
        // GET MATCH + LOCK
        // ----------------------------------------------------

        const matchResult =
            await client.query(
                `
                SELECT
                    matchid,
                    seasonid,
                    languageid,
                    matchstatus,
                    player1score,
                    player2score,
                    winneruserid,
                    loseruserid
                FROM matches
                WHERE matchid = $1
                FOR UPDATE
                `,
                [matchId]
            );


        if (
            matchResult.rows.length === 0
        ) {

            const error =
                new Error(
                    'Match not found.'
                );

            error.statusCode = 404;

            throw error;
        }


        const match =
            matchResult.rows[0];


        // ----------------------------------------------------
        // ALREADY FINISHED
        // ----------------------------------------------------

        if (
            String(
                match.matchstatus
            ).toLowerCase() === 'finished'
        ) {

            await client.query(
                'ROLLBACK'
            );


            stopRankedFinishTimer(
                matchId
            );


            return {

                success: true,

                matchId,

                status:
                    'Finished',

                matchStatus:
                    'Finished',

                waiting:
                    false,

                alreadyFinished:
                    true,

                winnerUserId:
                    match.winneruserid !== null
                        ? Number(
                            match.winneruserid
                        )
                        : null,

                loserUserId:
                    match.loseruserid !== null
                        ? Number(
                            match.loseruserid
                        )
                        : null,

                draw:
                    match.winneruserid === null &&
                    match.loseruserid === null,

                player1Score:
                    Number(
                        match.player1score || 0
                    ),

                player2Score:
                    Number(
                        match.player2score || 0
                    )
            };
        }


        // ----------------------------------------------------
        // GET PLAYERS
        // ----------------------------------------------------

        const playersResult =
            await client.query(
                `
                SELECT
                    mp.matchplayerid,
                    mp.userid,
                    mp.playernumber,
                    mp.ratingbefore,
                    mp.ratingafter,
                    u.username
                FROM matchplayers mp
                LEFT JOIN users u
                    ON u.userid = mp.userid
                WHERE mp.matchid = $1
                ORDER BY mp.playernumber ASC
                FOR UPDATE OF mp
                `,
                [matchId]
            );


        if (
            playersResult.rows.length !== 2
        ) {

            const error =
                new Error(
                    'Match must have exactly 2 players.'
                );

            error.statusCode = 400;

            throw error;
        }


        const player1 =
            playersResult.rows.find(
                p =>
                    Number(
                        p.playernumber
                    ) === 1
            );


        const player2 =
            playersResult.rows.find(
                p =>
                    Number(
                        p.playernumber
                    ) === 2
            );


        if (
            !player1 ||
            !player2
        ) {

            const error =
                new Error(
                    'Invalid player numbers.'
                );

            error.statusCode = 400;

            throw error;
        }


        // ----------------------------------------------------
        // CURRENT PLAYER
        // ----------------------------------------------------

        const currentPlayer =
            [
                player1,
                player2
            ].find(
                player =>
                    Number(
                        player.userid
                    ) ===
                    Number(userId)
            );


        if (!currentPlayer) {

            const error =
                new Error(
                    'You are not a player in this match.'
                );

            error.statusCode = 403;

            throw error;
        }


        // ----------------------------------------------------
        // OTHER PLAYER
        // ----------------------------------------------------

        const otherPlayer =
            Number(
                currentPlayer.userid
            ) ===
            Number(player1.userid)
                ? player2
                : player1;


        const currentPlayerFinished =
            currentPlayer.ratingafter !== null &&
            currentPlayer.ratingafter !== undefined;


        const otherPlayerFinished =
            otherPlayer.ratingafter !== null &&
            otherPlayer.ratingafter !== undefined;


        // ----------------------------------------------------
        // CURRENT PLAYER ALREADY FINISHED
        // ----------------------------------------------------
// ----------------------------------------------------
// CURRENT PLAYER ALREADY FINISHED
// ----------------------------------------------------

if (
    currentPlayerFinished &&
    !otherPlayerFinished
) {

    await client.query(
        'ROLLBACK'
    );


    const timer =
        getRankedFinishTimer(
            matchId
        );


    return {

        success: true,

        matchId,

        status:
            'WaitingForOpponent',

        matchStatus:
            'WaitingForOpponent',

        waiting:
            true,

        alreadyFinished:
            true,

        finishedByUserId:
            Number(
                currentPlayer.userid
            ),

        opponentUserId:
            Number(
                otherPlayer.userid
            ),

        finishDeadline:
            timer
                ? timer.deadline
                : null,

        remainingMilliseconds:
            timer
                ? timer.remainingMilliseconds
                : null,

        remainingSeconds:
            timer
                ? timer.remainingSeconds
                : null,

        autoFinishAfterSeconds:
            30,

        message:
            'Bạn đã nộp bài. Đang chờ đối thủ trong 30 giây.'
    };
}


        // ----------------------------------------------------
        // CURRENT PLAYER FINISHES FIRST
        // ----------------------------------------------------

       if (
    !currentPlayerFinished &&
    !otherPlayerFinished
) {

            await client.query(
                `
                UPDATE matchplayers
                SET
                    ratingafter =
                        ratingbefore::integer
                WHERE matchplayerid = $1
                `,
                [
                    currentPlayer.matchplayerid
                ]
            );


            await client.query(
                'COMMIT'
            );


            const timer =
                startRankedFinishTimer(
                    matchId,
                    currentPlayer.userid
                );


            return {

                success: true,

                matchId,

                status:
                    'WaitingForOpponent',

                matchStatus:
                    'WaitingForOpponent',

                waiting:
                    true,

                finishedByUserId:
                    Number(
                        currentPlayer.userid
                    ),

                opponentUserId:
                    Number(
                        otherPlayer.userid
                    ),

                finishDeadline:
                    timer.deadline,

                remainingMilliseconds:
                    timer.remainingMilliseconds,

                remainingSeconds:
                    timer.remainingSeconds,

                autoFinishAfterSeconds:
                    30,

                message:
                    'Bạn đã nộp bài. Đang chờ đối thủ trong 30 giây.'
            };
        }


        // ----------------------------------------------------
        // BOTH PLAYERS FINISHED
        // ----------------------------------------------------

        const player1Score =
            Number(
                match.player1score || 0
            );


        const player2Score =
            Number(
                match.player2score || 0
            );


        // ----------------------------------------------------
        // WIN / LOSS / DRAW
        // ----------------------------------------------------

        let winner = null;

        let loser = null;


        const isDraw =
            player1Score === player2Score;


        if (
            player1Score >
            player2Score
        ) {

            winner =
                player1;

            loser =
                player2;
        }


        if (
            player2Score >
            player1Score
        ) {

            winner =
                player2;

            loser =
                player1;
        }


        // ----------------------------------------------------
        // RATING CHANGE
        // ----------------------------------------------------

        let player1RatingChange =
            0;

        let player2RatingChange =
            0;


        if (!isDraw) {

            if (
                Number(
                    winner.userid
                ) ===
                Number(
                    player1.userid
                )
            ) {

                player1RatingChange =
                    25;

                player2RatingChange =
                    -25;

            } else {

                player1RatingChange =
                    -25;

                player2RatingChange =
                    25;
            }
        }


        // ----------------------------------------------------
        // OLD TIER
        // ----------------------------------------------------

        const oldTierMap = {};


        for (
            const player
            of [
                player1,
                player2
            ]
        ) {

            const tierResult =
                await client.query(
                    `
                    SELECT
                        ranktierid
                    FROM playerranks
                    WHERE userid = $1
                      AND seasonid = $2
                    LIMIT 1
                    `,
                    [
                        player.userid,
                        match.seasonid
                    ]
                );


            oldTierMap[
                Number(
                    player.userid
                )
            ] =
                tierResult.rows.length > 0
                    ? tierResult.rows[0].ranktierid
                    : null;
        }


        // ----------------------------------------------------
        // OLD RATING
        // ----------------------------------------------------

        const player1OldRating =
            Number(
                player1.ratingbefore ??
                1000
            );


        const player2OldRating =
            Number(
                player2.ratingbefore ??
                1000
            );


        // ----------------------------------------------------
        // NEW RATING
        // ----------------------------------------------------

        const player1NewRating =
            Math.max(
                0,
                player1OldRating +
                player1RatingChange
            );


        const player2NewRating =
            Math.max(
                0,
                player2OldRating +
                player2RatingChange
            );


        // ----------------------------------------------------
        // UPDATE MATCH PLAYERS
        // ----------------------------------------------------

        await client.query(
            `
            UPDATE matchplayers
            SET
                ratingafter =
                    CASE
                        WHEN userid = $1
                            THEN $3::integer

                        WHEN userid = $2
                            THEN $4::integer

                        ELSE ratingafter
                    END
            WHERE matchid = $5
            `,
            [
                player1.userid,
                player2.userid,
                player1NewRating,
                player2NewRating,
                matchId
            ]
        );


        // ----------------------------------------------------
        // UPDATE PLAYER RANK
        // ----------------------------------------------------

        if (isDraw) {

            await updatePlayerRankAfterMatch(
                client,
                player1.userid,
                match.seasonid,
                0,
                false,
                false,
                true
            );


            await updatePlayerRankAfterMatch(
                client,
                player2.userid,
                match.seasonid,
                0,
                false,
                false,
                true
            );

        } else {

            await updatePlayerRankAfterMatch(
                client,
                winner.userid,
                match.seasonid,
                25,
                true,
                false,
                false
            );


            await updatePlayerRankAfterMatch(
                client,
                loser.userid,
                match.seasonid,
                -25,
                false,
                true,
                false
            );
        }


        // ----------------------------------------------------
        // UPDATE MATCH
        // ----------------------------------------------------

        await client.query(
            `
            UPDATE matches
            SET
                matchstatus = 'Finished',

                winneruserid = $1,

                loseruserid = $2,

                finishedat = NOW()

            WHERE matchid = $3
            `,
            [
                isDraw
                    ? null
                    : Number(
                        winner.userid
                    ),

                isDraw
                    ? null
                    : Number(
                        loser.userid
                    ),

                matchId
            ]
        );


        // ----------------------------------------------------
        // RANK HISTORY PLAYER 1
        // ----------------------------------------------------

        const player1Result =
            isDraw
                ? 'Draw'
                : Number(
                    winner.userid
                ) ===
                  Number(
                      player1.userid
                  )
                    ? 'Win'
                    : 'Loss';


        await insertRankHistory(
            client,
            player1.userid,
            match.seasonid,
            matchId,
            player1OldRating,
            player1NewRating,
            player1Result
        );


        // ----------------------------------------------------
        // RANK HISTORY PLAYER 2
        // ----------------------------------------------------

        const player2Result =
            isDraw
                ? 'Draw'
                : Number(
                    winner.userid
                ) ===
                  Number(
                      player2.userid
                  )
                    ? 'Win'
                    : 'Loss';


        await insertRankHistory(
            client,
            player2.userid,
            match.seasonid,
            matchId,
            player2OldRating,
            player2NewRating,
            player2Result
        );


        // ----------------------------------------------------
        // COMMIT
        // ----------------------------------------------------

        await client.query(
            'COMMIT'
        );


        // ----------------------------------------------------
        // IMPORTANT:
        // STOP 30 SECOND TIMER
        // ----------------------------------------------------

        stopRankedFinishTimer(
            matchId
        );


        // ----------------------------------------------------
        // REMOVE HEARTBEAT
        // ----------------------------------------------------

        removeRankedHeartbeat(
            player1.userid,
            matchId
        );


        removeRankedHeartbeat(
            player2.userid,
            matchId
        );


        // ----------------------------------------------------
        // RESULT
        // ----------------------------------------------------

       const result = {

    matchId: Number(matchId),

    status: 'Finished',

    matchStatus: 'Finished',

    waiting: false,

    currentUserId:
        Number(userId),

    playerNumber:
        Number(
            currentPlayer.playernumber
        ),

    player1UserId:
        Number(
            player1.userid
        ),

    player2UserId:
        Number(
            player2.userid
        ),

    draw: isDraw,

    winnerUserId:
        isDraw
            ? null
            : Number(
                winner.userid
            ),

    loserUserId:
        isDraw
            ? null
            : Number(
                loser.userid
            ),

    player1: {

        userId:
            Number(
                player1.userid
            ),

        playerNumber:
            Number(
                player1.playernumber
            ),

        username:
            player1.username,

        score:
            player1Score,

        ratingBefore:
            player1OldRating,

        ratingAfter:
            player1NewRating,

        ratingChange:
            player1RatingChange,

        oldRankTierId:
            oldTierMap[
                Number(
                    player1.userid
                )
            ]
    },

    player2: {

        userId:
            Number(
                player2.userid
            ),

        playerNumber:
            Number(
                player2.playernumber
            ),

        username:
            player2.username,

        score:
            player2Score,

        ratingBefore:
            player2OldRating,

        ratingAfter:
            player2NewRating,

        ratingChange:
            player2RatingChange,

        oldRankTierId:
            oldTierMap[
                Number(
                    player2.userid
                )
            ]
    }
};


        return {

            success: true,

            matchId,

            status:
                'Finished',

            matchStatus:
                'Finished',

            waiting:
                false,

            draw:
                isDraw,

            winnerUserId:
                result.winnerUserId,

            loserUserId:
                result.loserUserId,

            player1:
                result.player1,

            player2:
                result.player2,

            result,

            summary: {

                matchId,

                status:
                    'Finished',

                draw:
                    isDraw,

                winnerUserId:
                    result.winnerUserId,

                loserUserId:
                    result.loserUserId,

                player1:
                    result.player1,

                player2:
                    result.player2
            }
        };


    } catch (error) {

        await client.query(
            'ROLLBACK'
        );

        console.error(
            '❌ finishMatch error:',
            error
        );

        throw error;

    } finally {

        client.release();
    }
}


// ============================================================
// AUTO FINISH AFTER 30 SECONDS
// ============================================================

async function autoFinishRankedMatch(
    matchId,
    finishedUserId
) {

    matchId =
        toPositiveInt(
            matchId,
            'matchId'
        );


    finishedUserId =
        toPositiveInt(
            finishedUserId,
            'finishedUserId'
        );


    const pool =
        await getPool();


    const client =
        await pool.connect();


    try {

        await client.query(
            'BEGIN'
        );


        // ----------------------------------------------------
        // LOCK MATCH
        // ----------------------------------------------------

        const matchResult =
            await client.query(
                `
                SELECT
                    matchid,
                    matchstatus
                FROM matches
                WHERE matchid = $1
                FOR UPDATE
                `,
                [matchId]
            );


        if (
            matchResult.rows.length === 0
        ) {

            await client.query(
                'ROLLBACK'
            );

            return null;
        }


        const match =
            matchResult.rows[0];


        // ----------------------------------------------------
        // MATCH ALREADY FINISHED
        // ----------------------------------------------------

        if (
            String(
                match.matchstatus
            ).toLowerCase() === 'finished'
        ) {

            await client.query(
                'ROLLBACK'
            );

            stopRankedFinishTimer(
                matchId
            );

            return {

                success: true,

                matchId,

                status:
                    'Finished'
            };
        }


        // ----------------------------------------------------
        // GET PLAYERS
        // ----------------------------------------------------

        const playersResult =
            await client.query(
                `
                SELECT
                    matchplayerid,
                    userid,
                    playernumber,
                    ratingbefore,
                    ratingafter
                FROM matchplayers
                WHERE matchid = $1
                ORDER BY playernumber
                FOR UPDATE
                `,
                [matchId]
            );


        if (
            playersResult.rows.length !== 2
        ) {

            throw new Error(
                'Match must have exactly 2 players.'
            );
        }


        const players =
            playersResult.rows;


        // ----------------------------------------------------
        // TÌM PLAYER CHƯA SUBMIT
        // ----------------------------------------------------

        const unfinishedPlayer =
            players.find(
                player =>
                    player.ratingafter === null ||
                    player.ratingafter === undefined
            );


        // ----------------------------------------------------
        // KHÔNG CÒN AI CHƯA SUBMIT
        // ----------------------------------------------------

       if (!unfinishedPlayer) {

    await client.query(
        'COMMIT'
    );

    stopRankedFinishTimer(
        matchId
    );

    return await finishMatch(
        finishedUserId,
        matchId
    );
}


        // ----------------------------------------------------
        // KIỂM TRA TIMER CÓ ĐÚNG PLAYER KHÔNG
        // ----------------------------------------------------

        const expectedOpponent =
            players.find(
                player =>
                    Number(
                        player.userid
                    ) !==
                    Number(
                        finishedUserId
                    ) &&
                    (
                        player.ratingafter === null ||
                        player.ratingafter === undefined
                    )
            );


        if (
            !expectedOpponent
        ) {

            await client.query(
                'ROLLBACK'
            );

            stopRankedFinishTimer(
                matchId
            );

            return {

                success: true,

                matchId,

                status:
                    'Finished'
            };
        }


        // ----------------------------------------------------
        // AUTO SUBMIT PLAYER
        // ----------------------------------------------------

        console.log(
            '🤖 AUTO SUBMIT PLAYER:',
            {
                matchId,

                userId:
                    Number(
                        unfinishedPlayer.userid
                    )
            }
        );


        await client.query(
    `
    UPDATE matchplayers
    SET
        ratingafter = ratingbefore::integer
    WHERE matchplayerid = $1
    `,
    [
        expectedOpponent.matchplayerid
    ]
);

await client.query('COMMIT');

stopRankedFinishTimer(matchId);

return await finishMatch(
    unfinishedPlayer.userid,
    matchId
);


    } catch (error) {

        await client.query(
            'ROLLBACK'
        );

        console.error(
            '❌ autoFinishRankedMatch error:',
            error
        );

        throw error;

    } finally {

        client.release();
    }
}


// ============================================================
// UPDATE PLAYER RANK
// ============================================================

async function updatePlayerRankAfterMatch(
    client,
    userId,
    seasonId,
    ratingChange,
    isWin,
    isLoss,
    isDraw
) {

    const rankResult =
        await client.query(
            `
            SELECT
                playerrankid,
                rating,
                ranktierid,
                rankpoint,
                wins,
                losses,
                draws,
                totalmatches,
                winstreak,
                bestwinstreak,
                highestrating
            FROM playerranks
            WHERE userid = $1
              AND seasonid = $2
            FOR UPDATE
            `,
            [
                userId,
                seasonId
            ]
        );


    if (
        rankResult.rows.length === 0
    ) {

        throw new Error(
            `Player rank not found for user ${userId}.`
        );
    }


    const rank =
        rankResult.rows[0];


    // --------------------------------------------------------
    // RATING
    // --------------------------------------------------------

    const oldRating =
        Number(
            rank.rating || 1000
        );


    const newRating =
        Math.max(
            0,
            oldRating +
            Number(
                ratingChange || 0
            )
        );


    // --------------------------------------------------------
    // STATS
    // --------------------------------------------------------

    const wins =
        Number(
            rank.wins || 0
        ) +
        (
            isWin
                ? 1
                : 0
        );


    const losses =
        Number(
            rank.losses || 0
        ) +
        (
            isLoss
                ? 1
                : 0
        );


    const draws =
        Number(
            rank.draws || 0
        ) +
        (
            isDraw
                ? 1
                : 0
        );


    const totalMatches =
        Number(
            rank.totalmatches || 0
        ) + 1;


    // --------------------------------------------------------
    // WIN STREAK
    // --------------------------------------------------------

    const winStreak =
        isWin
            ? Number(
                rank.winstreak || 0
            ) + 1
            : 0;


    const bestWinStreak =
        Math.max(
            Number(
                rank.bestwinstreak || 0
            ),
            winStreak
        );


    // --------------------------------------------------------
    // HIGHEST RATING
    // --------------------------------------------------------

    const highestRating =
        Math.max(
            Number(
                rank.highestrating ||
                1000
            ),
            newRating
        );


    // --------------------------------------------------------
    // NEW TIER
    // --------------------------------------------------------

    const tier =
        await findRankTierByRating(
            client,
            newRating
        );


    const newRankTierId =
        tier
            ? Number(
                tier.rankTierId
            )
            : Number(
                rank.ranktierid
            );


    // --------------------------------------------------------
    // UPDATE
    // --------------------------------------------------------

    await client.query(
        `
        UPDATE playerranks
        SET
            rating = $1::integer,

            rankpoint = $1::integer,

            ranktierid = $2::integer,

            highestrating =
                GREATEST(
                    COALESCE(
                        highestrating::integer,
                        0
                    ),
                    $3::integer
                ),

            wins =
                COALESCE(
                    wins::integer,
                    0
                ) + $4::integer,

            losses =
                COALESCE(
                    losses::integer,
                    0
                ) + $5::integer,

            draws =
                COALESCE(
                    draws::integer,
                    0
                ) + $6::integer,

            totalmatches =
                COALESCE(
                    totalmatches::integer,
                    0
                ) + 1,

            winstreak =
                $7::integer,

            bestwinstreak =
                GREATEST(
                    COALESCE(
                        bestwinstreak::integer,
                        0
                    ),
                    $8::integer
                ),

            lastmatchat =
                NOW()

        WHERE userid = $9
          AND seasonid = $10
        `,
        [
            newRating,
            newRankTierId,
            highestRating,

            isWin ? 1 : 0,
            isLoss ? 1 : 0,
            isDraw ? 1 : 0,

            winStreak,
            bestWinStreak,

            userId,
            seasonId
        ]
    );


    return {

        oldRating,

        newRating,

        ratingChange:
            Number(
                ratingChange || 0
            ),

        rankTierId:
            newRankTierId,

        wins,

        losses,

        draws,

        totalMatches
    };
}


// ============================================================
// INSERT RANK HISTORY
// ============================================================

async function insertRankHistory(
    client,
    userId,
    seasonId,
    matchId,
    oldRating,
    newRating,
    result
) {

    userId =
        toPositiveInt(
            userId,
            'userId'
        );


    seasonId =
        toPositiveInt(
            seasonId,
            'seasonId'
        );


    matchId =
        toPositiveInt(
            matchId,
            'matchId'
        );


    if (
        oldRating === null ||
        oldRating === undefined
    ) {

        throw new Error(
            'oldRating is required.'
        );
    }


    if (
        newRating === null ||
        newRating === undefined
    ) {

        throw new Error(
            'newRating is required.'
        );
    }


    // --------------------------------------------------------
    // OLD TIER
    // --------------------------------------------------------

    const oldRankResult =
        await client.query(
            `
            SELECT
                ranktierid
            FROM playerranks
            WHERE userid = $1
              AND seasonid = $2
            LIMIT 1
            `,
            [
                userId,
                seasonId
            ]
        );


    const oldRankTierId =
        oldRankResult.rows.length > 0
            ? oldRankResult.rows[0].ranktierid
            : null;


    // --------------------------------------------------------
    // NEW TIER
    // --------------------------------------------------------

    const newRankResult =
        await client.query(
            `
            SELECT
                ranktierid
            FROM ranktiers
            WHERE minrating <= $1
              AND (
                    maxrating IS NULL
                    OR maxrating >= $1
                  )
            ORDER BY minrating DESC
            LIMIT 1
            `,
            [
                Number(
                    newRating
                )
            ]
        );


    const newRankTierId =
        newRankResult.rows.length > 0
            ? newRankResult.rows[0].ranktierid
            : null;


    // --------------------------------------------------------
    // RATING CHANGE
    // --------------------------------------------------------

    const ratingChange =
        Number(newRating) -
        Number(oldRating);


    // --------------------------------------------------------
    // CHECK COLUMNS
    // --------------------------------------------------------

    const columnsResult =
        await client.query(
            `
            SELECT
                column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'rankhistory'
            `
        );


    const columns =
        new Set(
            columnsResult.rows.map(
                row =>
                    row.column_name
            )
        );


    // --------------------------------------------------------
    // BASE INSERT
    // --------------------------------------------------------

    const insertColumns = [

        'userid',

        'seasonid',

        'matchid',

        'oldrating',

        'newrating'
    ];


    const insertValues = [

        userId,

        seasonId,

        matchId,

        Number(oldRating),

        Number(newRating)
    ];


    // --------------------------------------------------------
    // OPTIONAL COLUMNS
    // --------------------------------------------------------

    if (
        columns.has(
            'ratingchange'
        )
    ) {

        insertColumns.push(
            'ratingchange'
        );

        insertValues.push(
            ratingChange
        );
    }


    if (
        columns.has(
            'oldranktierid'
        ) &&
        oldRankTierId !== null
    ) {

        insertColumns.push(
            'oldranktierid'
        );

        insertValues.push(
            oldRankTierId
        );
    }


    if (
        columns.has(
            'newranktierid'
        ) &&
        newRankTierId !== null
    ) {

        insertColumns.push(
            'newranktierid'
        );

        insertValues.push(
            newRankTierId
        );
    }


    if (
        columns.has(
            'result'
        )
    ) {

        insertColumns.push(
            'result'
        );

        insertValues.push(
            String(
                result || 'Draw'
            )
        );
    }


    // --------------------------------------------------------
    // PLACEHOLDERS
    // --------------------------------------------------------

    const placeholders =
        insertValues.map(
            (_, index) =>
                `$${index + 1}`
        );


    // --------------------------------------------------------
    // INSERT
    // --------------------------------------------------------

    await client.query(
        `
        INSERT INTO rankhistory
        (
            ${insertColumns.join(',\n            ')}
        )
        VALUES
        (
            ${placeholders.join(', ')}
        )
        `,
        insertValues
    );
}


// ============================================================
// GET MATCH RESULT
// ============================================================

async function getMatchResult(
    userId,
    matchId
) {

    userId =
        toPositiveInt(
            userId,
            'userId'
        );


    matchId =
        toPositiveInt(
            matchId,
            'matchId'
        );


    const pool =
        await getPool();


    const result =
        await pool.query(
            `
            SELECT
                m.matchid,
                m.matchstatus,
                m.player1score,
                m.player2score,
                m.winneruserid,
                m.loseruserid,
                m.finishedat,
                m.totalquestions,

                mp.playernumber

            FROM matches m

            INNER JOIN matchplayers mp
                ON mp.matchid =
                   m.matchid

            WHERE m.matchid = $1
              AND mp.userid = $2
              AND m.matchstatus = 'Finished'

            LIMIT 1
            `,
            [
                matchId,
                userId
            ]
        );


    if (
        result.rows.length === 0
    ) {

        const error =
            new Error(
                'Match result is not available yet.'
            );

        error.statusCode = 404;

        throw error;
    }


    const match =
        result.rows[0];


    return {

        success: true,

        matchId:
            Number(
                match.matchid
            ),

        status:
            'Finished',

        matchStatus:
            'Finished',

        playerNumber:
            Number(
                match.playernumber
            ),

        player1Score:
            Number(
                match.player1score || 0
            ),

        player2Score:
            Number(
                match.player2score || 0
            ),

        winnerUserId:
            match.winneruserid !== null
                ? Number(
                    match.winneruserid
                )
                : null,

        loserUserId:
            match.loseruserid !== null
                ? Number(
                    match.loseruserid
                )
                : null,

        draw:
            match.winneruserid === null &&
            match.loseruserid === null,

        totalQuestions:
            Number(
                match.totalquestions || 0
            ),

        finishedAt:
            match.finishedat,

        questions: []
    };
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    // Rank
    getRankHome,

    ensurePlayerRank,

    // Matchmaking
    findOrJoinQueue,

    cancelQueue,

    leaveRanked,

    // Match
    getMatch,

    answerQuestion,

    finishMatch,

    getMatchResult,

    // Offline
    forfeitOfflinePlayer,

    checkOfflinePlayers,

    // Heartbeat
    setRankedHeartbeat,

    removeRankedHeartbeat,

    getRankedHeartbeat,

    // 30-second timer
    startRankedFinishTimer,

    stopRankedFinishTimer,

    getRankedFinishTimer,

    autoFinishRankedMatch
};