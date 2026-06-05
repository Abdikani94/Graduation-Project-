import { readDb, updateDb } from '../lib/db.js';
import { fail, sendJson } from '../lib/http.js';
import { matchesText, paginate, sortNewest } from '../lib/query.js';
import { addActivity } from '../services/audit.js';

export const listStudents = async (req, res) => {
  const db = await readDb();
  let items = sortNewest(db.students);
  const { search, faculty, campus } = req.query;

  if (faculty && faculty !== 'All Faculties') items = items.filter((item) => item.faculty === faculty);
  if (campus && campus !== 'All Campuses') items = items.filter((item) => item.campus === campus);
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
