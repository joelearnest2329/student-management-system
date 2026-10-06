const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
	date: { type: String, required: true, unique: true },
	records: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);