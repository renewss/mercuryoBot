const axios = require('axios');
const { dcf } = require('./utils');

let data, prevData;

exports.fetch = async () => {
    try {
        prevData = dcf(data);
        data = (await axios.get('https://api.mercuryo.io/v1.5/public/rates')).data.data.buy;
        console.log('Info Fetched', data.BTC.RUB, data.USDT.RUB);
    } catch (err) {
        console.log(err);
    }
};

exports.getCurrent = () => {
    return data;
};
exports.getPrev = () => {
    return prevData;
};
