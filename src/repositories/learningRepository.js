const { getPool } = require('../config/database');


// =========================================================
// CURRENT USER ID
// =========================================================

function currentUserId() {
    const id = Number(process.env.CURRENT_USER_ID);

    return Number.isInteger(id) && id > 0
        ? id
        : 1;
}


// =========================================================
// VALIDATE INTEGER ID
// =========================================================

function validateId(value, name) {
    const id = Number(value);

    if (!Number.isInteger(id) || id < 1) {
        throw new Error(`${name} must be a positive integer.`);
    }

    return id;
}


// =========================================================
// SAFE NUMBER
// =========================================================

function safeNumber(value, defaultValue = 0) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : defaultValue;
}


// =========================================================
// GET LANGUAGES
// =========================================================
async function getLanguages(userId) {
    const pool = await getPool();

    const result = await pool.query(`
        SELECT
            l.languageid AS "languageId",
            l.languagename AS "languageName",
            COUNT(c.courseid)::integer AS "courseCount"
        FROM languages l
        LEFT JOIN courses c
            ON c.languageid = l.languageid
        GROUP BY
            l.languageid,
            l.languagename
        ORDER BY
            l.languageid
    `);

 console.log('========== GET LANGUAGES ==========');
    console.log('TOTAL:', result.rows.length);
    console.table(result.rows);
    console.log('===================================');

    return result.rows;
}


// =========================================================
// GET COURSES
// =========================================================

async function getCourses(languageId = null) {
    const pool = await getPool();

    if (languageId !== undefined && languageId !== null && languageId !== '') {
        const parsedLanguageId = validateId(
            languageId,
            'Language id'
        );

        const result = await pool.query(`
            SELECT
                c.courseid AS "courseId",
                c.languageid AS "languageId",
                c.coursename AS "courseName",
                c.description,
                c.imageurl AS "imageUrl",
                c.difficulty,
                c.totalxp AS "totalXp",
                c.ispublished AS "isPublished",

                l.languagecode AS "languageCode",
                l.languagename AS "languageName"

            FROM courses c

            INNER JOIN languages l
                ON l.languageid = c.languageid

            WHERE c.languageid = $1
              AND c.ispublished = TRUE

            ORDER BY c.courseid ASC
        `, [
            parsedLanguageId
        ]);

        return result.rows;
    }

    const result = await pool.query(`
        SELECT
            c.courseid AS "courseId",
            c.languageid AS "languageId",
            c.coursename AS "courseName",
            c.description,
            c.imageurl AS "imageUrl",
            c.difficulty,
            c.totalxp AS "totalXp",
            c.ispublished AS "isPublished",

            l.languagecode AS "languageCode",
            l.languagename AS "languageName"

        FROM courses c

        INNER JOIN languages l
            ON l.languageid = c.languageid

        WHERE c.ispublished = TRUE

        ORDER BY c.courseid ASC
    `);

    return result.rows;
}


// =========================================================
// GET COURSE LESSONS
// =========================================================

async function getCourseLessons(courseId) {
    const pool = await getPool();

    const parsedCourseId = validateId(
        courseId,
        'Course id'
    );

    const result = await pool.query(`
        SELECT
            l.lessonid AS "lessonId",
            l.courseid AS "courseId",
            l.lessonname AS "lessonName",
            l.description,
            l.lessonorder AS "lessonOrder",
            l.difficulty,
            l.xpreward AS "xpReward",
            l.estimatedminutes AS "estimatedMinutes",
            l.ispublished AS "isPublished"

        FROM lessons l

        WHERE l.courseid = $1
          AND l.ispublished = TRUE

        ORDER BY l.lessonorder ASC
    `, [
        parsedCourseId
    ]);

    return result.rows;
}


// =========================================================
// GET LESSON DETAIL
// =========================================================

