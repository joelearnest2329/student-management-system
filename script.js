const students = [
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

const courses = [
	{ code: 'CS-301', name: 'Computer Science', department: 'School of Technology', instructor: 'Dr. Elena Rivera', students: 68, credits: 4, color: 'green', icon: 'code-2' },
	{ code: 'BA-204', name: 'Business Administration', department: 'School of Business', instructor: 'Prof. Marcus Lee', students: 52, credits: 3, color: 'coral', icon: 'briefcase-business' },
	{ code: 'PS-410', name: 'Psychology', department: 'School of Social Sciences', instructor: 'Dr. Naomi Brooks', students: 41, credits: 3, color: 'gold', icon: 'brain' },
	{ code: 'GD-220', name: 'Graphic Design', department: 'School of Creative Arts', instructor: 'Prof. Jules Martin', students: 36, credits: 4, color: 'blue', icon: 'palette' },
	{ code: 'DS-315', name: 'Data Science', department: 'School of Technology', instructor: 'Dr. Andrew Park', students: 29, credits: 4, color: 'lilac', icon: 'chart-no-axes-combined' },
	{ code: 'EN-105', name: 'Environmental Studies', department: 'School of Natural Sciences', instructor: 'Dr. Hannah Green', students: 22, credits: 3, color: 'mint', icon: 'leaf' }
];

const activities = [
	{ icon: 'user-plus', text: '<strong>Olivia Chen</strong> was enrolled in Computer Science', time: '12 minutes ago' },
	{ icon: 'clipboard-check', text: 'Attendance recorded for <strong>Year 2 · Section A</strong>', time: '48 minutes ago' },
	{ icon: 'book-open-check', text: '<strong>Data Science</strong> course roster was updated', time: '2 hours ago' },
	{ icon: 'circle-alert', text: '<strong>2 students</strong> flagged for low attendance', time: 'Yesterday at 4:32 PM' }
];

const attendanceRecords = Object.fromEntries(students.map((student) => [student.id, student.status === 'Inactive' ? 'absent' : 'present']));
const viewContent = document.querySelector('#view-content');
const sidebar = document.querySelector('#sidebar');
const navCount = document.querySelector('#student-nav-count');
const authRoot = document.querySelector('#auth-root');
const previewMode = window.location.hostname.endsWith('.github.io') || new URLSearchParams(window.location.search).has('preview');
let currentView = 'overview';
let studentFilter = '';
let studentPage = 1;
let attendanceFilter = '';
let attendanceDate = new Date().toISOString().slice(0, 10);
let attendanceExists = false;
let toastTimer;
let currentUser = null;
let authToken = '';
try { authToken = localStorage.getItem('campusly.token') || ''; } catch {}

const icon = (name, className = '') => `<i data-lucide="${name}"${className ? ` class="${className}"` : ''}></i>`;
const initials = (name) => escapeHtml(name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase());
const avatar = (student) => `<span class="avatar" style="background:${student.color};color:#43534a">${initials(student.name)}</span>`;
const statusPill = (status) => `<span class="status-pill${status === 'At risk' ? ' warning' : status === 'Inactive' ? ' inactive' : ''}">${status}</span>`;
const studentRow = (student) => `<tr>
	<td><div class="student-cell">${avatar(student)}<div><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.email)}</small></div></div></td>
	<td>${escapeHtml(student.id)}</td><td>${escapeHtml(student.course)}</td><td>${escapeHtml(student.year)}</td><td>${escapeHtml(student.attendance)}</td><td>${statusPill(escapeHtml(student.status))}</td>
</tr>`;

async function apiRequest(path, options = {}) {
	if (previewMode) throw new Error('This is a read-only preview. Backend features are unavailable.');
	const response = await fetch(path, {
		...options,
		headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...options.headers }
	});
	const result = await response.json();
	if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
	return result;
}

async function loadWorkspaceData() {
	const data = await apiRequest(`/api/data?date=${encodeURIComponent(attendanceDate)}`);
	students.splice(0, students.length, ...data.students);
	courses.splice(0, courses.length, ...data.courses);
	attendanceExists = data.attendanceExists;
	Object.keys(attendanceRecords).forEach((studentId) => delete attendanceRecords[studentId]);
	for (const student of students) attendanceRecords[student.id] = data.attendance[student.id] || (student.status === 'Inactive' ? 'absent' : 'present');
}

function renderAuth(mode = 'login', errorMessage = '') {
	document.body.classList.add('auth-required');
	const registering = mode === 'register';
	authRoot.innerHTML = `<main class="auth-layout"><section class="auth-form-side"><a class="brand auth-brand" href="#" aria-label="Campusly"><span class="brand-mark"><i data-lucide="graduation-cap"></i></span><span class="brand-name">campusly<span>.</span><small>ACADEMIC PORTAL</small></span></a><div class="auth-form-wrap"><div class="eyebrow">${registering ? 'GET STARTED' : 'WELCOME BACK'}</div><h1>${registering ? 'Create your account' : 'Sign in to Campusly'}</h1><p class="auth-subtitle">${registering ? 'Set up your campus workspace in a few steps.' : 'Your campus, organized in one place.'}</p>${errorMessage ? `<div class="auth-error" role="alert">${escapeHtml(errorMessage)}</div>` : ''}<form id="auth-form" data-auth-mode="${mode}" class="auth-form">${registering ? '<div class="form-field"><label for="auth-name">Full name</label><input id="auth-name" name="name" autocomplete="name" required maxlength="70" placeholder="Your name"></div>' : ''}<div class="form-field"><label for="auth-email">Email address</label><input id="auth-email" name="email" type="email" autocomplete="email" required placeholder="you@school.edu"></div><div class="form-field"><div class="auth-label-row"><label for="auth-password">Password</label>${registering ? '' : '<span>Use your account password</span>'}</div><input id="auth-password" name="password" type="password" autocomplete="${registering ? 'new-password' : 'current-password'}" required minlength="8" placeholder="At least 8 characters"></div>${registering ? '<div class="form-field"><label for="auth-confirm">Confirm password</label><input id="auth-confirm" name="confirm" type="password" autocomplete="new-password" required minlength="8" placeholder="Re-enter your password"></div>' : ''}<button class="button button-primary auth-submit" type="submit">${registering ? 'Create account' : 'Sign in'}${icon('arrow-right')}</button></form><p class="auth-switch">${registering ? 'Already have an account?' : 'New to Campusly?'} <button type="button" data-auth-mode="${registering ? 'login' : 'register'}">${registering ? 'Sign in' : 'Create an account'}</button></p><p class="auth-disclaimer">Demo authentication and records are stored only in this browser. Do not use real passwords or sensitive student information.</p></div></section><aside class="auth-aside"><div class="auth-aside-top"><span class="auth-kicker">THE CAMPUSLY PORTAL</span><span class="auth-status"><i></i> ACADEMIC YEAR 2025–26</span></div><div class="auth-art" aria-hidden="true"><div class="auth-orbit orbit-one"></div><div class="auth-orbit orbit-two"></div><div class="auth-art-card"><i data-lucide="graduation-cap"></i><span>YOUR CAMPUS</span><strong>All in one place.</strong></div><div class="auth-art-dot dot-one"></div><div class="auth-art-dot dot-two"></div><div class="auth-art-dot dot-three"></div></div><div class="auth-aside-copy"><div class="eyebrow">BUILT FOR YOUR CAMPUS</div><h2>Make room for what matters.</h2><p>Keep student records, attendance, and academic programs together in one clear workspace.</p></div><div class="auth-aside-footer"><span>STUDENT MANAGEMENT</span><span>01 — 05</span></div></aside></main>`;
	refreshIcons();
}

