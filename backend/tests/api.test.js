import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jamhuriya-backend-'));
process.env.DB_DRIVER = 'json';
process.env.DB_FILE = path.join(tmpDir, 'database.json');
process.env.UPLOAD_DIR = path.join(tmpDir, 'uploads');
process.env.JWT_SECRET = 'test-secret';
process.env.WAAFI_MERCHANT_UID = 'test-merchant';
process.env.WAAFI_API_USER_ID = 'test-user';
process.env.WAAFI_API_KEY = 'super-secret-test-api-key';
process.env.WAAFI_MINIMUM_AMOUNT = '0.01';
process.env.WAAFI_MAXIMUM_AMOUNT = '10000';
process.env.WAAFI_REQUEST_TIMEOUT_MS = '20';
process.env.WAAFI_ENV = 'sandbox';
process.env.MAX_STORED_FILE_BYTES = '256';
process.env.FILE_STORAGE_DIR = path.join(tmpDir, 'centralized-files');
// Tests must never contact the real Xaliye6 provider.
process.env.SMS_ENABLED = 'false';

const { createApp } = await import('../src/app.js');
const { closeDb, ensureDb, readDb, updateDb } = await import('../src/lib/db.js');
const { setWaafiTransportForTests } = await import('../src/providers/waafiPayProvider.js');
const { normalizeSomaliEvcPhone } = await import('../src/validators/phoneValidator.js');
const { parseAmountToMinor } = await import('../src/validators/paymentValidator.js');
const { env } = await import('../src/config/env.js');
const {
  createApplicationSubmittedNotification,
  normalizeSomaliPhoneNumber,
  processSmsNotification,
  setSmsTransportForTests
} = await import('../src/services/smsService.js');
const { processCampaign } = await import('../src/services/scheduledMessageService.js');
const { assignAutomaticClass, CLASS_CAPACITY } = await import('../src/services/automaticClassService.js');

test('automatic classes reuse capacity, overflow at 61, and sequence independently by department', () => {
  const database = {
    programs: [{
      id: 'fac_it',
      title: 'Computer Science & IT',
      departments: [
        { id: 'dep_ca', name: 'Computer Application', code: 'CA' },
        { id: 'dep_cns', name: 'Computer Networking & Security', code: 'CNS' }
      ]
    }],
    classes: [],
    students: []
  };

  const enroll = (department, index) => {
    const assigned = assignAutomaticClass(database, {
      faculty: 'Computer Science & IT',
      department,
      academicYear: '2026-2027'
    });
    database.students.push({ id: `student_${department}_${index}`, classId: assigned.id, status: 'Enrolled' });
    return assigned;
  };

  const first = enroll('Computer Application', 1);
  assert.equal(first.classCode, 'CA261');
  assert.equal(first.capacity, CLASS_CAPACITY);

  for (let index = 2; index <= CLASS_CAPACITY; index += 1) {
    assert.equal(enroll('Computer Application', index).id, first.id);
  }
  const sixtyFirst = enroll('Computer Application', 61);
  assert.equal(sixtyFirst.classCode, 'CA262');
  assert.notEqual(sixtyFirst.id, first.id);

  const independent = enroll('Computer Networking & Security', 1);
  assert.equal(independent.classCode, 'CNS261');
  assert.equal(new Set(database.classes.map((item) => item.classCode)).size, database.classes.length);
});

await ensureDb();

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const appointmentLimitDate = new Date();
appointmentLimitDate.setUTCFullYear(appointmentLimitDate.getUTCFullYear() + 1);
const maximumAppointmentDate = appointmentLimitDate.toISOString().slice(0, 10);
const beyondAppointmentLimitDate = new Date(`${maximumAppointmentDate}T00:00:00Z`);
beyondAppointmentLimitDate.setUTCDate(beyondAppointmentLimitDate.getUTCDate() + 1);
const dateBeyondOneYear = beyondAppointmentLimitDate.toISOString().slice(0, 10);
const validApplication = (overrides = {}) => ({
  fullName: 'Test Applicant',
  motherName: 'Test Mother',
  nationality: 'Somali',
  nationalId: '1001001001',
  rollNumber: '1001001002',
  dateOfBirth: '2002-01-15',
  placeOfBirth: 'Mogadishu',
  district: 'Hodan',
  area: 'Taleex',
  email: 'test.applicant@example.com',
  mobile: '610000000',
  sex: 'Male',
  maritalStatus: 'Single',
  emergencyName: 'Emergency Contact',
  emergencyTell: '610000002',
  relationship: 'Father',
  familyStudied: 'Maya',
  schoolName: 'Jamhuriya Secondary School',
  schoolDistrict: 'Hodan',
  graduationYear: '2022',
  percentage: 'A',
  heardFrom: 'Social Media',
  program: 'Computer & IT',
  department: 'Computer Application',
  modeOfStudy: 'Full Time',
  paymentPlan: 'Admission fee only',
  paymentMethod: 'EVC Plus',
  applicantPhotoUploaded: 'Yes',
  certificateUploaded: 'No',
  hasCertificate: 'No',
  appointmentDate: tomorrow,
  appointmentTime: '09:30',
  ...overrides
});

const request = async ({ method = 'GET', path: requestPath, token, body }) =>
  new Promise((resolve, reject) => {
    const server = http.createServer(createApp());
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const payload = body ? JSON.stringify(body) : null;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: requestPath,
          method,
          headers: {
            ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        },
        (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            server.close();
            const text = Buffer.concat(chunks).toString('utf8');
            const responseType = res.headers['content-type'] || '';
            resolve({
              status: res.statusCode,
              body: text ? (responseType.includes('application/json') ? JSON.parse(text) : text) : null
            });
          });
        }
      );
      req.on('error', (error) => {
        server.close();
        reject(error);
      });
      if (payload) req.write(payload);
      req.end();
    });
  });

const multipartRequest = async ({ path: requestPath, token, fields = {}, filename = 'report.txt', contentType = 'text/plain', content = 'report' }) => {
  const boundary = `----jamhuriya-${crypto.randomUUID()}`;
  const chunks = [];
  for (const [name, value] of Object.entries({ category: 'Reports', ...fields })) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${Array.isArray(value) ? JSON.stringify(value) : value}\r\n`));
  }
  chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`));
  chunks.push(Buffer.isBuffer(content) ? content : Buffer.from(content));
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  const payload = Buffer.concat(chunks);

  return new Promise((resolve, reject) => {
    const server = http.createServer(createApp());
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const req = http.request({ hostname: '127.0.0.1', port, path: requestPath, method: 'POST', headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': payload.length,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      } }, (res) => {
        const responseChunks = [];
        res.on('data', (chunk) => responseChunks.push(chunk));
        res.on('end', () => {
          server.close();
          const text = Buffer.concat(responseChunks).toString('utf8');
          resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null });
        });
      });
      req.on('error', (error) => { server.close(); reject(error); });
      req.end(payload);
    });
  });
};