async function getLessonDetail(
    lessonId,
    userId = currentUserId()
) {
    const pool = await getPool();

    const parsedLessonId = validateId(
        lessonId,
        'Lesson id'
    );

    const parsedUserId = validateId(
        userId,
        'User id'
    );


    // -----------------------------------------------------
    // LESSON
    // -----------------------------------------------------

    const lessonResult = await pool.query(`
        SELECT
            l.lessonid AS "lessonId",
            l.courseid AS "courseId",
            l.lessonname AS "lessonName",
            l.description,
            l.lessonorder AS "lessonOrder",
            l.difficulty,
            l.xpreward AS "xpReward",
            l.estimatedminutes AS "estimatedMinutes",
            l.ispublished AS "isPublished",

            c.coursename AS "courseName",

            lang.languageid AS "languageId",
            lang.languagecode AS "languageCode",
            lang.languagename AS "languageName"

        FROM lessons l

        INNER JOIN courses c
            ON c.courseid = l.courseid

        INNER JOIN languages lang
            ON lang.languageid = c.languageid

        WHERE l.lessonid = $1
          AND l.ispublished = TRUE

        LIMIT 1
    `, [
        parsedLessonId
    ]);


    if (lessonResult.rows.length === 0) {
        return null;
    }


    // -----------------------------------------------------
    // VOCABULARY
    // -----------------------------------------------------

    const vocabularyResult = await pool.query(`
        SELECT
            v.vocabularyid AS "vocabularyId",
            v.word,
            v.pronunciation,
            v.meaning,
            v.partofspeech AS "partOfSpeech",
            v.audiourl AS "audioUrl",
            v.imageurl AS "imageUrl",
            v.difficulty,

            COALESCE(
                uv.masterylevel,
                0
            ) AS "masteryLevel",

            COALESCE(
                uv.isfavorite,
                FALSE
            ) AS "isFavorite",

            COALESCE(
                uv.islearned,
                FALSE
            ) AS "isLearned"

        FROM vocabulary v

        LEFT JOIN uservocabulary uv
            ON uv.vocabularyid = v.vocabularyid
           AND uv.userid = $1

        WHERE v.lessonid = $2

        ORDER BY v.vocabularyid ASC
    `, [
        parsedUserId,
        parsedLessonId
    ]);


    // -----------------------------------------------------
    // EXAMPLES
    // -----------------------------------------------------

    const examplesResult = await pool.query(`
        SELECT
            ve.exampleid AS "exampleId",
            ve.vocabularyid AS "vocabularyId",
            ve.examplesentence AS "exampleSentence",
            ve.translation,
            ve.audiourl AS "audioUrl"

        FROM vocabularyexamples ve

        INNER JOIN vocabulary v
            ON v.vocabularyid = ve.vocabularyid

        WHERE v.lessonid = $1

        ORDER BY ve.exampleid ASC
    `, [
        parsedLessonId
    ]);


    // -----------------------------------------------------
    // USER PROGRESS
    // -----------------------------------------------------

    const progressResult = await pool.query(`
        SELECT
            progressid AS "progressId",
            userid AS "userId",
            lessonid AS "lessonId",
            progresspercent AS "progressPercent",
            iscompleted AS "isCompleted",
            score,
            xpreceived AS "xpReceived",
            startedat AS "startedAt",
            completedat AS "completedAt",
            lastaccessedat AS "lastAccessedAt"

        FROM userlessonprogress

        WHERE userid = $1
          AND lessonid = $2

        LIMIT 1
    `, [
        parsedUserId,
        parsedLessonId
    ]);


    return {
        lesson: lessonResult.rows[0],
        vocabulary: vocabularyResult.rows,
        examples: examplesResult.rows,
        progress: progressResult.rows[0] || null
    };
}


// =========================================================
// GET GAMES
// =========================================================

