import { createId, readDb, updateDb } from '../lib/db.js';
import { fail, sendCsv, sendJson, sendNoContent } from '../lib/http.js';
import { matchesText, paginate, sortNewest, toCsv } from '../lib/query.js';
import { addActivity } from '../services/audit.js';
import { saveApplicationFile } from '../utils/files.js';

const applicationFields = [
  'fullName',
  'motherName',
  'nationality',
  'nationalId',
  'rollNumber',
  'dateOfBirth',
  'placeOfBirth',
  'district',
  'area',
  'email',
  'mobile',
  'sex',
  'maritalStatus',
  'campus',
  'emergencyName',
  'emergencyTell',
  'relationship',
  'familyStudied',
  'schoolName',
  'schoolDistrict',
  'graduationYear',
  'percentage',
  'heardFrom',
  'modeOfStudy',
  'paymentPlan',
  'paymentMethod',
  'hasCertificate',
  'appointmentDate',
  'appointmentTime'
];

const getBodyFields = (req) => (req.body?.fields ? req.body.fields : (req.body || {}));
const getBodyFiles = (req) => (req.body?.files ? req.body.files : []);
const today = () => new Date().toISOString().slice(0, 10);

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
const isValidPhone = (phone) => /^\+?\d[\d\s-]{6,}$/.test(phone || '');
const isValidDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date || '');
const isValidTime = (time) => /^\d{2}:\d{2}$/.test(time || '');

const generateReference = (db) => {
  const year = new Date().getFullYear();
  const next = String(db.applications.length + 1).padStart(4, '0');
  return `JUM-${year}-${next}`;
};

const getProgramFee = (db, facultyTitle) => {
  const program = db.programs.find((item) => item.title === facultyTitle);
  return program?.admissionFee || 25;
};

