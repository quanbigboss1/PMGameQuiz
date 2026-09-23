const state = {
  userId: null,
  token: localStorage.getItem('linguaQuestToken'),
  dashboard: null,
  languages: [],
  courses: [],
  games: [],
  leaderboard: [],
  authMode: 'login',
  rankedMatchId: null,
  searchingRanked: false,
  rankedData: null
};

let rankedPolling = null;
let matchWaitPolling = null;
let queueTimer = null;
let rankedMatchStatusTimer = null;
let rankedMatchStatusChecking = false;
let rankedAutoFinishTimer = null;
let rankedCountdownInterval = null;
let rankedMatchWatcher = null;

const $ = (selector) => document.querySelector(selector);

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;'
  }[char]));

const formatNumber = (value) =>
  new Intl.NumberFormat('vi-VN').format(Number(value) || 0);

const formatDuration = (value) =>
  `${String(Math.floor((Number(value) || 0) / 60)).padStart(2, '0')}:${String((Number(value) || 0) % 60).padStart(2, '0')}`;

const initials = (name) =>
  String(name || 'LQ')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(-2)
    .toUpperCase();

const progressBar = (percent) =>
  `<div class="progress-track"><i style="width:${Math.max(
    0,
    Math.min(100, Number(percent) || 0)
  )}%"></i></div>`;


/* =========================================================
   API
========================================================= */

async function api(path, options = {}) {
    const headers = {
        ...(options.headers || {})
    };

    if (state.token) {
        headers.Authorization =
            `Bearer ${state.token}`;
    }

    const response = await fetch(
        path,
        {
            ...options,
            headers
        }
    );

    console.log('🌐 API DEBUG');
    console.log('URL:', path);
    console.log('HTTP STATUS:', response.status);
    console.log(
        'CONTENT-TYPE:',
        response.headers.get('content-type')
    );

    const rawText = await response.text();

    console.log('RAW RESPONSE:', rawText);

    let payload = null;

    try {
        payload = rawText
            ? JSON.parse(rawText)
            : null;
    } catch (error) {
        console.error(
            '❌ JSON PARSE ERROR:',
            error
        );

        throw new Error(
            `API không trả về JSON hợp lệ. HTTP ${response.status}`
        );
    }

    if (!response.ok) {
        throw new Error(
            payload?.message ||
            `API error ${response.status}`
        );
    }

    return payload?.data ?? payload;
}

async function authApi(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error('API xác thực không trả về JSON hợp lệ.');
  }

  if (!response.ok) {
    throw new Error(
      payload?.message || 'Không thể xác thực tài khoản.'
    );
  }

  return payload?.data;
}


/* =========================================================
   HELPERS
========================================================= */

function showAlert(message) {
  const alert = $('#app-alert');

  if (!alert) return;

  alert.textContent = message || 'Có lỗi xảy ra.';
  alert.classList.remove('hidden');

  setTimeout(() => {
    alert.classList.add('hidden');
  }, 3500);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}


/* =========================================================
   LOAD DATA
========================================================= */

