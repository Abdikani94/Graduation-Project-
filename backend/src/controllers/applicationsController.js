import { createId, readDb, updateDb } from '../lib/db.js';
import { fail, sendCsv, sendJson, sendNoContent } from '../lib/http.js';
import { matchesText, paginate, sortNewest, toCsv } from '../lib/query.js';
import { addActivity } from '../services/audit.js';
import { saveApplicationFile } from '../utils/files.js';
import { generateStudentNumber } from '../utils/studentNumber.js';
import { signToken } from '../lib/crypto.js';

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
  'paymentPhone',
  'paymentAmount',
  'paymentTransactionId',
  'cardHolderName',
  'cardNumber',
  'cardExpiry',
  'cardCVV',
  'classId',
  'hasCertificate',
  'appointmentDate',
  'appointmentTime'
];

const getBodyFields = (req) => (req.body?.fields ? req.body.fields : (req.body || {}));
const getBodyFiles = (req) => (req.body?.files ? req.body.files : []);
const today = () => new Date().toISOString().slice(0, 10);
const appointmentStartTime = '08:00';
const appointmentEndTime = '17:00';
const fixedAdmissionFee = 25;
const gradeOptions = ['A', 'A-', 'B+', 'B', 'B-'];

const requiredCreateFields = [
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
  'hasCertificate',
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
  'paymentMethod'
];

const optionValues = {
  sex: ['Male', 'Female'],
  maritalStatus: ['Single', 'Marriage', 'Divorced', 'Widowed'],
  hasCertificate: ['Yes', 'No'],
  relationship: ['Mother', 'Father', 'Brother', 'Sister', 'Other specify'],
  familyStudied: ['Haa', 'Maya'],
  heardFrom: ['Social Media', 'Friends', 'University came to our School', 'Parents', 'Seminars of the University', 'Other specify'],
  modeOfStudy: ['Full Time', 'Part Time'],
  paymentPlan: ['Admission fee only', 'Semester payment', 'Full year payment'],
  paymentMethod: ['EVC Plus', 'Card', 'eDahab', 'Zaad', 'Sahal']
};

const personNamePattern = /^[A-Za-z][A-Za-z\s'.-]{1,79}$/;
const simpleTextPattern = /^[A-Za-z0-9][A-Za-z0-9\s'.&,/-]{1,99}$/;
const idPattern = /^[A-Za-z0-9][A-Za-z0-9\s/-]{2,29}$/;
const rollNumberPattern = /^[A-Za-z0-9][A-Za-z0-9/-]{2,29}$/;
const normalizeField = (value) => String(value ?? '').trim();
const isEmptyField = (value) => normalizeField(value) === '';
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeField(email)) && normalizeField(email).length <= 254;
const isValidPhone = (phone) => {
  const text = normalizeField(phone);
  const digits = text.replace(/\D/g, '');
  return /^\+?[\d\s-]{7,20}$/.test(text) && digits.length >= 7 && digits.length <= 15;
};
const isValidDate = (date) => {
  const text = normalizeField(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [year, month, day] = text.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
};
const isValidTime = (time) => /^\d{2}:\d{2}$/.test(normalizeField(time));
const ageFromDate = (dateText) => {
  const birthDate = new Date(`${dateText}T00:00:00`);
  const currentDate = new Date(`${today()}T00:00:00`);
  let age = currentDate.getFullYear() - birthDate.getFullYear();
  const monthDifference = currentDate.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && currentDate.getDate() < birthDate.getDate())) age -= 1;
  return age;
};
const requireOption = (fields, field, label) => {
  if (!optionValues[field].includes(fields[field])) fail(422, `${label} is invalid`);
};

const generateReference = (db) => {
  const year = new Date().getFullYear();
  const next = String(db.applications.length + 1).padStart(4, '0');
  return `JUM-${year}-${next}`;
};

const getProgramFee = () => fixedAdmissionFee;

