import { createId, readDb, updateDb } from '../lib/db.js';
import { fail, sendCsv, sendJson, sendNoContent } from '../lib/http.js';
import { matchesText, paginate, sortNewest, toCsv } from '../lib/query.js';
import { addActivity } from '../services/audit.js';
import { saveApplicationFile } from '../utils/files.js';
import { generateStudentNumber } from '../utils/studentNumber.js';
import { assertOpenForApplication } from './admissionPeriodsController.js';
import { signToken } from '../lib/crypto.js';
import { createApplicationSubmittedNotification, scheduleSmsNotification } from '../services/smsService.js';
import { registrationBalance } from '../services/registrationPaymentService.js';
import { admissionFee, admissionFeeMinor } from '../config/admissionFee.js';
import { fingerprintApplicationFile, storedPassportPhotoHash } from '../utils/files.js';
import { assignAutomaticClass, resolveAcademicYear } from '../services/automaticClassService.js';

const applicationFields = [
  'fullName',
  'motherName',
  'nationality',
  'nationalId',
  'rollNumber',
  'dateOfBirth',
  'placeOfBirth',
  'district',
  'email',
  'mobile',
  'sex',
  'maritalStatus',
  'campus',
  'emergencyName',
  'emergencyTell',
  'relationship',
  'relationshipOther',
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
  'applicantPhotoUploaded',
  'certificateUploaded',
  'cardHolderName',
  'cardNumber',
  'cardExpiry',
  'cardCVV',
  'hasCertificate',
  'appointmentDate',
  'appointmentTime'
];