async function loadData() {
  try {
    const [
      dashboard,
      languages,
      courses,
      games,
      leaderboard
    ] = await Promise.all([
      api('/api/dashboard'),
      api('/api/languages'),
      api('/api/courses'),
      api('/api/games'),
      api('/api/leaderboard')
    ]);

    state.dashboard = dashboard || {};

    state.languages = asArray(languages);
    state.courses = asArray(courses);
    state.games = asArray(games);
    state.leaderboard = asArray(leaderboard);

    updateProfile();
    renderDashboard();
    renderCourses();
    renderGames();
    renderLeaderboard();

  } catch (error) {
    console.error('loadData error:', error);

    showAlert(error.message);

    const dashboardView = $('#view-dashboard');

    if (dashboardView) {
      dashboardView.innerHTML = `
        <div class="empty-state">
          <h2>Không tải được dữ liệu</h2>
          <p>${escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }
}


/* =========================================================
   PROFILE
========================================================= */

function updateProfile() {
  const user = state.dashboard?.user || {};

  $('#user-name')?.replaceChildren(
    document.createTextNode(
      user.fullName || user.username || 'Learner'
    )
  );

  if ($('#user-level')) {
    $('#user-level').textContent =
      `Level ${user.level || 1} · ${formatNumber(user.xp)} XP`;
  }

  if ($('#user-avatar')) {
    $('#user-avatar').textContent =
      initials(user.fullName || user.username);
  }

  if ($('#dropdown-avatar')) {
    $('#dropdown-avatar').textContent =
      initials(user.fullName || user.username);
  }

  if ($('#dropdown-name')) {
    $('#dropdown-name').textContent =
      user.fullName || user.username || 'Learner';
  }

  if ($('#dropdown-email')) {
    $('#dropdown-email').textContent =
      user.email || '';
  }

  if ($('#side-streak')) {
    $('#side-streak').textContent =
      `${user.currentStreak || 0} ngày`;
  }
}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {
  const user = state.dashboard?.user || {};

  const lessons = asArray(
    state.dashboard?.recentLessons
  );

  const view = $('#view-dashboard');

  if (!view) return;

  view.innerHTML = `
    <section class="hero">
      <div>
        <p class="eyebrow">
          XIN CHÀO,
          ${escapeHtml(
            (user.fullName ||
              user.username ||
              'LEARNER')
              .split(' ')
              .pop()
              .toUpperCase()
          )}
        </p>

        <h2>
          Học một chút,<br />
          <em>tiến bộ mỗi ngày.</em>
        </h2>

        <p class="hero-copy">
          Theo dõi khóa học, ôn từ vựng và chơi game
          ngay trong một không gian học tập.
        </p>

        <button class="primary-btn" data-view="courses">
          Tiếp tục học <span>→</span>
        </button>
      </div>

      <div class="hero-illustration">
        <div class="hero-circle">
          A<span>あ</span>
        </div>
        <b>
          learn<br />
          more
        </b>
        <i>✦</i>
        <small>XP +</small>
      </div>
    </section>

    <section class="stats-row">

      <div class="stat-item">
        <div class="stat-icon orange">✹</div>
        <div>
          <strong>${formatNumber(user.xp)}</strong>
          <span>Tổng XP</span>
        </div>
      </div>

      <div class="stat-item">
        <div class="stat-icon yellow">⌁</div>
        <div>
          <strong>${user.currentStreak || 0} ngày</strong>
          <span>Chuỗi học hiện tại</span>
        </div>
      </div>

      <div class="stat-item">
        <div class="stat-icon green">✓</div>
        <div>
          <strong>${user.learnedWords || 0}</strong>
          <span>Từ đã học</span>
        </div>
      </div>

      <div class="stat-item level-stat">
        <span>Level ${user.level || 1}</span>

        <strong>
          ${
            user.isPremium
              ? 'Premium learner'
              : 'Active learner'
          }
        </strong>

        ${progressBar(
          (Number(user.xp) % 1000) / 10
        )}

        <small>
          ${user.completedLessons || 0}
          bài đã hoàn thành
        </small>
      </div>

    </section>

    <div class="section-heading">
      <div>
        <p class="eyebrow">TIẾP TỤC HỌC</p>
        <h2>Lộ trình gần đây</h2>
      </div>

      <button class="text-btn" data-view="courses">
        Xem khóa học <span>→</span>
      </button>
    </div>

    <section class="lesson-grid">
      ${
        lessons.length
          ? lessons.map(renderLessonCard).join('')
          : '<div class="empty-state">Chưa có tiến độ bài học.</div>'
      }
    </section>
  `;

  bindViewButtons();
  bindLessonButtons();
}


/* =========================================================
   LESSON CARD
========================================================= */

function renderLessonCard(lesson = {}) {
  return `
    <article
      class="lesson-card"
      data-lesson-id="${lesson.lessonId || ''}"
    >
      <div class="lesson-icon">
        ${escapeHtml(lesson.languageCode || 'LQ')}
      </div>

      <div class="lesson-body">

        <div class="card-topline">
          <span class="level-pill">
            ${escapeHtml(
              lesson.difficulty || 'Beginner'
            )}
          </span>

          <span>
            ${lesson.estimatedMinutes || 0} phút
          </span>
        </div>

        <h3>
          ${escapeHtml(
            lesson.lessonName || 'Bài học'
          )}
        </h3>

        <p>
          ${escapeHtml(
            lesson.courseName || ''
          )}
          ·
          ${escapeHtml(
            lesson.languageName || ''
          )}
        </p>

        ${progressBar(lesson.progressPercent)}

      </div>

      <div class="lesson-arrow">
        →
      </div>
    </article>
  `;
}


/* =========================================================
   COURSES
========================================================= */

function renderCourses() {
  const languages = asArray(state.languages);
  const courses = asArray(state.courses);

  const view = $('#view-courses');

  if (!view) return;

  view.innerHTML = `
    <div class="section-heading">

      <div>
        <p class="eyebrow">
          DATABASE COURSES
        </p>

        <h2>
          Khóa học của bạn
        </h2>

        <p class="section-subtitle">
          ${courses.length}
          khóa học đang được xuất bản từ PostgreSQL.
        </p>
      </div>

      <select
        class="filter-select"
        id="language-filter"
      >
        <option value="">
          Tất cả ngôn ngữ
        </option>

        ${
          languages.map((language) => `
            <option value="${language.languageId}">
              ${escapeHtml(
                language.languageName || ''
              )}
            </option>
          `).join('')
        }
      </select>

    </div>

    <div class="course-grid">

      ${
        courses.length
          ? courses.map((course) => `
              <article
                class="course-card"
                data-course-id="${course.courseId}"
              >

                <div class="course-icon">
                  ${escapeHtml(
                    course.languageCode || 'LQ'
                  )}
                </div>

                <div class="course-content">

                  <span class="level-pill">
                    ${escapeHtml(
                      course.difficulty || 'General'
                    )}
                  </span>

                  <h3>
                    ${escapeHtml(
                      course.courseName || ''
                    )}
                  </h3>

                  <p>
                    ${escapeHtml(
                      course.description ||
                      'Lộ trình học ngoại ngữ thực tế.'
                    )}
                  </p>

                  <div class="course-meta">
                    <span>
                      ${course.lessonCount || 0}
                      bài học
                    </span>

                    <span>
                      ${formatNumber(
                        course.totalXp
                      )}
                      XP
                    </span>
                  </div>

                  ${progressBar(
                    course.lessonCount
                      ? (
                          Number(course.completedLessons || 0) /
                          Number(course.lessonCount)
                        ) * 100
                      : 0
                  )}

                </div>

                <span class="card-arrow">
                  ↗
                </span>

              </article>
            `).join('')
          : `
            <div class="empty-state">
              Chưa có khóa học.
            </div>
          `
      }

    </div>
  `;

  const filter = $('#language-filter');

  filter?.addEventListener(
    'change',
    async (event) => {
      try {
        state.courses = asArray(
          await api(
            event.target.value
              ? `/api/courses?languageId=${event.target.value}`
              : '/api/courses'
          )
        );

        renderCourses();

      } catch (error) {
        showAlert(error.message);
      }
    }
  );

  document
    .querySelectorAll('.course-card')
    .forEach((card) => {
      card.addEventListener(
        'click',
        () => showCourseLessons(
          Number(card.dataset.courseId)
        )
      );
    });
}


/* =========================================================
   COURSE LESSONS
========================================================= */

async function showCourseLessons(courseId) {
  try {
    const data = await api(
      `/api/courses/${courseId}/lessons`
    );

    const lessons = asArray(data);

    const course = state.courses.find(
      (item) =>
        Number(item.courseId) === Number(courseId)
    );

    $('#lesson-modal-content').innerHTML = `
      <p class="eyebrow">
        ${escapeHtml(
          course?.languageName || 'COURSE'
        )}
      </p>

      <h2 id="lesson-modal-title">
        ${escapeHtml(
          course?.courseName || 'Bài học'
        )}
      </h2>

      <div class="modal-list">

        ${
          lessons.length
            ? lessons.map(renderLessonCard).join('')
            : '<p class="muted">Khóa học chưa có bài học.</p>'
        }

      </div>
    `;

    openModal();
    bindLessonButtons();

  } catch (error) {
    showAlert(error.message);
  }
}


/* =========================================================
   LESSON DETAIL
========================================================= */

async function openLesson(lessonId) {
  try {
    const data = await api(
      `/api/lessons/${lessonId}`
    );

    const lesson = data?.lesson || {};

    const vocabulary = asArray(
      data?.vocabulary
    );

    const quizzes = asArray(
      data?.quizzes
    );

    $('#lesson-modal-content').innerHTML = `
      <p class="eyebrow">
        ${escapeHtml(
          lesson.languageName || ''
        )}
        ·
        ${escapeHtml(
          lesson.difficulty || 'Beginner'
        )}
      </p>

      <h2 id="lesson-modal-title">
        ${escapeHtml(
          lesson.lessonName || 'Bài học'
        )}
      </h2>

      <p class="modal-description">
        ${escapeHtml(
          lesson.description ||
          'Bắt đầu bài học và ghi lại tiến độ của bạn.'
        )}
      </p>

      <div class="lesson-summary">
        <span>
          ${lesson.estimatedMinutes || 0} phút
        </span>

        <span>
          +${lesson.xpReward || 0} XP
        </span>

        <span>
          ${vocabulary.length} từ mới
        </span>
      </div>

      <h3>
        Từ vựng trong bài
      </h3>

      <div class="vocab-list">

        ${
          vocabulary.length
            ? vocabulary.map((word) => `
                <div class="vocab-row">
                  <strong>
                    ${escapeHtml(
                      word.word || ''
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      word.pronunciation || ''
                    )}
                  </span>

                  <b>
                    ${escapeHtml(
                      word.meaning || ''
                    )}
                  </b>
                </div>
              `).join('')
            : '<p class="muted">Chưa có từ vựng.</p>'
        }

      </div>

      <h3>
        Quiz
      </h3>

      ${
        quizzes.length
          ? quizzes.map(renderQuiz).join('')
          : '<p class="muted">Chưa có quiz cho bài này.</p>'
      }

      <button
        class="primary-btn complete-lesson"
        data-lesson-id="${lesson.lessonId || lessonId}"
      >
        Đánh dấu hoàn thành
        <span>✓</span>
      </button>
    `;

    openModal();

    $('.complete-lesson')?.addEventListener(
      'click',
      () => completeLesson(lesson)
    );

  } catch (error) {
    console.error('openLesson error:', error);
    showAlert(error.message);
  }
}


/* =========================================================
   QUIZ
========================================================= */

function renderQuiz(quiz = {}) {
  const questions = asArray(
    quiz.questions
  );

  return `
    <div class="quiz-box">

      <div>
        <strong>
          ${escapeHtml(
            quiz.quizName || 'Quiz'
          )}
        </strong>

        <span>
          +${quiz.xpReward || 0} XP ·
          đạt ${quiz.passingScore || 0}%
        </span>
      </div>

      ${
        questions.map((question) => {

          const answers = asArray(
            question?.answers
          );

          return `
            <div class="question">

              <p>
                ${escapeHtml(
                  question?.questionText || ''
                )}
              </p>

              <div class="answers">

                ${
                  answers.length
                    ? answers.map((answer) => `
                        <button
                          class="answer"
                          data-answer-id="${answer.answerId}"
                        >
                          ${escapeHtml(
                            answer.answerText || ''
                          )}
                        </button>
                      `).join('')
                    : '<span class="muted">Chưa có đáp án.</span>'
                }

              </div>

            </div>
          `;
        }).join('')
      }

    </div>
  `;
}


/* =========================================================
   COMPLETE LESSON
========================================================= */

async function completeLesson(lesson) {
  try {
    await api(
      `/api/lessons/${lesson.lessonId}/progress`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          progressPercent: 100,
          isCompleted: true,
          score: 100,
          xpReceived: lesson.xpReward || 0
        })
      }
    );

    closeModal();

    await loadData();

    showAlert(
      'Đã lưu tiến độ bài học vào PostgreSQL.'
    );

  } catch (error) {
    showAlert(error.message);
  }
}


/* =========================================================
   GAMES
========================================================= */

function renderGames() {
  const games = asArray(
    state.games
  );

  const view = $('#view-games');

  if (!view) return;

  view.innerHTML = `
    <div class="section-heading">

      <div>
        <p class="eyebrow">
          PLAY TO REMEMBER
        </p>

        <h2>
          Trò chơi ngôn ngữ
        </h2>

        <p class="section-subtitle">
          Game được lấy từ bảng Games,
          điểm tốt nhất lấy từ GameSessions.
        </p>
      </div>

    </div>

    <div class="game-grid">

      ${
        games.length
          ? games.map((game) => `
              <article class="game-card">

                <div class="game-art">
                  ${escapeHtml(
                    game.gameType || 'PLAY'
                  )}
                </div>

                <div>

                  <span class="level-pill">
                    ${escapeHtml(
                      game.difficulty ||
                      'All levels'
                    )}
                  </span>

                  <h3>
                    ${escapeHtml(
                      game.gameName || 'Game'
                    )}
                  </h3>

                  <p>
                    ${escapeHtml(
                      game.description ||
                      'Luyện tập từ vựng theo cách vui hơn.'
                    )}
                  </p>

                  <div class="game-meta">

                    <span>
                      Best
                      ${formatNumber(
                        game.bestScore
                      )}
                    </span>

                    <span>
                      ${game.playedCount || 0}
                      lượt chơi
                    </span>

                  </div>

                </div>

                <button
                  class="secondary-btn"
                  data-game-id="${game.gameId}"
                >
                  Bắt đầu
                  <span>↗</span>
                </button>

              </article>
            `).join('')
          : `
            <div class="empty-state">
              Chưa có game.
            </div>
          `
      }

    </div>
  `;

  document
    .querySelectorAll('[data-game-id]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => startGame(
          Number(button.dataset.gameId)
        )
      );
    });
}


/* =========================================================
   START GAME
========================================================= */

async function startGame(gameId) {
  try {
    const game = state.games.find(
      (item) =>
        Number(item.gameId) === Number(gameId)
    );

    const data = await api(
      `/api/games/${gameId}/vocabulary`
    );

    const gameData =
      data?.game ||
      game ||
      null;

    const words = Array.isArray(
      data?.vocabulary
    )
      ? data.vocabulary
      : [];

    console.log(
      'Game API data:',
      data
    );

    console.log(
      'Game words:',
      words
    );

    if (!gameData) {
      throw new Error(
        'Không tìm thấy thông tin game.'
      );
    }

    $('#lesson-modal-content').innerHTML = `
      <p class="eyebrow">
        ${escapeHtml(
          gameData.languageName ||
          'VOCABULARY GAME'
        )}
      </p>

      <h2 id="lesson-modal-title">
        ${escapeHtml(
          gameData.gameName ||
          'Word match'
        )}
      </h2>

      <p class="modal-description">
        Lật thẻ, ghi nhớ từ và hoàn thành lượt chơi.
        Kết quả sẽ được lưu vào GameSessions.
      </p>

      <div class="flashcard-grid">

        ${
          words.length > 0
            ? words.map((word) => `
                <article class="flashcard">

                  <strong>
                    ${escapeHtml(
                      word.word || ''
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      word.pronunciation || ''
                    )}
                  </span>

                  <b>
                    ${escapeHtml(
                      word.meaning || ''
                    )}
                  </b>

                </article>
              `).join('')
            : `
              <p class="muted">
                Chưa có từ vựng cho game này.
              </p>
            `
        }

      </div>

      <button
        class="primary-btn complete-game"
        data-game-id="${gameId}"
        data-word-count="${words.length}"
      >
        Hoàn thành lượt chơi
        <span>✓</span>
      </button>
    `;

    openModal();

    $('.complete-game')?.addEventListener(
      'click',
      () => finishGame(
        gameId,
        words.length
      )
    );

  } catch (error) {
    console.error(
      'startGame error:',
      error
    );

    showAlert(error.message);
  }
}


/* =========================================================
   FINISH GAME
========================================================= */

async function finishGame(
  gameId,
  wordCount
) {
  try {
    await api(
      `/api/games/${gameId}/sessions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          score: wordCount * 10,
          correctAnswers: wordCount,
          xpReceived: wordCount * 5,
          coinsReceived: wordCount,
          durationSeconds: 60
        })
      }
    );

    closeModal();

    await loadData();

    showAlert(
      'Đã lưu kết quả game vào PostgreSQL.'
    );

  } catch (error) {
    showAlert(error.message);
  }
}


