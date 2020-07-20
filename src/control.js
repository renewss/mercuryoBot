// TODO review DIFF SET system, implement mailing
const User = require('./model');
const fetch = require('./fetcher');
const utils = require('./utils');
const { findOne } = require('./model');

const crypts = ['BTC', 'USDT'];
const fiats = ['RUB'];

exports.auth = async (ctx, next) => {
    try {
        let id;
        if (ctx.update.message) id = ctx.update.message.chat.id;
        else id = ctx.update.callback_query.message.chat.id;

        const user = await User.findOne({ chatId: id });
        if (!user) {
            await User.create({ chatId: id });
        }

        ctx.state.id = id;

        next();
    } catch (err) {
        console.log(err);
    }
};

// Menu Level 0
// 0
exports.mainMenu = (ctx, next, replace = false) => {
    const text = 'Hey, You can use buttons below!';
    const inKey = {
        inline_keyboard: [
            [
                { text: 'Current Rates', callback_data: '1_0' },
                { text: 'Get Last Change', callback_data: '1_1' },
            ],
            [
                { text: 'Set Value', callback_data: '1_2' },
                { text: 'Set Percentage', callback_data: '1_3' },
            ],
        ],
    };
    try {
        if (replace) {
            ctx.editMessageText(text, {
                chat_id: ctx.update.callback_query.message.chat.id,
                message_id: ctx.update.callback_query.message.message_id,
                reply_markup: inKey,
            });

            return;
        } else {
            ctx.reply(text, {
                reply_markup: inKey,
            });

            return;
        }
    } catch (err) {
        console.log(err);
    }
};

// Menu Level 1
// 0, 1, 2, 3
exports.cryptMenu = (ctx, param) => {
    // callback query text for 0) current values 1) difference
    let queryNext,
        text = '<strong>';
    switch (param) {
        case 0:
            queryNext = 'current';
            text += 'Current Values\n';
            break;
        case 1:
            queryNext = 'diff';
            text += 'Last Changes\n';
            break;
        case 2:
            queryNext = '2_0';
            text += 'Set Value\n';
            break;
        case 3:
            queryNext = '2_1';
            text += 'Set Percentage\n';
            break;
    }
    text += '</strong>Choose Crypto';

    ctx.editMessageText(text, {
        chat_id: ctx.update.callback_query.message.chat.id,
        message_id: ctx.update.callback_query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                crypts.map((el) => {
                    return {
                        text: `${el}`,
                        callback_data: `${queryNext}_${el}`,
                    };
                }),
                [{ text: 'Back', callback_data: '0_0' }],
            ],
        },
    });
};

// Menu Level 2
// 0, 1
exports.fiatMenu = (ctx, param, crypt) => {
    const queryNext = param ? 'set_percent' : 'set_value';
    let text = '<strong>';
    text += param ? 'Set Percent' : 'Set Value';
    text += '</strong>\nChoose fiat';

    ctx.editMessageText(text, {
        chat_id: ctx.update.callback_query.message.chat.id,
        message_id: ctx.update.callback_query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                fiats.map((el) => {
                    return {
                        text: `${el}`,
                        callback_data: `${queryNext}_${crypt}_${el}`,
                    };
                }),
                [{ text: 'Back', callback_data: `1_${param}` }],
            ],
        },
    });
};

// SET Functions
exports.setDifference = async (ctx, param, crypt, fiat) => {
    const user = await User.findOne({ chatId: ctx.state.id });
    user.state = `req_${param}`;
    user[param] = new Array(crypt, fiat);
    user.mailing = true;
    await user.save();
    sendOkMessage('Send me range.\nex.(-6 -1)', ctx);
};
// param  => 0 - value, 1 - percentage
exports.saveDifference = async (ctx, param) => {
    const range = ctx.update.message.text.split(' ');
    const currentData = fetch.getCurrent();

    if (isNaN(range[0] * 1) || isNaN(range[1] * 1)) return sendOkMessage('Use numbers please!', ctx);
    else if (range[0] * 1 > range[1] * 1) return sendOkMessage('Second limit must be greater. ex. (3 10)', ctx);

    const user = await User.findOne({ chatId: ctx.state.id });
    if (param) {
        user.percent.push(range[0], range[1], currentData[user.percent[0]][user.percent[1]]);
    } else {
        user.value.push(range[0], range[1], currentData[user.value[0]][user.value[1]]);
    }

    user.state = 'none';
    await user.save();
    sendOkMessage('Successfully updated', ctx);
};

exports.toggleMailing = async (ctx, param) => {
    await User.findOneAndUpdate({ chatId: ctx.state.id }, { mailing: !!(param * 1) });
    sendOkMessage('Mailing Status Changed', ctx);
};

// Info Sender Endpoints
exports.sendCurrent = (ctx) => {
    const crypt = ctx.update.callback_query.data.split('_')[1];
    const data = fetch.getCurrent();

    const formated = utils.formatForTable(data[crypt], fiats);
    const table = utils.makeTable(formated, crypt);

    ctx.editMessageText(table, {
        chat_id: ctx.update.callback_query.message.chat.id,
        message_id: ctx.update.callback_query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [[{ text: 'Back', callback_data: '1_0' }]],
        },
    });
};

exports.sendDiff = (ctx) => {
    const crypt = ctx.update.callback_query.data.split('_')[1];

    const current = fetch.getCurrent();
    const prev = fetch.getPrev();
    if (!current || !prev) {
        sendOkMessage('Values are not available. Try again later!', ctx);
        return;
    }

    const formCurr = utils.formatForTable(current[crypt], fiats);
    const formPrev = utils.formatForTable(prev[crypt], fiats);

    const merged = utils.mergeDiffTable(formCurr, formPrev);
    const table = utils.makeTable(merged, crypt);

    ctx.editMessageText(table, {
        chat_id: ctx.update.callback_query.message.chat.id,
        message_id: ctx.update.callback_query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [[{ text: 'Back', callback_data: '1_1' }]],
        },
    });
};

function sendOkMessage(text, ctx) {
    ctx.reply(text, {
        reply_markup: {
            inline_keyboard: [[{ text: 'Ok', callback_data: 'delete' }]],
        },
    });
}
