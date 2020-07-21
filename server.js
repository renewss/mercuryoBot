const mongoose = require('mongoose');
const { bot, app } = require('./app');
const { fetch } = require('./src/fetcher');
const mailing = require('./src/mailing');

const Db = process.env.DB_CONNECTION.replace('<password>', process.env.DB_PASSWORD);

mongoose
    .connect(Db, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true, //required to avoid warning in console
    })
    .then(() => console.log('DB connection successful'));

// Info fetcher cycle
(async () => {
    try {
        await fetch();
        setInterval(fetch, 1000 * 40);
        setInterval(() => {
            mailing(bot);
        }, 1000 * 40);
        // mailing(bot);
    } catch (err) {
        console.log(err);
    }
})();

const Port = process.env.PORT || 3030;
app.listen(Port, () => {
    console.log(`Server is running on port ${Port}`);
});

// BOT
bot.launch();