test('health check responds', async () => {
  const response = await request({ path: '/health' });
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('admin can login and read dashboard', async () => {
  const login = await request({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      username: 'admin',
      password: 'admin12345'
    }
  });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);

  const dashboard = await request({
    path: '/api/dashboard',
    token: login.body.token
  });
  assert.equal(dashboard.status, 200);
  assert.ok(dashboard.body.stats.totalApplications >= 1);
});

let fileAdminToken;
let fileUserToken;
let adminSharedFile;
let privateAdminFile;
let userDailyFile;

test('file storage users authenticate and receive team assignments', async () => {
  await updateDb((db) => {
    const admin = db.users.find((item) => item.username === 'admin');
    const officer = db.users.find((item) => item.username === 'officer');
    admin.team = 'Administration'; admin.department = 'Admissions';
    officer.team = 'Campus 3'; officer.department = 'Computer Science';
  });
  const [adminLogin, userLogin] = await Promise.all([
    request({ method: 'POST', path: '/api/auth/login', body: { username: 'admin', password: 'admin12345' } }),
    request({ method: 'POST', path: '/api/auth/login', body: { username: 'officer', password: 'officer12345' } })
  ]);
  fileAdminToken = adminLogin.body.token;
  fileUserToken = userLogin.body.token;
  assert.ok(fileAdminToken); assert.ok(fileUserToken);
});

test('Officer cannot access Super Admin-only APIs while Admin retains access', async () => {
  for (const endpoint of ['/api/activity-log', '/api/activity-log/export/csv', '/api/admin-users', '/api/settings']) {
    const officerResponse = await request({ path: endpoint, token: fileUserToken });
    assert.equal(officerResponse.status, 403, `Officer unexpectedly accessed ${endpoint}`);
  }

  for (const endpoint of ['/api/activity-log', '/api/admin-users', '/api/settings']) {
    const adminResponse = await request({ path: endpoint, token: fileAdminToken });
    assert.equal(adminResponse.status, 200, `Admin could not access ${endpoint}`);
  }
});

test('unauthorized and invalid file uploads are rejected', async () => {
  const fields = { title: 'Invalid', reportType: 'General File', visibility: 'Private' };
  const unauthorized = await multipartRequest({ path: '/api/files', fields });
  assert.equal(unauthorized.status, 401);
  const unsupported = await multipartRequest({ path: '/api/files', token: fileAdminToken, fields, filename: 'malware.exe', contentType: 'application/octet-stream' });
  assert.equal(unsupported.status, 422);
  const oversized = await multipartRequest({ path: '/api/files', token: fileAdminToken, fields, content: Buffer.alloc(257, 1) });
  assert.equal(oversized.status, 413);
  const empty = await multipartRequest({ path: '/api/files', token: fileAdminToken, fields, content: Buffer.alloc(0) });
  assert.equal(empty.status, 422);
  const blankText = await multipartRequest({ path: '/api/files', token: fileAdminToken, fields, content: '   \n\t' });
  assert.equal(blankText.status, 422);
  const fakePdf = await multipartRequest({ path: '/api/files', token: fileAdminToken, fields, filename: 'fake.pdf', contentType: 'application/pdf', content: 'not a pdf' });
  assert.equal(fakePdf.status, 422);
  const shortTitle = await multipartRequest({ path: '/api/files', token: fileAdminToken, fields: { ...fields, title: '  a ' } });
  assert.equal(shortTitle.status, 422);
  const missingCategory = await multipartRequest({ path: '/api/files', token: fileAdminToken, fields: { ...fields, category: '' } });
  assert.equal(missingCategory.status, 422);
  const missingSelectedUser = await multipartRequest({ path: '/api/files', token: fileAdminToken, fields: { ...fields, visibility: 'Selected Users' } });
  assert.equal(missingSelectedUser.status, 422);
});

test('Admin uploads files for all users and selected teams', async () => {
  const sharedAll = await multipartRequest({ path: '/api/files', token: fileAdminToken, fields: {
    title: 'University Operations Guide', reportType: 'General File', visibility: 'All Users', approvalRequired: 'false'
  }});
  assert.equal(sharedAll.status, 201, sharedAll.body?.error?.message);
  adminSharedFile = sharedAll.body.file;

  const teamShared = await multipartRequest({ path: '/api/files', token: fileAdminToken, fields: {
    title: 'Campus Team File', reportType: 'General File', visibility: 'Selected Team', selectedTeam: 'Campus 3', approvalRequired: 'false'
  }});
  assert.equal(teamShared.status, 201, teamShared.body?.error?.message);
  const db = await readDb();
  const officerId = db.users.find((item) => item.username === 'officer').id;
  const selectedUser = await multipartRequest({ path: '/api/files', token: fileAdminToken, fields: {
    title: 'Selected User File', reportType: 'General File', visibility: 'Selected Users', selectedUsers: [officerId], approvalRequired: 'false'
  }});
  assert.equal(selectedUser.status, 201, selectedUser.body?.error?.message);
  const userList = await request({ path: '/api/files?tab=shared&limit=50', token: fileUserToken });
  assert.equal(userList.status, 200);
  assert.ok(userList.body.data.some((item) => item.id === adminSharedFile.id));
  assert.ok(userList.body.data.some((item) => item.id === teamShared.body.file.id));
  assert.ok(userList.body.data.some((item) => item.id === selectedUser.body.file.id));
});

test('file storage options include all campuses and academic departments', async () => {
  const response = await request({ path: '/api/files/options', token: fileAdminToken });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.campuses, ['Main Campus', 'Campus 2', 'Campus 3']);
  assert.ok(response.body.departments.length > 0);
});

