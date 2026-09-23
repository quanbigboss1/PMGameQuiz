const rankService = require('../services/rankService');

function getUserId(req) {

    const userId =
        req.user?.userId ??
        req.user?.id ??
        req.auth?.userId ??
        req.auth?.id;

    const parsed =
        Number(userId);

    if (
        !Number.isInteger(parsed) ||
        parsed <= 0
    ) {

        const error =
            new Error(
                'Không xác định được user.'
            );

        error.statusCode = 401;

        throw error;
    }

    return parsed;
}

/*
|--------------------------------------------------------------------------
| HOME
|--------------------------------------------------------------------------
*/

async function home(req, res, next) {

    try {

        const userId =
            getUserId(req);

        const data =
            await rankService.getRankHome(
                userId
            );

        res.json({
            success: true,
            data
        });

    } catch (error) {

        next(error);

    }
}

/*
|--------------------------------------------------------------------------
| JOIN QUEUE
|--------------------------------------------------------------------------
*/

async function joinQueue(req, res, next) {

    try {

        const userId =
            getUserId(req);

        const data =
            await rankService.joinQueue(
                userId,
                req.body || {}
            );

        res.json({
            success: true,
            data
        });

    } catch (error) {

        next(error);

    }
}

/*
|--------------------------------------------------------------------------
| CANCEL QUEUE
|--------------------------------------------------------------------------
*/

async function cancelQueue(req, res, next) {

    try {

        const userId =
            getUserId(req);

        const data =
            await rankService.cancelQueue(
                userId
            );

        res.json({
            success: true,
            data
        });

    } catch (error) {

        next(error);

    }
}

/*
|--------------------------------------------------------------------------
| LEAVE RANKED
|--------------------------------------------------------------------------
*/

async function leaveRanked(req, res, next) {

    try {

        const userId =
            getUserId(req);

        const matchId =
            Number(req.body?.matchId);

        const data =
            await rankService.leaveRanked(
                userId,
                matchId
            );

        res.json({
            success: true,
            data
        });

    } catch (error) {

        next(error);

    }
}

/*
|--------------------------------------------------------------------------
| GET MATCH
|--------------------------------------------------------------------------
*/

async function getMatch(req, res, next) {

    try {

        const userId =
            getUserId(req);

        const matchId =
            Number(req.params.id);

        const data =
            await rankService.getMatch(
                userId,
                matchId
            );

        res.json({
            success: true,
            data
        });

    } catch (error) {

        next(error);

    }
}

/*
|--------------------------------------------------------------------------
| HEARTBEAT
|--------------------------------------------------------------------------

/*
|--------------------------------------------------------------------------
| ANSWER
|--------------------------------------------------------------------------
*/

async function answer(req, res, next) {

    try {

        const userId =
            getUserId(req);

        const matchId =
            Number(req.params.id);

        const data =
            await rankService.answerQuestion(
                userId,
                matchId,
                req.body || {}
            );

        res.json({
            success: true,
            data
        });

    } catch (error) {

        next(error);

    }
}

/*
|--------------------------------------------------------------------------
| FINISH
|--------------------------------------------------------------------------
*/

async function finish(req, res, next) {

    try {

        const userId =
            getUserId(req);

        const matchId =
            Number(req.params.id);

        const data =
            await rankService.finishMatch(
                userId,
                matchId
            );

        res.json({
            success: true,
            data
        });

    } catch (error) {

        next(error);

    }
}

/*
|--------------------------------------------------------------------------
| RESULT
|--------------------------------------------------------------------------
*/

async function result(req, res, next) {

    try {

        const userId =
            getUserId(req);

        const matchId =
            Number(req.params.id);

        const data =
            await rankService.getMatchResult(
                userId,
                matchId
            );

        res.json({
            success: true,
            data
        });

    } catch (error) {

        next(error);

    }
}

module.exports = {
    home,
    joinQueue,
    cancelQueue,
    leaveRanked,
    getMatch,
    answer,
    finish,
    result
};