/* =========================================================
   LEADERBOARD
========================================================= */

function renderLeaderboard() {
  const leaderboard = asArray(
    state.leaderboard
  );

  const view = $('#view-leaderboard');

  if (!view) return;

  view.innerHTML = `
    <div class="section-heading">

      <div>
        <p class="eyebrow">
          WEEKLY RANKING
        </p>

        <h2>
          Bảng xếp hạng tuần
        </h2>

        <p class="section-subtitle">
          Xếp hạng được quản lý trong bảng Leaderboard.
        </p>
      </div>

      <span class="mission-badge">
        ${leaderboard.length}
        learners
      </span>

    </div>

    <div class="leaderboard-table">

      <div class="table-head">
        <span>Hạng</span>
        <span>Người học</span>
        <span>XP</span>
      </div>

      ${
        leaderboard.length
          ? leaderboard.map((row, index) => `
              <div class="table-row">

                <strong>
                  ${row.rankPosition || index + 1}
                </strong>

                <div class="table-user">

                  <span class="small-avatar">
                    ${initials(
                      row.fullName ||
                      row.username
                    )}
                  </span>

                  <span>
                    ${escapeHtml(
                      row.fullName ||
                      row.username ||
                      'Learner'
                    )}
                  </span>

                </div>

                <b>
                  ${formatNumber(row.xp)}
                  XP
                </b>

              </div>
            `).join('')
          : `
            <div class="empty-state">
              Chưa có dữ liệu bảng xếp hạng tuần.
            </div>
          `
      }

    </div>
  `;
}


/* =========================================================
   RANKED
========================================================= */

async function loadRanked() {
  try {
    const ranked = await api(
      '/api/ranked/home'
    );

    /*
     * Lưu dữ liệu Ranked
     */
    state.rankedData =
      ranked || {};

    /*
     * Render giao diện
     */
    renderRanked(
      state.rankedData
    );

    /*
     * Danh sách trận gần đây
     */
    const recentMatches =
      asArray(
        ranked?.recentMatches
      );

    /*
     * Tìm trận đang InProgress
     *
     * Chỉ kiểm tra khi frontend
     * đang trong trạng thái tìm trận.
     */
    const activeMatch =
      state.searchingRanked
        ? recentMatches.find(
            (match) =>
              (
                match.matchStatus ??
                match.matchstatus
              ) === 'InProgress'
          )
        : null;

    /*
     * Nếu tìm thấy trận mới
     */
    if (
      !ranked?.queue &&
      activeMatch &&
      state.rankedMatchId !==
        (
          activeMatch.matchId ??
          activeMatch.matchid
        )
    ) {

      state.rankedMatchId =
        activeMatch.matchId ??
        activeMatch.matchid;

      await showMatchFound(
        state.rankedMatchId
      );
    }

  } catch (error) {

    console.error(
      'loadRanked error:',
      error
    );

    const view =
      $('#view-ranked');

    if (view) {

      view.innerHTML = `
        <div class="empty-state">

          <h2>
            Ranked chưa sẵn sàng
          </h2>

          <p>
            ${escapeHtml(
              error.message ||
              'Không thể tải Ranked.'
            )}
          </p>

        </div>
      `;

    }
  }
}


function renderRanked(data = {}) {
  const view = $('#view-ranked');

  if (!view) {
    return;
  }

  if (!data.season) {
    view.innerHTML = `
      <div class="empty-state">
        <h2>
          Chưa có mùa giải active
        </h2>

        <p>
          Admin cần mở một RankSeason
          trước khi người chơi vào ranked.
        </p>
      </div>
    `;

    return;
  }

  /*
   * ============================================================
   * RANK DATA
   * ============================================================
   *
   * Repository của bạn có thể trả:
   *
   * data.playerRank
   * hoặc
   * data.rank
   *
   * nên hỗ trợ cả hai.
   */

  const rank =
    data.playerRank ||
    data.rank ||
    {};

  const tiers =
    Array.isArray(data.tiers)
      ? data.tiers
      : [];

  const recentMatches =
    Array.isArray(data.recentMatches)
      ? data.recentMatches
      : [];

  const queue =
    data.queue || null;

  /*
   * ============================================================
   * NORMALIZE RANK
   * ============================================================
   */

  const rankTierId = Number(
    rank.rankTierId ??
    rank.ranktierid ??
    0
  );

  const rankName =
    rank.rankName ??
    rank.rankname ??
    'Bronze';

  const rating = Number(
    rank.rating ??
    1000
  );

  const rankPoint = Number(
    rank.rankPoint ??
    rank.rankpoint ??
    0
  );

  const wins = Number(
    rank.wins ??
    0
  );

  const losses = Number(
    rank.losses ??
    0
  );

  const totalMatches = Number(
    rank.totalMatches ??
    rank.totalmatches ??
    0
  );

  /*
   * ============================================================
   * SEASON
   * ============================================================
   */

  const seasonName =
    data.season.seasonName ??
    data.season.seasonname ??
    'Ranked Season';

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  view.innerHTML = `

    <!-- ====================================================== -->
    <!-- RANKED HEADER                                          -->
    <!-- ====================================================== -->

    <div class="ranked-heading">

      <div>

        <p class="eyebrow">
          SEASON RANKED
        </p>

        <h2>
          ${escapeHtml(seasonName)}
        </h2>

        <p class="section-subtitle">
          Ghép 1v1 theo ngôn ngữ và rating gần nhau.
          Mỗi trận thắng cộng rating.
        </p>

      </div>

      <span class="mission-badge">
        ${escapeHtml(rankName)}
      </span>

    </div>


    <!-- ====================================================== -->
    <!-- RANK + QUEUE                                           -->
    <!-- ====================================================== -->

    <section class="ranked-layout">


      <!-- ==================================================== -->
      <!-- CURRENT RANK                                         -->
      <!-- ==================================================== -->

      <div class="rank-card">

        <div class="rank-emblem">

          ${escapeHtml(
            rankName
              .slice(0, 2)
              .toUpperCase()
          )}

        </div>


        <div>

          <span class="eyebrow">
            CURRENT RANK
          </span>

          <h3>
            ${escapeHtml(rankName)}
          </h3>

          <strong>
            ${rating} rating
          </strong>

          <p>
            ${wins} thắng ·
            ${losses} thua ·
            ${totalMatches} trận
          </p>

        </div>


        <!-- Rank progress -->

        ${progressBar(rankPoint)}


      </div>


      <!-- ==================================================== -->
      <!-- QUEUE                                                -->
      <!-- ==================================================== -->

      <div class="queue-card">

        <div class="section-heading">

          <div>

            <p class="eyebrow">
              FIND A MATCH
            </p>

            <h3>
              Đấu solo lên rank
            </h3>

          </div>


          <span
            class="queue-status ${
              queue
                ? 'is-waiting'
                : ''
            }"
          >

            ${
              queue
                ? 'Đang tìm...'
                : 'Sẵn sàng'
            }

          </span>

        </div>


        <!-- Language -->

        <label
          class="rank-label"
          for="rank-language"
        >
          Ngôn ngữ thi đấu
        </label>


        <select
          id="rank-language"
          class="filter-select"
        >

          <option value="">
            -- Chọn ngôn ngữ --
          </option>


          ${
            asArray(state.languages)
              .filter((language) => {

                const languageId =
                  Number(
                    language.languageId ??
                    language.languageid ??
                    language.id
                  );

                const courseCount =
                  Number(
                    language.courseCount ??
                    language.coursecount ??
                    0
                  );

                return (
                  Number.isInteger(
                    languageId
                  ) &&
                  languageId > 0 &&
                  courseCount > 0
                );
              })
              .map((language) => {

                const languageId =
                  Number(
                    language.languageId ??
                    language.languageid ??
                    language.id
                  );

                const languageName =
                  language.languageName ??
                  language.languagename ??
                  language.name ??
                  '';

                return `
                  <option
                    value="${languageId}"
                  >
                    ${escapeHtml(
                      languageName
                    )}
                  </option>
                `;
              })
              .join('')
          }

        </select>


        <p class="queue-help">

          Rating hiện tại:
          <strong>${rating}</strong>.

          Đối thủ được tìm trong khoảng
          ±100 rating.

        </p>


        <!-- Queue button -->

        <button
          class="primary-btn rank-queue-btn"
          ${queue ? 'disabled' : ''}
        >

          ${
            queue
              ? 'Đang tìm đối thủ...'
              : 'Tìm trận ngay'
          }

          <span>
            ⚔
          </span>

        </button>


        ${
          queue
            ? `
              <button
                class="text-btn cancel-queue-btn"
              >
                Hủy tìm trận
              </button>
            `
            : ''
        }

      </div>

    </section>


    <!-- ====================================================== -->
    <!-- RANK TIERS                                             -->
    <!-- ====================================================== -->

    <div class="section-heading rank-tier-heading">

      <div>

        <p class="eyebrow">
          RANK TIERS
        </p>

        <h2>
          Thang xếp hạng
        </h2>

      </div>

    </div>


    <div class="tier-row">

      ${
  `
    <div class="tier-row">

      <div class="tier-chip ${rankTierId === 1 ? 'current' : ''}">
        <strong>Bronze</strong>
        <span>0 - 1199</span>
      </div>

      <div class="tier-chip ${rankTierId === 2 ? 'current' : ''}">
        <strong>Silver</strong>
        <span>1200 - 1499</span>
      </div>

      <div class="tier-chip ${rankTierId === 3 ? 'current' : ''}">
        <strong>Gold</strong>
        <span>1500 - 1799</span>
      </div>

      <div class="tier-chip ${rankTierId === 4 ? 'current' : ''}">
        <strong>Platinum</strong>
        <span>1800 - 2149</span>
      </div>

      <div class="tier-chip ${rankTierId === 5 ? 'current' : ''}">
        <strong>Diamond</strong>
        <span>2150+</span>
      </div>

    </div>
  `
}

    </div>


    <!-- ====================================================== -->
    <!-- RANK HISTORY                                           -->
    <!-- ====================================================== -->

    <div class="section-heading rank-history-heading">

      <div>

        <p class="eyebrow">
          MATCH HISTORY
        </p>

        <h2>
          Trận gần đây
        </h2>

      </div>

    </div>


    <div class="rank-match-list">

      ${
        recentMatches.length

          ? recentMatches.map((match) => {

              const matchId =
                match.matchId ??
                match.matchid ??
                '';

              const opponentUsername =
                match.opponentUsername ??
                match.opponentusername ??
                'opponent';

              const matchStatus =
                match.matchStatus ??
                match.matchstatus ??
                '';

              const ratingChange =
                Number(
                  match.ratingChange ??
                  match.ratingchange ??
                  0
                );

              return `

                <div
                  class="rank-match-row"
                >

                  <strong>
                    #${matchId}
                  </strong>


                  <span>

                    vs

                    ${escapeHtml(
                      opponentUsername
                    )}

                  </span>


                  <span>
                    ${escapeHtml(
                      matchStatus
                    )}
                  </span>


                  <b>

                    ${
                      ratingChange > 0
                        ? '+'
                        : ''
                    }

                    ${ratingChange}

                    rating

                  </b>

                </div>

              `;

            }).join('')

          : `

            <div class="empty-state">

              Chưa có trận ranked nào.

            </div>

          `
      }

    </div>

  `;


  /*
   * ============================================================
   * QUEUE TIMER
   * ============================================================
   */

  if (queue) {

    document
      .querySelector('.queue-status')
      ?.insertAdjacentHTML(
        'afterend',
        `
          <strong
            class="queue-timer"
            id="queue-timer"
          >
            00:00
          </strong>
        `
      );

  }


  /*
   * ============================================================
   * EVENTS
   * ============================================================
   */

  $('.rank-queue-btn')
    ?.addEventListener(
      'click',
      joinRankedQueue
    );


  $('.cancel-queue-btn')
    ?.addEventListener(
      'click',
      cancelRankedQueue
    );


  /*
   * ============================================================
   * RANKED POLLING
   * ============================================================
   */

  if (
    queue &&
    !rankedPolling
  ) {

    rankedPolling =
      setInterval(
        loadRanked,
        3000
      );

  }


  /*
   * ============================================================
   * QUEUE TIMER
   * ============================================================
   */

  if (queue) {

    if (queueTimer) {

      clearInterval(
        queueTimer
      );

    }


    updateQueueTimer(
      queue.joinedAt ??
      queue.joinedat
    );


    queueTimer =
      setInterval(
        () => {

          updateQueueTimer(
            queue.joinedAt ??
            queue.joinedat
          );

        },
        1000
      );

  }


  /*
   * ============================================================
   * STOP POLLING
   * ============================================================
   */

  if (
    !queue &&
    rankedPolling
  ) {

    clearInterval(
      rankedPolling
    );

    rankedPolling = null;

  }


  /*
   * ============================================================
   * STOP TIMER
   * ============================================================
   */

  if (
    !queue &&
    queueTimer
  ) {

    clearInterval(
      queueTimer
    );

    queueTimer = null;

  }
}


