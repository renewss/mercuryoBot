const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        chatId: {
            type: String,
            required: true,
        },
        isChannel: {
            type: Boolean,
            default: false,
        },
        state: {
            type: String,
            default: 'none',
            enum: ['none', 'req_value', 'req_percent'],
        },
        stateLink: String,
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

userSchema.virtual('diffs', {
    ref: 'Diff',
    foreignField: 'user',
    localField: '_id',
});

const User = mongoose.model('User', userSchema);
exports.User = User;

//*********************************************************************** */
const diffSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'review must belong to a user'],
    },
    name: {
        type: String,
        enum: ['value', 'percent'],
        required: true,
    },
    ranges: [Number],
    crypt: String,
    fiat: String,
    rate: Number,
    active: {
        type: Boolean,
        default: false,
    },
});

const Diff = mongoose.model('Diff', diffSchema);

exports.Diff = Diff;