test('admission periods are Admin-only and enforce lifecycle validation with audit history', async () => {
  const opening = new Date(Date.now() + 2 * 86400000).toISOString();
  const closing = new Date(Date.now() + 32 * 86400000).toISOString();
  const payload = { name: 'January Undergraduate Intake', academicYear: '2026-2027', intakeName: 'January Intake',
    admissionType: 'Undergraduate', openingDatetime: opening, closingDatetime: closing, timezone: 'Africa/Nairobi', status: 'Draft' };
  const forbidden = await request({ method: 'POST', path: '/api/admission-periods', token: fileUserToken, body: payload });
  assert.equal(forbidden.status, 403);
  const invalid = await request({ method: 'POST', path: '/api/admission-periods', token: fileAdminToken,
    body: { ...payload, name: 'Invalid Dates', openingDatetime: closing, closingDatetime: opening } });
  assert.equal(invalid.status, 422);
  const created = await request({ method: 'POST', path: '/api/admission-periods', token: fileAdminToken, body: payload });
  assert.equal(created.status, 201, created.body?.error?.message);
  const id = created.body.period.id;
  assert.equal((await request({ method: 'POST', path: `/api/admission-periods/${id}/open`, token: fileAdminToken, body: {} })).status, 200);
  assert.equal((await request({ method: 'POST', path: `/api/admission-periods/${id}/pause`, token: fileAdminToken, body: { reason: 'Administrative review' } })).body.period.status, 'Paused');
  assert.equal((await request({ method: 'POST', path: `/api/admission-periods/${id}/resume`, token: fileAdminToken, body: {} })).body.period.status, 'Open');
  const extendedClosing = new Date(Date.now() + 40 * 86400000).toISOString();
  assert.equal((await request({ method: 'POST', path: `/api/admission-periods/${id}/extend`, token: fileAdminToken, body: { closingDatetime: extendedClosing, reason: 'Give applicants more time' } })).status, 200);
  assert.equal((await request({ method: 'POST', path: `/api/admission-periods/${id}/close`, token: fileAdminToken, body: { reason: 'Intake review' } })).body.period.status, 'Closed');
  assert.equal((await request({ method: 'POST', path: `/api/admission-periods/${id}/reopen`, token: fileAdminToken, body: { reason: 'Approved reopening' } })).body.period.status, 'Open');
  const history = await request({ path: `/api/admission-periods/${id}/activity`, token: fileAdminToken });
  assert.ok(history.body.data.some((entry) => entry.action === 'Registration paused'));
  assert.ok(history.body.data.some((entry) => entry.action === 'Deadline extended'));
  assert.ok(history.body.data.some((entry) => entry.action === 'Registration reopened'));
});

test('scheduled admission periods open and expire using server time', async () => {
  const now = new Date();
  await updateDb((db) => {
    db.admissionPeriods.unshift({ id: 'adp_auto_open', name: 'Automatic Opening', academicYear: '2026-2027', intakeName: 'Automatic Intake', admissionType: 'General Admission',
      facultyId: '', programId: '', openingDatetime: new Date(now.getTime() - 60000).toISOString(), closingDatetime: new Date(now.getTime() + 86400000).toISOString(),
      timezone: 'Africa/Nairobi', status: 'Scheduled', automaticOpen: true, automaticClose: true, archived: false, version: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() });
    db.admissionPeriods.unshift({ id: 'adp_auto_expire', name: 'Automatic Expiry', academicYear: '2026-2027', intakeName: 'Expired Intake', admissionType: 'General Admission',
      facultyId: '', programId: '', openingDatetime: new Date(now.getTime() - 86400000).toISOString(), closingDatetime: new Date(now.getTime() - 60000).toISOString(),
      timezone: 'Africa/Nairobi', status: 'Open', automaticOpen: true, automaticClose: true, archived: false, version: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() });
  });
  await request({ path: '/api/admission-registration/status?intake=Automatic%20Intake' });
  const db = await readDb();
  assert.equal(db.admissionPeriods.find((p) => p.id === 'adp_auto_open').status, 'Open');
  assert.equal(db.admissionPeriods.find((p) => p.id === 'adp_auto_expire').status, 'Expired');
});

test('applicants cannot bypass a paused registration period through the API', async () => {
  await updateDb((db) => {
    const period = db.admissionPeriods.find((item) => item.id === 'adp_general_2026');
    period.status = 'Paused'; period.automaticOpen = false;
  });
  const response = await request({ method: 'POST', path: '/api/applications', body: validApplication({
    fullName: 'Blocked Period Applicant', nationalId: '1001001099', rollNumber: '1001002099', email: 'blocked.period@example.com', mobile: '610000099'
  }) });
  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'ADMISSION_REGISTRATION_CLOSED');
  await updateDb((db) => {
    const period = db.admissionPeriods.find((item) => item.id === 'adp_general_2026');
    period.status = 'Open'; period.automaticOpen = true;
  });
});

test('a user cannot access another user private file but Admin can access every file', async () => {
  const privateUpload = await multipartRequest({ path: '/api/files', token: fileAdminToken, fields: {
    title: 'Private Admin File', reportType: 'General File', visibility: 'Private', approvalRequired: 'false'
  }});
  privateAdminFile = privateUpload.body.file;
  const denied = await request({ path: `/api/files/${privateAdminFile.id}`, token: fileUserToken });
  assert.equal(denied.status, 404);
  const allowed = await request({ path: `/api/files/${privateAdminFile.id}/download`, token: fileAdminToken });
  assert.equal(allowed.status, 200);
});

test('user daily and monthly reports persist and duplicate periods are rejected', async () => {
  const dailyFields = { title: 'Daily Activity Report', reportType: 'Daily Report', reportDate: '2026-07-21', visibility: 'Private' };
  const daily = await multipartRequest({ path: '/api/files', token: fileUserToken, fields: dailyFields });
  assert.equal(daily.status, 201, daily.body?.error?.message);
  userDailyFile = daily.body.file;
  const duplicateDaily = await multipartRequest({ path: '/api/files', token: fileUserToken, fields: dailyFields });
  assert.equal(duplicateDaily.status, 409);

  const monthlyFields = { title: 'Monthly Activity Report', reportType: 'Monthly Report', reportingMonth: '7', reportingYear: '2026', visibility: 'Private' };
  const monthly = await multipartRequest({ path: '/api/files', token: fileUserToken, fields: monthlyFields });
  assert.equal(monthly.status, 201, monthly.body?.error?.message);
  const duplicateMonthly = await multipartRequest({ path: '/api/files', token: fileUserToken, fields: monthlyFields });
  assert.equal(duplicateMonthly.status, 409);
});