async function getGames(languageId = null) {
    const pool = await getPool();


    if (
        languageId !== undefined &&
        languageId !== null &&
        languageId !== ''
    ) {
        const parsedLanguageId = validateId(
            languageId,
            'Language id'
        );

        const result = await pool.query(`
            SELECT
                g.gameid AS "gameId",
                g.languageid AS "languageId",
                g.gamename AS "gameName",
                g.description,
                g.gametype AS "gameType",
                g.difficulty,
                g.imageurl AS "imageUrl",
                g.xpreward AS "xpReward",
                g.coinreward AS "coinReward",
                g.isactive AS "isActive",

                l.languagecode AS "languageCode",
                l.languagename AS "languageName"

            FROM games g

            INNER JOIN languages l
                ON l.languageid = g.languageid

            WHERE g.languageid = $1
              AND g.isactive = TRUE

            ORDER BY g.gameid ASC
        `, [
            parsedLanguageId
        ]);

        return result.rows;
    }


    const result = await pool.query(`
        SELECT
            g.gameid AS "gameId",
            g.languageid AS "languageId",
            g.gamename AS "gameName",
            g.description,
            g.gametype AS "gameType",
            g.difficulty,
            g.imageurl AS "imageUrl",
            g.xpreward AS "xpReward",
            g.coinreward AS "coinReward",
            g.isactive AS "isActive",

            l.languagecode AS "languageCode",
            l.languagename AS "languageName"

        FROM games g

        INNER JOIN languages l
            ON l.languageid = g.languageid

        WHERE g.isactive = TRUE

        ORDER BY g.gameid ASC
    `);

    return result.rows;
}


// =========================================================
// GET GAME VOCABULARY
// =========================================================

async function getGameVocabulary(
    gameId,
    limit = 10
) {
    const pool = await getPool();

    const parsedGameId = validateId(
        gameId,
        'Game id'
    );

    let parsedLimit = Number(limit);

    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
        parsedLimit = 10;
    }

    // Giới hạn tối đa để tránh query quá lớn
    parsedLimit = Math.min(parsedLimit, 100);


    // -----------------------------------------------------
    // GAME
    // -----------------------------------------------------

    const gameResult = await pool.query(`
        SELECT
            g.gameid AS "gameId",
            g.gamename AS "gameName",
            g.gametype AS "gameType",
            g.languageid AS "languageId"

        FROM games g

        WHERE g.gameid = $1
          AND g.isactive = TRUE

        LIMIT 1
    `, [
        parsedGameId
    ]);


    if (gameResult.rows.length === 0) {
        return null;
    }


    // -----------------------------------------------------
    // VOCABULARY
    // -----------------------------------------------------

    const vocabularyResult = await pool.query(`
        SELECT
            v.vocabularyid AS "vocabularyId",
            v.word,
            v.pronunciation,
            v.meaning,
            v.partofspeech AS "partOfSpeech",
            v.audiourl AS "audioUrl",
            v.imageurl AS "imageUrl",
            v.difficulty

        FROM vocabulary v

        WHERE v.languageid = $1

        ORDER BY RANDOM()

        LIMIT $2::integer
    `, [
        gameResult.rows[0].languageId,
        parsedLimit
    ]);


    return {
        game: gameResult.rows[0],
        vocabulary: vocabularyResult.rows
    };
}


// =========================================================
// SAVE GAME SESSION
// =========================================================

async function saveGameSession(data = {}) {
    const pool = await getPool();

    const userId = validateId(
        data.userId ?? currentUserId(),
        'User id'
    );

    const gameId = validateId(
        data.gameId,
        'Game id'
    );

    const score = Math.trunc(
        safeNumber(data.score, 0)
    );

    const correctAnswers = Math.trunc(
        safeNumber(data.correctAnswers, 0)
    );

    const wrongAnswers = Math.trunc(
        safeNumber(data.wrongAnswers, 0)
    );

    const xpReceived = Math.trunc(
        safeNumber(data.xpReceived, 0)
    );

    const coinsReceived = Math.trunc(
        safeNumber(data.coinsReceived, 0)
    );

    const durationSeconds = Math.max(
        0,
        Math.trunc(
            safeNumber(data.durationSeconds, 0)
        )
    );

    const result = await pool.query(`
        INSERT INTO gamesessions
        (
            userid,
            gameid,
            score,
            correctanswers,
            wronganswers,
            xpreceived,
            coinsreceived,
            durationseconds,
            startedat,
            finishedat
        )
        VALUES
        (
            $1::integer,
            $2::integer,
            $3::integer,
            $4::integer,
            $5::integer,
            $6::integer,
            $7::integer,
            $8::integer,
            NOW() - ($8::integer * INTERVAL '1 second'),
            NOW()
        )
        RETURNING
            gamesessionid AS "gameSessionId",
            userid AS "userId",
            gameid AS "gameId",
            score,
            correctanswers AS "correctAnswers",
            wronganswers AS "wrongAnswers",
            xpreceived AS "xpReceived",
            coinsreceived AS "coinsReceived",
            durationseconds AS "durationSeconds",
            startedat AS "startedAt",
            finishedat AS "finishedAt"
    `, [
        userId,
        gameId,
        score,
        correctAnswers,
        wrongAnswers,
        xpReceived,
        coinsReceived,
        durationSeconds
    ]);

    return result.rows[0];
}


