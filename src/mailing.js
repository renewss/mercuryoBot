const { User, Diff } = require('./model');
const fetcher = require('./fetcher');

module.exports = async (bot) => {
    try {
        const usersRaw = await User.find().populate({ path: 'diffs' });
        if (!usersRaw) return;

        const users = usersRaw.filter((el) => !!el.diffs);

        const currentData = fetcher.getCurrent();
        if (!currentData) return;

        users.forEach(async (user) => {
            user.diffs.forEach(async (el) => {
                //finding difference
                let absDiff, realDiff;
                if (el.name === 'value') {
                    realDiff = currentData[el.crypt][el.fiat] - el.rate;
                    absDiff = Math.abs(realDiff);
                } else {
                    realDiff = ((currentData[el.crypt][el.fiat] - el.rate) / el.rate) * 100;
                    absDiff = Math.abs(realDiff);
                }

                if (el.ranges[0] <= absDiff && el.ranges[1] >= absDiff) {
                    // updating db value
                    await Diff.findOneAndUpdate({ _id: el._id }, { rate: currentData[el.crypt][el.fiat] });

                    const symbol = el.name === 'value' ? el.fiat : '%';

                    bot.telegram.sendMessage(
                        user.chatId,
                        `Change ${el.crypt}\nRange: <strong>${el.ranges[0]} and ${
                            el.ranges[1]
                        } ${symbol}</strong>\nCurrent: ${
                            Math.round(currentData[el.crypt][el.fiat] * 100) / 100
                        } | Previous: ${Math.round(el.rate * 100) / 100}\nDifference:  <strong>${
                            Math.round(realDiff * 100) / 100
                        } ${symbol}</strong>`,

                        {
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: 'Stop Mailing', callback_data: `mail_${el._id}` }],
                                    [{ text: 'Ok', callback_data: 'delete' }],
                                ],
                            },
                        }
                    );
                }
            });
        });
    } catch (err) {
        console.log(err);
    }
};
