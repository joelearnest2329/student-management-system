const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
	tokenHash: { type: String, required: true, unique: true },
	accountId: { type: String, required: true, index: true },
	expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);