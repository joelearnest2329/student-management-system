require('dotenv').config();

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const Account = require('./models/account');
const Attendance = require('./models/attendance');
const connectDatabase = require('./models/db');
const Course = require('./models/course');
const Session = require('./models/session');
const Student = require('./models/student');

const scrypt = promisify(crypto.scrypt);
const root = __dirname;
const databasePath = process.env.CAMPUSLY_DATA_PATH || path.join(root, '.data', 'campusly.json');
const sessionDurationMs = 30 * 24 * 60 * 60 * 1000;
const port = Number(process.env.PORT) || 3000;

const seedStudents = [
	{ id: 'STU-2025-001', name: 'Olivia Chen', email: 'olivia.chen@campus.edu', course: 'Computer Science', year: 'Year 3', status: 'Active', attendance: '96%', color: '#e9e2f1' },
	{ id: 'STU-2025-002', name: 'Noah Williams', email: 'noah.williams@campus.edu', course: 'Business Admin', year: 'Year 2', status: 'Active', attendance: '91%', color: '#f4e7d6' },
	{ id: 'STU-2025-003', name: 'Amara Okafor', email: 'amara.okafor@campus.edu', course: 'Psychology', year: 'Year 4', status: 'Active', attendance: '88%', color: '#e7eee2' },
	{ id: 'STU-2025-004', name: 'Ethan Patel', email: 'ethan.patel@campus.edu', course: 'Computer Science', year: 'Year 1', status: 'At risk', attendance: '72%', color: '#f1e4e1' },
	{ id: 'STU-2025-005', name: 'Sofia Martinez', email: 'sofia.martinez@campus.edu', course: 'Graphic Design', year: 'Year 3', status: 'Active', attendance: '98%', color: '#e1ebf0' },
	{ id: 'STU-2025-006', name: 'Liam Thompson', email: 'liam.thompson@campus.edu', course: 'Business Admin', year: 'Year 2', status: 'Active', attendance: '94%', color: '#f2ead9' },
	{ id: 'STU-2025-007', name: 'Maya Johnson', email: 'maya.johnson@campus.edu', course: 'Psychology', year: 'Year 1', status: 'Inactive', attendance: '—', color: '#e8e5ef' },
	{ id: 'STU-2025-008', name: 'Lucas Kim', email: 'lucas.kim@campus.edu', course: 'Data Science', year: 'Year 4', status: 'Active', attendance: '89%', color: '#e2ece8' },
	{ id: 'STU-2025-009', name: 'Priya Shah', email: 'priya.shah@campus.edu', course: 'Graphic Design', year: 'Year 2', status: 'Active', attendance: '93%', color: '#f1e4e1' },
	{ id: 'STU-2025-010', name: 'Gabriel Costa', email: 'gabriel.costa@campus.edu', course: 'Data Science', year: 'Year 3', status: 'At risk', attendance: '76%', color: '#e6e9dd' },
	{ id: 'STU-2025-011', name: 'Ava Robinson', email: 'ava.robinson@campus.edu', course: 'Computer Science', year: 'Year 2', status: 'Active', attendance: '97%', color: '#f4e8d9' },
	{ id: 'STU-2025-012', name: 'James Okoye', email: 'james.okoye@campus.edu', course: 'Psychology', year: 'Year 3', status: 'Active', attendance: '90%', color: '#e4eced' }
];

const seedCourses = [
	{ code: 'CS-301', name: 'Computer Science', department: 'School of Technology', instructor: 'Dr. Elena Rivera', students: 68, credits: 4, color: 'green', icon: 'code-2' },
	{ code: 'BA-204', name: 'Business Administration', department: 'School of Business', instructor: 'Prof. Marcus Lee', students: 52, credits: 3, color: 'coral', icon: 'briefcase-business' },
	{ code: 'PS-410', name: 'Psychology', department: 'School of Social Sciences', instructor: 'Dr. Naomi Brooks', students: 41, credits: 3, color: 'gold', icon: 'brain' },
	{ code: 'GD-220', name: 'Graphic Design', department: 'School of Creative Arts', instructor: 'Prof. Jules Martin', students: 36, credits: 4, color: 'blue', icon: 'palette' },
	{ code: 'DS-315', name: 'Data Science', department: 'School of Technology', instructor: 'Dr. Andrew Park', students: 29, credits: 4, color: 'lilac', icon: 'chart-no-axes-combined' },
	{ code: 'EN-105', name: 'Environmental Studies', department: 'School of Natural Sciences', instructor: 'Dr. Hannah Green', students: 22, credits: 3, color: 'mint', icon: 'leaf' }
];


