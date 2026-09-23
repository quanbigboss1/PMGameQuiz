const userRepository = require('../repositories/userRepository');
const { getUserId } = require('./learningService');

function id(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw Object.assign(new Error(`${name} must be a positive integer.`), { statusCode: 400 });
  return parsed;
}

async function getSubscriptions(userId) { return userRepository.getSubscriptions(getUserId(userId)); }
async function getNotifications(userId, unreadOnly) { return userRepository.getNotifications(getUserId(userId), unreadOnly); }
async function markNotificationRead(userId, notificationId) { return userRepository.markNotificationRead(getUserId(userId), id(notificationId, 'Notification id')); }
async function getVocabulary(userId, favoritesOnly) { return userRepository.getUserVocabulary(getUserId(userId), favoritesOnly); }
async function updateVocabulary(userId, vocabularyId, payload) {
  if (payload.isFavorite === undefined && payload.isLearned === undefined) throw Object.assign(new Error('isFavorite or isLearned is required.'), { statusCode: 400 });
  return userRepository.updateVocabulary(getUserId(userId), id(vocabularyId, 'Vocabulary id'), payload);
}

module.exports = { getSubscriptions, getNotifications, markNotificationRead, getVocabulary, updateVocabulary };