function updateQueueTimer(joinedAt) {
  const timer =
    $('#queue-timer');

  if (!timer) return;

  const elapsed = Math.max(
    0,
    Math.floor(
      (
        Date.now() -
        new Date(joinedAt).getTime()
      ) / 1000
    )
  );

  const minutes =
    String(
      Math.floor(elapsed / 60)
    ).padStart(2, '0');

  const seconds =
    String(elapsed % 60)
      .padStart(2, '0');

  timer.textContent =
    `${minutes}:${seconds}`;
}


/* =========================================================
   RANKED QUEUE
========================================================= */

async function joinRankedQueue() {
  const languageElement = $('#rank-language');

  if (!languageElement) {
    showAlert('Không tìm thấy ô chọn ngôn ngữ thi đấu.');
    return;
  }

  const rawLanguageId = languageElement.value;

  const languageId = Number(rawLanguageId);

  console.log('Rank language raw:', rawLanguageId);
  console.log('Rank language id:', languageId);

  if (
    !Number.isInteger(languageId) ||
    languageId <= 0
  ) {
    showAlert('Vui lòng chọn ngôn ngữ thi đấu.');
    return;
  }

  state.searchingRanked = true;

  try {
    const result = await api(
      '/api/ranked/queue',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          languageId: languageId
        })
      }
    );

    if (result?.status === 'matched') {
      state.rankedMatchId = result.matchId;
      state.searchingRanked = false;

      await showMatchFound(result.matchId);
    } else {
      showAlert(
        'Đã vào hàng chờ. Đang tìm đối thủ phù hợp...'
      );

      await loadRanked();
    }

  } catch (error) {
    state.searchingRanked = false;
    showAlert(error.message);
  }
}


async function cancelRankedQueue() {
  state.searchingRanked = false;

  try {
    await api(
      '/api/ranked/queue',
      {
        method: 'DELETE'
      }
    );

    await loadRanked();

    showAlert(
      'Đã hủy tìm trận.'
    );

  } catch (error) {
    showAlert(error.message);
  }
}


/* =========================================================
   RANKED EXIT
========================================================= */

function clearRankedOnExit() {
  if (
    !state.token ||
    (
      !state.searchingRanked &&
      !state.rankedMatchId
    )
  ) {
    return;
  }

  clearRankedStorage();

  state.searchingRanked = false;
  state.rankedMatchId = null;
}


function clearRankedStorage() {
  if (!state.token) return;

  const headers = {
    'Content-Type': 'application/json',
    Authorization:
      `Bearer ${state.token}`
  };

  fetch(
    '/api/ranked/leave',
    {
      method: 'POST',
      headers,
      body: '{}',
      keepalive: true
    }
  ).catch(() => {});
}


/* =========================================================
   MATCH FOUND
========================================================= */

async function showMatchFound(matchId) {
  try {
    const data = await api(
      `/api/ranked/matches/${matchId}`
    );
console.log('PLAYER NUMBER:', data?.playerNumber);
console.log('MATCH DATA:', data?.match);
    const match =
      data?.match || {};

    const currentUser =
      state.dashboard?.user || {};

    const currentRank =
      state.rankedData?.rank || {};

    $('#lesson-modal-content').innerHTML = `
      <div class="match-found">

        <div class="match-found-icon">
          ⚔
        </div>

        <p class="eyebrow">
          MATCH FOUND · RANKED 1V1
        </p>

        <h2 id="lesson-modal-title">
          Đã tìm thấy đối thủ!
        </h2>

        <div class="versus-board">

          <div class="versus-player self">

            <div class="avatar opponent-avatar">
              ${initials(
                currentUser.fullName ||
                currentUser.username
              )}
            </div>

            <strong>
              ${escapeHtml(
                currentUser.username ||
                currentUser.fullName ||
                'Bạn'
              )}
            </strong>

            <span>
              ${escapeHtml(
                currentRank.rankName ||
                'Bronze'
              )}
              ·
              ${currentRank.rating || 1000}
              rating
            </span>

            <b>
              BẠN
            </b>

          </div>

          <div class="versus-label">
            VS
          </div>

          <div class="versus-player opponent">

            <div class="avatar opponent-avatar">
              ${initials(
                match.opponentUsername
              )}
            </div>

            <strong>
              ${escapeHtml(
                match.opponentUsername ||
                'Opponent'
              )}
            </strong>

            <span>
              ${escapeHtml(
                match.opponentRankName ||
                'Bronze'
              )}
              ·
              ${match.opponentRating || 1000}
              rating
            </span>

            <b>
              ĐỐI THỦ
            </b>

          </div>

        </div>

        <p class="countdown-label">
          Trận đấu bắt đầu sau
        </p>

        <strong
          class="match-countdown"
          id="match-countdown"
        >
          3
        </strong>

      </div>
    `;

    openModal();

    let count = 3;

    const countdown =
      $('#match-countdown');

    const timer =
      setInterval(() => {
        count -= 1;

        if (count > 0) {
          if (countdown) {
            countdown.textContent =
              count;
          }
        } else {
          clearInterval(timer);
          openRankedMatch(matchId);
        }
      }, 1000);

  } catch (error) {
    showAlert(error.message);
  }
}