const createStudentFromApplication = (db, application, classItem) => {
  const existing = db.students.find((student) => student.applicationId === application.id);
  if (existing) return existing;
  const student = {
    id: createId('stu'),
    applicationId: application.id,
    studentNumber: generateStudentNumber(db, application.department),
    fullName: application.fullName,
    email: application.email,
    mobile: application.mobile,
    faculty: application.faculty,
    department: application.department,
    campus: application.campus,
    classId: classItem?.id || null,
    className: classItem?.name || null,
    discountReason: null,
    discountPercentage: null,
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
  const fields = Object.fromEntries(
    Object.entries(getBodyFields(req)).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
  );
  const files = getBodyFiles(req);
  const faculty = fields.faculty || fields.program;
  const department = fields.department || fields.programOfStudy;
  const passportFile = files.find((file) => ['photo', 'passportPhoto', 'passport'].includes(file.fieldName));
  const certificateFile = files.find((file) => ['certificate', 'certificateFile'].includes(file.fieldName));
  const receiptFile = files.find((file) => ['paymentReceipt', 'receipt'].includes(file.fieldName));

  const missing = requiredCreateFields.filter((field) => isEmptyField(fields[field]));
  if (!faculty) missing.push('program');
  if (!department) missing.push('department');
  if (fields.hasCertificate === 'Yes' && !certificateFile) missing.push('certificate');
  if (fields.hasCertificate === 'No') {
    if (!fields.appointmentDate) missing.push('appointmentDate');
    if (!fields.appointmentTime) missing.push('appointmentTime');
  }
  if (missing.length) fail(422, 'Required application fields are missing', missing);
  if (!personNamePattern.test(fields.fullName)) fail(422, 'Full Name must contain only letters, spaces, apostrophes, hyphens, or periods');
  if (!personNamePattern.test(fields.motherName)) fail(422, "Mother's Name must contain only letters, spaces, apostrophes, hyphens, or periods");
  if (!simpleTextPattern.test(fields.nationality)) fail(422, 'Nationality is invalid');
  if (!idPattern.test(fields.nationalId)) fail(422, 'National ID is required and must be 3-30 letters or numbers');
  if (!rollNumberPattern.test(fields.rollNumber)) fail(422, 'Roll Number is invalid');
  if (!isValidEmail(fields.email)) fail(422, 'Please enter a valid email address');
  if (!isValidPhone(fields.mobile)) fail(422, 'Please enter a valid phone number');
  if (!isValidDate(fields.dateOfBirth)) fail(422, 'Date of birth is invalid');
  if (fields.dateOfBirth > today()) fail(422, 'Date of birth cannot be in the future');
  {
    const age = ageFromDate(fields.dateOfBirth);
    if (age < 14 || age > 100) fail(422, 'Applicant age must be between 14 and 100 years');
  }
  if (!simpleTextPattern.test(fields.placeOfBirth)) fail(422, 'Place Of Birth is invalid');
  if (!simpleTextPattern.test(fields.district)) fail(422, 'District is invalid');
  if (!simpleTextPattern.test(fields.area)) fail(422, 'Area is invalid');
  requireOption(fields, 'sex', 'Sex');
  requireOption(fields, 'maritalStatus', 'Marital Status');
  requireOption(fields, 'hasCertificate', 'Certificate status');
  if (fields.hasCertificate === 'No') {
    if (!isValidDate(fields.appointmentDate)) fail(422, 'Appointment date is invalid');
    if (!isValidTime(fields.appointmentTime)) fail(422, 'Appointment time is invalid');
    if (fields.appointmentDate < today()) fail(422, 'Appointment date cannot be in the past');
    if (fields.appointmentTime < appointmentStartTime || fields.appointmentTime > appointmentEndTime) {
      fail(422, 'Appointment time must be between 8:00 AM and 5:00 PM');
    }
  }
  if (!personNamePattern.test(fields.emergencyName)) fail(422, 'Emergency Contact Name is invalid');
  if (!isValidPhone(fields.emergencyTell)) fail(422, 'Emergency phone is invalid');
  requireOption(fields, 'relationship', 'Relationship');
  requireOption(fields, 'familyStudied', 'Family Member Studied Here');
  if (!simpleTextPattern.test(fields.schoolName)) fail(422, 'Secondary School Name is invalid');
  if (!simpleTextPattern.test(fields.schoolDistrict)) fail(422, 'School District is invalid');
  {
    const graduationYear = Number(fields.graduationYear);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(graduationYear) || graduationYear < 1970 || graduationYear > currentYear) {
      fail(422, `Graduation year must be between 1970 and ${currentYear}`);
    }
  }
  {
    if (!gradeOptions.includes(fields.percentage)) fail(422, 'Passing grade must be A, A-, B+, B, or B-');
  }
  requireOption(fields, 'heardFrom', 'How did you know about university');
  requireOption(fields, 'modeOfStudy', 'Mode Of Study');
  requireOption(fields, 'paymentPlan', 'Payment Plan');
  requireOption(fields, 'paymentMethod', 'Payment Method');

  const result = await updateDb(async (db) => {
    const selectedProgram = db.programs.find((item) => item.title === faculty);
    if (!selectedProgram) fail(422, 'Faculty is invalid');
    if (!selectedProgram.departments?.some((item) => item.name === department)) {
      fail(422, 'Department must belong to the selected faculty');
    }

    const reference = generateReference(db);
    const documents = {};
    if (passportFile) documents.passportPhoto = await saveApplicationFile(passportFile, reference, 'passportPhoto');
    if (certificateFile) documents.certificate = await saveApplicationFile(certificateFile, reference, 'certificate');
    if (receiptFile) documents.paymentReceipt = await saveApplicationFile(receiptFile, reference, 'paymentReceipt');

    const now = new Date().toISOString();
    const application = {
      id: createId('app'),
      reference,
      ...Object.fromEntries(applicationFields.map((field) => [field, fields[field] || null])),
      faculty,
      department,
      admissionFee: getProgramFee(db, faculty),
      paymentStatus: 'UNPAID',
      status: fields.paymentMethod === 'EVC Plus' ? 'DRAFT' : 'Pending',
      documents,
      notes: '',
      reviewedBy: null,
      createdAt: now,
      updatedAt: now
    };
    if (application.paymentMethod === 'EVC Plus') {
      application.paymentPhone = null;
      application.paymentAmount = null;
      application.paymentTransactionId = null;
    }

    db.applications.unshift(application);

    let payment = null;
    if (application.paymentMethod && application.paymentMethod !== 'EVC Plus') {
      payment = {
        id: createId('pay'),
        applicationId: application.id,
        reference: application.reference,
        amount: application.admissionFee,
        currency: db.settings.currency || 'USD',
        method: application.paymentMethod,
        transactionCode: fields.paymentTransactionId || fields.transactionCode || '',
        status: 'Pending',
        createdAt: now,
        updatedAt: now
      };
      db.payments.unshift(payment);
    }

    addActivity(db, req, {
      action: application.status === 'DRAFT' ? 'Created Application Draft' : 'Submitted Application',
      afterAction: application.status,
      applicantPerson: application.fullName,
      applicationReference: application.reference,
      module: 'Applications'
    });

    const paymentAccessToken = signToken({
      sub: application.id,
      type: 'application_payment',
      applicationId: application.id
    }, 60 * 60);

    return { application, payment, paymentAccessToken };
  });

  sendJson(res, 201, result);
};

