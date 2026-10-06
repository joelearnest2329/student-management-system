const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
	id: { type: String, required: true, unique: true, trim: true },
	name: { type: String, required: true, trim: true, maxlength: 70 },
	email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
	phone: { type: String, trim: true, maxlength: 24, default: '' },
	guardian: { type: String, trim: true, maxlength: 70, default: '' },
	course: { type: String, required: true, trim: true, maxlength: 60 },
	year: { type: String, required: true, trim: true, maxlength: 20 },
	status: { type: String, enum: ['Active', 'At risk', 'Inactive'], default: 'Active' },
	attendance: { type: String, default: '\u2014' },
	enrollmentDate: { type: String, default: '' },
	notes: { type: String, maxlength: 500, default: '' },
	color: { type: String, default: '#e9e2f1' }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