/* =========================================================
   RANKED MATCH
========================================================= */
function watchRankedMatch(matchId) {

  if (rankedMatchWatcher) {
    clearInterval(rankedMatchWatcher);
  }

  let countdownStarted = false;

  rankedMatchWatcher = setInterval(async () => {

    try {

      const data = await api(
        `/api/ranked/matches/${matchId}`
      );

      const match =
        data?.match ??
        data ??
        {};

      const waitingForOpponent =
        match.waitingForOpponent === true ||
        match.waitingforopponent === true ||
        data?.waitingForOpponent === true ||
        data?.waitingforopponent === true;

      const status = String(
        match.matchStatus ??
        match.matchstatus ??
        data?.matchStatus ??
        data?.matchstatus ??
        data?.status ??
        ''
      ).toLowerCase();

      console.log('🔎 MATCH WATCH:', {
        matchId,
        status,
        waitingForOpponent
      });

      // ======================================
      // MỘT PLAYER ĐÃ BẤM KẾT THÚC
      // ======================================

      if (
        waitingForOpponent &&
        !countdownStarted
      ) {

        countdownStarted = true;

        console.log(
          '⏱️ MỘT PLAYER ĐÃ XONG -> BẮT ĐẦU 30 GIÂY'
        );

        startRanked30SecondCountdown(
          matchId
        );
      }

      // ======================================
      // TRẬN ĐÃ KẾT THÚC
      // ======================================

      if (status === 'finished') {

        console.log(
          '🏆 MATCH FINISHED'
        );

        clearInterval(
          rankedMatchWatcher
        );

        rankedMatchWatcher = null;

        stopRankedCountdown();

        await loadFinishedMatchResult(
          matchId
        );
      }

    } catch (error) {

      console.error(
        '❌ WATCH MATCH ERROR:',
        error
      );

    }

  }, 1000);
}
function startRanked30SecondCountdown(matchId) {

  stopRankedCountdown();

  let seconds = 30;

  const countdownElement =
    document.querySelector(
      '#ranked-countdown'
    );

  if (countdownElement) {
    countdownElement.textContent =
      `⏱️ Còn ${seconds} giây`;
  }

  console.log(
    '⏱️ BẮT ĐẦU 30 GIÂY:',
    matchId
  );

  rankedCountdownInterval =
    setInterval(() => {

      seconds--;

      if (countdownElement) {
        countdownElement.textContent =
          `⏱️ Còn ${seconds} giây`;
      }

      if (seconds <= 0) {

        clearInterval(
          rankedCountdownInterval
        );

        rankedCountdownInterval = null;
      }

    }, 1000);

  rankedAutoFinishTimer =
    setTimeout(async () => {

      rankedAutoFinishTimer = null;

      console.log(
        '⏰ HẾT 30 GIÂY -> TỰ ĐỘNG NỘP'
      );

      try {

        await finishRankedMatch(
          matchId
        );

      } catch (error) {

        console.error(
          '❌ AUTO FINISH ERROR:',
          error
        );
      }

    }, 30000);
}
function stopRankedCountdown() {

  if (rankedAutoFinishTimer) {

    clearTimeout(
      rankedAutoFinishTimer
    );

    rankedAutoFinishTimer = null;
  }

  if (rankedCountdownInterval) {

    clearInterval(
      rankedCountdownInterval
    );

    rankedCountdownInterval = null;
  }
}
async function openRankedMatch(matchId) {
  try {
    const data = await api(
      `/api/ranked/matches/${matchId}`
    );

    console.log('🏷️ MATCH DATA:', data);

    const questions =
      asArray(data?.questions);

    $('#lesson-modal-content').innerHTML = `
      <p class="eyebrow">
        RANKED 1V1 · MATCH #${matchId}
      </p>

      <h2 id="lesson-modal-title">
        Đối đầu với
        ${escapeHtml(
          data?.match?.opponentUsername ||
          'opponent'
        )}
      </h2>

      <p class="modal-description">
        Chọn đáp án nhanh và chính xác.
        Điểm sẽ được ghi vào MatchAnswers.
      </p>

      <div
        id="ranked-countdown"
        style="
          text-align:center;
          font-size:24px;
          font-weight:700;
          margin:15px 0;
        "
      >
        <!-- Chưa bắt đầu đếm -->
      </div>

      <div class="rank-question-list">

        ${
          questions.length
            ? questions.map((question) => {

                const answers =
                  asArray(
                    question?.answers
                  );

                return `
                  <div
                    class="rank-question"
                    data-question-id="${
                      question.matchQuestionId
                    }"
                  >

                    <span>
                      Câu
                      ${question.questionNumber}
                    </span>

                    <strong>
                      ${escapeHtml(
                        question.questionText || ''
                      )}
                    </strong>

                    <div class="answers">

                      ${
                        answers.length
                          ? answers.map((answer) => `
                              <button
                                class="answer ranked-answer"
                                data-answer-text="${escapeHtml(
                                  answer.answerText || ''
                                )}"
                              >
                                ${escapeHtml(
                                  answer.answerText || ''
                                )}
                              </button>
                            `).join('')
                          : `
                              <span class="muted">
                                Chưa có đáp án.
                              </span>
                            `
                      }

                    </div>

                  </div>
                `;
              }).join('')
            : `
              <p class="muted">
                Không có câu hỏi cho trận đấu này.
              </p>
            `
        }

      </div>

      <button
        class="primary-btn finish-ranked"
        data-match-id="${matchId}"
      >
        Kết thúc trận
        <span>✓</span>
      </button>
    `;

    openModal();

    // ===============================
    // CHỌN ĐÁP ÁN
    // ===============================

    document
      .querySelectorAll('.ranked-answer')
      .forEach((button) => {

        button.addEventListener(
          'click',
          () =>
            answerRankedQuestion(
              button,
              matchId
            )
        );

      });

    // ===============================
    // NÚT KẾT THÚC
    // ===============================

    $('.finish-ranked')
      ?.addEventListener(
        'click',
        () => finishRankedMatch(matchId)
      );

    // ===============================
    // THEO DÕI TRẬN
    // ===============================

    watchRankedMatch(matchId);

  } catch (error) {

    console.error(
      '❌ OPEN RANKED MATCH ERROR:',
      error
    );

    showAlert(error.message);
  }
}


/* =========================================================
   ANSWER RANKED QUESTION
========================================================= */

/* =========================================================
   ANSWER RANKED QUESTION
========================================================= */

async function answerRankedQuestion(button, matchId) {
    const question = button.closest('.rank-question');

    if (!question) return;

    if (question.dataset.answered) {
        return;
    }

    const matchQuestionId =
        Number(question.dataset.questionId);

    if (!Number.isInteger(matchQuestionId) || matchQuestionId <= 0) {
        showAlert('Không xác định được câu hỏi trong trận.');
        return;
    }

    try {
        const result = await api(
            `/api/ranked/matches/${matchId}/answers`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    matchQuestionId: matchQuestionId,

                    answerText:
                        button.dataset.answerText,

                    answerTimeMilliseconds: 1000
                })
            }
        );

        question.dataset.answered = 'true';

        button.classList.add(
            result?.isCorrect
                ? 'correct-answer'
                : 'wrong-answer'
        );

        question
            .querySelectorAll('.ranked-answer')
            .forEach(item => {
                item.disabled = true;
            });

    } catch (error) {
        showAlert(error.message);
    }
}


/* =========================================================
   FINISH RANKED MATCH
========================================================= */

/* =========================================================
   FINISH RANKED MATCH
========================================================= */

async function finishRankedMatch(matchId) {
    stopRankedCountdown();
   if (rankedAutoFinishTimer) {
    clearTimeout(rankedAutoFinishTimer);
    rankedAutoFinishTimer = null;
  }
  try {
    const result = await api(
      `/api/ranked/matches/${matchId}/finish`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: '{}'
      }
    );

    console.log(
      '🏁 FINISH MATCH RESULT:',
      result
    );

    /*
     * =======================================================
     * PLAYER ĐÃ FINISH NHƯNG ĐỐI THỦ CHƯA FINISH
     * =======================================================
     */

   if (
    result?.status === 'WaitingForOpponent' ||
    result?.waiting === true
) {
    showWaitingForOpponent(matchId);
    return;
}

    /*
     * =======================================================
     * CẢ HAI ĐÃ FINISH
     * =======================================================
     */

    if (
      result?.status === 'Finished' ||
      result?.matchStatus === 'Finished'
    ) {

      /*
       * Dừng các trạng thái tìm trận
       */
      state.rankedMatchId = null;
      state.searchingRanked = false;

      /*
       * Hiển thị kết quả
       */
      showMatchResult(result);

      /*
       * Reload Ranked sau khi trận hoàn thành
       */
      await loadRanked();

      return;
    }

    /*
     * =======================================================
     * TRƯỜNG HỢP KHÔNG XÁC ĐỊNH
     * =======================================================
     */

    console.warn(
      '⚠️ Unknown finish status:',
      result
    );

    showWaitingForOpponent(matchId);

  } catch (error) {

    console.error(
      'finishRankedMatch error:',
      error
    );

    showAlert(
      error.message
    );
  }
}


async function checkRankedMatchStatus(matchId) {

    // Nếu đang có request trước đó thì không tạo request mới
    if (rankedMatchStatusChecking) {
        return;
    }

    rankedMatchStatusChecking = true;

    try {

        const result = await api(
            `/api/ranked/matches/${matchId}`,
            {
                method: 'GET'
            }
        );

        console.log(
            '🔄 RANKED STATUS RAW:',
            result
        );

        const data =
            result?.data ?? result;

        console.log(
            '🔄 RANKED STATUS DATA:',
            data
        );

        const match =
            data?.match ?? {};

        const matchStatus =
            String(
                match?.matchStatus ??
                match?.matchstatus ??
                data?.matchStatus ??
                data?.matchstatus ??
                data?.status ??
                ''
            );

        console.log(
            '📌 CURRENT MATCH STATUS:',
            matchStatus
        );

        // ==========================================
        // TRẬN ĐÃ KẾT THÚC
        // ==========================================

        if (
            matchStatus.toLowerCase() === 'finished'
        ) {

            console.log(
                '🏁 MATCH FINISHED → SHOW RESULT'
            );

            // QUAN TRỌNG:
            // dừng interval trước
            stopRankedMatchStatusPolling();

            // Xóa trạng thái trận
            state.rankedMatchId = null;
            state.searchingRanked = false;

            console.log(
                '🏆 FINAL RESULT FROM GET:',
                data
            );

            // KHÔNG gọi POST /finish nữa
            showMatchResult(data);

            return;
        }

        // ==========================================
        // ĐANG CHỜ ĐỐI THỦ
        // ==========================================

        if (
            data?.waitingForOpponent === true
        ) {

            console.log(
                '⏳ WAITING FOR OPPONENT:',
                data?.remainingSeconds
            );

            return;
        }

        // ==========================================
        // TRẬN ĐANG CHƠI
        // ==========================================

        if (
            matchStatus.toLowerCase() === 'inprogress'
        ) {

            console.log(
                '🎮 MATCH STILL IN PROGRESS'
            );

            return;
        }

    } catch (error) {

        console.error(
            '❌ CHECK MATCH STATUS ERROR:',
            error
        );

    } finally {

        rankedMatchStatusChecking = false;
    }
}


