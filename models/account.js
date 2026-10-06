const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
	id: { type: String, required: true, unique: true },
	name: { type: String, required: true, trim: true, maxlength: 70 },
	email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
	salt: { type: String, required: true },
	passwordHash: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);