test('Admin approval, rejection comments, archive filtering, and file activity logs work', async () => {
  const approved = await request({ method: 'PATCH', path: `/api/files/${userDailyFile.id}/review`, token: fileAdminToken,
    body: { status: 'Approved', adminComment: 'Daily report verified.' } });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.file.approvalStatus, 'Approved');
  assert.equal(approved.body.file.adminComment, 'Daily report verified.');

  const rejectTarget = await multipartRequest({ path: '/api/files', token: fileUserToken, fields: {
    title: 'Revision Report', reportType: 'Daily Report', reportDate: '2026-07-20', visibility: 'Private'
  }});
  const rejected = await request({ method: 'PATCH', path: `/api/files/${rejectTarget.body.file.id}/review`, token: fileAdminToken,
    body: { status: 'Rejected', adminComment: 'Please correct the totals.' } });
  assert.equal(rejected.body.file.approvalStatus, 'Rejected');
  assert.equal(rejected.body.file.adminComment, 'Please correct the totals.');

  await request({ method: 'PATCH', path: `/api/files/${userDailyFile.id}/archive`, token: fileUserToken, body: { archived: true } });
  const normal = await request({ path: '/api/files?tab=all&limit=50', token: fileUserToken });
  const archived = await request({ path: '/api/files?tab=archived&limit=50', token: fileUserToken });
  assert.equal(normal.body.data.some((item) => item.id === userDailyFile.id), false);
  assert.equal(archived.body.data.some((item) => item.id === userDailyFile.id), true);
  const activities = await request({ path: `/api/files/${userDailyFile.id}/activities`, token: fileUserToken });
  assert.ok(activities.body.data.some((item) => item.action === 'File uploaded'));
  assert.ok(activities.body.data.some((item) => item.action === 'File approved'));
  assert.ok(activities.body.data.some((item) => item.action === 'File archived'));
});

let applicantPaymentAccess;
let applicantRegistration;

test('public applicant can submit an application', async () => {
  const response = await request({
    method: 'POST',
    path: '/api/applications',
    body: validApplication()
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.application.status, 'DRAFT');
  assert.equal(response.body.application.admissionFee, 25);
  assert.equal(response.body.application.paymentStatus, 'UNPAID');
  assert.equal(response.body.payment, null);
  assert.ok(response.body.paymentAccessToken);
  applicantPaymentAccess = response.body.paymentAccessToken;
  applicantRegistration = response.body.application;
});

test('application identifiers and phone numbers enforce numeric length and positive-value rules', async () => {
  const accepted = await request({
    method: 'POST',
    path: '/api/applications',
    body: validApplication({
      fullName: 'Maximum Identifier Applicant',
      nationalId: '123456789012345',
      rollNumber: '223456789012345',
      email: 'maximum.identifiers@example.com',
      mobile: '+25261234567'
    })
  });
  assert.equal(accepted.status, 201, accepted.body?.error?.message);

  const invalidCases = [
    ['nationalId', '123456789', 'National ID'],
    ['nationalId', '1234567890123456', 'National ID'],
    ['nationalId', '12345ABC90', 'National ID'],
    ['nationalId', '0000000000', 'National ID'],
    ['rollNumber', '123456789', 'Roll Number'],
    ['rollNumber', '1234567890123456', 'Roll Number'],
    ['rollNumber', '12345/7890', 'Roll Number'],
    ['rollNumber', '0000000000', 'Roll Number'],
    ['mobile', '6123456', 'Phone Number'],
    ['mobile', '00000000', 'Phone Number'],
    ['mobile', '61A345678', 'Phone Number'],
    ['mobile', '61 234567', 'Phone Number']
  ];

  for (const [field, value, label] of invalidCases) {
    const response = await request({
      method: 'POST',
      path: '/api/applications',
      body: validApplication({ [field]: value })
    });
    assert.equal(response.status, 422, `${label} value ${value} should be rejected`);
    assert.match(response.body.error.message, new RegExp(label));
  }
});

test('university accepts C and C- passing grades', async () => {
  for (const [index, grade] of ['C', 'C-'].entries()) {
    const response = await request({
      method: 'POST',
      path: '/api/applications',
      body: validApplication({
        fullName: index === 0 ? 'Accepted Grade Applicant One' : 'Accepted Grade Applicant Two',
        nationalId: `100101000${index + 1}`,
        rollNumber: `200101000${index + 1}`,
        email: `accepted.grade.${index + 1}@example.com`,
        mobile: `61000001${index}`,
        percentage: grade
      })
    });

    assert.equal(response.status, 201, response.body?.message);
    assert.equal(response.body.application.percentage, grade);
  }
});

test('classes survive concurrent updates and a database restart', async () => {
  const firstId = `cls_${crypto.randomUUID()}`;
  const secondId = `cls_${crypto.randomUUID()}`;

  await Promise.all([
    updateDb(async (db) => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      db.classes = db.classes || [];
      db.classes.push({ id: firstId, name: 'Persistent Class A', capacity: 30 });
    }),
    updateDb((db) => {
      db.classes = db.classes || [];
      db.classes.push({ id: secondId, name: 'Persistent Class B', capacity: 30 });
    })
  ]);

  await closeDb();
  const reloaded = await readDb();
  assert.ok(reloaded.classes.some((item) => item.id === firstId));
  assert.ok(reloaded.classes.some((item) => item.id === secondId));
});

test('concurrent automatic assignment never puts more than 60 students in a class', async () => {
  const marker = crypto.randomUUID().slice(0, 8);
  const faculty = `Concurrency Faculty ${marker}`;
  const department = `Concurrency Department ${marker}`;
  const departmentId = `dep_concurrency_${marker}`;
  const firstClassId = `cls_concurrency_${marker}`;

  await updateDb((db) => {
    db.programs.push({
      id: `fac_concurrency_${marker}`,
      title: faculty,
      departments: [{ id: departmentId, name: department, code: `Z${marker.slice(0, 3).toUpperCase()}` }]
    });
    db.classes.push({
      id: firstClassId, classCode: `Z${marker.slice(0, 3).toUpperCase()}261`,
      name: `Z${marker.slice(0, 3).toUpperCase()}261`, faculty, department,
      departmentId, academicYear: 2026, sequenceNumber: 1, capacity: 60
    });
    for (let index = 1; index <= 59; index += 1) {
      db.students.push({ id: `concurrent_existing_${marker}_${index}`, classId: firstClassId, status: 'Enrolled' });
    }
  });

  await Promise.all([1, 2].map((index) => updateDb(async (db) => {
    if (index === 1) await new Promise((resolve) => setTimeout(resolve, 20));
    const assigned = assignAutomaticClass(db, { faculty, department, academicYear: 2026 });
    db.students.push({ id: `concurrent_new_${marker}_${index}`, classId: assigned.id, status: 'Enrolled' });
  })));

  const db = await readDb();
  const relevantClasses = db.classes.filter((item) => item.departmentId === departmentId);
  const counts = relevantClasses.map((item) => db.students.filter((student) => student.classId === item.id && student.status === 'Enrolled').length);
  assert.deepEqual(counts.sort((a, b) => b - a), [60, 1]);
  assert.equal(new Set(relevantClasses.map((item) => item.classCode)).size, 2);
});

