const express = require('express');
const path = require('path');

const apiRouter = require('./routes/api');

const app = express();


// =====================================================
// BODY PARSER
// =====================================================

app.use(
    express.json()
);


// =====================================================
// STATIC FILES
// =====================================================

app.use(
    express.static(
        path.join(
            __dirname,
            '..',
            'public'
        )
    )
);


// =====================================================
// API
// =====================================================

app.use(
    '/api',
    apiRouter
);


// =====================================================
// API 404
// QUAN TRỌNG:
// Không cho API request rơi xuống index.html
// =====================================================

app.use(
    '/api',
    (req, res) => {

        return res.status(404).json({
            success: false,
            message: 'API endpoint không tồn tại.',
            path: req.originalUrl
        });

    }
);


// =====================================================
// FRONTEND FALLBACK
// =====================================================

app.get(
    '*',
    (req, res) => {

        return res.sendFile(
            path.join(
                __dirname,
                '..',
                'public',
                'index.html'
            )
        );

    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = app;