function startRankedMatchStatusPolling(matchId) {

    // Nếu đã có polling thì dừng cái cũ
    stopRankedMatchStatusPolling();

    const id = Number(matchId);

    if (!id) {
        console.error(
            '❌ INVALID MATCH ID:',
            matchId
        );

        return;
    }

    console.log(
        '🔄 START POLLING MATCH:',
        id
    );

    // Kiểm tra ngay lập tức
    checkRankedMatchStatus(id);

    // Sau đó mỗi 1 giây kiểm tra
    rankedMatchStatusTimer =
        setInterval(
            () => {
                checkRankedMatchStatus(id);
            },
            1000
        );
}


function stopRankedMatchStatusPolling() {

    if (
        rankedMatchStatusTimer !== null
    ) {

        clearInterval(
            rankedMatchStatusTimer
        );

        rankedMatchStatusTimer = null;

        console.log(
            '🛑 STOP MATCH POLLING'
        );
    }

    // Cho phép request mới
    rankedMatchStatusChecking = false;
}

/* =========================================================
   WAITING OPPONENT
========================================================= */

/* =========================================================
   WAITING OPPONENT
========================================================= */

function showWaitingForOpponent(matchId) {

  /*
   * Nếu đang polling cũ thì dừng trước
   */
  if (matchWaitPolling) {

    clearInterval(
      matchWaitPolling
    );

    matchWaitPolling = null;
  }

  $('#lesson-modal-content').innerHTML = `
    <div class="match-waiting">

      <div class="match-waiting-icon">
        ⌛
      </div>

      <p class="eyebrow">
        BẠN ĐÃ NỘP BÀI
      </p>

      <h2 id="lesson-modal-title">
        Đang chờ đối thủ...
      </h2>

      <p class="modal-description">
        Bạn đã hoàn thành phần thi.
        Kết quả chỉ được công bố sau khi
        cả hai người chơi hoàn thành trận đấu.
      </p>

      <div class="waiting-dots">
        <i></i>
        <i></i>
        <i></i>
      </div>

      <p class="muted" id="match-wait-status">
        Đang kiểm tra trạng thái đối thủ...
      </p>

      <button
        class="text-btn leave-match-btn"
      >
        Rời trận
      </button>

    </div>
  `;

  /*
   * =======================================================
   * NÚT RỜI TRẬN
   * =======================================================
   */

  $('.leave-match-btn')
    ?.addEventListener(
      'click',
      () => {

        if (matchWaitPolling) {

          clearInterval(
            matchWaitPolling
          );

          matchWaitPolling = null;
        }

        clearRankedOnExit();

        closeModal();
      }
    );


  /*
   * =======================================================
   * KIỂM TRA NGAY LẬP TỨC
   * =======================================================
   */

  const checkMatchFinished =
    async () => {

      try {

        const current =
          await api(
            `/api/ranked/matches/${matchId}`
          );

        const match =
          current?.match || {};

        const status =
          match.matchStatus ??
          match.matchstatus ??
          '';

        console.log(
          '⏳ MATCH WAIT STATUS:',
          {
            matchId,
            status,
            match
          }
        );

        /*
         * =================================================
         * CHỈ KHI BACKEND TRẢ FINISHED
         * MỚI ĐƯỢC XEM KẾT QUẢ
         * =================================================
         */

        if (
          String(status).toLowerCase() ===
          'finished'
        ) {

          /*
           * Dừng polling trước
           */
          if (matchWaitPolling) {

            clearInterval(
              matchWaitPolling
            );

            matchWaitPolling = null;
          }

          const statusElement =
            $('#match-wait-status');

          if (statusElement) {
            statusElement.textContent =
              'Đối thủ đã hoàn thành. Đang tải kết quả...';
          }

          /*
           * Lấy kết quả thật
           */
          await loadFinishedMatchResult(
            matchId
          );

          return;
        }

        /*
         * Nếu chưa Finished thì tiếp tục chờ
         */
        const statusElement =
          $('#match-wait-status');

        if (statusElement) {

          statusElement.textContent =
            'Đối thủ chưa hoàn thành. Đang chờ...';
        }

      } catch (error) {

        console.error(
          'checkMatchFinished error:',
          error
        );

        /*
         * Không dừng polling chỉ vì
         * một request tạm thời lỗi.
         */
      }
    };


  /*
   * =======================================================
   * KIỂM TRA NGAY
   * =======================================================
   */

  checkMatchFinished();


  /*
   * =======================================================
   * POLLING MỖI 2 GIÂY
   * =======================================================
   */

  matchWaitPolling =
    setInterval(
      checkMatchFinished,
      2000
    );
}


/* =========================================================
   MATCH RESULT
========================================================= */
/* =========================================================
   LOAD FINISHED MATCH RESULT
========================================================= */

async function loadFinishedMatchResult(matchId) {

    try {

        console.log(
            '🏆 Loading finished match result:',
            matchId
        );

        const result =
            await api(
                `/api/ranked/matches/${matchId}/result`
            );

        console.log(
            '🏆 FINAL MATCH RESULT:',
            result
        );

        /*
         * =================================================
         * DEBUG QUAN TRỌNG
         * =================================================
         */

        console.log(
            '🏆 RESULT DEBUG',
            {
                matchId: result?.matchId,
                currentUserId:
                    state.userId ??
                    state.user?.userId ??
                    state.user?.id,

                playerNumber:
                    result?.playerNumber,

                player1Score:
                    result?.player1Score,

                player2Score:
                    result?.player2Score,

                winnerUserId:
                    result?.winnerUserId,

                loserUserId:
                    result?.loserUserId,

                draw:
                    result?.draw,

                matchStatus:
                    result?.matchStatus
            }
        );


        /*
         * Không được hiển thị kết quả
         * nếu backend chưa Finished.
         */

        const status =
            result?.matchStatus ??
            result?.status ??
            result?.match?.matchStatus ??
            result?.match?.matchstatus ??
            '';

        if (
            String(status).toLowerCase() !==
            'finished'
        ) {

            console.warn(
                '⚠️ Match chưa Finished:',
                result
            );

            return;
        }


        /*
         * Phải có playerNumber.
         */

        if (
            result?.playerNumber !== 1 &&
            result?.playerNumber !== 2
        ) {

            console.error(
                '❌ API không trả playerNumber hợp lệ:',
                result
            );

            return;
        }


        /*
         * =================================================
         * HIỂN THỊ RESULT
         * =================================================
         */

        state.rankedMatchId = null;
        state.searchingRanked = false;

        showMatchResult(result);

        await loadRanked();

    } catch (error) {

        console.error(
            'loadFinishedMatchResult error:',
            error
        );
    }
}