test('discounts and every admin collection survive a database restart', async () => {
  const marker = `persist_${crypto.randomUUID()}`;
  const persistentCollections = ['users', 'programs', 'applications', 'students', 'payments', 'contactMessages', 'activities', 'classes', 'files', 'fileShares', 'fileActivities', 'notifications'];

  await updateDb((db) => {
    for (const collection of persistentCollections) {
      assert.ok(db[collection].length > 0, `${collection} must contain a record for the persistence test`);
      db[collection][0].persistenceMarker = marker;
    }
    db.students[0].discountReason = 'Scholarship';
    db.students[0].discountPercentage = 30;
    db.settings.persistenceMarker = marker;
    db.settings.twoFactorRequired = false;
  });

  await closeDb();
  const reloaded = await readDb();
  for (const collection of persistentCollections) {
    assert.equal(reloaded[collection][0].persistenceMarker, marker, `${collection} was not persisted`);
  }
  assert.equal(reloaded.students[0].discountReason, 'Scholarship');
  assert.equal(reloaded.students[0].discountPercentage, 30);
  assert.equal(reloaded.settings.persistenceMarker, marker);
  assert.equal(reloaded.settings.twoFactorRequired, false);
});

test('JSON database recovers all admin data from its latest backup', async () => {
  const before = await readDb();
  await fs.writeFile(process.env.DB_FILE, '{corrupted-json');

  const recovered = await readDb();
  assert.equal(recovered.students[0].discountPercentage, before.students[0].discountPercentage);
  assert.equal(recovered.classes.length, before.classes.length);
  assert.equal(recovered.applications.length, before.applications.length);
  assert.equal(recovered.payments.length, before.payments.length);
  assert.equal(recovered.programs.length, before.programs.length);
  assert.equal(recovered.users.length, before.users.length);
});

test('certificate appointment is required when applicant has no certificate', async () => {
  const response = await request({
    method: 'POST',
    path: '/api/applications',
    body: validApplication({
      fullName: 'Missing Appointment',
      email: 'missing.appointment@example.com',
      mobile: '610000001',
      appointmentDate: '',
      appointmentTime: ''
    })
  });
  assert.equal(response.status, 422);
  assert.deepEqual(response.body.error.details, ['appointmentDate', 'appointmentTime']);
});

test('certificate appointment must be within one year', async () => {
  const allowed = await request({
    method: 'POST',
    path: '/api/applications',
    body: validApplication({
      fullName: 'Maximum Appointment Applicant',
      nationalId: '1001001020',
      rollNumber: '2001001020',
      email: 'maximum.appointment@example.com',
      mobile: '610000020',
      appointmentDate: maximumAppointmentDate
    })
  });
  assert.equal(allowed.status, 201, allowed.body?.error?.message);

  const tooLate = await request({
    method: 'POST',
    path: '/api/applications',
    body: validApplication({
      fullName: 'Late Appointment Applicant',
      nationalId: '1001001021',
      rollNumber: '2001001021',
      email: 'late.appointment@example.com',
      mobile: '610000021',
      appointmentDate: dateBeyondOneYear
    })
  });
  assert.equal(tooLate.status, 422);
  assert.equal(tooLate.body.error.message, 'Certificate appointment date cannot be more than one year from today');
});

test('public visitor can submit a contact message', async () => {
  const response = await request({
    method: 'POST',
    path: '/api/contact-messages',
    body: {
      name: 'Contact Visitor',
      email: 'contact.visitor@example.com',
      phone: '612345000',
      type: 'Admission',
      message: 'I need admission information.'
    }
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.contact.status, 'Pending');
});

test('admin cannot create an academic program shorter than 5 years', async () => {
  const login = await request({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      username: 'admin',
      password: 'admin12345'
    }
  });

  const response = await request({
    method: 'POST',
    path: '/api/programs/fac_engineering/departments',
    token: login.body.token,
    body: {
      name: 'Short Program',
      durationYears: 4
    }
  });

  assert.equal(response.status, 422);
  assert.match(response.body.error.message, /at least 5 years/);
});

const providerResponse = (body) => async () => ({
  ok: true,
  status: 200,
  json: async () => body
});

const paymentBody = (overrides = {}) => ({
  registrationId: applicantRegistration.reference,
  amount: '25.00',
  phoneNumber: '0618827482',
  idempotencyKey: `idem-${crypto.randomUUID()}`,
  ...overrides
});

const createPaymentDraft = async () => {
  const suffix = `1${Date.now().toString().slice(-9)}`;
  const response = await request({
    method: 'POST',
    path: '/api/applications',
    body: validApplication({
      fullName: 'Payment Test Applicant',
      nationalId: `${suffix}`,
      rollNumber: `${suffix}`,
      email: `payment-${suffix}@example.com`
    })
  });
  assert.equal(response.status, 201);
  return { application: response.body.application, token: response.body.paymentAccessToken };
};

const draftPaymentBody = (draft, overrides = {}) => paymentBody({ registrationId: draft.application.reference, ...overrides });

test('dynamic amounts and Somali EVC phone formats validate safely', () => {
  assert.equal(parseAmountToMinor('10'), 1000);
  assert.equal(parseAmountToMinor('10.25'), 1025);
  assert.equal(parseAmountToMinor('0.01'), 1);
  assert.throws(() => parseAmountToMinor('0'));
  assert.throws(() => parseAmountToMinor('-1'));
  assert.throws(() => parseAmountToMinor('1.001'));
  assert.equal(parseAmountToMinor('10001'), 1000100);
  assert.equal(normalizeSomaliEvcPhone('618827482'), '252618827482');
  assert.equal(normalizeSomaliEvcPhone('0618827482'), '252618827482');
  assert.equal(normalizeSomaliEvcPhone('+252618827482'), '252618827482');
  assert.equal(normalizeSomaliEvcPhone('252618827482'), '252618827482');
  assert.throws(() => normalizeSomaliEvcPhone('621234567'));
});

