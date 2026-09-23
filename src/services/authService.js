const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, isActive, ...safeUser } = user;
  return safeUser;
}

function validateCredentials(username, email, password) {
  if (!username || !/^[a-zA-Z0-9_]{3,50}$/.test(username)) throw Object.assign(new Error('Username must be 3-50 letters, numbers or underscores.'), { statusCode: 400 });
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw Object.assign(new Error('A valid email is required.'), { statusCode: 400 });
  if (!password || password.length < 6) throw Object.assign(new Error('Password must contain at least 6 characters.'), { statusCode: 400 });
}

function signToken(user) {
  return jwt.sign({ userId: user.userId, role: user.role, username: user.username }, process.env.JWT_SECRET || 'development-secret', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

async function register(payload) {
  const username = String(payload.username || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  validateCredentials(username, email, password);
  const existing = await userRepository.findByLogin(username);
  if (existing) throw Object.assign(new Error('Username or email is already registered.'), { statusCode: 409 });
  const user = await userRepository.createUser({ username, email, passwordHash: await bcrypt.hash(password, 12), fullName: payload.fullName?.trim(), country: payload.country?.trim() });
  return { user: publicUser(user), token: signToken(user) };
}

async function login(payload) {
  const login = String(payload.login || payload.username || payload.email || '').trim();
  const password = String(payload.password || '');
  if (!login || !password) throw Object.assign(new Error('Login and password are required.'), { statusCode: 400 });
  const user = await userRepository.findByLogin(login);
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) throw Object.assign(new Error('Invalid login or password.'), { statusCode: 401 });
  await userRepository.updateLastLogin(user.userId);
  return { user: publicUser(user), token: signToken(user) };
}

async function getProfile(userId) { return publicUser(await userRepository.findById(userId)); }
async function updateProfile(userId, payload) { return userRepository.updateProfile(userId, payload); }

async function changePassword(userId, payload) {
  const user = await userRepository.findAuthById(userId);
  if (!user || !(await bcrypt.compare(String(payload.currentPassword || ''), user.passwordHash))) throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 401 });
  if (!payload.newPassword || String(payload.newPassword).length < 6) throw Object.assign(new Error('New password must contain at least 6 characters.'), { statusCode: 400 });
  await userRepository.updatePassword(userId, await bcrypt.hash(String(payload.newPassword), 12));
  return { changed: true };
}

module.exports = { register, login, getProfile, updateProfile, changePassword, publicUser };
