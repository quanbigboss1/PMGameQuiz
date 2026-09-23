-- =========================================================
-- ADD COURSES FOR FRENCH, SPANISH, GERMAN, ITALIAN
-- =========================================================

INSERT INTO courses
(
    courseid,
    languageid,
    coursename,
    description,
    imageurl,
    difficulty,
    totalxp,
    ispublished
)
SELECT
    base.max_id + ROW_NUMBER() OVER (ORDER BY x.languageid, x.course_order)::integer,
    x.languageid,
    x.coursename,
    x.description,
    x.imageurl,
    x.difficulty,
    x.totalxp,
    x.ispublished
FROM
(
    SELECT
        5 AS languageid,
        1 AS course_order,
        'French Basics' AS coursename,
        'Learn basic French vocabulary, greetings and everyday expressions.' AS description,
        NULL AS imageurl,
        'Beginner' AS difficulty,
        500 AS totalxp,
        TRUE AS ispublished

    UNION ALL

    SELECT
        5,
        2,
        'French Conversation',
        'Practice common French conversations and useful daily phrases.',
        NULL,
        'Intermediate',
        800,
        TRUE

    UNION ALL

    SELECT
        6,
        1,
        'Spanish Basics',
        'Learn basic Spanish vocabulary, greetings and everyday expressions.',
        NULL,
        'Beginner',
        500,
        TRUE

    UNION ALL

    SELECT
        6,
        2,
        'Spanish Conversation',
        'Practice common Spanish conversations and useful daily phrases.',
        NULL,
        'Intermediate',
        800,
        TRUE

    UNION ALL

    SELECT
        7,
        1,
        'German Basics',
        'Learn basic German vocabulary, greetings and everyday expressions.',
        NULL,
        'Beginner',
        500,
        TRUE

    UNION ALL

    SELECT
        7,
        2,
        'German Conversation',
        'Practice common German conversations and useful daily phrases.',
        NULL,
        'Intermediate',
        800,
        TRUE

    UNION ALL

    SELECT
        8,
        1,
        'Italian Basics',
        'Learn basic Italian vocabulary, greetings and everyday expressions.',
        NULL,
        'Beginner',
        500,
        TRUE

    UNION ALL

    SELECT
        8,
        2,
        'Italian Conversation',
        'Practice common Italian conversations and useful daily phrases.',
        NULL,
        'Intermediate',
        800,
        TRUE
) x
CROSS JOIN
(
    SELECT COALESCE(MAX(courseid), 0) AS max_id
    FROM courses
) base;