function showMatchResult(data = {}) {

    console.log(
        '🏆 SHOW MATCH RESULT INPUT:',
        data
    );


    /*
     * =====================================================
     * 1. MATCH ID
     * =====================================================
     */

  const matchId =
    data.matchId ??
    data.match?.matchId ??
    data.match?.matchid ??
    '';

if (matchId) {
    console.log(
        '🏆 SHOW RESULT FOR MATCH:',
        matchId
    );

    state.rankedMatchId = null;
}


    /*
     * =====================================================
     * 2. SCORE PLAYER 1 / PLAYER 2
     * =====================================================
     */

    const player1Score =
        Number(
            data.player1Score ??
            data.match?.player1Score ??
            data.match?.player1score ??
            data.player1?.score ??
            0
        );

    const player2Score =
        Number(
            data.player2Score ??
            data.match?.player2Score ??
            data.match?.player2score ??
            data.player2?.score ??
            0
        );


    /*
     * =====================================================
     * 3. WINNER / LOSER
     * =====================================================
     */

    const winnerUserId =
        data.winnerUserId !== undefined &&
        data.winnerUserId !== null
            ? Number(data.winnerUserId)
            : null;

    const loserUserId =
        data.loserUserId !== undefined &&
        data.loserUserId !== null
            ? Number(data.loserUserId)
            : null;


    /*
     * =====================================================
     * 4. CURRENT USER ID
     * =====================================================
     *
     * Thứ tự ưu tiên:
     *
     * state.userId
     * state.user.userId
     * state.user.id
     * localStorage.userId
     */

    const currentUserId = Number(
    state.userId ??
    localStorage.getItem('userId') ??
    0
);

const player1UserId = Number(
    data.player1UserId ??
    data.player1?.userId ??
    data.player1?.userid ??
    data.match?.player1UserId ??
    data.match?.player1userid ??
    0
);

const player2UserId = Number(
    data.player2UserId ??
    data.player2?.userId ??
    data.player2?.userid ??
    data.match?.player2UserId ??
    data.match?.player2userid ??
    0
);

let playerNumber = Number(
    data.playerNumber ??
    data.player?.playerNumber ??
    data.match?.playerNumber ??
    0
);

// API chưa trả playerNumber thì tự xác định
if (playerNumber !== 1 && playerNumber !== 2) {

    if (
        currentUserId > 0 &&
        player1UserId > 0 &&
        currentUserId === player1UserId
    ) {
        playerNumber = 1;
    }

    else if (
        currentUserId > 0 &&
        player2UserId > 0 &&
        currentUserId === player2UserId
    ) {
        playerNumber = 2;
    }
}

console.log('🏆 PLAYER DEBUG:', {
    currentUserId,
    playerNumber,
    player1UserId,
    player2UserId
});

if (playerNumber !== 1 && playerNumber !== 2) {
    console.error('❌ KHÔNG XÁC ĐỊNH ĐƯỢC PLAYER NUMBER', {
        currentUserId,
        playerNumber,
        player1UserId,
        player2UserId,
        data
    });

    return;
}
    /*
     * =====================================================
     * 9. XÁC ĐỊNH ĐIỂM CỦA NGƯỜI ĐANG XEM
     * =====================================================
     */

    let ownScore = 0;

    let opponentScore = 0;


    if (playerNumber === 1) {

        ownScore =
            player1Score;

        opponentScore =
            player2Score;

    }

    else {

        ownScore =
            player2Score;

        opponentScore =
            player1Score;
    }


    /*
     * =====================================================
     * 10. RESULT WIN / LOSS / DRAW
     * =====================================================
     */

    let result = 'Draw';


    /*
     * Backend xác định Draw bằng winnerUserId = null
     * và loserUserId = null.
     */

    const isDraw =
        data.draw === true ||
        (
            winnerUserId === null &&
            loserUserId === null
        );


    if (isDraw) {

        result = 'Draw';

    }

    else if (
        winnerUserId !== null &&
        winnerUserId === currentUserId
    ) {

        result = 'Win';

    }

    else if (
        loserUserId !== null &&
        loserUserId === currentUserId
    ) {

        result = 'Loss';

    }

    /*
     * Fallback bằng điểm.
     */

    else if (
        ownScore > opponentScore
    ) {

        result = 'Win';

    }

    else if (
        ownScore < opponentScore
    ) {

        result = 'Loss';

    }

    else {

        result = 'Draw';
    }


    /*
     * =====================================================
     * 11. RESULT TEXT
     * =====================================================
     */

    const resultText =
        result === 'Win'
            ? 'CHIẾN THẮNG'
            : result === 'Loss'
                ? 'THUA CUỘC'
                : 'HÒA';


    const resultClass =
        result === 'Win'
            ? 'win'
            : result === 'Loss'
                ? 'loss'
                : 'draw';


    /*
     * =====================================================
     * 12. SUMMARY
     * =====================================================
     */

    const summary =
        data.summary || {};


    /*
     * =====================================================
     * 13. TOTAL QUESTIONS
     * =====================================================
     *
     * Ưu tiên:
     *
     * data.totalQuestions
     * summary.totalQuestions
     * match.totalQuestions
     * fallback 10
     */

    const totalQuestions =
        Number(data.totalQuestions) ||
        Number(summary.totalQuestions) ||
        Number(data.match?.totalQuestions) ||
        Number(data.match?.totalquestions) ||
        10;


    /*
     * =====================================================
     * 14. CORRECT / WRONG
     * =====================================================
     */

    const summaryCorrect =
        Number(summary.correctAnswers);

    const summaryWrong =
        Number(summary.wrongAnswers);

    const summaryOpponentCorrect =
        Number(summary.opponentCorrectAnswers);

    const summaryOpponentWrong =
        Number(summary.opponentWrongAnswers);


    const correct =
        Number.isFinite(summaryCorrect)
            ? summaryCorrect
            : ownScore;


    const wrong =
        Number.isFinite(summaryWrong)
            ? summaryWrong
            : Math.max(
                0,
                totalQuestions - correct
            );


    const opponentCorrect =
        Number.isFinite(summaryOpponentCorrect)
            ? summaryOpponentCorrect
            : opponentScore;


    const opponentWrong =
        Number.isFinite(summaryOpponentWrong)
            ? summaryOpponentWrong
            : Math.max(
                0,
                totalQuestions - opponentCorrect
            );


    /*
     * =====================================================
     * 15. ACCURACY
     * =====================================================
     */

    const yourAccuracy =
        totalQuestions > 0
            ? Math.round(
                (
                    correct /
                    totalQuestions
                ) * 100
            )
            : 0;


    const opponentAccuracy =
        totalQuestions > 0
            ? Math.round(
                (
                    opponentCorrect /
                    totalQuestions
                ) * 100
            )
            : 0;


    /*
     * =====================================================
     * 16. QUESTIONS
     * =====================================================
     */

    const questions =
        asArray(
            data.questions
        );


    /*
     * =====================================================
     * 17. RATING CHANGE
     * =====================================================
     */

    let ratingChange =
        Number(data.ratingChange);


    if (
        !Number.isFinite(ratingChange)
    ) {

        /*
         * Player 1
         */

        if (
            currentUserId === player1UserId
        ) {

            ratingChange =
                Number(
                    data.player1?.ratingChange ??
                    data.player1?.ratingchange ??
                    0
                );
        }

        /*
         * Player 2
         */

        else if (
            currentUserId === player2UserId
        ) {

            ratingChange =
                Number(
                    data.player2?.ratingChange ??
                    data.player2?.ratingchange ??
                    0
                );
        }

        else {

            ratingChange = 0;
        }
    }


    /*
     * =====================================================
     * 18. OPPONENT USERNAME
     * =====================================================
     */

    let opponentUsername =
        summary.opponentUsername ||
        data.opponentUsername ||
        'Opponent';


    if (
        currentUserId === player1UserId
    ) {

        opponentUsername =
            data.player2?.username ||
            data.player2?.userName ||
            opponentUsername;

    }

    else if (
        currentUserId === player2UserId
    ) {

        opponentUsername =
            data.player1?.username ||
            data.player1?.userName ||
            opponentUsername;
    }


    /*
     * =====================================================
     * 19. FINAL DEBUG
     * =====================================================
     */

    console.log(
        '================================'
    );

    console.log(
        '🏆 FINAL RESULT DISPLAY DEBUG'
    );

    console.log(
        'Match ID:',
        matchId
    );

    console.log(
        'Current User ID:',
        currentUserId
    );

    console.log(
        'Player Number:',
        playerNumber
    );

    console.log(
        'Player 1 User ID:',
        player1UserId
    );

    console.log(
        'Player 2 User ID:',
        player2UserId
    );

    console.log(
        'Player 1 Score:',
        player1Score
    );

    console.log(
        'Player 2 Score:',
        player2Score
    );

    console.log(
        'Own Score:',
        ownScore
    );

    console.log(
        'Opponent Score:',
        opponentScore
    );

    console.log(
        'Winner User ID:',
        winnerUserId
    );

    console.log(
        'Loser User ID:',
        loserUserId
    );

    console.log(
        'Result:',
        result
    );

    console.log(
        'Rating Change:',
        ratingChange
    );

    console.log(
        '================================'
    );


    /*
     * =====================================================
     * 20. RENDER
     * =====================================================
     */

    $('#lesson-modal-content').innerHTML = `

        <div class="match-result">

            <div class="result-header">

                <div>

                    <p class="eyebrow">
                        RANKED MATCH #${escapeHtml(
                            String(matchId)
                        )}
                    </p>

                    <h2
                        id="lesson-modal-title"
                        class="result-title ${resultClass}"
                    >
                        ${resultText}
                    </h2>

                    <p class="result-subtitle">

                        ${
                            data.forfeit
                                ? 'Đối thủ đã bỏ cuộc'
                                : 'Trận đấu đã hoàn tất và điểm đã được ghi nhận.'
                        }

                    </p>

                </div>


                <div
                    class="result-medal ${resultClass}"
                >

                    ${
                        result === 'Win'
                            ? '✓'
                            : result === 'Loss'
                                ? '×'
                                : '='
                    }

                </div>

            </div>


            <!-- SCORE -->

            <div class="scoreline">

                <span>
                    ${formatNumber(ownScore)}
                </span>

                <b>
                    -
                </b>

                <span>
                    ${formatNumber(opponentScore)}
                </span>

            </div>


            <!-- COMPARISON -->

            <div class="comparison-grid">

                <article
                    class="comparison-card yours"
                >

                    <span class="player-label">
                        BẠN
                    </span>


                    <strong>
                        ${correct}/${totalQuestions}
                        câu đúng
                    </strong>


                    <div class="accuracy-bar">

                        <i
                            style="width:${yourAccuracy}%"
                        ></i>

                    </div>


                    <small>
                        ${yourAccuracy}%
                        chính xác
                    </small>

                </article>


                <div class="comparison-vs">
                    VS
                </div>


                <article
                    class="comparison-card theirs"
                >

                    <span class="player-label">

                        ĐỐI THỦ ·

                        ${escapeHtml(
                            opponentUsername
                        )}

                    </span>


                    <strong>
                        ${opponentCorrect}/${totalQuestions}
                        câu đúng
                    </strong>


                    <div class="accuracy-bar">

                        <i
                            style="width:${opponentAccuracy}%"
                        ></i>

                    </div>


                    <small>
                        ${opponentAccuracy}%
                        chính xác
                    </small>

                </article>

            </div>


            <!-- STATS -->

            <div class="result-stats">

                <div>

                    <strong>
                        ${correct}/${totalQuestions}
                    </strong>

                    <span>
                        Bạn đã làm
                    </span>

                </div>


                <div>

                    <strong>
                        ${correct}
                    </strong>

                    <span>
                        Bạn đúng
                    </span>

                </div>


                <div>

                    <strong>
                        ${wrong}
                    </strong>

                    <span>
                        Bạn sai
                    </span>

                </div>


                <div>

                    <strong>

                        ${
                            ratingChange > 0
                                ? '+'
                                : ''
                        }${ratingChange}

                    </strong>

                    <span>
                        Rating
                    </span>

                </div>

            </div>


            <!-- REVIEW -->

            <div class="review-heading">

                <div>

                    <p class="eyebrow">
                        ANSWER REVIEW
                    </p>

                    <h3>
                        Chi tiết từng câu
                    </h3>

                </div>


                <span>

                    ${correct} đúng ·
                    ${wrong} sai

                </span>

            </div>


            <div class="answer-review">

                ${
                    questions.length

                        ? questions
                            .map(
                                question => `

                                    <div
                                        class="
                                            review-row
                                            ${
                                                question.isCorrect
                                                    ? 'review-correct'
                                                    : 'review-wrong'
                                            }
                                        "
                                    >

                                        <span class="review-index">

                                            ${String(
                                                question.questionNumber ??
                                                ''
                                            ).padStart(2, '0')}

                                        </span>


                                        <span class="review-mark">

                                            ${
                                                question.isCorrect
                                                    ? '✓'
                                                    : '×'
                                            }

                                        </span>


                                        <div>

                                            <strong>

                                                ${escapeHtml(
                                                    question.questionText || ''
                                                )}

                                            </strong>


                                            <small>

                                                Bạn chọn:

                                                <b>

                                                    ${escapeHtml(
                                                        question.answerText ||
                                                        'Chưa trả lời'
                                                    )}

                                                </b>

                                                <br />

                                                Đáp án đúng:

                                                <b>

                                                    ${escapeHtml(
                                                        question.correctAnswer ||
                                                        ''
                                                    )}

                                                </b>

                                            </small>

                                        </div>

                                    </div>

                                `
                            )
                            .join('')

                        : `

                            <p class="muted">
                                Không có dữ liệu câu trả lời.
                            </p>

                        `
                }

            </div>


            <button
                class="primary-btn result-close"
                data-close-modal
            >

                Đóng kết quả

                <span>
                    →
                </span>

            </button>

        </div>

    `;


    openModal();
}