export const submitPaidApplication = async (req, res) => {
  const result = await updateDb((db) => {
    const application = db.applications.find((item) => item.id === req.params.id || item.reference === req.params.id);
    if (!application) fail(404, 'Application not found');
    if (req.paymentOwner.role === 'Applicant' && req.paymentOwner.applicationId !== application.id) {
      fail(403, 'You are not authorized to submit this application');
    }
    if (application.status !== 'DRAFT') {
      return { application, payment: db.payments.find((item) => item.applicationId === application.id && item.status === 'SUCCESS') || null };
    }
    const payment = db.payments.find((item) => item.applicationId === application.id && item.status === 'SUCCESS');
    if (!payment) fail(409, 'A confirmed payment is required before submitting this application.');
    application.status = 'Pending';
    application.paymentStatus = 'PAID';
    application.paymentMethod = 'EVC Plus';
    application.paymentPhone = payment.payerPhoneMasked;
    application.paymentAmount = payment.amount;
    application.paymentTransactionId = payment.providerTransactionId || '';
    application.updatedAt = new Date().toISOString();
    addActivity(db, req, {
      action: 'Submitted Paid Application',
      beforeAction: 'DRAFT',
      afterAction: 'Pending',
      applicantPerson: application.fullName,
      applicationReference: application.reference,
      module: 'Applications'
    });
    return { application, payment };
  });
  sendJson(res, 200, result);
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

    let selectedClass;
    if (req.body?.classId !== undefined && req.body.classId !== null && req.body.classId !== '') {
      selectedClass = (db.classes || []).find((item) => item.id === req.body.classId);
      if (!selectedClass) fail(404, 'Class not found');
      const targetFaculty = req.body.faculty || found.faculty;
      const targetDepartment = req.body.programOfStudy || req.body.department || found.department;
      if (selectedClass.faculty !== targetFaculty || selectedClass.department !== targetDepartment) {
        fail(422, 'The selected class does not belong to this applicant\'s faculty and department');
      }
    }

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
      if (selectedClass) {
        student.classId = selectedClass.id;
        student.className = selectedClass.name;
      }
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

    let classItem = null;
    if (status === 'Approved') {
      const alreadyStudent = db.students.find((student) => student.applicationId === application.id);
      if (!alreadyStudent) {
        const classId = req.body?.classId || application.classId;
        if (!classId) fail(422, 'A class must be selected to approve this application');
        classItem = (db.classes || []).find((item) => item.id === classId);
        if (!classItem) fail(404, 'Class not found');
        if (classItem.faculty !== application.faculty || classItem.department !== application.department) {
          fail(422, 'The selected class does not belong to this applicant\'s faculty and department');
        }
        const enrolled = db.students.filter((student) => student.classId === classItem.id).length;
        if (enrolled >= classItem.capacity) {
          fail(422, 'The selected class is full. Create a new class before approving this application.');
        }
      }
    }

    application.status = status;
    application.notes = note || application.notes;
    application.reviewedBy = req.user.id;
    application.updatedAt = new Date().toISOString();

    let student = null;
    if (status === 'Approved') {
      student = createStudentFromApplication(db, application, classItem);
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
