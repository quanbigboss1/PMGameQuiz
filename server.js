require('dotenv').config();

const app = require('./src/app');
const rankRepository = require('./src/repositories/rankRepository');

const port = Number(process.env.PORT) || 3000;

const server = app.listen(port, () => {
    console.log(
        `Lingua Quest running at http://localhost:${port}`
    );
});


/*
|--------------------------------------------------------------------------
| SHUTDOWN
|--------------------------------------------------------------------------
*/

function shutdown(signal) {

    console.log(
        `\n⚠️ ${signal} received. Shutting down...`
    );


    server.close(() => {

        console.log(
            '✅ HTTP server closed.'
        );

        process.exit(0);

    });
}

process.on(
    'SIGTERM',
    () => shutdown('SIGTERM')
);