test('payment preview validates ownership, amount, and masks phone numbers', async () => {
  const response = await request({
    method: 'POST', path: '/api/payments/preview', token: applicantPaymentAccess,
    body: paymentBody()
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.preview.amount, 25);
  assert.equal(response.body.preview.payerPhone, '25261****482');
  assert.equal(JSON.stringify(response.body).includes('252618827482'), false);

  const unauthorized = await request({
    method: 'POST', path: '/api/payments/preview', token: applicantPaymentAccess,
    body: paymentBody({ registrationId: 'JUM-2026-0001' })
  });
  assert.equal(unauthorized.status, 403);

  const missing = await request({
    method: 'POST', path: '/api/payments/preview', token: applicantPaymentAccess,
    body: paymentBody({ registrationId: 'REG-NOT-FOUND' })
  });
  assert.equal(missing.status, 404);
});

test('backend rejects submission before a confirmed EVC payment', async () => {
  const response = await request({
    method: 'POST',
    path: `/api/applications/${applicantRegistration.reference}/submit`,
    token: applicantPaymentAccess
  });
  assert.equal(response.status, 409);
  assert.equal(response.body.error.message, 'A confirmed payment is required before submitting this application.');
});

test('approved admission-fee payment is idempotent and produces a safe receipt', async () => {
  let calls = 0;
  let providerPayload;
  setWaafiTransportForTests(async (_url, options) => {
    calls += 1;
    providerPayload = JSON.parse(options.body);
    return { ok: true, status: 200, json: async () => ({ responseCode: '2001', params: { state: 'approved', transactionId: 'TX-1268666' } }) };
  });
  const body = paymentBody();
  const [first, duplicate] = await Promise.all([
    request({ method: 'POST', path: '/api/payments/initiate', token: applicantPaymentAccess, body }),
    request({ method: 'POST', path: '/api/payments/initiate', token: applicantPaymentAccess, body })
  ]);
  assert.equal(first.status, 200);
  assert.equal(first.body.payment.status, 'SUCCESS');
  assert.equal(duplicate.body.payment.referenceId, first.body.payment.referenceId);
  assert.equal(calls, 1);
  assert.equal(providerPayload.serviceParams.transactionInfo.amount, '25.00');
  assert.equal(first.body.payment.amount, 25);

  const receiptResponse = await request({
    path: `/api/payments/${first.body.payment.referenceId}/receipt`, token: applicantPaymentAccess
  });
  assert.equal(receiptResponse.status, 200);
  assert.equal(receiptResponse.body.receipt.providerTransactionId, 'TX-1268666');
  assert.match(receiptResponse.body.receipt.walletBalanceMessage, /confirmation message/i);
  const serialized = JSON.stringify(receiptResponse.body);
  assert.equal(serialized.includes('super-secret-test-api-key'), false);
  assert.equal(serialized.includes('252618827482'), false);
  assert.equal(serialized.toLowerCase().includes('walletbalance":'), false);
});

test('HTTP 200 without approved provider state is not successful', async () => {
  const declinedDraft = await createPaymentDraft();
  setWaafiTransportForTests(providerResponse({ responseCode: '2001', params: { state: 'DECLINED' } }));
  const response = await request({ method: 'POST', path: '/api/payments/initiate', token: declinedDraft.token, body: draftPaymentBody(declinedDraft) });
  assert.equal(response.status, 200);
  assert.equal(response.body.payment.status, 'FAILED');
});

test('sandbox authentication failure is reported clearly and safely', async () => {
  const authDraft = await createPaymentDraft();
  setWaafiTransportForTests(providerResponse({
    responseCode: '5001',
    errorCode: '1001',
    responseMsg: 'Request could not be processed. Please check the error details and try again.',
    params: { description: 'Authentication failed' }
  }));
  const response = await request({
    method: 'POST', path: '/api/payments/initiate', token: authDraft.token,
    body: draftPaymentBody(authDraft, { amount: '25.00' })
  });
  assert.equal(response.body.payment.status, 'FAILED');
  assert.equal(response.body.payment.failureCode, 'SANDBOX_AUTHENTICATION_FAILED');
  assert.match(response.body.payment.failureMessage, /not valid for the configured sandbox environment/i);
  assert.equal(JSON.stringify(response.body).includes('super-secret-test-api-key'), false);
});

test('pending and malformed provider responses remain non-successful', async () => {
  const pendingDraft = await createPaymentDraft();
  setWaafiTransportForTests(providerResponse({ responseCode: '2001', params: { state: 'PENDING' } }));
  const pending = await request({ method: 'POST', path: '/api/payments/initiate', token: pendingDraft.token, body: draftPaymentBody(pendingDraft, { amount: '2.00' }) });
  assert.equal(pending.body.payment.status, 'PROCESSING');

  const malformedDraft = await createPaymentDraft();
  setWaafiTransportForTests(providerResponse({ unexpected: true }));
  const malformed = await request({ method: 'POST', path: '/api/payments/initiate', token: malformedDraft.token, body: draftPaymentBody(malformedDraft, { amount: '2.00' }) });
  assert.equal(malformed.body.payment.status, 'UNKNOWN');
});

test('provider timeout is UNKNOWN instead of FAILED', async () => {
  const timeoutDraft = await createPaymentDraft();
  setWaafiTransportForTests((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  }));
  const response = await request({ method: 'POST', path: '/api/payments/initiate', token: timeoutDraft.token, body: draftPaymentBody(timeoutDraft, { amount: '2.00' }) });
  assert.equal(response.body.payment.status, 'UNKNOWN');
  assert.equal(response.body.payment.failureCode, 'PROVIDER_TIMEOUT');
});

test('payments accept 0.01 minimum, allow submission, track the remaining 25 USD fee, and reject payment after completion', async () => {
  const fullDraft = await createPaymentDraft();
  setWaafiTransportForTests(providerResponse({ responseCode: '2001', params: { state: 'APPROVED', transactionId: 'TX-FINAL' } }));
  const partial = await request({ method: 'POST', path: '/api/payments/initiate', token: fullDraft.token, body: draftPaymentBody(fullDraft, { amount: '0.01' }) });
  assert.equal(partial.body.payment.status, 'SUCCESS');
  assert.equal(partial.body.payment.amount, 0.01);
  assert.equal(partial.body.payment.remainingBalance, 24.99);

  const earlySubmission = await request({
    method: 'POST', path: `/api/applications/${fullDraft.application.reference}/submit`, token: fullDraft.token
  });
  assert.equal(earlySubmission.status, 200);
  assert.equal(earlySubmission.body.application.status, 'Pending');
  assert.equal(earlySubmission.body.application.paymentStatus, 'PARTIALLY_PAID');

  const full = await request({ method: 'POST', path: '/api/payments/initiate', token: fullDraft.token, body: draftPaymentBody(fullDraft, { amount: '24.99' }) });
  assert.equal(full.body.payment.status, 'SUCCESS');
  assert.equal(full.body.payment.remainingBalance, 0);

  const overpayment = await request({ method: 'POST', path: '/api/payments/preview', token: fullDraft.token, body: draftPaymentBody(fullDraft) });
  assert.equal(overpayment.status, 409);

  const submission = await request({
    method: 'POST', path: `/api/applications/${fullDraft.application.reference}/submit`, token: fullDraft.token
  });
  assert.equal(submission.status, 200);
  assert.equal(submission.body.application.status, 'Pending');
  assert.equal(submission.body.application.paymentStatus, 'PAID');
  assert.equal(submission.body.application.paymentTransactionId, 'TX-FINAL');
});

