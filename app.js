// *****************************
// Author : renewss
// CONTACT: t.me/Renewss
// *****************************

const Telegraf = require('telegraf');
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();
const control = require('./src/control.js');
const { User } = require('./src/model');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
// app.use(bot.webhookCallback(`/${process.env.BOT_TOKEN}`));
// (async function () {
//     const b = await bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}${process.env.BOT_TOKEN}`, null, 5000);
//     console.log(b);
// })();

app.use(bodyParser.json());
app.get('/keepAlive', (req, res, next) => {
    console.log('KEEP-ALIVE endpoint hit');
    res.send({
        status: 'success',
    });
});

async function kplv() {
    await axios.get(`${process.env.WEBHOOK_URL}keepAlive`);
}
setInterval(kplv, 1000 * 60 * 25);

bot.start(control.auth, control.mainMenu);
bot.on('text', async (ctx, next) => {
    await control.auth(ctx, next);

    control.saveDifference(ctx);
});

bot.on('callback_query', async (ctx, next) => {
    try {
        ctx.answerCbQuery();
        const cbData = ctx.update.callback_query.data.split('_');
        console.log(cbData);

        switch (cbData[0]) {
            case 'main':
                control.mainMenu(ctx, next, true);
            case '0':
                if (cbData[1] == 0) control.rateMenu(ctx);
                else if (cbData[1] == 1) control.reqMenu(ctx);
                break;
            case '1':
                control.cryptMenu(ctx, cbData[1] * 1);
                break;
            case '2':
                control.fiatMenu(ctx, cbData[1] * 1, cbData[2]);
                break;
            case 'current':
                control.sendCurrent(ctx);
                break;
            case 'diff':
                control.sendDiff(ctx);
                break;
            case 'set':
                await control.auth(ctx, next);
                await control.setDifference(ctx, cbData[1], cbData[2], cbData[3]);
                break;
            case 'request':
                await control.auth(ctx, next);
                await control.showReqs(ctx);
                break;
            case 'confirm':
                control.confirmDeleteReq(ctx);
                break;
            case 'deleteReq':
                await control.auth(ctx, next);
                await control.deleteRequests(ctx);
                break;
            case 'mail':
                await control.deleteMailing(ctx, cbData[1]);
                break;
            case 'delete':
                await ctx.telegram.deleteMessage(
                    ctx.update.callback_query.message.chat.id,
                    ctx.update.callback_query.message.message_id
                );
                break;
        }
    } catch (err) {
        console.log(err);
    }
});

//

// bot.help((ctx) => ctx.reply('Send me a sticker'));
// bot.on('sticker', (ctx) => ctx.reply('👍'));
// bot.hears('hi', (ctx) => ctx.reply('Hey there'));
// bot.command('send', (ctx) => {
//     try {
//         id = ctx.message.chat.id;
//         ctx.reply(info);
//     } catch (err) {
//         console.log(err);
//     }
// });

exports.app = app;
exports.bot = bot;