function enterWorkspace(account) {
	currentUser = account;
	document.body.classList.remove('auth-required');
	document.body.classList.toggle('preview-mode', previewMode);
	document.querySelector('#preview-banner').hidden = !previewMode;
	authRoot.innerHTML = '';
	document.querySelector('#profile-name').textContent = account.name;
	document.querySelector('#profile-avatar').textContent = initials(account.name);
	document.querySelector('.topbar-user-name').textContent = account.name;
	document.querySelector('.topbar-user .avatar').textContent = initials(account.name);
	renderView();
}

function refreshIcons() {
	if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
}

function setView(view) {
	closeAttendanceNotifications();
	currentView = view;
	const labels = { overview: 'Overview', students: 'Students', courses: 'Courses', attendance: 'Attendance', database: 'Data collection', reports: 'Reports', settings: 'Settings' };
	document.querySelector('#breadcrumb-current').textContent = labels[view] || 'Overview';
	document.querySelectorAll('.nav-link[data-view]').forEach((link) => link.classList.toggle('active', link.dataset.view === view));
	renderView();
	sidebar.classList.remove('open');
	document.querySelector('.mobile-scrim')?.classList.remove('visible');
	window.scrollTo({ top: 0, behavior: 'smooth' });
}

function pageHeading(title, subtitle, action = '') {
	return `<div class="page-heading"><div><div class="eyebrow">STUDENT MANAGEMENT</div><h1>${title}</h1><p class="page-subtitle">${subtitle}</p></div>${action ? `<div class="heading-actions">${action}</div>` : ''}</div>`;
}

function metricCard(label, value, note, iconName, color, trend = 'positive') {
	return `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon ${color}">${icon(iconName)}</span></div><div class="metric-value">${value}</div><div class="metric-note"><span class="${trend}">${note.split('|')[0]}</span>${note.split('|')[1] || ''}</div></article>`;
}

function renderOverview() {
	const bars = [
		[46, 60], [55, 68], [47, 64], [68, 72], [58, 66], [72, 82], [67, 78], [82, 85], [73, 90], [86, 88], [77, 95], [91, 100]
	];
	const chart = `<div class="chart-area"><div class="chart-y-labels"><span>300</span><span>225</span><span>150</span><span>75</span><span>0</span></div><div class="chart-gridlines"><span></span><span></span><span></span><span></span><span></span></div><div class="bar-chart">${bars.map(([previous, current]) => `<div class="bar-group"><span class="bar" style="height:${previous}%"></span><span class="bar current" style="height:${current}%"></span></div>`).join('')}</div><div class="chart-x-labels"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span></div></div>`;
	return `${pageHeading(`Good morning, ${escapeHtml(currentUser?.name?.split(' ')[0] || 'Alex')}`, 'Here’s what’s happening across your campus today.', `<button class="button" data-action="export"><span class="button-label">Export report</span>${icon('download')}</button><button class="button button-primary" data-action="add-student">${icon('plus')}<span class="button-label">Add student</span></button>`)}
		<section class="metric-grid">
			${metricCard('Total students', students.length === 12 ? '248' : (236 + students.length), '<span class="positive">↑ 8.2%</span>| vs. last semester', 'users-round', 'green')}
			${metricCard('Courses offered', '18', '<span class="positive">↑ 2 new</span>| this semester', 'library-big', 'blue')}
			${metricCard('Attendance rate', '92.4%', '<span class="positive">↑ 1.8%</span>| vs. last month', 'clipboard-check', 'gold')}
			${metricCard('Students at risk', '12', '<span class="negative">↑ 2</span>| need attention', 'triangle-alert', 'coral', 'negative')}
		</section>
		<section class="dashboard-grid">
			<article class="panel"><div class="panel-header"><div><h2 class="panel-title">Enrollment overview</h2><p class="panel-subtitle">Student enrollment through the academic year</p></div><div class="chart-legend"><span><i class="legend-dot"></i>This year</span><span><i class="legend-dot previous"></i>Last year</span></div></div>${chart}</article>
			<article class="panel attendance-panel"><div class="panel-header"><div><h2 class="panel-title">Attendance today</h2><p class="panel-subtitle">Monday, September 29</p></div><button class="text-link" data-view="attendance">Details ${icon('arrow-up-right')}</button></div><div class="attendance-summary"><div class="attendance-summary-top"><strong class="attendance-big">92.4%</strong><span class="attendance-change">${icon('trending-up')} 2.1%</span></div><div class="attendance-track"><div class="attendance-fill"></div></div><div class="attendance-caption"><span>Present across campus</span><span>Target 90%</span></div></div><div class="attendance-list"><div class="attendance-row"><span>Present</span><strong>229 students</strong></div><div class="attendance-row"><span>Absent</span><strong>16 students</strong></div><div class="attendance-row"><span>Not marked</span><strong>3 students</strong></div></div></article>
		</section>
		<section class="dashboard-grid">
			<article class="panel table-panel"><div class="panel-header"><div><h2 class="panel-title">Recent students</h2><p class="panel-subtitle">Recently enrolled and updated students</p></div><button class="text-link" data-view="students">View all ${icon('arrow-right')}</button></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Student ID</th><th>Course</th><th>Year</th><th>Attendance</th><th>Status</th></tr></thead><tbody>${students.slice(0, 5).map(studentRow).join('')}</tbody></table></div></article>
			<article class="panel"><div class="panel-header"><div><h2 class="panel-title">Recent activity</h2><p class="panel-subtitle">Latest updates from your campus</p></div><button class="icon-button" aria-label="More activity options">${icon('ellipsis')}</button></div><div class="activity-list">${activities.map((item) => `<div class="activity-item"><span class="activity-icon">${icon(item.icon)}</span><div><p>${item.text}</p><small>${item.time}</small></div></div>`).join('')}</div></article>
		</section>`;
}