async function initializeDatabase() {
	let legacyDatabase = {};
	try {
		legacyDatabase = JSON.parse(await fs.promises.readFile(databasePath, 'utf8'));
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
	}

	if (await Student.countDocuments() === 0) {
		await Student.insertMany(legacyDatabase.students?.length ? legacyDatabase.students : seedStudents);
	}
	if (await Course.countDocuments() === 0) {
		await Course.insertMany(legacyDatabase.courses?.length ? legacyDatabase.courses : seedCourses);
	}
	if (await Account.countDocuments() === 0 && legacyDatabase.accounts?.length) {
		await Account.insertMany(legacyDatabase.accounts.map((account) => ({ ...account, id: account.id || crypto.randomUUID() })));
	}
	if (await Attendance.countDocuments() === 0) {
		const records = Object.entries(legacyDatabase.attendance || {}).map(([date, attendance]) => ({ date, records: attendance }));
		if (records.length) await Attendance.insertMany(records);
	}
}

function send(response, status, payload) {
	response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
	response.end(JSON.stringify(payload));
}

async function readBody(request) {
	let body = '';
	for await (const chunk of request) {
		body += chunk;
		if (body.length > 1024 * 1024) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
	}
	try {
		return JSON.parse(body || '{}');
	} catch {
		throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 });
	}
}

function requireText(value, label, maxLength) {
	if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
		throw Object.assign(new Error(`${label} is required and must be no longer than ${maxLength} characters.`), { status: 400 });
	}
	return value.trim();
}

function hashSessionToken(token) {
	return crypto.createHash('sha256').update(token).digest('hex');
}

async function createSession(accountId) {
	const token = crypto.randomBytes(32).toString('hex');
	await Session.create({
		tokenHash: hashSessionToken(token),
		accountId,
		expiresAt: new Date(Date.now() + sessionDurationMs)
	});
	return token;
}

async function getSession(request) {
	const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
	if (!token) return null;
	const session = await Session.findOne({ tokenHash: hashSessionToken(token), expiresAt: { $gt: new Date() } }).lean();
	return session?.accountId || null;
}

async function createAccount(body) {
	const name = requireText(body.name, 'Name', 70);
	const email = requireText(body.email, 'Email', 120).toLowerCase();
	const password = requireText(body.password, 'Password', 200);
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('Enter a valid email address.'), { status: 400 });
	if (password.length < 8) throw Object.assign(new Error('Password must be at least 8 characters.'), { status: 400 });
	if (await Account.exists({ email })) throw Object.assign(new Error('An account with this email already exists.'), { status: 409 });
	const salt = crypto.randomBytes(16).toString('hex');
	const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
	return Account.create({ id: crypto.randomUUID(), name, email, salt, passwordHash });
}

async function login(body) {
	const email = requireText(body.email, 'Email', 120).toLowerCase();
	const password = requireText(body.password, 'Password', 200);
	const account = await Account.findOne({ email }).lean();
	if (!account) throw Object.assign(new Error('Email or password is incorrect.'), { status: 401 });
	const passwordHash = (await scrypt(password, account.salt, 64)).toString('hex');
	if (!crypto.timingSafeEqual(Buffer.from(passwordHash, 'hex'), Buffer.from(account.passwordHash, 'hex'))) {
		throw Object.assign(new Error('Email or password is incorrect.'), { status: 401 });
	}
	return account;
}

