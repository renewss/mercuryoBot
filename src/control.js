// TODO review DIFF SET system, implement mailing
const { User, Diff } = require('./model');
const fetch = require('./fetcher');
const utils = require('./utils');
const { findOne } = require('./model');

const crypts = ['BTC', 'USDT', 'ETH', 'BAT', 'ALGO'];
const fiats = ['RUB', 'USD', 'EUR', 'UAH', 'TRY'];

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

// Main Menu
exports.mainMenu = (ctx, next, replace = false) => {
    const text = '<strong>Main Menu</strong>';
    const inKey = {
        inline_keyboard: [[{ text: 'Rates', callback_data: '0_0' }], [{ text: 'Requests', callback_data: '0_1' }]],
    };

    try {
        if (replace) {
            ctx.editMessageText(text, {
                chat_id: ctx.update.callback_query.message.chat.id,
                message_id: ctx.update.callback_query.message.message_id,
                parse_mode: 'HTML',
                reply_markup: inKey,
            });

            return;
        } else {
            ctx.reply(text, {
                parse_mode: 'HTML',
                reply_markup: inKey,
            });

            return;
        }
    } catch (err) {
        console.log(err);
    }
};

// Menu Level 0
// 0
exports.rateMenu = (ctx) => {
    const text = '<strong>Rates Menu</strong>';

    ctx.editMessageText(text, {
        chat_id: ctx.update.callback_query.message.chat.id,
        message_id: ctx.update.callback_query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Current Rates', callback_data: '1_0' },
                    { text: 'Get Last Change', callback_data: '1_1' },
                ],
                [{ text: 'Back', callback_data: 'main' }],
            ],
        },
    });
};

// 0 1
exports.reqMenu = (ctx) => {
    const text = '<strong>Requests Menu</strong>';

    ctx.editMessageText(text, {
        chat_id: ctx.update.callback_query.message.chat.id,
        message_id: ctx.update.callback_query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Set Value', callback_data: '1_2' },
                    { text: 'Set Percentage', callback_data: '1_3' },
                ],
                [
                    { text: 'Show All Requests', callback_data: 'request_show' },
                    { text: 'Delete All Requests', callback_data: 'confirm_delete' },
                ],
                [{ text: 'Back', callback_data: 'main' }],
            ],
        },
    });
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

// SET Endpoints (Request  Menu)
exports.setDifference = async (ctx, param, crypt, fiat) => {
    const user = await User.findOne({ chatId: ctx.state.id });
    const diff = await Diff.create({ user: user._id, name: param, crypt, fiat });

    user.state = `req_${param}`;
    user.stateLink = diff._id;
    await user.save();

    sendOkMessage('Send me range.\nex.(-6 -1)', ctx);
};
// param  => 0 - value, 1 - percentage
exports.saveDifference = async (ctx) => {
    const range = ctx.update.message.text.split(' ');
    const currentData = fetch.getCurrent();

    if (isNaN(range[0] * 1) || isNaN(range[1] * 1)) return sendOkMessage('Use numbers please!', ctx);
    if (range[0] * 1 < 0 || range[1] * 1 < 0) return sendOkMessage('Use positive numbers', ctx);
    else if (range[0] * 1 > range[1] * 1) return sendOkMessage('Second limit must be greater. ex. (3 10)', ctx);

    const user = await User.findOne({ chatId: ctx.state.id });
    const diff = await Diff.findById(user.stateLink);

    diff.ranges = new Array(range[0] * 1, range[1] * 1);
    diff.rate = currentData[diff.crypt][diff.fiat];
    diff.active = true;
    user.state = 'none';
    user.stateLink = undefined;

    await diff.save();
    await user.save();

    sendOkMessage('Successfully updated', ctx);
};

exports.showReqs = async (ctx) => {
    try {
        const user = await User.findOne({ chatId: ctx.state.id }).populate({ path: 'diffs' });
        if (!user.diffs.length) {
            sendOkMessage('Request List is Empty!', ctx);
            return;
        }

        let arr = [];
        user.diffs.forEach((el) => {
            if (el.active) arr.push(new Array(el.name, el.crypt, el.fiat, `${el.ranges[0]} - ${el.ranges[1]}`));
        });

        const table = utils.makeTable(arr, '');

        ctx.editMessageText(table, {
            chat_id: ctx.update.callback_query.message.chat.id,
            message_id: ctx.update.callback_query.message.message_id,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[{ text: 'Back', callback_data: '0_1' }]],
            },
        });
    } catch (err) {
        console.log(err);
    }
};

exports.confirmDeleteReq = (ctx) => {
    try {
        ctx.editMessageText('Delete All Requests?', {
            chat_id: ctx.update.callback_query.message.chat.id,
            message_id: ctx.update.callback_query.message.message_id,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Confirm', callback_data: 'deleteReq' }],
                    [{ text: 'Back', callback_data: '0_1' }],
                ],
            },
        });
    } catch (err) {
        console.log(err);
    }
};
exports.deleteRequests = async (ctx) => {
    try {
        const user = await User.findOne({ chatId: ctx.state.id });

        await Diff.deleteMany({ user: user._id });
        sendOkMessage('Request List Deleted', ctx);
    } catch (err) {
        console.log(err);
    }
};

//
exports.deleteMailing = async (ctx, id) => {
    await Diff.findOneAndDelete({ _id: id });
    sendOkMessage('Mailing Deleted', ctx);
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