const createStudentFromApplication = (db, application) => {
  const existing = db.students.find((student) => student.applicationId === application.id);
  if (existing) return existing;
  const student = {
    id: createId('stu'),
    applicationId: application.id,
    studentNumber: `JUST-${new Date().getFullYear()}-${String(db.students.length + 1).padStart(4, '0')}`,
    fullName: application.fullName,
    email: application.email,
    mobile: application.mobile,
    faculty: application.faculty,
    department: application.department,
    campus: application.campus,
    status: 'Enrolled',
    whatsappSent: false,
    enrolledAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.students.unshift(student);
  return student;
};

export const createApplication = async (req, res) => {
  const fields = getBodyFields(req);
  const files = getBodyFiles(req);
  const faculty = fields.faculty || fields.program;
  const department = fields.department || fields.programOfStudy;
  const passportFile = files.find((file) => ['photo', 'passportPhoto', 'passport'].includes(file.fieldName));
  const certificateFile = files.find((file) => ['certificate', 'certificateFile'].includes(file.fieldName));

  const missing = ['fullName', 'email', 'mobile', 'hasCertificate'].filter((field) => !fields[field]);
  if (!faculty) missing.push('program');
  if (!department) missing.push('department');
  if (fields.hasCertificate === 'Yes' && !certificateFile) missing.push('certificate');
  if (fields.hasCertificate === 'No') {
    if (!fields.appointmentDate) missing.push('appointmentDate');
    if (!fields.appointmentTime) missing.push('appointmentTime');
  }
  if (missing.length) fail(422, 'Required application fields are missing', missing);
  if (!isValidEmail(fields.email)) fail(422, 'Please enter a valid email address');
  if (!isValidPhone(fields.mobile)) fail(422, 'Please enter a valid phone number');
  if (!['Yes', 'No'].includes(fields.hasCertificate)) fail(422, 'Certificate status must be Yes or No');
  if (fields.hasCertificate === 'No') {
    if (!isValidDate(fields.appointmentDate)) fail(422, 'Appointment date is invalid');
    if (!isValidTime(fields.appointmentTime)) fail(422, 'Appointment time is invalid');
    if (fields.appointmentDate < today()) fail(422, 'Appointment date cannot be in the past');
  }

  const result = await updateDb(async (db) => {
    const reference = generateReference(db);
    const documents = {};
    if (passportFile) documents.passportPhoto = await saveApplicationFile(passportFile, reference, 'passportPhoto');
    if (certificateFile) documents.certificate = await saveApplicationFile(certificateFile, reference, 'certificate');

    const now = new Date().toISOString();
    const application = {
      id: createId('app'),
      reference,
      ...Object.fromEntries(applicationFields.map((field) => [field, fields[field] || null])),
      faculty,
      department,
      admissionFee: getProgramFee(db, faculty),
      paymentStatus: 'Pending',
      status: 'Pending',
      documents,
      notes: '',
      reviewedBy: null,
      createdAt: now,
      updatedAt: now
    };

    db.applications.unshift(application);

    let payment = null;
    if (application.paymentMethod) {
      payment = {
        id: createId('pay'),
        applicationId: application.id,
        reference: application.reference,
        amount: application.admissionFee,
        currency: db.settings.currency || 'USD',
        method: application.paymentMethod,
        transactionCode: fields.transactionCode || '',
        status: 'Pending',
        createdAt: now,
        updatedAt: now
      };
      db.payments.unshift(payment);
    }

    addActivity(db, req, {
      action: 'Submitted Application',
      afterAction: 'Pending',
      applicantPerson: application.fullName,
      applicationReference: application.reference,
      module: 'Applications'
    });

    return { application, payment };
  });

  sendJson(res, 201, result);
};

export const listApplications = async (req, res) => {
  const db = await readDb();
  let items = sortNewest(db.applications);
  const { search, status, faculty, campus } = req.query;

  if (status && status !== 'All Status') items = items.filter((item) => item.status === status);
  if (faculty && faculty !== 'All Faculties') items = items.filter((item) => item.faculty === faculty);
  if (campus && campus !== 'All Campuses') items = items.filter((item) => item.campus === campus);
  items = items.filter((item) => matchesText(item, ['fullName', 'email', 'mobile', 'reference', 'department'], search));

  const summary = {
    total: db.applications.length,
    approved: db.applications.filter((item) => item.status === 'Approved').length,
    pending: db.applications.filter((item) => item.status === 'Pending').length,
    rejected: db.applications.filter((item) => item.status === 'Rejected').length
  };

  sendJson(res, 200, { ...paginate(items, req.query), summary });
};

export const getApplication = async (req, res) => {
  const db = await readDb();
  const application = db.applications.find((item) => item.id === req.params.id || item.reference === req.params.id);
  if (!application) fail(404, 'Application not found');
  const payment = db.payments.find((item) => item.applicationId === application.id);
  sendJson(res, 200, { application, payment });
};

export const updateApplication = async (req, res) => {
  const allowedFields = new Set([...applicationFields, 'faculty', 'department', 'program', 'programOfStudy', 'paymentStatus', 'notes']);
  const application = await updateDb((db) => {
    const found = db.applications.find((item) => item.id === req.params.id || item.reference === req.params.id);
    if (!found) fail(404, 'Application not found');
    const before = { ...found };

    for (const [key, value] of Object.entries(req.body || {})) {
      if (!allowedFields.has(key)) continue;
      if (key === 'program') found.faculty = value;
      else if (key === 'programOfStudy') found.department = value;
      else found[key] = value;
    }

    if (req.body?.faculty || req.body?.program) {
      found.admissionFee = getProgramFee(db, found.faculty);
    }
    found.updatedAt = new Date().toISOString();

    const student = db.students.find((item) => item.applicationId === found.id);
    if (student) {
      student.fullName = found.fullName;
      student.email = found.email;
      student.mobile = found.mobile;
      student.faculty = found.faculty;
      student.department = found.department;
      student.campus = found.campus;
      student.updatedAt = found.updatedAt;
    }

    addActivity(db, req, {
      action: 'Updated Application',
      beforeAction: before.status,
      afterAction: found.status,
      applicantPerson: found.fullName,
      applicationReference: found.reference,
      module: 'Applications'
    });

    return found;
  });

  sendJson(res, 200, { application });
};

export const updateApplicationStatus = async (req, res) => {
  const { status, note = '' } = req.body || {};
  const allowed = new Set(['Pending', 'Approved', 'Rejected', 'Waitlisted', 'Cancelled']);
  if (!allowed.has(status)) fail(422, 'Invalid application status');

  const result = await updateDb((db) => {
    const application = db.applications.find((item) => item.id === req.params.id || item.reference === req.params.id);
    if (!application) fail(404, 'Application not found');
    const before = application.status;
    application.status = status;
    application.notes = note || application.notes;
    application.reviewedBy = req.user.id;
    application.updatedAt = new Date().toISOString();

    let student = null;
    if (status === 'Approved') {
      student = createStudentFromApplication(db, application);
    }

    addActivity(db, req, {
      action: `${status} Application`,
      beforeAction: before,
      afterAction: status,
      applicantPerson: application.fullName,
      applicationReference: application.reference,
      module: 'Applications',
      metadata: { note }
    });

    return { application, student };
  });

  sendJson(res, 200, result);
};

export const deleteApplication = async (req, res) => {
  await updateDb((db) => {
    const index = db.applications.findIndex((item) => item.id === req.params.id);
    if (index === -1) fail(404, 'Application not found');
    const [application] = db.applications.splice(index, 1);
    addActivity(db, req, {
      action: 'Deleted Application',
      beforeAction: application.status,
      applicantPerson: application.fullName,
      applicationReference: application.reference,
      module: 'Applications'
    });
  });
  sendNoContent(res);
};

export const exportApplicationsCsv = async (req, res) => {
  const db = await readDb();
  const csv = toCsv(sortNewest(db.applications), [
    { key: 'reference', header: 'Reference' },
    { key: 'fullName', header: 'Applicant' },
    { key: 'email', header: 'Email' },
    { key: 'mobile', header: 'Mobile' },
    { key: 'faculty', header: 'Faculty' },
    { key: 'department', header: 'Department' },
    { key: 'campus', header: 'Campus' },
    { key: 'status', header: 'Status' },
    { key: 'paymentStatus', header: 'Payment Status' },
    { key: 'createdAt', header: 'Created At' }
  ]);
  sendCsv(res, 'applications.csv', csv);
};
