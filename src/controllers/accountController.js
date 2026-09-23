const accountService = require('../services/accountService');

async function subscriptions(req, res, next) {
  try { res.json({ data: await accountService.getSubscriptions(req.user.userId) }); } catch (error) { next(error); }
}

async function notifications(req, res, next) {
  try { res.json({ data: await accountService.getNotifications(req.user.userId, req.query.unreadOnly === 'true') }); } catch (error) { next(error); }
}

async function markNotificationRead(req, res, next) {
  try { res.json({ data: { updated: await accountService.markNotificationRead(req.user.userId, req.params.id) } }); } catch (error) { next(error); }
}

async function vocabulary(req, res, next) {
  try { res.json({ data: await accountService.getVocabulary(req.user.userId, req.query.favoritesOnly === 'true') }); } catch (error) { next(error); }
}

async function updateVocabulary(req, res, next) {
  try { res.json({ data: { updated: await accountService.updateVocabulary(req.user.userId, req.params.id, req.body) } }); } catch (error) { next(error); }
}

module.exports = { subscriptions, notifications, markNotificationRead, vocabulary, updateVocabulary };