function renderStudents() {
	const filtered = students.filter((student) => `${student.name} ${student.email} ${student.id} ${student.course}`.toLowerCase().includes(studentFilter.toLowerCase()));
	const pageSize = 8;
	const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
	studentPage = Math.min(studentPage, pageCount);
	const pageRows = filtered.slice((studentPage - 1) * pageSize, studentPage * pageSize);
	const action = `<button class="button" data-action="export">${icon('download')}<span class="button-label">Export</span></button><button class="button button-primary" data-action="add-student">${icon('plus')}<span class="button-label">Add student</span></button>`;
	return `${pageHeading('Students', 'Manage enrollment, academic details, and student records.', action)}
		<section class="metric-grid">
			${metricCard('Total enrolled', 248 + Math.max(0, students.length - 12), '<span class="positive">↑ 8.2%</span>| this semester', 'users-round', 'green')}
			${metricCard('Active students', students.filter((student) => student.status === 'Active').length + 229, '<span class="positive">93.1%</span>| of all students', 'user-round-check', 'blue')}
			${metricCard('At risk', students.filter((student) => student.status === 'At risk').length + 10, '<span class="negative">Needs follow-up</span>', 'triangle-alert', 'coral', 'negative')}
			${metricCard('New this month', '24', '<span class="positive">↑ 6</span>| vs. last month', 'user-round-plus', 'gold')}
		</section>
		<section class="panel table-panel"><div class="table-controls"><label class="table-search">${icon('search')}<input id="student-search" type="search" placeholder="Search by name, ID, or course..." value="${escapeHtml(studentFilter)}"></label><div class="toolbar"><select class="select-control" id="status-filter" aria-label="Filter by status"><option value="">All statuses</option><option>Active</option><option>At risk</option><option>Inactive</option></select><select class="select-control" id="course-filter" aria-label="Filter by course"><option value="">All courses</option>${courses.map((course) => `<option>${course.name}</option>`).join('')}</select><button class="icon-button" data-action="export" aria-label="Export students">${icon('download')}</button></div></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Student ID</th><th>Course</th><th>Year</th><th>Attendance</th><th>Status</th></tr></thead><tbody>${pageRows.length ? pageRows.map(studentRow).join('') : '<tr><td class="table-empty" colspan="6">No students match your search.</td></tr>'}</tbody></table></div><div class="table-footer"><span>Showing ${filtered.length ? (studentPage - 1) * pageSize + 1 : 0}–${Math.min(studentPage * pageSize, filtered.length)} of ${filtered.length} students</span><div class="pagination"><button class="page-number" data-page="${studentPage - 1}" ${studentPage <= 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>${Array.from({ length: pageCount }, (_, index) => `<button class="page-number${studentPage === index + 1 ? ' active' : ''}" data-page="${index + 1}">${index + 1}</button>`).join('')}<button class="page-number" data-page="${studentPage + 1}" ${studentPage >= pageCount ? 'disabled' : ''} aria-label="Next page">›</button></div></div></section>`;
}

function renderCourses() {
	const cards = courses.map((course) => `<article class="course-card"><div class="course-banner ${escapeHtml(course.color)}"><span class="course-code">${escapeHtml(course.code)}</span>${icon(course.icon)}</div><div class="course-info"><h3>${escapeHtml(course.name)}</h3><p>${escapeHtml(course.department)}</p><div class="course-meta"><span>${icon('users-round')}${course.students} students</span><span>${course.credits} credits</span></div><div class="course-meta" style="margin-top:0;padding-top:9px;border-top:0"><span>${icon('user-round')}${escapeHtml(course.instructor)}</span></div><div class="course-actions"><button class="icon-button" data-action="edit-course" data-course="${escapeHtml(course.code)}" aria-label="Edit ${escapeHtml(course.name)}" title="Edit course">${icon('pencil')}</button><button class="icon-button" data-action="delete-course" data-course="${escapeHtml(course.code)}" aria-label="Delete ${escapeHtml(course.name)}" title="Delete course">${icon('trash-2')}</button></div></div></article>`).join('');
	return `${pageHeading('Courses', 'Explore programs and keep track of course enrollment.', `<button class="button button-primary" data-action="course-info">${icon('plus')}<span class="button-label">Add course</span></button>`)}<section class="metric-grid">${metricCard('Active courses', '18', '<span class="positive">Across 5 schools</span>', 'library-big', 'green')}${metricCard('Total enrollments', '1,284', '<span class="positive">↑ 5.4%</span>| this semester', 'users-round', 'blue')}${metricCard('Average class size', '24', '<span class="positive">Healthy ratio</span>', 'user-round', 'gold')}${metricCard('Faculty members', '42', '<span class="positive">Across all programs</span>', 'contact-round', 'coral')}</section><div class="course-grid">${cards}</div>`;
}

