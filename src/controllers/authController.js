const authService = require('../services/authService');

async function register(req, res, next) {
  try { res.status(201).json({ data: await authService.register(req.body) }); } catch (error) { next(error); }
}

async function login(req, res, next) {
  try { res.json({ data: await authService.login(req.body) }); } catch (error) { next(error); }
}

async function profile(req, res, next) {
  try { res.json({ data: await authService.getProfile(req.user.userId) }); } catch (error) { next(error); }
}

async function updateProfile(req, res, next) {
  try { res.json({ data: await authService.updateProfile(req.user.userId, req.body) }); } catch (error) { next(error); }
}

async function changePassword(req, res, next) {
  try { res.json({ data: await authService.changePassword(req.user.userId, req.body) }); } catch (error) { next(error); }
}

module.exports = { register, login, profile, updateProfile, changePassword };