/* =========================================================
   NAVIGATION
========================================================= */

function bindViewButtons() {
  document
    .querySelectorAll('[data-view]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () =>
          switchView(
            button.dataset.view
          )
      );
    });
}


function bindLessonButtons() {
  document
    .querySelectorAll('[data-lesson-id]')
    .forEach((card) => {
      card.addEventListener(
        'click',
        () =>
          openLesson(
            Number(
              card.dataset.lessonId
            )
          )
      );
    });
}


function switchView(view) {
  document
    .querySelectorAll('.nav-item')
    .forEach((item) => {
      item.classList.toggle(
        'active',
        item.dataset.view === view
      );
    });

  document
    .querySelectorAll('.view')
    .forEach((section) => {
      section.classList.toggle(
        'active-view',
        section.id === `view-${view}`
      );
    });

  const titles = {
    dashboard: 'Tổng quan',
    courses: 'Khóa học',
    games: 'Trò chơi',
    ranked: 'Ranked PvP',
    leaderboard: 'Bảng xếp hạng'
  };

  if ($('#page-title')) {
    $('#page-title').textContent =
      titles[view] || '';
  }

  const mobileMenu =
    $('#mobile-menu');

  if (
    mobileMenu &&
    window.innerWidth <= 680
  ) {
    mobileMenu.classList.add(
      'hidden'
    );

    $('#mobile-menu-toggle')
      ?.setAttribute(
        'aria-expanded',
        'false'
      );
  }

  if (view === 'ranked') {
    loadRanked();
  }
}


/* =========================================================
   MOBILE NAVBAR
========================================================= */

function initMobileNavbar() {
  const toggle =
    $('#mobile-menu-toggle');

  const menu =
    $('#mobile-menu');

  if (!toggle || !menu) {
    return;
  }

  toggle.addEventListener(
    'click',
    () => {
      const hidden =
        menu.classList.toggle(
          'hidden'
        );

      toggle.setAttribute(
        'aria-expanded',
        String(!hidden)
      );

      toggle.textContent =
        hidden ? '☰' : '×';
    }
  );
}

initMobileNavbar();


/* =========================================================
   MODAL
========================================================= */

function openModal() {
  $('#lesson-modal')
    ?.classList
    .remove('hidden');
}

function closeModal() {
  $('#lesson-modal')
    ?.classList
    .add('hidden');
}


/* =========================================================
   AUTH UI
========================================================= */

function showApp() {
  $('#auth-screen')
    ?.classList
    .add('hidden');

  $('#app-shell')
    ?.classList
    .remove('hidden');
}

function showAuth() {
  $('#auth-screen')
    ?.classList
    .remove('hidden');

  $('#app-shell')
    ?.classList
    .add('hidden');
}


function setAuthMode(mode) {
  state.authMode = mode;

  const register =
    mode === 'register';

  $('#auth-title').textContent =
    register
      ? 'Tạo tài khoản mới.'
      : 'Chào mừng trở lại.';

  $('#auth-subtitle').textContent =
    register
      ? 'Bắt đầu hành trình học ngoại ngữ của bạn ngay hôm nay.'
      : 'Đăng nhập để tiếp tục hành trình học ngoại ngữ của bạn.';

  $('#auth-submit').innerHTML =
    register
      ? 'Tạo tài khoản <span>→</span>'
      : 'Đăng nhập <span>→</span>';

  $('#auth-switch').innerHTML =
    register
      ? 'Đã có tài khoản? <strong>Đăng nhập</strong>'
      : 'Chưa có tài khoản? <strong>Đăng ký</strong>';

  document
    .querySelectorAll('.register-only')
    .forEach((element) =>
      element.classList.toggle(
        'hidden',
        !register
      )
    );

  document
    .querySelectorAll('.login-only')
    .forEach((element) =>
      element.classList.toggle(
        'hidden',
        register
      )
    );

  $('#auth-error')
    ?.classList
    .add('hidden');
}


/* =========================================================
   AUTH SUBMIT
========================================================= */

async function handleAuthSubmit(event) {
  event.preventDefault();

  const form =
    new FormData(
      event.currentTarget
    );

  const payload =
    Object.fromEntries(
      form.entries()
    );

  const error =
    $('#auth-error');

  try {
    $('#auth-submit').disabled =
      true;

    const result =
      await authApi(
        state.authMode === 'register'
          ? '/api/auth/register'
          : '/api/auth/login',
        payload
      );

    if (
      !result?.token ||
      !result?.user
    ) {
      throw new Error(
        'API đăng nhập không trả về token hoặc user.'
      );
    }

    state.token =
      result.token;

    state.userId =
      result.user.userId;

    localStorage.setItem(
      'linguaQuestToken',
      state.token
    );

    showApp();

    await loadData();

  } catch (authError) {
    if (error) {
      error.textContent =
        authError.message;

      error.classList.remove(
        'hidden'
      );
    }

  } finally {
    $('#auth-submit').disabled =
      false;
  }
}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {
  localStorage.removeItem(
    'linguaQuestToken'
  );

  state.token = null;
  state.dashboard = null;
  state.languages = [];
  state.courses = [];
  state.games = [];
  state.leaderboard = [];

  $('#profile-dropdown')
    ?.classList
    .add('hidden');

  showAuth();
  setAuthMode('login');
}


/* =========================================================
   RESTORE SESSION
========================================================= */

async function restoreSession() {
  if (!state.token) {
    showAuth();
    setAuthMode('login');
    return;
  }

  try {
    clearRankedStorage();

    const profile =
      await api('/api/auth/me');

    if (!profile?.userId) {
      throw new Error(
        'Phiên đăng nhập không hợp lệ.'
      );
    }

    state.userId =
      profile.userId;

    showApp();

    await loadData();

  } catch (error) {
    console.error(
      'restoreSession error:',
      error
    );

    logout();
  }
}


/* =========================================================
   GLOBAL CLICK
========================================================= */

document.addEventListener(
  'click',
  (event) => {

    const viewButton =
      event.target.closest(
        '[data-view]'
      );

    if (viewButton) {
      switchView(
        viewButton.dataset.view
      );
    }

    if (
      event.target.matches(
        '[data-close-modal]'
      ) ||
      event.target.id ===
        'lesson-modal'
    ) {
      closeModal();
    }

    const accountAction =
      event.target.closest(
        '[data-account-action]'
      );

    if (
      accountAction?.dataset
        .accountAction === 'logout'
    ) {
      clearRankedOnExit();
      logout();
    }

    if (
      accountAction?.dataset
        .accountAction === 'profile'
    ) {
      $('#profile-dropdown')
        ?.classList
        .add('hidden');

      showAlert(
        'Thông tin tài khoản đang được quản lý từ API /api/auth/me.'
      );
    }

    if (
      !event.target.closest(
        '.profile-wrap'
      )
    ) {
      $('#profile-dropdown')
        ?.classList
        .add('hidden');

      $('#profile-toggle')
        ?.setAttribute(
          'aria-expanded',
          'false'
        );
    }
  }
);


/* =========================================================
   INITIAL EVENTS
========================================================= */

$('#auth-form')
  ?.addEventListener(
    'submit',
    handleAuthSubmit
  );

$('#auth-switch')
  ?.addEventListener(
    'click',
    () =>
      setAuthMode(
        state.authMode === 'login'
          ? 'register'
          : 'login'
      )
  );

$('#profile-toggle')
  ?.addEventListener(
    'click',
    () => {
      const dropdown =
        $('#profile-dropdown');

      if (!dropdown) return;

      const hidden =
        dropdown.classList.toggle(
          'hidden'
        );

      $('#profile-toggle')
        ?.setAttribute(
          'aria-expanded',
          String(!hidden)
        );
    }
  );

bindViewButtons();

restoreSession();

window.addEventListener(
  'pagehide',
  clearRankedOnExit
);

window.addEventListener(
  'beforeunload',
  clearRankedOnExit
);