function renderDatabase() {
	const rows = students.map((student) => `<tr><td><div class="student-cell">${avatar(student)}<div><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.email)}</small></div></div></td><td>${escapeHtml(student.phone || '—')}</td><td>${escapeHtml(student.course)}</td><td>${escapeHtml(student.year)}</td><td>${escapeHtml(student.enrollmentDate || '—')}</td></tr>`).join('');
	return `${pageHeading('Data collection', 'Add student records and review the data saved in this browser.', `<button class="button" data-action="export">${icon('download')}<span class="button-label">Export records</span></button>`)}
		<div class="database-grid"><section class="panel database-form-panel"><div class="panel-header"><div><h2 class="panel-title">New student record</h2><p class="panel-subtitle">Fields marked * are required</p></div><span class="metric-icon green">${icon('user-round-plus')}</span></div><form id="collection-form" class="collection-form"><div class="form-grid"><div class="form-field"><label for="record-name">Full name *</label><input id="record-name" name="name" required maxlength="70" placeholder="Student full name"></div><div class="form-field"><label for="record-email">Email address *</label><input id="record-email" name="email" type="email" required maxlength="120" placeholder="student@school.edu"></div><div class="form-field"><label for="record-phone">Phone number</label><input id="record-phone" name="phone" type="tel" maxlength="24" placeholder="+1 555 0100"></div><div class="form-field"><label for="record-guardian">Parent / guardian</label><input id="record-guardian" name="guardian" maxlength="70" placeholder="Contact name"></div><div class="form-field"><label for="record-course">Program *</label><select id="record-course" name="course" required>${courses.map((course) => `<option value="${escapeHtml(course.name)}">${escapeHtml(course.name)}</option>`).join('')}</select></div><div class="form-field"><label for="record-year">Academic year *</label><select id="record-year" name="year"><option>Year 1</option><option>Year 2</option><option>Year 3</option><option>Year 4</option></select></div><div class="form-field"><label for="record-date">Enrollment date</label><input id="record-date" name="enrollmentDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></div><div class="form-field full"><label for="record-notes">Notes</label><textarea id="record-notes" name="notes" maxlength="500" rows="3" placeholder="Additional information (optional)"></textarea></div></div><button class="button button-primary collection-submit" type="submit">${icon('save')}Save student record</button></form></section>
		<section class="panel table-panel database-records"><div class="panel-header"><div><h2 class="panel-title">Student database</h2><p class="panel-subtitle">${students.length} ${students.length === 1 ? 'record' : 'records'} stored for this workspace</p></div><span class="database-live"><i></i> SERVER DATABASE</span></div><label class="table-search database-search">${icon('search')}<input id="database-search" type="search" placeholder="Search saved records..."></label><div class="table-wrap"><table><thead><tr><th>Student</th><th>Phone</th><th>Program</th><th>Year</th><th>Enrolled</th></tr></thead><tbody>${rows || '<tr><td class="table-empty" colspan="5">No records yet. Add the first student using the form.</td></tr>'}</tbody></table></div><div class="database-note">${icon('info')}<span>Student records are stored by the Campusly server and shared with signed-in workspace users.</span></div></section></div>`;
}

function renderAttendance() {
	const marked = students.filter((student) => student.status !== 'Inactive');
	const visibleStudents = marked.filter((student) => `${student.name} ${student.id} ${student.course}`.toLowerCase().includes(attendanceFilter.toLowerCase()));
	const rows = visibleStudents.map((student) => `<tr><td><div class="student-cell">${avatar(student)}<div><strong>${student.name}</strong><small>${student.email}</small></div></div></td><td>${student.id}</td><td>${student.course}</td><td>${student.year}</td><td><div class="attendance-choice"><button class="${attendanceRecords[student.id] === 'present' ? 'selected' : ''}" data-attendance="present" data-student="${student.id}">Present</button><button class="${attendanceRecords[student.id] === 'absent' ? 'selected absent' : ''}" data-attendance="absent" data-student="${student.id}">Absent</button><button class="${attendanceRecords[student.id] === 'late' ? 'selected' : ''}" data-attendance="late" data-student="${student.id}">Late</button></div></td></tr>`).join('');
	return `${pageHeading('Attendance', 'Record daily attendance and spot patterns that need attention.', `<button class="button" data-action="export">${icon('download')}<span class="button-label">Export</span></button>`)}
		<section class="metric-grid">${metricCard('Attendance today', '92.4%', '<span class="positive">↑ 2.1%</span>| vs. last Monday', 'clipboard-check', 'green')}${metricCard('Present', '229', '<span class="positive">93.1%</span>| of enrolled students', 'user-round-check', 'blue')}${metricCard('Absent', '16', '<span class="negative">6.5%</span>| of enrolled students', 'user-round-x', 'coral', 'negative')}${metricCard('Unmarked', '3', '<span class="negative">Review needed</span>', 'clock-3', 'gold', 'negative')}</section>
		<div class="attendance-toolbar"><label class="attendance-date">${icon('calendar-days')}<span>Date</span><input id="attendance-date" type="date" value="${escapeHtml(attendanceDate)}"><span class="attendance-record-status">${attendanceExists ? 'Saved' : 'Not saved'}</span></label><div class="attendance-actions"><label class="table-search">${icon('search')}<input id="attendance-search" type="search" placeholder="Find a student..." value="${escapeHtml(attendanceFilter)}"></label><button class="button button-soft button-small" data-action="mark-all">Mark all present</button><button class="button button-danger button-small" data-action="delete-attendance" ${attendanceExists ? '' : 'disabled'} title="Delete this date’s attendance">${icon('trash-2')}<span class="button-label">Delete day</span></button></div></div>
		<section class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Student</th><th>Student ID</th><th>Course</th><th>Year</th><th>Attendance status</th></tr></thead><tbody>${rows || '<tr><td class="table-empty" colspan="5">No students match your search.</td></tr>'}</tbody></table></div><div class="table-footer"><span>Showing ${visibleStudents.length} of ${marked.length} students</span><button class="button button-primary button-small" data-action="save-attendance">${icon('check')}Save attendance</button></div></section>`;
}

