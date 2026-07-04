import { createId, readDb, updateDb } from '../lib/db.js';
import { fail, sendJson, sendNoContent } from '../lib/http.js';
import { matchesText, paginate, sortNewest } from '../lib/query.js';
import { addActivity } from '../services/audit.js';

const minimumCapacity = 1;

const parseCapacity = (value) => {
  const capacity = Number(value);
  if (!Number.isInteger(capacity) || capacity < minimumCapacity) {
    fail(422, `Class capacity must be a whole number of at least ${minimumCapacity}`);
  }
  return capacity;
};

const withComputedFields = (classItem, students) => {
  const enrolled = students.filter((student) => student.classId === classItem.id).length;
  return {
    ...classItem,
    enrolled,
    status: enrolled >= classItem.capacity ? 'Full' : 'Open'
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
  const { name, faculty, department, capacity } = req.body || {};
  if (!name) fail(422, 'Class name is required');
  if (!faculty) fail(422, 'Faculty is required');
  if (!department) fail(422, 'Department is required');
  const parsedCapacity = parseCapacity(capacity);

  const classItem = await updateDb((db) => {
    findFacultyAndDepartment(db, faculty, department);
    const now = new Date().toISOString();
    const item = {
      id: createId('cls'),
      name,
      faculty,
      department,
      capacity: parsedCapacity,
      createdAt: now,
      updatedAt: now
    };
    db.classes = db.classes || [];
    db.classes.unshift(item);
    addActivity(db, req, {
      action: 'Added Class',
      afterAction: name,
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

    if (req.body.faculty !== undefined || req.body.department !== undefined) {
      findFacultyAndDepartment(db, req.body.faculty ?? found.faculty, req.body.department ?? found.department);
    }
    if (req.body.name !== undefined) found.name = req.body.name;
    if (req.body.faculty !== undefined) found.faculty = req.body.faculty;
    if (req.body.department !== undefined) found.department = req.body.department;
    if (req.body.capacity !== undefined) found.capacity = parseCapacity(req.body.capacity);
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
