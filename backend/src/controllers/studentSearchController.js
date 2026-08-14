import { readDb } from '../lib/db.js';
import { fail, sendJson } from '../lib/http.js';
import { normalize, paginate, sortNewest } from '../lib/query.js';
import { admissionFee } from '../config/admissionFee.js';

const hasPermission = (user, permission) => Array.isArray(user.permissions) && user.permissions.includes(permission);
const searchableText = (values) => values.map((value) => normalize(value)).join(' ');

const paymentSummaryFor = (db, application) => {
  const payments = sortNewest(db.payments.filter((payment) => payment.applicationId === application.id));
  const successful = payments.filter((payment) => ['SUCCESS', 'Paid'].includes(payment.status));
  const paid = successful.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const required = Number(application.admissionFee ?? admissionFee);
  const latest = payments[0] || null;
  return {
    requiredAmount: required,
    paidAmount: paid,
    balance: Math.max(required - paid, 0),
    currency: latest?.currency || db.settings.currency || 'USD',
    status: application.paymentStatus || (successful.length ? 'PAID' : latest?.status || 'UNPAID'),
    latestMethod: latest?.method || latest?.paymentMethod || application.paymentMethod || '',
    latestTransactionId: latest?.providerTransactionId || latest?.transactionCode || '',
    latestPaymentAt: latest?.paidAt || latest?.updatedAt || latest?.createdAt || null
  };
};

const studentSearchView = (db, application, user) => {
  const student = db.students.find((item) => item.applicationId === application.id) || {};
  const canContact = hasPermission(user, 'student_search.view_contact');
  const canEmergency = hasPermission(user, 'student_search.view_emergency_contact');
  const canAcademic = hasPermission(user, 'student_search.view_academic');
  const canPayment = hasPermission(user, 'student_search.view_payment_summary');
  const view = {
    id: student.id || application.id,
    applicationId: application.id,
    photoUrl: application.documents?.passportPhoto?.url || '',
    fullName: student.fullName || application.fullName || '',
    studentNumber: student.studentNumber || application.studentNumber || '',
    rollNumber: application.rollNumber || '',
    admissionReference: application.reference || '',
    admissionStatus: application.status || student.status || 'Unknown',
    studentStatus: student.status || 'Not enrolled',
    currentSemester: student.currentSemester || student.semester || application.currentSemester || application.semester || '',
    hemisId: student.hemisId || student.hemisID || application.hemisId || application.hemisID || '',
    campus: student.campus || application.campus || '',
    enrolledAt: student.enrolledAt || null
  };
  if (canContact) view.contact = {
    phone: student.mobile || application.mobile || '',
    email: student.email || application.email || '',
    district: application.district || ''
  };
  if (canEmergency) view.emergencyContact = {
    name: application.emergencyName || '',
    phone: application.emergencyTell || '',
    relationship: application.relationship === 'Other specify'
      ? application.relationshipOther || application.relationship
      : application.relationship || ''
  };
  if (canAcademic) view.academic = {
    faculty: student.faculty || application.faculty || '', program: student.department || application.department || '',
    className: student.className || '', classId: student.classId || null,
    modeOfStudy: application.modeOfStudy || '', campus: student.campus || application.campus || '',
    secondarySchool: application.schoolName || '', schoolDistrict: application.schoolDistrict || '',
    graduationYear: application.graduationYear || '', grade: application.percentage || application.grade || ''
  };
  if (hasPermission(user, 'student_search.view_full_profile')) view.personalProfile = {
    fullName: student.fullName || application.fullName || '',
    motherName: application.motherName || '',
    sex: application.sex || '',
    maritalStatus: application.maritalStatus || '',
    dateOfBirth: application.dateOfBirth || '',
    placeOfBirth: application.placeOfBirth || '',
    nationality: application.nationality || '',
    nationalId: application.nationalId || ''
  };
  if (canPayment) view.paymentSummary = paymentSummaryFor(db, application);
  return view;
};

const inStaffScope = (application, student, user) => {
  if (user.role === 'Admin') return true;
  if (user.campus && user.campus !== 'All Campuses' && (student.campus || application.campus) !== user.campus) return false;
  if (user.department && (student.department || application.department) !== user.department) return false;
  return true;
};

export const searchStudents = async (req, res) => {
  const query = String(req.query.query || req.query.search || '').trim();
  if (query && query.length < 2) fail(422, 'Enter at least 2 characters to search');
  const db = await readDb();
  const needle = normalize(query);
  let applications = query ? sortNewest(db.students).map((student) => {
    const application = db.applications.find((item) => item.id === student.applicationId);
    if (!application) return null;
    if (!inStaffScope(application, student, req.user)) return false;
    const matches = searchableText([
      student.fullName, application.fullName, student.studentNumber, application.studentNumber,
      application.rollNumber, application.reference, student.mobile, application.mobile,
      student.email, application.email
    ]).includes(needle);
    return matches ? application : null;
  }).filter(Boolean) : [];
  applications = [...new Map(applications.map((application) => [application.id, application])).values()];
  const result = paginate(applications.map((application) => studentSearchView(db, application, req.user)), { ...req.query, limit: Math.min(Number(req.query.limit) || 12, 25) });
  sendJson(res, 200, {
    ...result,
    query,
    access: {
      contact: hasPermission(req.user, 'student_search.view_contact'),
      emergencyContact: hasPermission(req.user, 'student_search.view_emergency_contact'),
      academic: hasPermission(req.user, 'student_search.view_academic'),
      paymentSummary: hasPermission(req.user, 'student_search.view_payment_summary'),
      fullProfile: hasPermission(req.user, 'student_search.view_full_profile')
    }
  });
};