function renderReports() {
	const reports = [
		['Computer Science', 68, '26%', 26], ['Business Admin', 52, '20%', 20], ['Psychology', 41, '16%', 16], ['Graphic Design', 36, '14%', 14], ['Data Science', 29, '11%', 11], ['Other programs', 34, '13%', 13]
	];
	return `${pageHeading('Reports & insights', 'A snapshot of enrollment and academic health across campus.', `<select class="select-control" aria-label="Report period"><option>Fall semester 2025</option><option>Spring semester 2025</option><option>Fall semester 2024</option></select><button class="button button-primary" data-action="export">${icon('download')}<span class="button-label">Download</span></button>`)}<section class="metric-grid">${metricCard('Total enrollment', '248', '<span class="positive">↑ 8.2%</span>| year over year', 'users-round', 'green')}${metricCard('Retention rate', '94.8%', '<span class="positive">↑ 1.4%</span>| year over year', 'refresh-cw', 'blue')}${metricCard('Average attendance', '92.4%', '<span class="positive">↑ 1.8%</span>| vs. spring', 'clipboard-check', 'gold')}${metricCard('At-risk students', '12', '<span class="negative">4.8%</span>| of enrollment', 'triangle-alert', 'coral', 'negative')}</section><section class="report-grid"><article class="panel"><div class="panel-header"><div><h2 class="panel-title">Enrollment by program</h2><p class="panel-subtitle">Student distribution across academic programs</p></div><span class="status-pill">248 students</span></div><div class="report-stat-list">${reports.map(([name, count, percentage, width]) => `<div class="report-stat"><span>${name}</span><div class="report-track"><span style="width:${width * 2.8}%"></span></div><strong>${count}</strong></div>`).join('')}</div></article><article class="panel"><div class="panel-header"><div><h2 class="panel-title">Academic health</h2><p class="panel-subtitle">Key indicators this semester</p></div></div><div class="report-stat-list"><div class="report-stat"><span>Good standing</span><div class="report-track"><span style="width:84%"></span></div><strong>84%</strong></div><div class="report-stat"><span>Needs support</span><div class="report-track"><span style="width:11%"></span></div><strong>11%</strong></div><div class="report-stat"><span>At risk</span><div class="report-track"><span style="width:5%;background:#dc725c"></span></div><strong>5%</strong></div></div></article></section><section class="panel table-panel"><div class="panel-header"><div><h2 class="panel-title">Students requiring follow-up</h2><p class="panel-subtitle">Students with attendance below 80%</p></div><button class="text-link" data-view="students">View student list ${icon('arrow-right')}</button></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Student ID</th><th>Course</th><th>Year</th><th>Attendance</th><th>Status</th></tr></thead><tbody>${students.filter((student) => student.status === 'At risk').map(studentRow).join('')}</tbody></table></div></section>`;
}

function renderSettings() {
	return `${pageHeading('Settings', 'Manage your workspace preferences and notifications.')}
		<section class="settings-grid">
			<article class="panel"><div class="panel-header"><div><h2 class="panel-title">Workspace preferences</h2><p class="panel-subtitle">Customize how Campusly works for you</p></div></div>
				<div class="settings-section"><h3>Academic year</h3><p>Choose the current academic year used across the dashboard and reports.</p><div class="settings-row"><select class="select-control"><option>2025 – 2026</option><option>2024 – 2025</option></select></div></div>
				<div class="settings-section"><h3>Default attendance target</h3><p>Set the attendance threshold used to flag students who may need support.</p><div class="settings-row"><select class="select-control"><option>Below 80%</option><option>Below 85%</option><option>Below 90%</option></select></div></div>
				<div class="settings-section"><h3>Student data</h3><p>Student records are stored by the Campusly server and shared with signed-in workspace users.</p><div class="settings-row"><button class="button button-danger button-small" data-action="reset-data">Reset demo data</button></div></div>
			</article>
			<article class="panel"><div class="panel-header"><div><h2 class="panel-title">Notifications</h2><p class="panel-subtitle">Choose the updates you receive</p></div></div>
				<div class="settings-section"><h3>Attendance alerts</h3><p>Get notified when attendance falls below your selected target.</p><div class="settings-row"><label class="switch"><input type="checkbox" checked aria-label="Attendance alerts"><span></span></label></div></div>
				<div class="settings-section"><h3>Enrollment updates</h3><p>Receive a summary when a new student joins a course.</p><div class="settings-row"><label class="switch"><input type="checkbox" checked aria-label="Enrollment updates"><span></span></label></div></div>
				<div class="settings-section"><h3>Weekly reports</h3><p>Get a Monday morning summary of campus activity.</p><div class="settings-row"><label class="switch"><input type="checkbox" aria-label="Weekly reports"><span></span></label></div></div>
			</article>
		</section>`;
}

function renderView() {
	const renderers = { overview: renderOverview, students: renderStudents, courses: renderCourses, attendance: renderAttendance, database: renderDatabase, reports: renderReports, settings: renderSettings };
	viewContent.innerHTML = (renderers[currentView] || renderOverview)();
	navCount.textContent = String(236 + Math.max(0, students.length - 12));
	updateAttendanceNotificationBadge();
	refreshIcons();
}

function studentsBelowAttendanceThreshold() {
	return students.filter((student) => {
		const match = String(student.attendance || '').match(/^\s*(\d+(?:\.\d+)?)\s*%?\s*$/);
		return match && Number(match[1]) < 20;
	});
}

function updateAttendanceNotificationBadge() {
	const button = document.querySelector('.notification-button');
	const badge = button?.querySelector('.notification-dot');
	if (!button || !badge) return;
	const count = studentsBelowAttendanceThreshold().length;
	badge.textContent = count > 99 ? '99+' : String(count);
	badge.hidden = count === 0;
	button.setAttribute('aria-label', count ? `Notifications: ${count} low attendance` : 'Notifications');
}

function closeAttendanceNotifications() {
	document.querySelector('.notification-panel')?.remove();
	document.querySelector('.notification-button')?.setAttribute('aria-expanded', 'false');
}

