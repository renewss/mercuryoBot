const User = require('./model');
const fetcher = require('./fetcher');

module.exports = async (bot) => {
    const users = await User.find();
    if (!users) return;

    const current = fetcher.getCurrent();
    const prev = fetcher.getPrev();
    if (!current || !prev) {
        return;
    }

    const currentData = fetcher.getCurrent();

    const settings = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Ok', callback_data: 'delete' }],
                [{ text: 'Stop Mailing', callback_data: 'mail_0' }],
            ],
        },
    };
    users.forEach((user) => {
        console.log(user.mailing);
        if (user.mailing) {
            const [valRangeS, valRangeF] = [user.value[2], user.value[3]];
            const [percentRangeS, percentRangeF] = [user.percent[2], user.percent[3]];
            const diffValue = currentData[user.value[0]][user.value[1]] - user.value[4] * 1;
            const diffPercent =
                ((currentData[user.percent[0]][user.percent[1]] - user.percent[4] * 1) / (user.percent[4] * 1)) * 100;

            console.log('Mailing', diffValue, diffPercent);
            if (valRangeS <= diffValue && valRangeF >= diffValue) {
                bot.telegram.sendMessage(
                    user.chatId,
                    `Hey, there was change in range ${valRangeS} and ${valRangeF} ${user.value[1]} (${
                        Math.round(diffValue * 100) / 100
                    } ${user.value[1]}) for ${user.value[0]}`,
                    settings
                );
            }
            if (percentRangeS <= diffPercent && percentRangeF >= diffPercent) {
                bot.telegram.sendMessage(
                    user.chatId,
                    `Hey, there was change in range ${percentRangeS}% and ${percentRangeF}%  (${
                        Math.round(diffPercent * 100) / 100
                    } %) for ${user.percent[0]} -> ${user.percent[1]}`,
                    settings
                );
            }
        }
    });
};