// =========================================================
// SAVE LESSON PROGRESS
// =========================================================

async function saveLessonProgress(data = {}) {
    const pool = await getPool();


    const userId = validateId(
        data.userId ?? currentUserId(),
        'User id'
    );

    const lessonId = validateId(
        data.lessonId,
        'Lesson id'
    );


    let progressPercent = safeNumber(
        data.progressPercent,
        0
    );

    // Không cho progress vượt quá 100
    progressPercent = Math.max(
        0,
        Math.min(
            100,
            progressPercent
        )
    );


    const isCompleted =
        data.isCompleted === true ||
        data.isCompleted === 'true';


    const score = safeNumber(
        data.score,
        0
    );

    const xpReceived = safeNumber(
        data.xpReceived,
        0
    );


    const result = await pool.query(`
        INSERT INTO userlessonprogress
        (
            userid,
            lessonid,
            progresspercent,
            iscompleted,
            score,
            xpreceived,
            startedat,
            completedat,
            lastaccessedat
        )

        VALUES
        (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            NOW(),
            CASE
                WHEN $4 = TRUE
                THEN NOW()
                ELSE NULL
            END,
            NOW()
        )

        ON CONFLICT (userid, lessonid)

        DO UPDATE SET
            progresspercent = EXCLUDED.progresspercent,
            iscompleted = EXCLUDED.iscompleted,
            score = EXCLUDED.score,
            xpreceived = EXCLUDED.xpreceived,

            completedat =
                CASE
                    WHEN EXCLUDED.iscompleted = TRUE
                    THEN NOW()
                    ELSE userlessonprogress.completedat
                END,

            lastaccessedat = NOW()

        RETURNING
            progressid AS "progressId",
            userid AS "userId",
            lessonid AS "lessonId",
            progresspercent AS "progressPercent",
            iscompleted AS "isCompleted",
            score,
            xpreceived AS "xpReceived",
            startedat AS "startedAt",
            completedat AS "completedAt",
            lastaccessedat AS "lastAccessedAt"
    `, [
        userId,
        lessonId,
        progressPercent,
        isCompleted,
        score,
        xpReceived
    ]);


    return result.rows[0];
}


// =========================================================
// GET LEADERBOARD
// =========================================================

async function getLeaderboard(
    periodType = 'Weekly'
) {
    const pool = await getPool();


    const normalizedPeriodType =
        String(periodType || 'Weekly').trim();


    const result = await pool.query(`
        SELECT
            lb.leaderboardid AS "leaderboardId",
            lb.userid AS "userId",

            u.username,
            u.fullname AS "fullName",
            u.avatarurl AS "avatarUrl",

            lb.periodtype AS "periodType",
            lb.periodstart AS "periodStart",
            lb.periodend AS "periodEnd",

            lb.xp,
            lb.rankposition AS "rankPosition"

        FROM leaderboard lb

        INNER JOIN users u
            ON u.userid = lb.userid

        WHERE lb.periodtype = $1

        ORDER BY
            lb.rankposition ASC NULLS LAST,
            lb.xp DESC
    `, [
        normalizedPeriodType
    ]);


    return result.rows;
}


// =========================================================
// GET DASHBOARD
// =========================================================