function toggleAttendanceNotifications() {
	const button = document.querySelector('.notification-button');
	if (document.querySelector('.notification-panel')) {
		closeAttendanceNotifications();
		return;
	}
	const flaggedStudents = studentsBelowAttendanceThreshold();
	const content = flaggedStudents.length
		? `<ul class="notification-list">${flaggedStudents.map((student) => `<li class="notification-item"><span class="notification-icon">${icon('triangle-alert')}</span><span class="notification-copy"><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.course)}</small></span><strong class="notification-rate">${escapeHtml(student.attendance)}</strong></li>`).join('')}</ul><button class="button button-primary notification-review" data-view="students">View students ${icon('arrow-right')}</button>`
		: '<p class="notification-empty">No students are below 20% attendance.</p>';
	button.insertAdjacentHTML('afterend', `<section class="notification-panel" role="region" aria-label="Low attendance notifications"><div class="notification-panel-heading"><div><h2>Attendance alerts</h2><p>Below 20% attendance</p></div><span>${flaggedStudents.length}</span></div>${content}</section>`);
	button.setAttribute('aria-expanded', 'true');
	refreshIcons();
}

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function showToast(message) {
	const region = document.querySelector('#toast-region');
	region.innerHTML = `<div class="toast">${icon('circle-check')}<span>${escapeHtml(message)}</span></div>`;
	refreshIcons();
	window.clearTimeout(toastTimer);
	toastTimer = window.setTimeout(() => { region.innerHTML = ''; }, 3000);
}

function openStudentModal() {
	document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" data-action="dismiss-modal"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="student-modal-title"><div class="modal-header"><div><h2 id="student-modal-title">Add a student</h2><p>Enter the student’s details to create a new record.</p></div><button class="icon-button" data-action="close-modal" aria-label="Close">${icon('x')}</button></div><form id="student-form" class="modal-form"><div class="form-grid"><div class="form-field"><label for="student-first">First name</label><input id="student-first" name="first" required maxlength="40" placeholder="e.g. Jordan"></div><div class="form-field"><label for="student-last">Last name</label><input id="student-last" name="last" required maxlength="40" placeholder="e.g. Lee"></div><div class="form-field full"><label for="student-email">Email address</label><input id="student-email" name="email" type="email" required placeholder="student@campus.edu"></div><div class="form-field"><label for="student-course">Course</label><select id="student-course" name="course" required>${courses.map((course) => `<option value="${course.name}">${course.name}</option>`).join('')}</select></div><div class="form-field"><label for="student-year">Year</label><select id="student-year" name="year"><option>Year 1</option><option>Year 2</option><option>Year 3</option><option>Year 4</option></select></div></div><div class="form-actions"><button type="button" class="button" data-action="close-modal">Cancel</button><button type="submit" class="button button-primary">${icon('plus')}Add student</button></div></form></section></div>`);
	refreshIcons();
	document.querySelector('#student-first').focus();
}

function closeModal() {
	document.querySelector('.modal-backdrop')?.remove();
}

function openCourseModal(course = null) {
	const editing = Boolean(course);
	document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" data-action="dismiss-modal"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="course-modal-title"><div class="modal-header"><div><h2 id="course-modal-title">${editing ? 'Edit course' : 'Add a course'}</h2><p>${editing ? 'Update course details.' : 'Create a course for your academic programs.'}</p></div><button class="icon-button" data-action="close-modal" aria-label="Close">${icon('x')}</button></div><form id="course-form" class="modal-form" data-course-code="${escapeHtml(course?.code || '')}"><div class="form-grid"><div class="form-field"><label for="course-code">Course code</label><input id="course-code" name="code" required maxlength="12" placeholder="e.g. CS-301" value="${escapeHtml(course?.code || '')}" ${editing ? 'readonly' : ''}></div><div class="form-field"><label for="course-credits">Credits</label><input id="course-credits" name="credits" type="number" min="1" max="12" value="${course?.credits ?? 3}" required></div><div class="form-field full"><label for="course-name">Course name</label><input id="course-name" name="name" required maxlength="60" placeholder="e.g. Computer Science" value="${escapeHtml(course?.name || '')}"></div><div class="form-field"><label for="course-department">Department</label><input id="course-department" name="department" required maxlength="60" placeholder="School of Technology" value="${escapeHtml(course?.department || '')}"></div><div class="form-field"><label for="course-instructor">Instructor</label><input id="course-instructor" name="instructor" required maxlength="60" placeholder="Instructor name" value="${escapeHtml(course?.instructor || '')}"></div></div><div class="form-actions"><button type="button" class="button" data-action="close-modal">Cancel</button><button type="submit" class="button button-primary">${icon(editing ? 'save' : 'plus')}${editing ? 'Save changes' : 'Add course'}</button></div></form></section></div>`);
	refreshIcons();
	document.querySelector('#course-code').focus();
}

async function addStudent(form) {
	const data = new FormData(form);
	const name = `${data.get('first').trim()} ${data.get('last').trim()}`;
	if (students.some((student) => student.email.toLowerCase() === String(data.get('email')).toLowerCase())) {
		showToast('A student with that email already exists.');
		return;
	}
	const result = await apiRequest('/api/students', { method: 'POST', body: JSON.stringify({ name, email: String(data.get('email')).trim(), course: data.get('course'), year: data.get('year'), attendance: '100%' }) });
	students.unshift(result.student);
	studentFilter = '';
	studentPage = 1;
	closeModal();
	setView('students');
	showToast(`${name} was added to your student records.`);
}

async function collectStudent(form) {
	const data = new FormData(form);
	const email = String(data.get('email')).trim();
	if (students.some((student) => student.email.toLowerCase() === email.toLowerCase())) {
		showToast('A student with that email already exists.');
		return;
	}
	const result = await apiRequest('/api/students', { method: 'POST', body: JSON.stringify({
		name: String(data.get('name')).trim(), email, phone: String(data.get('phone')).trim(), guardian: String(data.get('guardian')).trim(),
		course: data.get('course'), year: data.get('year'), enrollmentDate: data.get('enrollmentDate'), notes: String(data.get('notes')).trim()
	}) });
	const student = result.student;
	students.unshift(student);
	renderView();
	showToast(`${student.name} was saved to the student database.`);
}