const getBodyFields = (req) => (req.body?.fields ? req.body.fields : (req.body || {}));
const getBodyFiles = (req) => (req.body?.files ? req.body.files : []);
const admissionTimeZone = 'Africa/Mogadishu';
const getAdmissionDateTime = (date = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: admissionTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date).map(({ type, value }) => [type, value])
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`
  };
};
const today = () => getAdmissionDateTime().date;
const oneYearFromToday = () => {
  const current = new Date(`${today()}T00:00:00Z`);
  const targetYear = current.getUTCFullYear() + 1;
  const targetMonth = current.getUTCMonth();
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(current.getUTCDate(), lastDayOfTargetMonth);
  return new Date(Date.UTC(targetYear, targetMonth, targetDay)).toISOString().slice(0, 10);
};
const appointmentStartTime = '08:00';
const appointmentEndTime = '17:00';
const appointmentIsNotInFuture = (date, time) => {
  const appointment = new Date(`${date}T${time}:00+03:00`);
  return Number.isNaN(appointment.getTime()) || appointment.getTime() <= Date.now();
};
const fixedAdmissionFee = admissionFee;
const partTimeDepartments = new Set([
  'Computer Application',
  'Computer Network & Security',
  'Network and Security',
  'Business Administration'
]);
const gradeOptions = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-'];

const requiredCreateFields = [
  'fullName',
  'motherName',
  'nationality',
  'nationalId',
  'rollNumber',
  'dateOfBirth',
  'placeOfBirth',
  'district',
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
  familyStudied: ['Haa', 'Maya', 'Yes', 'No'],
  heardFrom: ['Social Media', 'Friends', 'University came to our School', 'Parents', 'Seminars of the University', 'Other specify'],
  modeOfStudy: ['Full Time', 'Part Time'],
  paymentPlan: ['Admission fee only', 'Admission fee + Semester fee', 'Admission fee + Full payment'],
  paymentMethod: ['EVC Plus'],
  applicantPhotoUploaded: ['Yes', 'No'],
  certificateUploaded: ['Yes', 'No']
};

const personNamePattern = /^[A-Za-z][A-Za-z\s'.-]{1,79}$/;
const simpleTextPattern = /^[A-Za-z][A-Za-z\s'.&,/-]{1,99}$/;
const addressPattern = /^[A-Za-z0-9][A-Za-z0-9\s'.&,()#/-]{1,149}$/;
const schoolNamePattern = /^[A-Za-z0-9][A-Za-z0-9\s'.&,()/-]{1,149}$/;
const idPattern = /^[1-9]\d{9,14}$/;
const rollNumberPattern = /^[1-9]\d{9,14}$/;
const normalizeField = (value) => String(value ?? '').trim();
const isEmptyField = (value) => normalizeField(value) === '';
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeField(email)) && normalizeField(email).length <= 254;
const isValidPhone = (phone) => {
  const text = normalizeField(phone);
  if (!/^\+?\d+$/.test(text)) return false;

  const internationalDigits = text.startsWith('+') ? text.slice(1) : text;
  const localDigits = internationalDigits.startsWith('252')
    ? internationalDigits.slice(3)
    : internationalDigits;
  return /^[1-9]\d{7,11}$/.test(localDigits);
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

const createStudentFromApplication = (db, application) => {
  const existing = db.students.find((student) => student.applicationId === application.id);
  if (existing) return existing;
  const classItem = assignAutomaticClass(db, {
    faculty: application.faculty,
    department: application.department,
    academicYear: resolveAcademicYear(db, application)
  });
  application.faculty = classItem.faculty;
  application.department = classItem.department;
  const student = {
    id: createId('stu'),
    applicationId: application.id,
    studentNumber: generateStudentNumber(db, application.department),
    fullName: application.fullName,
    email: application.email,
    mobile: application.mobile,
    faculty: classItem.faculty,
    department: classItem.department,
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
  application.classId = classItem.id;
  application.className = classItem.classCode;
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
  if (!passportFile && fields.applicantPhotoUploaded !== 'Yes') missing.push('passportPhoto');
  if (fields.hasCertificate === 'Yes' && !certificateFile && fields.certificateUploaded !== 'Yes') missing.push('certificate');
  if (fields.hasCertificate === 'No') {
    if (!fields.appointmentDate) missing.push('appointmentDate');
    if (!fields.appointmentTime) missing.push('appointmentTime');
  }
  if (fields.relationship === 'Other specify' && isEmptyField(fields.relationshipOther)) {
    missing.push('relationshipOther');
  }
  if (missing.length) fail(422, 'Required application fields are missing', missing);
  if (!personNamePattern.test(fields.fullName)) fail(422, 'Full Name must contain only letters, spaces, apostrophes, hyphens, or periods');
  if (!personNamePattern.test(fields.motherName)) fail(422, "Mother's Name must contain only letters, spaces, apostrophes, hyphens, or periods");
  if (!simpleTextPattern.test(fields.nationality)) fail(422, 'Nationality must contain text only');
  if (!idPattern.test(fields.nationalId)) fail(422, 'National ID must contain 10 to 15 digits and cannot start with zero');
  if (!rollNumberPattern.test(fields.rollNumber)) fail(422, 'Roll Number must contain 10 to 15 digits and cannot start with zero');
  if (!isValidEmail(fields.email)) fail(422, 'Please enter a valid email address');
  if (!isValidPhone(fields.mobile)) fail(422, 'Phone Number must contain 8 to 12 digits after +252 and cannot start with zero');
  if (!isValidDate(fields.dateOfBirth)) fail(422, 'Date of birth is invalid');
  if (fields.dateOfBirth > today()) fail(422, 'Date of birth cannot be in the future');
  {
    const age = ageFromDate(fields.dateOfBirth);
    if (age < 14 || age > 100) fail(422, 'Applicant age must be between 14 and 100 years');
  }
  if (!simpleTextPattern.test(fields.placeOfBirth)) fail(422, 'Place Of Birth must contain text only');
  if (!addressPattern.test(fields.district)) fail(422, 'District / Address may contain letters, numbers, and normal address punctuation');
  requireOption(fields, 'sex', 'Sex');
  requireOption(fields, 'maritalStatus', 'Marital Status');
  requireOption(fields, 'hasCertificate', 'Certificate status');
  if (!isEmptyField(fields.applicantPhotoUploaded)) {
    requireOption(fields, 'applicantPhotoUploaded', 'Applicant photo');
  }
  if (!isEmptyField(fields.certificateUploaded)) {
    requireOption(fields, 'certificateUploaded', 'Certificate upload status');
  }
  if (fields.hasCertificate === 'No') {
    if (!isValidDate(fields.appointmentDate)) fail(422, 'Appointment date is invalid');
    if (!isValidTime(fields.appointmentTime)) fail(422, 'Appointment time is invalid');
    if (fields.appointmentDate < today()) fail(422, 'Appointment date cannot be in the past');
    if (fields.appointmentDate > oneYearFromToday()) {
      fail(422, 'Certificate appointment date cannot be more than one year from today');
    }
    if (appointmentIsNotInFuture(fields.appointmentDate, fields.appointmentTime)) {
      fail(422, 'Appointment date and time must be in the future');
    }
    if (fields.appointmentTime < appointmentStartTime || fields.appointmentTime > appointmentEndTime) {
      fail(422, 'Appointment time must be between 8:00 AM and 5:00 PM');
    }
  }
  if (!personNamePattern.test(fields.emergencyName)) fail(422, 'Emergency Contact Name is invalid');
  if (!isValidPhone(fields.emergencyTell)) fail(422, 'Emergency phone must contain 8 to 12 digits after +252 and cannot start with zero');
  requireOption(fields, 'relationship', 'Relationship');
  if (fields.relationship === 'Other specify') {
    if (!simpleTextPattern.test(fields.relationshipOther)) {
      fail(422, 'Please specify a valid relationship to the applicant');
    }
  } else {
    fields.relationshipOther = null;
  }
  requireOption(fields, 'familyStudied', 'Family Member Studied Here');
  if (!schoolNamePattern.test(fields.schoolName)) fail(422, 'Secondary School Name may contain letters and numbers');
  if (!simpleTextPattern.test(fields.schoolDistrict)) fail(422, 'School District must contain text only');
  {
    const graduationYear = Number(fields.graduationYear);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(graduationYear) || graduationYear < 1970 || graduationYear > currentYear) {
      fail(422, `Graduation year must be between 1970 and ${currentYear}`);
    }
  }
  {
    if (!gradeOptions.includes(fields.percentage)) {
      fail(422, `Passing grade must be one of: ${gradeOptions.join(', ')}`);
    }
  }
  requireOption(fields, 'heardFrom', 'How did you know about university');
  requireOption(fields, 'modeOfStudy', 'Mode Of Study');
  requireOption(fields, 'paymentPlan', 'Payment Plan');
  requireOption(fields, 'paymentMethod', 'Payment Method');
  if (!isEmptyField(fields.paymentPhone) && !isValidPhone(fields.paymentPhone)) {
    fail(422, 'Payment Phone Number must contain 8 to 12 digits after +252 and cannot start with zero');
  }

  const result = await updateDb(async (db) => {
    const admissionPeriod = assertOpenForApplication(db, fields);
    const selectedProgram = db.programs.find((item) => item.title === faculty);
    if (!selectedProgram) fail(422, 'Faculty is invalid');
    if (!selectedProgram.departments?.some((item) => item.name === department)) {
      fail(422, 'Department must belong to the selected faculty');
    }
    if (fields.modeOfStudy === 'Part Time' && !partTimeDepartments.has(department)) {
      fail(422, 'Part Time is available only for Computer Application, Computer Network & Security, and Business Administration');
    }
    if (fields.paymentMethod !== 'EVC Plus') {
      fail(422, 'Payment method must be EVC Plus');
    }
    if (passportFile) {
      const photoHash = fingerprintApplicationFile(passportFile);
      const existingPhoto = await Promise.all(db.applications.map(async (application) => ({
        application,
        hash: await storedPassportPhotoHash(application.documents?.passportPhoto)
      }))).then((photos) => photos.find(({ hash }) => hash === photoHash));
      if (existingPhoto) fail(422, 'This photo has already been used in another application.');
      passportFile.imageHash = photoHash;
    }

    const reference = generateReference(db);
    const documents = {};
    if (passportFile) documents.passportPhoto = await saveApplicationFile(passportFile, reference, 'passportPhoto');
    if (!passportFile && fields.applicantPhotoUploaded === 'Yes') {
      documents.passportPhoto = {
        originalName: fields.applicantPhotoName || 'mobile-photo-confirmed',
        filename: null,
        contentType: fields.applicantPhotoMimeType || 'image/mobile-confirmed',
        size: 0,
        url: null,
        status: 'Selected in mobile app'
      };
    }
    if (certificateFile) documents.certificate = await saveApplicationFile(certificateFile, reference, 'certificate');
    if (!certificateFile && fields.certificateUploaded === 'Yes') {
      documents.certificate = {
        originalName: fields.certificateName || 'mobile-certificate-confirmed',
        filename: null,
        contentType: fields.certificateMimeType || 'application/mobile-confirmed',
        size: 0,
        url: null,
        status: 'Selected in mobile app'
      };
    }
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
      admissionPeriodId: admissionPeriod.id,
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

    const smsNotification = application.status === 'Pending'
      ? createApplicationSubmittedNotification(db, application)
      : null;
    return { application, payment, paymentAccessToken, smsNotification };
  });

  scheduleSmsNotification(result.smsNotification?.status === 'PENDING' ? result.smsNotification.id : null);
  sendJson(res, 201, {
    application: result.application,
    payment: result.payment,
    paymentAccessToken: result.paymentAccessToken,
    smsStatus: result.smsNotification?.status || null
  });
};

export const submitPaidApplication = async (req, res) => {
  const result = await updateDb((db) => {
    const application = db.applications.find((item) => item.id === req.params.id || item.reference === req.params.id);
    if (!application) fail(404, 'Application not found');
    if (req.paymentOwner.role === 'Applicant' && req.paymentOwner.applicationId !== application.id) {
      fail(403, 'You are not authorized to submit this application');
    }
    if (application.status !== 'DRAFT') {
      const smsNotification = (db.smsNotifications || []).find((item) => item.idempotencyKey === `APPLICATION_SUBMITTED:${application.id}`) || null;
      return { application, payment: db.payments.find((item) => item.applicationId === application.id && item.status === 'SUCCESS') || null, smsNotification };
    }
    const admissionPeriod = assertOpenForApplication(db, application);
    if (application.admissionPeriodId && application.admissionPeriodId !== admissionPeriod.id) fail(409, 'The admission period for this application is no longer active.');
    const payment = db.payments.find((item) => item.applicationId === application.id && item.status === 'SUCCESS');
    const balance = registrationBalance(db, application);
    if (!payment || balance.totalPaidMinor < 1) {
      fail(409, 'A confirmed payment is required before submitting this application.');
    }
    application.status = 'Pending';
    application.paymentStatus = balance.remainingMinor > 0 ? 'PARTIALLY_PAID' : 'PAID';
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
    const smsNotification = createApplicationSubmittedNotification(db, application);
    return { application, payment, smsNotification };
  });
  scheduleSmsNotification(result.smsNotification?.status === 'PENDING' ? result.smsNotification.id : null);
  sendJson(res, 200, { application: result.application, payment: result.payment, smsStatus: result.smsNotification?.status || null });
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

    if (Object.hasOwn(req.body || {}, 'nationalId') && !idPattern.test(normalizeField(req.body.nationalId))) {
      fail(422, 'National ID must contain 10 to 15 digits and cannot start with zero');
    }
    if (Object.hasOwn(req.body || {}, 'rollNumber') && !rollNumberPattern.test(normalizeField(req.body.rollNumber))) {
      fail(422, 'Roll Number must contain 10 to 15 digits and cannot start with zero');
    }
    if (Object.hasOwn(req.body || {}, 'mobile') && !isValidPhone(req.body.mobile)) {
      fail(422, 'Phone Number must contain 8 to 12 digits after +252 and cannot start with zero');
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
      if (student.faculty !== before.faculty || student.department !== before.department) {
        const assignedClass = assignAutomaticClass(db, {
          faculty: found.faculty,
          department: found.department,
          academicYear: resolveAcademicYear(db, found),
          excludedStudentId: student.id
        });
        student.classId = assignedClass.id;
        student.className = assignedClass.classCode;
        found.classId = assignedClass.id;
        found.className = assignedClass.classCode;
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
      metadata: { note, automaticClass: student?.className || null }
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
