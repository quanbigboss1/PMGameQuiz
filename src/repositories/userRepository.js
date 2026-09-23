const { getPool } = require('../config/database');

const publicUserColumns = `
  userid AS "userId",
  username AS "username",
  email AS "email",
  fullname AS "fullName",
  avatarurl AS "avatarUrl",
  dateofbirth AS "dateOfBirth",
  gender AS "gender",
  country AS "country",
  bio AS "bio",
  xp AS "xp",
  level AS "level",
  coins AS "coins",
  hearts AS "hearts",
  maxhearts AS "maxHearts",
  ispremium AS "isPremium",
  role AS "role",
  createdat AS "createdAt",
  lastloginat AS "lastLoginAt"
`;

/**
 * Tìm user bằng username hoặc email
 */
async function findByLogin(login) {
  const pool = await getPool();

  const result = await pool.query(
    `
      SELECT
        ${publicUserColumns},
        passwordhash AS "passwordHash",
        isactive AS "isActive"
      FROM users
      WHERE username = $1 OR email = $1
      LIMIT 1
    `,
    [login]
  );

  return result.rows[0] || null;
}

/**
 * Tìm user theo ID
 */
async function findById(userId) {
  const pool = await getPool();

  const result = await pool.query(
    `
      SELECT ${publicUserColumns}
      FROM users
      WHERE userid = $1
        AND isactive = TRUE
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Tìm user phục vụ authentication
 */
async function findAuthById(userId) {
  const pool = await getPool();

  const result = await pool.query(
    `
      SELECT
        ${publicUserColumns},
        passwordhash AS "passwordHash",
        isactive AS "isActive"
      FROM users
      WHERE userid = $1
        AND isactive = TRUE
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Tạo user mới
 */
async function createUser(user) {
  const pool = await getPool();

  const result = await pool.query(
    `
      INSERT INTO users
        (username, email, passwordhash, fullname, country)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING userid AS "userId"
    `,
    [
      user.username,
      user.email,
      user.passwordHash,
      user.fullName || user.username,
      user.country || null
    ]
  );

  return findById(result.rows[0].userId);
}

/**
 * Cập nhật thời gian đăng nhập
 */
async function updateLastLogin(userId) {
  const pool = await getPool();

  await pool.query(
    `
      UPDATE users
      SET lastloginat = NOW()
      WHERE userid = $1
    `,
    [userId]
  );
}

/**
 * Cập nhật profile
 */
async function updateProfile(userId, profile) {
  const pool = await getPool();

  await pool.query(
    `
      UPDATE users
      SET
        fullname = $1,
        avatarurl = $2,
        dateofbirth = $3,
        gender = $4,
        country = $5,
        bio = $6
      WHERE userid = $7
        AND isactive = TRUE
    `,
    [
      profile.fullName ?? null,
      profile.avatarUrl ?? null,
      profile.dateOfBirth || null,
      profile.gender ?? null,
      profile.country ?? null,
      profile.bio ?? null,
      userId
    ]
  );

  const result = await pool.query(
    `
      SELECT ${publicUserColumns}
      FROM users
      WHERE userid = $1
        AND isactive = TRUE
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Cập nhật password
 */
async function updatePassword(userId, passwordHash) {
  const pool = await getPool();

  await pool.query(
    `
      UPDATE users
      SET passwordhash = $1
      WHERE userid = $2
        AND isactive = TRUE
    `,
    [passwordHash, userId]
  );
}

/**
 * Lấy danh sách subscription
 */
async function getSubscriptions(userId) {
  const pool = await getPool();

  const result = await pool.query(
    `
      SELECT
        subscriptionid AS "subscriptionId",
        planname AS "planName",
        price AS "price",
        startdate AS "startDate",
        enddate AS "endDate",
        status AS "status",
        paymentmethod AS "paymentMethod",
        transactioncode AS "transactionCode",
        createdat AS "createdAt"
      FROM subscriptions
      WHERE userid = $1
      ORDER BY createdat DESC
    `,
    [userId]
  );

  return result.rows;
}

/**
 * Lấy notifications
 */
async function getNotifications(userId, unreadOnly = false) {
  const pool = await getPool();

  const query = `
    SELECT
      notificationid AS "notificationId",
      title AS "title",
      message AS "message",
      notificationtype AS "notificationType",
      isread AS "isRead",
      createdat AS "createdAt"
    FROM notifications
    WHERE userid = $1
    ${unreadOnly ? 'AND isread = FALSE' : ''}
    ORDER BY createdat DESC
  `;

  const result = await pool.query(query, [userId]);

  return result.rows;
}

/**
 * Đánh dấu notification đã đọc
 */
async function markNotificationRead(userId, notificationId) {
  const pool = await getPool();

  const result = await pool.query(
    `
      UPDATE notifications
      SET isread = TRUE
      WHERE notificationid = $1
        AND userid = $2
    `,
    [notificationId, userId]
  );

  return result.rowCount === 1;
}

/**
 * Lấy vocabulary của user
 */
async function getUserVocabulary(userId, onlyFavorites = false) {
  const pool = await getPool();

  const query = `
    SELECT
      uv.uservocabularyid AS "userVocabularyId",
      v.vocabularyid AS "vocabularyId",
      v.word AS "word",
      v.pronunciation AS "pronunciation",
      v.meaning AS "meaning",
      v.partofspeech AS "partOfSpeech",
      uv.masterylevel AS "masteryLevel",
      uv.isfavorite AS "isFavorite",
      uv.islearned AS "isLearned",
      uv.reviewcount AS "reviewCount",
      uv.correctcount AS "correctCount",
      uv.wrongcount AS "wrongCount",
      uv.lastreviewedat AS "lastReviewedAt",
      uv.nextreviewat AS "nextReviewAt",
      lang.languagename AS "languageName"
    FROM uservocabulary uv
    INNER JOIN vocabulary v
      ON v.vocabularyid = uv.vocabularyid
    INNER JOIN languages lang
      ON lang.languageid = v.languageid
    WHERE uv.userid = $1
    ${onlyFavorites ? 'AND uv.isfavorite = TRUE' : ''}
    ORDER BY
      COALESCE(uv.nextreviewat, NOW()),
      v.word
  `;

  const result = await pool.query(query, [userId]);

  return result.rows;
}

/**
 * Cập nhật vocabulary
 */
async function updateVocabulary(userId, vocabularyId, values) {
  const pool = await getPool();

  const result = await pool.query(
    `
      UPDATE uservocabulary
      SET
        isfavorite = COALESCE($1, isfavorite),
        islearned = COALESCE($2, islearned)
      WHERE userid = $3
        AND vocabularyid = $4
    `,
    [
      values.isFavorite ?? null,
      values.isLearned ?? null,
      userId,
      vocabularyId
    ]
  );

  return result.rowCount === 1;
}

module.exports = {
  findByLogin,
  findById,
  findAuthById,
  createUser,
  updateLastLogin,
  updateProfile,
  updatePassword,
  getSubscriptions,
  getNotifications,
  markNotificationRead,
  getUserVocabulary,
  updateVocabulary
};