async function addCourse(form) {
	const data = new FormData(form);
	const code = String(data.get('code')).trim().toUpperCase();
	if (courses.some((course) => course.code.toLowerCase() === code.toLowerCase())) {
		showToast('A course with that code already exists.');
		return;
	}
	const result = await apiRequest('/api/courses', { method: 'POST', body: JSON.stringify({ code, name: String(data.get('name')).trim(), department: String(data.get('department')).trim(), instructor: String(data.get('instructor')).trim(), credits: Number(data.get('credits')) }) });
	courses.push(result.course);
	closeModal();
	renderView();
	showToast(`${data.get('name')} was added to your courses.`);
}

async function updateCourse(form) {
	const data = new FormData(form);
	const code = form.dataset.courseCode;
	const existing = courses.find((course) => course.code === code);
	const result = await apiRequest(`/api/courses/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify({ name: String(data.get('name')).trim(), department: String(data.get('department')).trim(), instructor: String(data.get('instructor')).trim(), credits: Number(data.get('credits')) }) });
	const index = courses.findIndex((course) => course.code === code);
	courses[index] = result.course;
	if (existing && existing.name !== result.course.name) students.forEach((student) => { if (student.course === existing.name) student.course = result.course.name; });
	closeModal();
	renderView();
	showToast(`${result.course.name} was updated.`);
}

async function deleteCourse(code) {
	const course = courses.find((entry) => entry.code === code);
	if (!course || !window.confirm(`Delete ${course.name}? This cannot be undone.`)) return;
	await apiRequest(`/api/courses/${encodeURIComponent(code)}`, { method: 'DELETE' });
	courses.splice(courses.indexOf(course), 1);
	renderView();
	showToast(`${course.name} was deleted.`);
}

async function loadAttendance(date) {
	const result = await apiRequest(`/api/attendance?date=${encodeURIComponent(date)}`);
	attendanceDate = result.date;
	attendanceExists = result.exists;
	Object.keys(attendanceRecords).forEach((studentId) => delete attendanceRecords[studentId]);
	for (const student of students) attendanceRecords[student.id] = result.records[student.id] || (student.status === 'Inactive' ? 'absent' : 'present');
	renderView();
}

async function saveAttendance() {
	const result = await apiRequest('/api/attendance', { method: 'PUT', body: JSON.stringify({ date: attendanceDate, records: attendanceRecords }) });
	Object.assign(attendanceRecords, result.records);
	for (const student of students) {
		if (result.studentAttendance?.[student.id]) student.attendance = result.studentAttendance[student.id];
	}
	attendanceExists = true;
	renderView();
	showToast(`Attendance saved for ${attendanceDate}.`);
}

async function deleteAttendance() {
	if (!attendanceExists || !window.confirm(`Delete attendance for ${attendanceDate}? This cannot be undone.`)) return;
	const result = await apiRequest(`/api/attendance?date=${encodeURIComponent(attendanceDate)}`, { method: 'DELETE' });
	for (const student of students) {
		if (result.studentAttendance?.[student.id]) student.attendance = result.studentAttendance[student.id];
	}
	attendanceExists = false;
	for (const student of students) attendanceRecords[student.id] = student.status === 'Inactive' ? 'absent' : 'present';
	renderView();
	showToast(`Attendance for ${attendanceDate} was deleted.`);
}

async function resetDemoData() {
	const result = await apiRequest('/api/reset', { method: 'POST', body: '{}' });
	students.splice(0, students.length, ...result.students);
	attendanceDate = new Date().toISOString().slice(0, 10);
	attendanceExists = false;
	Object.keys(attendanceRecords).forEach((studentId) => delete attendanceRecords[studentId]);
	for (const student of students) attendanceRecords[student.id] = student.status === 'Inactive' ? 'absent' : 'present';
	studentFilter = '';
	studentPage = 1;
	attendanceFilter = '';
	renderView();
	showToast('Demo student and attendance data reset.');
}

function exportStudents() {
	const headers = ['Student ID', 'Name', 'Email', 'Course', 'Year', 'Attendance', 'Status'];
	const rows = students.map((student) => [student.id, student.name, student.email, student.course, student.year, student.attendance, student.status]);
	const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
	const link = document.createElement('a');
	link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
	link.download = 'campusly-students.csv';
	link.click();
	URL.revokeObjectURL(link.href);
	showToast('Student report downloaded.');
}

document.addEventListener('click', (event) => {
	const notificationButton = event.target.closest('.notification-button');
	if (notificationButton) { toggleAttendanceNotifications(); return; }
	if (!event.target.closest('.notification-panel')) closeAttendanceNotifications();
	const authModeButton = event.target.closest('[data-auth-mode]');
	if (authModeButton && authModeButton.tagName === 'BUTTON') { renderAuth(authModeButton.dataset.authMode); return; }
	const nav = event.target.closest('[data-view]');
	if (nav) { setView(nav.dataset.view); return; }
	const action = event.target.closest('[data-action]');
	if (action) {
		if (previewMode && ['add-student', 'delete-course', 'mark-all', 'save-attendance', 'delete-attendance', 'reset-data', 'logout'].includes(action.dataset.action)) {
			showToast('This is a read-only preview. Changes are not saved.');
			return;
		}
		switch (action.dataset.action) {
			case 'add-student': openStudentModal(); break;
			case 'close-modal': closeModal(); break;
			case 'dismiss-modal': if (event.target === action) closeModal(); break;
			case 'export': exportStudents(); break;
			case 'course-info': openCourseModal(); break;
			case 'edit-course': openCourseModal(courses.find((course) => course.code === action.dataset.course)); break;
			case 'delete-course': deleteCourse(action.dataset.course).catch((error) => showToast(error.message)); break;
			case 'mark-all': students.filter((student) => student.status !== 'Inactive').forEach((student) => { attendanceRecords[student.id] = 'present'; }); renderView(); showToast('All listed students marked present.'); break;
			case 'save-attendance': saveAttendance().catch((error) => showToast(error.message)); break;
			case 'delete-attendance': deleteAttendance().catch((error) => showToast(error.message)); break;
			case 'logout':
				apiRequest('/api/auth/logout', { method: 'POST', body: '{}' }).catch(() => {});
				try { localStorage.removeItem('campusly.token'); } catch {}
				authToken = '';
				currentUser = null;
				renderAuth('login');
				break;
			case 'reset-data': resetDemoData().catch((error) => showToast(error.message)); break;
		}
		return;
	}
	const pageButton = event.target.closest('[data-page]');
	if (pageButton && !pageButton.disabled) { studentPage = Number(pageButton.dataset.page); renderView(); }
	const attendanceButton = event.target.closest('[data-attendance]');
	if (attendanceButton && previewMode) { showToast('This is a read-only preview. Changes are not saved.'); return; }
	if (attendanceButton) { attendanceRecords[attendanceButton.dataset.student] = attendanceButton.dataset.attendance; renderView(); }
});

document.addEventListener('input', (event) => {
	if (event.target.id === 'student-search') { studentFilter = event.target.value; studentPage = 1; renderView(); document.querySelector('#student-search')?.focus(); }
	if (event.target.id === 'attendance-search') { attendanceFilter = event.target.value; renderView(); document.querySelector('#attendance-search')?.focus(); }
	if (event.target.id === 'global-search') {
		const query = event.target.value;
		if (query && currentView !== 'students') setView('students');
		if (currentView === 'students') { studentFilter = query; studentPage = 1; renderView(); const localSearch = document.querySelector('#student-search'); if (localSearch) { localSearch.value = query; localSearch.setSelectionRange(query.length, query.length); } }
	}
	if (event.target.id === 'database-search') {
		const query = event.target.value.toLowerCase();
		const filtered = students.filter((student) => `${student.name} ${student.email} ${student.phone || ''} ${student.course} ${student.id}`.toLowerCase().includes(query));
		const tbody = viewContent.querySelector('.database-records tbody');
		if (tbody) tbody.innerHTML = filtered.map((student) => `<tr><td><div class="student-cell">${avatar(student)}<div><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.email)}</small></div></div></td><td>${escapeHtml(student.phone || '—')}</td><td>${escapeHtml(student.course)}</td><td>${escapeHtml(student.year)}</td><td>${escapeHtml(student.enrollmentDate || '—')}</td></tr>`).join('') || '<tr><td class="table-empty" colspan="5">No records match your search.</td></tr>';
		refreshIcons();
	}
});

document.addEventListener('change', (event) => {
	if (event.target.id === 'attendance-date' && event.target.value) { loadAttendance(event.target.value).catch((error) => showToast(error.message)); return; }
	if (event.target.id === 'status-filter' || event.target.id === 'course-filter') {
		const status = document.querySelector('#status-filter')?.value || '';
		const course = document.querySelector('#course-filter')?.value || '';
		const filteredStudents = students.filter((student) => `${student.name} ${student.email} ${student.id} ${student.course}`.toLowerCase().includes(studentFilter.toLowerCase()) && (!status || student.status === status) && (!course || student.course === course));
		const tbody = viewContent.querySelector('tbody');
		if (tbody) tbody.innerHTML = filteredStudents.slice(0, 8).map(studentRow).join('') || '<tr><td class="table-empty" colspan="6">No students match these filters.</td></tr>';
		const count = viewContent.querySelector('.table-footer > span');
		if (count) count.textContent = `Showing ${filteredStudents.length ? 1 : 0}–${Math.min(8, filteredStudents.length)} of ${filteredStudents.length} students`;
		refreshIcons();
	}
});

document.addEventListener('submit', async (event) => {
	if (previewMode && event.target.id !== 'auth-form') {
		event.preventDefault();
		showToast('This is a read-only preview. Changes are not saved.');
		return;
	}
	if (event.target.id === 'student-form') { event.preventDefault(); if (event.target.reportValidity()) await addStudent(event.target).catch((error) => showToast(error.message)); }
	if (event.target.id === 'course-form') { event.preventDefault(); if (event.target.reportValidity()) await (event.target.dataset.courseCode ? updateCourse(event.target) : addCourse(event.target)).catch((error) => showToast(error.message)); }
	if (event.target.id === 'collection-form') { event.preventDefault(); if (event.target.reportValidity()) await collectStudent(event.target).catch((error) => showToast(error.message)); }
	if (event.target.id === 'auth-form') {
		event.preventDefault();
		if (!event.target.reportValidity()) return;
		const form = event.target;
		const data = new FormData(form);
		const mode = form.dataset.authMode;
		const email = String(data.get('email')).trim().toLowerCase();
		const password = String(data.get('password'));
		if (mode === 'register') {
			if (password !== data.get('confirm')) { renderAuth('register', 'The passwords do not match.'); return; }
		}
		try {
			const path = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
			const result = await apiRequest(path, { method: 'POST', body: JSON.stringify({ name: String(data.get('name') || '').trim(), email, password }) });
			authToken = result.token;
			try { localStorage.setItem('campusly.token', authToken); } catch {}
			await loadWorkspaceData();
			enterWorkspace(result.account);
		} catch (error) {
			renderAuth(mode, error.message || 'The request could not be completed.');
		}
	}
});

document.querySelector('#menu-toggle').addEventListener('click', () => {
	sidebar.classList.toggle('open');
	let scrim = document.querySelector('.mobile-scrim');
	if (!scrim) { scrim = document.createElement('button'); scrim.className = 'mobile-scrim'; scrim.setAttribute('aria-label', 'Close navigation'); scrim.addEventListener('click', () => { sidebar.classList.remove('open'); scrim.classList.remove('visible'); }); document.body.append(scrim); }
	scrim.classList.toggle('visible', sidebar.classList.contains('open'));
});
document.querySelector('.global-search').addEventListener('click', () => document.querySelector('#global-search').focus());
document.addEventListener('keydown', (event) => {
	if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('#global-search').focus(); }
	if (event.key === 'Escape') { closeModal(); closeAttendanceNotifications(); }
});

(async () => {
	if (previewMode) { enterWorkspace({ name: 'Joel Earnest' }); return; }
	if (!authToken) { renderAuth('login'); return; }
	try {
		const result = await apiRequest('/api/auth/me');
		await loadWorkspaceData();
		enterWorkspace(result.account);
	} catch {
		authToken = '';
		try { localStorage.removeItem('campusly.token'); } catch {}
		renderAuth('login');
	}
})();
