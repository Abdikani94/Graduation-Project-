import assert from 'node:assert/strict';
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

const { createApp } = await import('../src/app.js');
const { ensureDb } = await import('../src/lib/db.js');

await ensureDb();

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const validApplication = (overrides = {}) => ({
  fullName: 'Test Applicant',
  motherName: 'Test Mother',
  nationality: 'Somali',
  nationalId: '',
  rollNumber: 'ROLL-1001',
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
  percentage: '86',
  heardFrom: 'Social Media',
  program: 'Computer Science & IT',
  department: 'Computer Application',
  modeOfStudy: 'Full Time',
  paymentPlan: 'Admission fee only',
  paymentMethod: 'EVC PLUS',
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
            resolve({
              status: res.statusCode,
              body: text ? JSON.parse(text) : null
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

test('public applicant can submit an application', async () => {
  const response = await request({
    method: 'POST',
    path: '/api/applications',
    body: validApplication()
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.application.status, 'Pending');
  assert.equal(response.body.application.admissionFee, 25);
  assert.equal(response.body.payment.amount, 25);
  assert.equal(response.body.payment.status, 'Pending');
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