async function updateAttendancePercentages(resetStudentIds = []) {
	const [students, attendanceDays] = await Promise.all([
		Student.find().select('id').lean(),
		Attendance.find().lean()
	]);
	const totals = new Map(students.map((student) => [student.id, { attended: 0, marked: 0 }]));
	for (const day of attendanceDays) {
		for (const [studentId, status] of Object.entries(day.records || {})) {
			const total = totals.get(studentId);
			if (!total || !['present', 'absent', 'late'].includes(status)) continue;
			total.marked += 1;
			if (status === 'present' || status === 'late') total.attended += 1;
		}
	}

	const resetIds = new Set(resetStudentIds);
	const studentAttendance = {};
	const operations = [];
	for (const [studentId, total] of totals) {
		if (total.marked) {
			studentAttendance[studentId] = `${Math.round((total.attended / total.marked) * 1000) / 10}%`;
		} else if (resetIds.has(studentId)) {
			studentAttendance[studentId] = '\u2014';
		} else {
			continue;
		}
		operations.push({ updateOne: { filter: { id: studentId }, update: { $set: { attendance: studentAttendance[studentId] } } } });
	}
	if (operations.length) await Student.bulkWrite(operations);
	return studentAttendance;
}

function publicAccount(account) {
	return { id: account.id, name: account.name, email: account.email };
}

function staticFile(request, response, pathname) {
	const requestedPath = pathname === '/' ? '/index.html' : pathname;
	const filePath = path.resolve(root, `.${decodeURIComponent(requestedPath)}`);
	if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== path.join(root, 'index.html')) {
		response.writeHead(403).end('Forbidden');
		return;
	}
	const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
	fs.createReadStream(filePath)
		.on('error', () => response.writeHead(404).end('Not found'))
		.on('open', () => response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' }))
		.pipe(response);
}

