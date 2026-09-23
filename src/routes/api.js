const express = require('express');

const controller =
    require('../controllers/learningController');

const authController =
    require('../controllers/authController');

const accountController =
    require('../controllers/accountController');

const rankController =
    require('../controllers/rankController');

const {
    optionalAuth,
    requireAuth
} = require('../middleware/auth');

const router = express.Router();


// =====================================================
// CONTROLLER VALIDATION
// =====================================================

const requiredControllers = {

    'authController.register':
        authController.register,

    'authController.login':
        authController.login,

    'authController.profile':
        authController.profile,

    'authController.updateProfile':
        authController.updateProfile,

    'authController.changePassword':
        authController.changePassword,


    'accountController.subscriptions':
        accountController.subscriptions,

    'accountController.notifications':
        accountController.notifications,

    'accountController.markNotificationRead':
        accountController.markNotificationRead,

    'accountController.vocabulary':
        accountController.vocabulary,

    'accountController.updateVocabulary':
        accountController.updateVocabulary,


    'rankController.home':
        rankController.home,

    'rankController.joinQueue':
        rankController.joinQueue,

    'rankController.cancelQueue':
        rankController.cancelQueue,

    'rankController.leaveRanked':
        rankController.leaveRanked,

    'rankController.getMatch':
        rankController.getMatch,

    'rankController.answer':
        rankController.answer,

    'rankController.finish':
        rankController.finish,

    'rankController.result':
        rankController.result,


    'controller.getDashboard':
        controller.getDashboard,

    'controller.getLanguages':
        controller.getLanguages,

    'controller.getCourses':
        controller.getCourses,

    'controller.getCourseLessons':
        controller.getCourseLessons,

    'controller.saveLessonProgress':
        controller.saveLessonProgress,


    'controller.getGames':
        controller.getGames,

    'controller.getGameVocabulary':
        controller.getGameVocabulary,

    'controller.saveGameSession':
        controller.saveGameSession,


    'controller.getLeaderboard':
        controller.getLeaderboard
};


for (
    const [name, handler]
    of Object.entries(requiredControllers)
) {

    if (
        typeof handler !== 'function'
    ) {

        throw new Error(
            `❌ Controller ${name} is not a function.`
        );

    }

}


console.log(
    '✅ All API controllers loaded successfully.'
);


// =====================================================
// HEALTH
// =====================================================

router.get(
    '/health',
    (req, res) => {

        return res.json({
            status: 'ok',
            service: 'lingua-quest-api'
        });

    }
);


// =====================================================
// AUTH
// =====================================================

router.post(
    '/auth/register',
    authController.register
);

router.post(
    '/auth/login',
    authController.login
);


// =====================================================
// OPTIONAL AUTH
// =====================================================

router.use(
    optionalAuth
);


// =====================================================
// AUTHENTICATED USER
// =====================================================

router.get(
    '/auth/me',
    requireAuth,
    authController.profile
);

router.patch(
    '/auth/me',
    requireAuth,
    authController.updateProfile
);

router.patch(
    '/auth/me/password',
    requireAuth,
    authController.changePassword
);


// =====================================================
// ACCOUNT
// =====================================================

router.get(
    '/account/subscriptions',
    requireAuth,
    accountController.subscriptions
);

router.get(
    '/account/notifications',
    requireAuth,
    accountController.notifications
);

router.patch(
    '/account/notifications/:id/read',
    requireAuth,
    accountController.markNotificationRead
);

router.get(
    '/account/vocabulary',
    requireAuth,
    accountController.vocabulary
);

router.patch(
    '/account/vocabulary/:id',
    requireAuth,
    accountController.updateVocabulary
);


// =====================================================
// LEARNING - DASHBOARD
// =====================================================

router.get(
    '/dashboard',
    requireAuth,
    controller.getDashboard
);


// =====================================================
// LEARNING - LANGUAGES
// =====================================================

router.get(
    '/languages',
    requireAuth,
    controller.getLanguages
);


// =====================================================
// LEARNING - COURSES
// =====================================================

router.get(
    '/courses',
    requireAuth,
    controller.getCourses
);


// =====================================================
// LEARNING - COURSE LESSONS
// =====================================================

router.get(
    '/courses/:id/lessons',
    requireAuth,
    controller.getCourseLessons
);


// =====================================================
// LEARNING - LESSON PROGRESS
// =====================================================

router.post(
    '/lessons/:id/progress',
    requireAuth,
    controller.saveLessonProgress
);


// =====================================================
// GAMES
// =====================================================

router.get(
    '/games',
    requireAuth,
    controller.getGames
);

router.get(
    '/games/:id/vocabulary',
    requireAuth,
    controller.getGameVocabulary
);

router.post(
    '/games/:id/sessions',
    requireAuth,
    controller.saveGameSession
);


// =====================================================
// LEADERBOARD
// =====================================================

router.get(
    '/leaderboard',
    requireAuth,
    controller.getLeaderboard
);


// =====================================================
// RANKED HOME
// =====================================================

router.get(
    '/ranked/home',
    requireAuth,
    rankController.home
);


// =====================================================
// RANKED QUEUE
// =====================================================

router.post(
    '/ranked/queue',
    requireAuth,
    rankController.joinQueue
);

router.delete(
    '/ranked/queue',
    requireAuth,
    rankController.cancelQueue
);


// =====================================================
// RANKED LEAVE
// =====================================================

router.post(
    '/ranked/leave',
    requireAuth,
    rankController.leaveRanked
);


// =====================================================
// RANKED MATCH
// =====================================================

router.get(
    '/ranked/matches/:id',
    requireAuth,
    rankController.getMatch
);


// =====================================================
// RANKED ANSWERS
// =====================================================

router.post(
    '/ranked/matches/:id/answers',
    requireAuth,
    rankController.answer
);


// =====================================================
// RANKED FINISH
// =====================================================

router.post(
    '/ranked/matches/:id/finish',
    requireAuth,
    rankController.finish
);


// =====================================================
// RANKED RESULT
// =====================================================

router.get(
    '/ranked/matches/:id/result',
    requireAuth,
    rankController.result
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;