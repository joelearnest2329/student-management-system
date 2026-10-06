const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
	code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 12 },
	name: { type: String, required: true, trim: true, maxlength: 60 },
	department: { type: String, required: true, trim: true, maxlength: 60 },
	instructor: { type: String, required: true, trim: true, maxlength: 60 },
	students: { type: Number, default: 0, min: 0 },
	credits: { type: Number, required: true, min: 1, max: 12 },
	color: { type: String, default: 'green' },
	icon: { type: String, default: 'book-open' }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
