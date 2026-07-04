import { createId, readDb, updateDb } from '../lib/db.js';
import { fail, sendJson, sendNoContent } from '../lib/http.js';
import { matchesText, paginate, sortNewest } from '../lib/query.js';
import { addActivity } from '../services/audit.js';

const discountReasons = ['Regional', 'Financial Assistance', 'Scholarship', 'Other'];
const discountPercentages = [20, 25, 30, 100];
const regionalDiscountPercentage = 20;

export const listStudents = async (req, res) => {
  const db = await readDb();
  let items = sortNewest(db.students);
  const { search, faculty, campus, hasDiscount } = req.query;

  if (faculty && faculty !== 'All Faculties') items = items.filter((item) => item.faculty === faculty);
  if (campus && campus !== 'All Campuses') items = items.filter((item) => item.campus === campus);
  if (hasDiscount === 'true') items = items.filter((item) => Boolean(item.discountPercentage));
  items = items.filter((item) => matchesText(item, ['fullName', 'email', 'mobile', 'studentNumber', 'department'], search));

  const summary = {
    total: db.students.length,
    whatsappSent: db.students.filter((item) => item.whatsappSent).length,
    whatsappPending: db.students.filter((item) => !item.whatsappSent).length
  };

  sendJson(res, 200, { ...paginate(items, req.query), summary });
};

export const getStudent = async (req, res) => {
  const db = await readDb();
  const student = db.students.find((item) => item.id === req.params.id || item.studentNumber === req.params.id);
  if (!student) fail(404, 'Student not found');
  sendJson(res, 200, { student });
};

export const createStudent = async (req, res) => {
  const { fullName, email, mobile, faculty, department, campus = 'Main Campus', status = 'Enrolled' } = req.body || {};
  if (!fullName || !email || !mobile) fail(422, 'Full name, email, and mobile are required');

  const student = await updateDb((db) => {
    const now = new Date().toISOString();
    const item = {
      id: createId('stu'),
      applicationId: req.body.applicationId || '',
      studentNumber: req.body.studentNumber || `JUST-${new Date().getFullYear()}-${String(db.students.length + 1).padStart(4, '0')}`,
      fullName,
      email,
      mobile,
      faculty: faculty || '',
      department: department || '',
      campus,
      classId: req.body.classId || null,
      className: req.body.className || null,
      discountReason: null,
      discountPercentage: null,
      status,
      whatsappSent: Boolean(req.body.whatsappSent),
      enrolledAt: req.body.enrolledAt || now,
      createdAt: now,
      updatedAt: now
    };
    db.students.unshift(item);
    addActivity(db, req, {
      action: 'Added Student',
      afterAction: status,
      applicantPerson: fullName,
      module: 'Students'
    });
    return item;
  });

  sendJson(res, 201, { student });
};

export const updateStudent = async (req, res) => {
  if (req.body?.discountReason !== undefined && req.body.discountReason !== null && !discountReasons.includes(req.body.discountReason)) {
    fail(422, 'Discount reason is invalid');
  }
  if (req.body?.discountPercentage !== undefined && req.body.discountPercentage !== null && !discountPercentages.includes(Number(req.body.discountPercentage))) {
    fail(422, 'Discount percentage is invalid');
  }

  const isDiscountUpdate = req.body?.discountReason !== undefined || req.body?.discountPercentage !== undefined;

  const student = await updateDb((db) => {
    const found = db.students.find((item) => item.id === req.params.id || item.studentNumber === req.params.id);
    if (!found) fail(404, 'Student not found');
    const before = found.status;
    for (const key of ['fullName', 'email', 'mobile', 'faculty', 'department', 'campus', 'status', 'whatsappSent', 'classId', 'className', 'discountReason', 'discountPercentage']) {
      if (req.body[key] !== undefined) found[key] = req.body[key];
    }
    if (found.discountReason === 'Regional') {
      found.discountPercentage = regionalDiscountPercentage;
    }
    found.updatedAt = new Date().toISOString();
    addActivity(db, req, isDiscountUpdate ? {
      action: 'Applied Discount',
      afterAction: `${found.discountReason} - ${found.discountPercentage}%`,
      applicantPerson: found.fullName,
      module: 'Discount'
    } : {
      action: 'Updated Student',
      beforeAction: before,
      afterAction: found.status,
      applicantPerson: found.fullName,
      module: 'Students'
    });
    return found;
  });

  sendJson(res, 200, { student });
};

export const deleteStudent = async (req, res) => {
  await updateDb((db) => {
    const index = db.students.findIndex((item) => item.id === req.params.id || item.studentNumber === req.params.id);
    if (index === -1) fail(404, 'Student not found');
    const [student] = db.students.splice(index, 1);
    addActivity(db, req, {
      action: 'Deleted Student',
      beforeAction: student.status,
      applicantPerson: student.fullName,
      module: 'Students'
    });
  });
  sendNoContent(res);
};

export const markWhatsAppSent = async (req, res) => {
  const student = await updateDb((db) => {
    const found = db.students.find((item) => item.id === req.params.id);
    if (!found) fail(404, 'Student not found');
    found.whatsappSent = true;
    found.updatedAt = new Date().toISOString();
    addActivity(db, req, {
      action: 'Sent WhatsApp Message',
      beforeAction: 'Pending',
      afterAction: 'Sent',
      applicantPerson: found.fullName,
      module: 'Students'
    });
    return found;
  });
  sendJson(res, 200, { student });
};