test('frontend has no EVC PIN input field', async () => {
  const source = await fs.readFile(new URL('../../frontend/src/components/EvcPaymentFlow.jsx', import.meta.url), 'utf8');
  assert.equal(/name=["'](?:evc)?pin["']/i.test(source), false);
  assert.equal(/type=["']password["']/i.test(source), false);
  assert.match(source, /Number\(preview\.amount\)\.toFixed\(2\)/);
  const applyPage = await fs.readFile(new URL('../../frontend/src/pages/ApplyPage.jsx', import.meta.url), 'utf8');
  assert.match(applyPage, /confirmedEvcPayment\?\.status !== 'SUCCESS'/);
  assert.match(applyPage, /name="paymentAmount" value=\{form\.paymentAmount\}/);
  assert.match(applyPage, /name="paymentAmount"[^>]*min="0\.01"/);
  assert.doesNotMatch(applyPage, /name="paymentAmount"[^>]*readOnly/);
});

test('all public and backend admission fees are fixed at 25 USD', async () => {
  const admissionsPage = await fs.readFile(new URL('../../frontend/src/pages/AdmissionsPage.jsx', import.meta.url), 'utf8');
  const feesData = await import('../../frontend/src/data/admissionsData.js');
  assert.match(admissionsPage, /fixed, non-refundable admission fee of <strong>\$25<\/strong>/);
  assert.equal(/<strong>\$(?:30|35)<\/strong>/.test(admissionsPage), false);
  for (const group of feesData.programFeeGroups) {
    for (const program of group.programs) assert.equal(program[7], 25, `${program[0]} registration fee must be 25`);
  }
  const db = await readDb();
  assert.ok(db.programs.length > 0);
  assert.equal(db.programs.every((program) => Number(program.admissionFee) === 25), true);
  assert.equal(db.applications.every((application) => Number(application.admissionFee) === 25), true);
});

test('Somali SMS phone numbers normalize to international format and invalid numbers are rejected', () => {
  assert.equal(normalizeSomaliPhoneNumber('0618833500'), '+252618833500');
  assert.equal(normalizeSomaliPhoneNumber('618833500'), '+252618833500');
  assert.equal(normalizeSomaliPhoneNumber('252618833500'), '+252618833500');
  assert.equal(normalizeSomaliPhoneNumber('+252618833500'), '+252618833500');
  assert.throws(() => normalizeSomaliPhoneNumber(''));
  assert.throws(() => normalizeSomaliPhoneNumber('12345'));
});

test('application SMS is persistent, idempotent, uses the stored phone, and sends the exact Xaliye6 payload', async () => {
  env.smsEnabled = true;
  let providerCall;
  setSmsTransportForTests(async (url, options) => {
    providerCall = { url, payload: JSON.parse(options.body) };
    return { ok: true, status: 200, json: async () => ({ success: true, messageId: 'SMS-TEST-1' }) };
  });
  const application = {
    id: `app_sms_${crypto.randomUUID()}`, reference: `JUM-SMS-${crypto.randomUUID().slice(0, 8)}`,
    fullName: 'SMS Test Student', mobile: '0618833500', status: 'Pending'
  };
  const notification = await updateDb((db) => {
    db.applications.unshift(application);
    const first = createApplicationSubmittedNotification(db, application);
    const duplicate = createApplicationSubmittedNotification(db, application);
    assert.equal(duplicate.id, first.id);
    return first;
  });
  const sent = await processSmsNotification(notification.id);
  assert.equal(sent.status, 'SENT');
  assert.equal(sent.attemptCount, 1);
  assert.equal(providerCall.url, 'https://api.xaliye6.online/sendSMS');
  assert.deepEqual(providerCall.payload, {
    mobile: '+252618833500',
    message: 'Jamhuriya University: Codsigaaga diiwaangelinta si guul leh ayaa loo gudbiyay. Mahadsanid.'
  });
  const persisted = await readDb();
  assert.equal(persisted.smsNotifications.find((item) => item.id === notification.id).status, 'SENT');
});

test('SMS failure never removes the saved application and Admin-only monitoring is protected', async () => {
  env.smsEnabled = true;
  setSmsTransportForTests(async () => { throw new Error('network unavailable'); });
  const application = {
    id: `app_sms_fail_${crypto.randomUUID()}`, reference: `JUM-SMS-FAIL-${crypto.randomUUID().slice(0, 8)}`,
    fullName: 'SMS Failure Student', mobile: '618833501', status: 'Pending'
  };
  const notification = await updateDb((db) => {
    db.applications.unshift(application);
    return createApplicationSubmittedNotification(db, application);
  });
  const failed = await processSmsNotification(notification.id);
  assert.equal(failed.status, 'FAILED');
  assert.equal((await readDb()).applications.some((item) => item.id === application.id), true);

  const forbidden = await request({ path: '/api/sms-notifications', token: fileUserToken });
  assert.equal(forbidden.status, 403);
  const allowed = await request({ path: '/api/sms-notifications?status=FAILED', token: fileAdminToken });
  assert.equal(allowed.status, 200);
  assert.ok(allowed.body.data.some((item) => item.id === notification.id));
  env.smsEnabled = false;
  setSmsTransportForTests(null);
});

test('application approval remains separate and does not create a scheduled SMS campaign', async () => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const applicationId = `app_approval_sms_${suffix}`;
  const classId = `class_approval_sms_${suffix}`;
  await updateDb((db) => {
    db.classes.unshift({ id: classId, name: 'CNS Approval Test', faculty: 'Computer Science & IT', department: 'Computer Application', capacity: 50 });
    db.applications.unshift({
      id: applicationId, reference: `JUM-APPROVAL-${suffix}`, fullName: 'Approved SMS Student',
      email: `approval-${suffix}@example.com`, mobile: '0618833502', faculty: 'Computer Science & IT',
      department: 'Computer Application', campus: 'Main Campus', status: 'Pending', notes: '', classId,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
  });
  const approved = await request({ method: 'PATCH', path: `/api/applications/${applicationId}/status`, token: fileAdminToken,
    body: { status: 'Approved', classId } });
  assert.equal(approved.status, 200, approved.body?.error?.message);
  assert.equal(approved.body.application.status, 'Approved');
  assert.equal(approved.body.smsStatus, undefined);
  const db = await readDb();
  assert.equal(db.smsCampaigns.some((item) => item.applicationId === applicationId), false);
  assert.equal(db.smsNotifications.some((item) => item.idempotencyKey === `APPLICATION_APPROVED:${applicationId}`), false);
});

test('scheduled message APIs are Admin-only and validate placeholders and future server time', async () => {
  const forbidden = await request({ path: '/api/scheduled-messages', token: fileUserToken });
  assert.equal(forbidden.status, 403);
  const unsupported = await request({ method: 'POST', path: '/api/scheduled-messages/preview', token: fileAdminToken,
    body: { messageContent: 'Hello {{unsupported_value}}', targetAudience: 'All students' } });
  assert.equal(unsupported.status, 422);
  const past = await request({ method: 'POST', path: '/api/scheduled-messages', token: fileAdminToken, body: {
    title: 'Past campaign', messageType: 'Custom Message', messageContent: 'Hello students', targetAudience: 'All students',
    action: 'schedule', scheduledAt: new Date(Date.now() - 60_000).toISOString()
  }});
  assert.equal(past.status, 422);
});

test('Admin previews class and individual audiences with personalized recipient counts', async () => {
  const marker = crypto.randomUUID().slice(0, 8); const classId = `scheduled_class_${marker}`;
  await updateDb((db) => {
    db.classes.unshift({ id: classId, name: 'CS Scheduled A', faculty: 'Computer Science & IT', department: 'Computer Application', capacity: 50, startDate: '2026-09-01', startTime: '08:00' });
    db.students.unshift(
      { id: `scheduled_valid_${marker}`, studentNumber: `JUST-${marker}-1`, fullName: 'Valid Scheduled Student', mobile: '0618833503', faculty: 'Computer Science & IT', department: 'Computer Application', campus: 'Campus 3', classId, className: 'CS Scheduled A', status: 'Enrolled', createdAt: new Date().toISOString() },
      { id: `scheduled_invalid_${marker}`, studentNumber: `JUST-${marker}-2`, fullName: 'Invalid Scheduled Student', mobile: 'invalid', faculty: 'Computer Science & IT', department: 'Computer Application', campus: 'Campus 3', classId, className: 'CS Scheduled A', status: 'Enrolled', createdAt: new Date().toISOString() }
    );
  });
  const response = await request({ method: 'POST', path: '/api/scheduled-messages/preview', token: fileAdminToken, body: {
    messageContent: 'Hello {{student_name}}, class {{class_name}} starts {{class_start_date}}.',
    targetAudience: 'Students in a selected class', targetFilters: { classId }
  }});
  assert.equal(response.status, 200, response.body?.error?.message);
  assert.equal(response.body.totalRecipients, 2); assert.equal(response.body.validRecipients, 1); assert.equal(response.body.invalidRecipients, 1);
  assert.match(response.body.recipients[0].personalizedMessage, /CS Scheduled A/);
  assert.equal(response.body.recipients.some((item) => /{{/.test(item.personalizedMessage)), false);

  const individual = await request({ method: 'POST', path: '/api/scheduled-messages/preview', token: fileAdminToken, body: {
    messageContent: 'Individual message for {{student_id}}', targetAudience: 'Individually selected students', selectedStudentIds: [`scheduled_valid_${marker}`]
  }});
  assert.equal(individual.body.totalRecipients, 1);
});

test('scheduled campaign waits, sends in background batches once, and isolates recipient failures', async () => {
  env.smsEnabled = true; env.smsBatchSize = 1; env.smsBatchDelayMs = 0;
  let calls = 0;
  setSmsTransportForTests(async (_url, options) => {
    calls += 1; const payload = JSON.parse(options.body);
    if (payload.mobile.endsWith('504')) throw new Error('temporary network failure');
    return { ok: true, status: 200, json: async () => ({ success: true, messageId: `MSG-${calls}` }) };
  });
  const marker = crypto.randomUUID().slice(0, 8); const ids = [`batch_a_${marker}`, `batch_b_${marker}`];
  await updateDb((db) => db.students.unshift(
    { id: ids[0], studentNumber: `BATCH-${marker}-A`, fullName: 'Batch Success', mobile: '0618833505', faculty: 'Engineering', department: 'Civil Engineering', campus: 'Campus 2', status: 'Enrolled', createdAt: new Date().toISOString() },
    { id: ids[1], studentNumber: `BATCH-${marker}-B`, fullName: 'Batch Failure', mobile: '0618833504', faculty: 'Engineering', department: 'Civil Engineering', campus: 'Campus 2', status: 'Enrolled', createdAt: new Date().toISOString() }
  ));
  const future = new Date(Date.now() + 3600_000).toISOString();
  const created = await request({ method: 'POST', path: '/api/scheduled-messages', token: fileAdminToken, body: {
    title: `Batch test ${marker}`, messageType: 'Orientation', messageContent: 'Welcome {{student_name}} ({{student_id}})',
    targetAudience: 'Individually selected students', selectedStudentIds: ids, scheduledAt: future, action: 'schedule'
  }});
  assert.equal(created.status, 201, created.body?.error?.message); assert.equal(created.body.campaign.status, 'Scheduled'); assert.equal(calls, 0);
  const campaignId = created.body.campaign.id;
  await processCampaign(campaignId, { force: true });
  let db = await readDb(); let campaign = db.smsCampaigns.find((item) => item.id === campaignId);
  assert.equal(calls, 2); assert.equal(campaign.status, 'Partially Sent'); assert.equal(campaign.successfulCount, 1); assert.equal(campaign.failedCount, 1);
  await processCampaign(campaignId, { force: true });
  assert.equal(calls, 2, 'a completed campaign must not send successful recipients twice');
  assert.ok(db.activities.some((item) => item.module === 'Scheduled Student Messages' && item.metadata?.campaignId === campaignId));
  env.smsEnabled = false; setSmsTransportForTests(null);
});

test('cancelled scheduled campaign is never processed', async () => {
  const future = new Date(Date.now() + 3600_000).toISOString();
  const created = await request({ method: 'POST', path: '/api/scheduled-messages', token: fileAdminToken, body: {
    title: 'Cancelled campaign', messageType: 'General Announcement', messageContent: 'This must not send.',
    targetAudience: 'All students', scheduledAt: future, action: 'schedule'
  }});
  const cancelled = await request({ method: 'POST', path: `/api/scheduled-messages/${created.body.campaign.id}/cancel`, token: fileAdminToken, body: { reason: 'Test cancellation' } });
  assert.equal(cancelled.body.campaign.status, 'Cancelled');
  assert.equal(await processCampaign(created.body.campaign.id, { force: true }), null);
});
