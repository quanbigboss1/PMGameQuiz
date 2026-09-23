const learningService = require('../services/learningService');

function userIdFrom(req) {
  return learningService.getUserId(
    req.user?.userId ||
    req.query.userId ||
    req.body?.userId
  );
}

function handle(serviceCall, statusCode = 200) {
  return async (req, res, next) => {
    try {
      const data = await serviceCall(req);

      res
        .status(statusCode)
        .json({ data });
    } catch (error) {
      next(error);
    }
  };
}

const getDashboard = handle((req) =>
  learningService.getDashboard(
    userIdFrom(req)
  )
);

const getLanguages = handle((req) =>
  learningService.getLanguages(
    userIdFrom(req)
  )
);

const getCourses = handle((req) =>
  learningService.getCourses(
    req.query.languageId,
    userIdFrom(req)
  )
);

const getCourseLessons = handle((req) =>
  learningService.getCourseLessons(
    req.params.id,
    userIdFrom(req)
  )
);

const getGames = handle((req) =>
  learningService.getGames(
    req.query.languageId,
    userIdFrom(req)
  )
);

const getGameVocabulary = handle((req) =>
  learningService.getGameVocabulary(
    req.params.id
  )
);

const saveGameSession = handle(
  (req) =>
    learningService.saveGameSession(
      req.params.id,
      req.body,
      userIdFrom(req)
    ),
  201
);

const getLeaderboard = handle((req) =>
  learningService.getLeaderboard(
    req.query.periodType
  )
);

const saveLessonProgress = handle((req) =>
  learningService.saveLessonProgress(
    req.params.id,
    req.body,
    userIdFrom(req)
  )
);

async function getLessonDetail(req, res, next) {
  try {
    const data = await learningService.getLessonDetail(
      req.params.id,
      userIdFrom(req)
    );

    if (!data || !data.lesson) {
      return res.status(404).json({
        message: 'Lesson not found.'
      });
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
}

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