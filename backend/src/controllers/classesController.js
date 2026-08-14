import { readDb, updateDb } from '../lib/db.js';
import { fail, sendJson, sendNoContent } from '../lib/http.js';
import { matchesText, paginate, sortNewest } from '../lib/query.js';
import { addActivity } from '../services/audit.js';
import { assignAutomaticClass, CLASS_CAPACITY, classEnrollmentCount } from '../services/automaticClassService.js';

const withComputedFields = (classItem, students) => {
  const enrolled = students.filter((student) => student.classId === classItem.id && !['Withdrawn', 'Inactive', 'Graduated', 'Deleted'].includes(student.status)).length;
  return {
    ...classItem,
    enrolled,
    classCode: classItem.classCode || classItem.name,
    name: classItem.classCode || classItem.name,
    capacity: CLASS_CAPACITY,
    currentStudents: enrolled,
    status: enrolled >= CLASS_CAPACITY ? 'Full' : 'Open'
  };
};

const findFacultyAndDepartment = (db, facultyTitle, departmentName) => {
  const program = db.programs.find((item) => item.title === facultyTitle);
  if (!program) fail(422, 'Faculty is invalid');
  const department = program.departments?.find((item) => item.name === departmentName);
  if (!department) fail(422, 'Department must belong to the selected faculty');
  return { program, department };
};

export const listClasses = async (req, res) => {
  const db = await readDb();
  const students = db.students || [];
  const computed = (db.classes || []).map((item) => withComputedFields(item, students));

  const summary = {
    total: computed.length,
    open: computed.filter((item) => item.status === 'Open').length,
    full: computed.filter((item) => item.status === 'Full').length
  };

  let items = computed;
  const { faculty, department, status, search } = req.query;
  if (faculty && faculty !== 'All Faculties') items = items.filter((item) => item.faculty === faculty);
  if (department && department !== 'All Departments') items = items.filter((item) => item.department === department);
  if (status && status !== 'All Status') items = items.filter((item) => item.status === status);
  items = items.filter((item) => matchesText(item, ['name', 'faculty', 'department'], search));
  items = sortNewest(items);

  sendJson(res, 200, { ...paginate(items, req.query), summary });
};

export const createClass = async (req, res) => {
  const { faculty, department, academicYear = new Date().getFullYear() } = req.body || {};
  if (!faculty) fail(422, 'Faculty is required');
  if (!department) fail(422, 'Department is required');

  const classItem = await updateDb((db) => {
    findFacultyAndDepartment(db, faculty, department);
    const existingIds = new Set((db.classes || []).map((item) => item.id));
    const item = assignAutomaticClass(db, { faculty, department, academicYear });
    if (existingIds.has(item.id)) {
      fail(409, `${item.classCode} still has available capacity; a new class is not required`);
    }
    item.currentStudents = classEnrollmentCount(db, item.id);
    addActivity(db, req, {
      action: 'Generated Class',
      afterAction: item.classCode,
      module: 'Classes'
    });
    return item;
  });

  sendJson(res, 201, { class: withComputedFields(classItem, []) });
};

export const updateClass = async (req, res) => {
  const classItem = await updateDb((db) => {
    const found = (db.classes || []).find((item) => item.id === req.params.id);
    if (!found) fail(404, 'Class not found');
    const before = found.name;

    if (['name', 'classCode', 'faculty', 'department', 'departmentId', 'academicYear', 'sequenceNumber', 'capacity']
      .some((key) => req.body?.[key] !== undefined)) {
      fail(422, 'Generated class identity, department, academic year, and capacity cannot be edited');
    }
    found.updatedAt = new Date().toISOString();

    addActivity(db, req, {
      action: 'Updated Class',
      beforeAction: before,
      afterAction: found.name,
      module: 'Classes'
    });
    return found;
  });

  const db = await readDb();
  sendJson(res, 200, { class: withComputedFields(classItem, db.students || []) });
};

export const deleteClass = async (req, res) => {
  await updateDb((db) => {
    const index = (db.classes || []).findIndex((item) => item.id === req.params.id);
    if (index === -1) fail(404, 'Class not found');
    const enrolled = (db.students || []).filter((student) => student.classId === db.classes[index].id).length;
    if (enrolled > 0) fail(422, 'Cannot delete a class that has enrolled students');
    const [classItem] = db.classes.splice(index, 1);
    addActivity(db, req, {
      action: 'Deleted Class',
      beforeAction: classItem.name,
      module: 'Classes'
    });
  });
  sendNoContent(res);
};
