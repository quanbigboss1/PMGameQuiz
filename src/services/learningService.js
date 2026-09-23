const learningRepository = require('../repositories/learningRepository');

function getUserId(value) {
    const userId = Number(value);

    if (!Number.isInteger(userId) || userId < 1) {
        const error = new Error('Invalid authenticated userId.');
        error.statusCode = 401;
        throw error;
    }

    return userId;
}
function getId(value, name) {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return id;
}

async function getDashboard(userId) {
  return learningRepository.getDashboard(
    getUserId(userId)
  );
}

async function getLanguages(userId) {
  return learningRepository.getLanguages(
    getUserId(userId)
  );
}

async function getCourses(languageId, userId) {
    let parsedLanguageId = null;

    if (
        languageId !== undefined &&
        languageId !== null &&
        languageId !== '' &&
        languageId !== 'undefined' &&
        languageId !== 'null'
    ) {
        parsedLanguageId = getId(
            languageId,
            'Language id'
        );
    }

    return learningRepository.getCourses(
        parsedLanguageId,
        getUserId(userId)
    );
}

async function getCourseLessons(courseId, userId) {
  return learningRepository.getCourseLessons(
    getId(courseId, 'Course id'),
    getUserId(userId)
  );
}

async function getLessonDetail(lessonId, userId) {
  return learningRepository.getLessonDetail(
    getId(lessonId, 'Lesson id'),
    getUserId(userId)
  );
}

async function getGames(languageId, userId) {
    let parsedLanguageId = null;

    if (
        languageId !== undefined &&
        languageId !== null &&
        languageId !== '' &&
        languageId !== 'undefined' &&
        languageId !== 'null'
    ) {
        parsedLanguageId = getId(
            languageId,
            'Language id'
        );
    }

    return learningRepository.getGames(
        parsedLanguageId,
        getUserId(userId)
    );
}

async function getGameVocabulary(gameId) {
  return learningRepository.getGameVocabulary(
    getId(gameId, 'Game id')
  );
}

/*
 * FIX:
 * Repository saveGameSession(data) nhận 1 object.
 */
async function saveGameSession(gameId, payload, userId) {
  const parsedGameId = getId(gameId, 'Game id');
  const parsedUserId = getUserId(userId);

  return learningRepository.saveGameSession({
    userId: parsedUserId,
    gameId: parsedGameId,
    ...(payload || {})
  });
}

async function getLeaderboard(periodType) {
  return learningRepository.getLeaderboard(
    periodType || 'Weekly'
  );
}

/*
 * FIX QUAN TRỌNG:
 * Repository saveLessonProgress(data) nhận 1 object.
 */
async function saveLessonProgress(lessonId, payload, userId) {
  const parsedLessonId = getId(
    lessonId,
    'Lesson id'
  );

  const parsedUserId = getUserId(userId);

  return learningRepository.saveLessonProgress({
    userId: parsedUserId,
    lessonId: parsedLessonId,
    ...(payload || {})
  });
}

module.exports = {
  getUserId,
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