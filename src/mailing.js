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
                let compare;
                if (el.name === 'value') {
                    compare = Math.abs(currentData[el.crypt][el.fiat] - el.rate);
                } else {
                    compare = Math.abs(((currentData[el.crypt][el.fiat] - el.rate) / el.rate) * 100);
                }

                if (el.ranges[0] <= compare && el.ranges[1] >= compare) {
                    // updating db value
                    await Diff.findOneAndUpdate({ _id: el._id }, { rate: currentData[el.crypt][el.fiat] });

                    const symbol = el.name === 'value' ? el.fiat : '%';

                    bot.telegram.sendMessage(
                        user.chatId,
                        `Hey, there was change in range ${el.ranges[0]} and ${el.ranges[1]} ${symbol}\nCurrent: ${
                            Math.round(currentData[el.crypt][el.fiat] * 100) / 100
                        } | Previous: ${Math.round(el.rate * 100) / 100}\nDifference:  <strong>${
                            Math.round(compare * 100) / 100
                        }</strong> ${symbol}\nfor <strong>${el.crypt}</strong>`,

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
