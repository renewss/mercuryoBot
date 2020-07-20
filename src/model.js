const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true,
    },
    isChannel: {
        type: Boolean,
        default: false,
    },
    value: [String],
    percent: [String],
    mailing: Boolean,
    state: {
        type: String,
        default: 'none',
        enum: ['none', 'req_value', 'req_percent'],
    },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