async function getDashboard(
    userId = currentUserId()
) {
    const pool = await getPool();

    const parsedUserId = validateId(
        userId,
        'User id'
    );


    // -----------------------------------------------------
    // USER
    // -----------------------------------------------------

    const userResult = await pool.query(`
        SELECT
            u.userid AS "userId",
            u.username,
            u.fullname AS "fullName",
            u.avatarurl AS "avatarUrl",

            u.xp,
            u.level,
            u.coins,
            u.hearts,
            u.maxhearts AS "maxHearts",
            u.ispremium AS "isPremium",

            COALESCE(
                ds.currentstreak,
                0
            ) AS "currentStreak",

            COALESCE(
                ds.longeststreak,
                0
            ) AS "longestStreak",

            COALESCE(
                ds.totalstudydays,
                0
            ) AS "totalStudyDays",

            COALESCE(
                (
                    SELECT SUM(ulp.xpreceived)

                    FROM userlessonprogress ulp

                    WHERE ulp.userid = $1
                ),
                0
            ) AS "lessonXp",

            COALESCE(
                (
                    SELECT COUNT(*)

                    FROM userlessonprogress ulp

                    WHERE ulp.userid = $1
                      AND ulp.iscompleted = TRUE
                ),
                0
            ) AS "completedLessons",

            COALESCE(
                (
                    SELECT COUNT(*)

                    FROM uservocabulary uv

                    WHERE uv.userid = $1
                      AND uv.islearned = TRUE
                ),
                0
            ) AS "learnedWords"

        FROM users u

        LEFT JOIN dailystreaks ds
            ON ds.userid = u.userid

        WHERE u.userid = $1
          AND u.isactive = TRUE

        LIMIT 1
    `, [
        parsedUserId
    ]);


    // -----------------------------------------------------
    // RECENT LESSONS
    // -----------------------------------------------------

    const lessonsResult = await pool.query(`
        SELECT
            l.lessonid AS "lessonId",
            l.lessonname AS "lessonName",
            l.description,
            l.difficulty,
            l.xpreward AS "xpReward",
            l.estimatedminutes AS "estimatedMinutes",

            c.courseid AS "courseId",
            c.coursename AS "courseName",

            lang.languagecode AS "languageCode",
            lang.languagename AS "languageName",

            COALESCE(
                ulp.progresspercent,
                0
            ) AS "progressPercent",

            COALESCE(
                ulp.iscompleted,
                FALSE
            ) AS "isCompleted"

        FROM lessons l

        INNER JOIN courses c
            ON c.courseid = l.courseid

        INNER JOIN languages lang
            ON lang.languageid = c.languageid

        LEFT JOIN userlessonprogress ulp
            ON ulp.lessonid = l.lessonid
           AND ulp.userid = $1

        WHERE l.ispublished = TRUE
          AND c.ispublished = TRUE

        ORDER BY
            COALESCE(
                ulp.lastaccessedat,
                l.createdat
            ) DESC,

            c.courseid ASC,
            l.lessonorder ASC

        LIMIT 5
    `, [
        parsedUserId
    ]);


    // -----------------------------------------------------
    // WEEKLY LEADERBOARD
    // -----------------------------------------------------

    const leaderboardResult = await pool.query(`
        SELECT
            lb.userid AS "userId",

            u.username,
            u.fullname AS "fullName",
            u.avatarurl AS "avatarUrl",

            lb.xp,
            lb.rankposition AS "rankPosition",
            lb.periodtype AS "periodType"

        FROM leaderboard lb

        INNER JOIN users u
            ON u.userid = lb.userid

        WHERE lb.periodtype = 'Weekly'

        ORDER BY
            lb.rankposition ASC NULLS LAST,
            lb.xp DESC

        LIMIT 5
    `);


    return {
        user: userResult.rows[0] || null,

        recentLessons:
            lessonsResult.rows,

        leaderboard:
            leaderboardResult.rows
    };
}


// =========================================================
// EXPORT
// =========================================================

module.exports = {
    getDashboard,
    getLanguages,
    getCourses,
    getCourseLessons,
    getLessonDetail,
    getGames,
    getGameVocabulary,
    saveGameSession,
    getLeaderboard,
    saveLessonProgress
};