async function handleApi(request, response, url, database) {
	const { pathname } = url;
	if (request.method === 'POST' && pathname === '/api/auth/register') {
		const account = await createAccount(await readBody(request));
		const token = await createSession(account.id);
		return send(response, 201, { token, account: publicAccount(account) });
	}
	if (request.method === 'POST' && pathname === '/api/auth/login') {
		const account = await login(await readBody(request));
		const token = await createSession(account.id);
		return send(response, 200, { token, account: publicAccount(account) });
	}

	const accountId = await getSession(request);
	if (!accountId) return send(response, 401, { error: 'Please sign in to continue.' });
	if (request.method === 'GET' && pathname === '/api/auth/me') {
		const account = await Account.findOne({ id: accountId }).lean();
		if (!account) return send(response, 401, { error: 'Please sign in to continue.' });
		return send(response, 200, { account: publicAccount(account) });
	}
	if (request.method === 'POST' && pathname === '/api/auth/logout') {
		const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
		if (token) await Session.deleteOne({ tokenHash: hashSessionToken(token) });
		return send(response, 200, { ok: true });
	}
	if (request.method === 'GET' && pathname === '/api/data') {
		const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
		const [students, courses, attendance] = await Promise.all([
			Student.find().sort({ _id: 1 }).lean(),
			Course.find().sort({ _id: 1 }).lean(),
			Attendance.findOne({ date }).lean()
		]);
		return send(response, 200, { students, courses, attendance: attendance?.records || {}, attendanceExists: Boolean(attendance) });
	}
	if (request.method === 'GET' && pathname === '/api/courses') {
		return send(response, 200, { courses: await Course.find().sort({ _id: 1 }).lean() });
	}
	if (request.method === 'GET' && pathname === '/api/students') {
		return send(response, 200, { students: await Student.find().sort({ _id: 1 }).lean() });
	}
	if (pathname.startsWith('/api/students/')) {
		const studentId = decodeURIComponent(pathname.slice('/api/students/'.length)).trim();
		if (!/^[a-z0-9-]{1,24}$/i.test(studentId)) throw Object.assign(new Error('Student ID is invalid.'), { status: 400 });
		if (request.method === 'GET') {
			const student = await Student.findOne({ id: studentId }).lean();
			if (!student) return send(response, 404, { error: 'Student not found.' });
			return send(response, 200, { student });
		}
		if (request.method === 'PUT') {
			const body = await readBody(request);
			const email = requireText(body.email, 'Email', 120).toLowerCase();
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('Enter a valid email address.'), { status: 400 });
			if (await Student.exists({ email, id: { $ne: studentId } })) throw Object.assign(new Error('A student with that email already exists.'), { status: 409 });
			const status = body.status === undefined ? 'Active' : body.status;
			if (!['Active', 'At risk', 'Inactive'].includes(status)) throw Object.assign(new Error('Student status is invalid.'), { status: 400 });
			const student = await Student.findOneAndUpdate({ id: studentId }, { $set: {
				name: requireText(body.name, 'Name', 70), email,
				course: requireText(body.course, 'Course', 60), year: requireText(body.year, 'Year', 20), status,
				phone: String(body.phone || '').slice(0, 24), guardian: String(body.guardian || '').slice(0, 70),
				attendance: String(body.attendance || '\u2014').slice(0, 20), enrollmentDate: String(body.enrollmentDate || '').slice(0, 10),
				notes: String(body.notes || '').slice(0, 500)
			} }, { returnDocument: 'after', runValidators: true }).lean();
			if (!student) return send(response, 404, { error: 'Student not found.' });
			return send(response, 200, { student });
		}
		if (request.method === 'DELETE') {
			const student = await Student.findOneAndDelete({ id: studentId }).lean();
			if (!student) return send(response, 404, { error: 'Student not found.' });
			await Attendance.updateMany({}, { $unset: { [`records.${studentId}`]: 1 } });
			return send(response, 200, { ok: true });
		}
	}
	if (request.method === 'POST' && pathname === '/api/students') {
		const body = await readBody(request);
		const email = requireText(body.email, 'Email', 120).toLowerCase();
		if (await Student.exists({ email })) throw Object.assign(new Error('A student with that email already exists.'), { status: 409 });
		const name = requireText(body.name, 'Name', 70);
		const existingIds = await Student.find().select('id').lean();
		const nextId = existingIds.reduce((highest, entry) => Math.max(highest, Number(entry.id.match(/(\d+)$/)?.[1]) || 0), 0) + 1;
		const student = await Student.create({
			id: `STU-2025-${String(nextId).padStart(3, '0')}`,
			name, email, phone: String(body.phone || '').slice(0, 24), guardian: String(body.guardian || '').slice(0, 70),
			course: requireText(body.course, 'Course', 60), year: requireText(body.year, 'Year', 20), status: 'Active', attendance: body.attendance || '—',
			enrollmentDate: String(body.enrollmentDate || ''), notes: String(body.notes || '').slice(0, 500), color: ['#e9e2f1', '#f4e7d6', '#e7eee2', '#e1ebf0'][existingIds.length % 4]
		});
		return send(response, 201, { student });
	}
	if (request.method === 'POST' && pathname === '/api/courses') {
		const body = await readBody(request);
		const code = requireText(body.code, 'Course code', 12).toUpperCase();
		if (await Course.exists({ code })) throw Object.assign(new Error('A course with that code already exists.'), { status: 409 });
		const course = await Course.create({
			code, name: requireText(body.name, 'Course name', 60), department: requireText(body.department, 'Department', 60),
			instructor: requireText(body.instructor, 'Instructor', 60), students: 0, credits: Math.max(1, Math.min(12, Number(body.credits) || 3)),
			color: ['green', 'coral', 'gold', 'blue', 'lilac', 'mint'][await Course.countDocuments() % 6], icon: 'book-open'
		});
		return send(response, 201, { course });
	}
	if (pathname.startsWith('/api/courses/')) {
		const code = decodeURIComponent(pathname.slice('/api/courses/'.length)).trim().toUpperCase();
		if (!code) throw Object.assign(new Error('Course code is required.'), { status: 400 });
		if (request.method === 'GET') {
			const course = await Course.findOne({ code }).lean();
			if (!course) return send(response, 404, { error: 'Course not found.' });
			return send(response, 200, { course });
		}
		if (request.method === 'PUT') {
			const body = await readBody(request);
			const existing = await Course.findOne({ code }).lean();
			if (!existing) return send(response, 404, { error: 'Course not found.' });
			const credits = Number(body.credits);
			if (!Number.isInteger(credits) || credits < 1 || credits > 12) {
				throw Object.assign(new Error('Credits must be a whole number from 1 to 12.'), { status: 400 });
			}
			const name = requireText(body.name, 'Course name', 60);
			const course = await Course.findOneAndUpdate({ code }, { $set: {
				name,
				department: requireText(body.department, 'Department', 60),
				instructor: requireText(body.instructor, 'Instructor', 60),
				credits
			} }, { returnDocument: 'after', runValidators: true }).lean();
			if (existing.name !== name) await Student.updateMany({ course: existing.name }, { $set: { course: name } });
			return send(response, 200, { course });
		}
		if (request.method === 'DELETE') {
			const course = await Course.findOne({ code }).lean();
			if (!course) return send(response, 404, { error: 'Course not found.' });
			if (await Student.exists({ course: course.name })) {
				return send(response, 409, { error: 'Move enrolled students to another course before deleting this course.' });
			}
			const result = await Course.deleteOne({ code });
			if (!result.deletedCount) return send(response, 404, { error: 'Course not found.' });
			return send(response, 200, { ok: true });
		}
	}
	if (pathname === '/api/attendance' && request.method === 'GET') {
		const date = requireText(url.searchParams.get('date') || '', 'Date', 10);
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Object.assign(new Error('Attendance date is invalid.'), { status: 400 });
		const attendance = await Attendance.findOne({ date }).lean();
		return send(response, 200, { date, records: attendance?.records || {}, exists: Boolean(attendance) });
	}
	if (pathname === '/api/attendance' && request.method === 'DELETE') {
		const date = requireText(url.searchParams.get('date') || '', 'Date', 10);
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Object.assign(new Error('Attendance date is invalid.'), { status: 400 });
		const deletedAttendance = await Attendance.findOneAndDelete({ date }).lean();
		if (!deletedAttendance) return send(response, 404, { error: 'No attendance record exists for that date.' });
		const studentAttendance = await updateAttendancePercentages(Object.keys(deletedAttendance.records || {}));
		return send(response, 200, { ok: true, studentAttendance });
	}
	if (request.method === 'PUT' && pathname === '/api/attendance') {
		const body = await readBody(request);
		const date = requireText(body.date, 'Date', 10);
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !body.records || typeof body.records !== 'object' || Array.isArray(body.records)) {
			throw Object.assign(new Error('Attendance date or records are invalid.'), { status: 400 });
		}
		const students = await Student.find().select('id').lean();
		const validStudentIds = new Set(students.map((student) => student.id));
		const records = {};
		for (const [studentId, status] of Object.entries(body.records)) {
			if (validStudentIds.has(studentId) && ['present', 'absent', 'late'].includes(status)) records[studentId] = status;
		}
		const attendance = await Attendance.findOneAndUpdate(
			{ date },
			{ $set: { records: { ...(await Attendance.findOne({ date }).lean())?.records, ...records } } },
			{ upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
		).lean();
		const studentAttendance = await updateAttendancePercentages();
		return send(response, 200, { records: attendance.records, studentAttendance });
	}
	if (request.method === 'POST' && pathname === '/api/reset') {
		await Promise.all([Student.deleteMany({}), Attendance.deleteMany({})]);
		const students = await Student.insertMany(seedStudents);
		return send(response, 200, { students, attendance: {} });
	}
	return send(response, 404, { error: 'API route not found.' });
}

const server = http.createServer(async (request, response) => {
	try {
		const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
		if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url);
		if (request.method !== 'GET' && request.method !== 'HEAD') return send(response, 405, { error: 'Method not allowed.' });
		staticFile(request, response, url.pathname);
	} catch (error) {
		if (!response.headersSent) send(response, error.status || 500, { error: error.status ? error.message : 'The server could not complete the request.' });
		else response.destroy();
		if (!error.status) console.error(error);
	}
});


connectDatabase().then(initializeDatabase).then(() => {
	server.listen(port, () => console.log(`Campusly is running at http://localhost:${port}`));
}).catch((error) => {
	console.error('Could not connect to MongoDB or initialize the database.', error.message);
	process.exitCode = 1;
});
