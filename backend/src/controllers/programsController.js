import { createId, readDb, updateDb } from '../lib/db.js';
import { fail, sendJson, sendNoContent } from '../lib/http.js';
import { addActivity } from '../services/audit.js';
import { admissionFee } from '../config/admissionFee.js';
import { ensureDepartmentCodes, normalizeDepartmentCode } from '../utils/departmentCodes.js';

const fixedAdmissionFee = admissionFee;
const minimumProgramDurationYears = 5;
const maximumFacultyImageCharacters = 2_500_000;
const validStatuses = new Set(['Active', 'Inactive']);
const cleanText = (value) => String(value || '').trim();
const parseStatus = (value, fallback = 'Active') => {
  const status = cleanText(value || fallback);
  if (!validStatuses.has(status)) fail(422, 'Status must be Active or Inactive');
  return status;
};
const parseFacultyImage = (value) => {
  const image = String(value || '');
  if (image.length > maximumFacultyImageCharacters) {
    fail(413, 'The optimized faculty image is too large. Choose a smaller image.');
  }
  if (image && !image.startsWith('data:image/') && !image.startsWith('/') && !/^https?:\/\//i.test(image)) {
    fail(422, 'Faculty image format is invalid');
  }
  return image;
};
const withFixedAdmissionFee = (program) => ({
  ...program,
  status: program.status || 'Active',
  description: program.description || '',
  admissionFee: fixedAdmissionFee,
  departments: (program.departments || []).map((department) => ({
    ...department,
    status: department.status || 'Active',
    description: department.description || '',
    admissionFee: fixedAdmissionFee,
    durationYears: Number(department.durationYears || department.duration || minimumProgramDurationYears)
  }))
});
const parseProgramDuration = (value) => {
  const duration = Number(value === undefined || value === null || value === '' ? minimumProgramDurationYears : value);
  if (!Number.isInteger(duration) || duration < minimumProgramDurationYears) {
    fail(422, `Academic program duration must be at least ${minimumProgramDurationYears} years`);
  }
  return duration;
};

export const listPrograms = async (req, res) => {
  const db = await readDb();
  let programs = db.programs.map(withFixedAdmissionFee);
  const search = cleanText(req.query.search).toLowerCase();
  if (search) {
    programs = programs.filter((faculty) => (
      [faculty.title, faculty.campus, faculty.description].some((value) => cleanText(value).toLowerCase().includes(search))
      || faculty.departments.some((department) => [department.name, department.code].some((value) => cleanText(value).toLowerCase().includes(search)))
    ));
  }
  if (req.query.status && req.query.status !== 'All') {
    programs = programs.filter((faculty) => faculty.status === req.query.status);
  }
  if (req.query.facultyId) programs = programs.filter((faculty) => faculty.id === req.query.facultyId);
  const summary = {
    totalPrograms: db.programs.reduce((sum, item) => sum + item.departments.filter((department) => (department.status || 'Active') === 'Active').length, 0),
    totalFaculties: db.programs.length,
    admissionFee: fixedAdmissionFee
  };
  sendJson(res, 200, { data: programs, summary });
};

export const getProgram = async (req, res) => {
  const program = (await readDb()).programs.find((item) => item.id === req.params.id);
  if (!program) fail(404, 'Faculty not found');
  sendJson(res, 200, { program: withFixedAdmissionFee(program) });
};

export const createProgram = async (req, res) => {
  const { campus = 'Main Campus', image = '', departments = [], description = '', status } = req.body || {};
  const title = cleanText(req.body?.title);
  if (!title) fail(422, 'Faculty title is required');
  departments.forEach((department) => {
    parseProgramDuration(department.durationYears || department.duration);
  });

  const program = await updateDb((db) => {
    if (db.programs.some((item) => cleanText(item.title).toLowerCase() === title.toLowerCase())) fail(409, 'A faculty with this name already exists');
    const now = new Date().toISOString();
    const item = {
      id: createId('fac'),
      title,
      admissionFee: fixedAdmissionFee,
      campus,
      image: parseFacultyImage(image),
      description: cleanText(description),
      status: parseStatus(status),
      departments: departments.map((department) => ({
        id: createId('dep'),
        name: department.name,
        code: normalizeDepartmentCode(department.code),
        durationYears: parseProgramDuration(department.durationYears || department.duration),
        status: parseStatus(department.status),
        description: cleanText(department.description)
      })),
      createdAt: now,
      updatedAt: now
    };
    db.programs.unshift(item);
    ensureDepartmentCodes(db.programs);
    addActivity(db, req, {
      action: 'Added Faculty',
      afterAction: title,
      module: 'Programs'
    });
    return item;
  });

  sendJson(res, 201, { program });
};

export const updateProgram = async (req, res) => {
  const program = await updateDb((db) => {
    const found = db.programs.find((item) => item.id === req.params.id);
    if (!found) fail(404, 'Faculty not found');
    const before = found.title;
    for (const key of ['title', 'campus', 'description']) {
      if (req.body[key] !== undefined) found[key] = req.body[key];
    }
    if (req.body.image !== undefined) found.image = parseFacultyImage(req.body.image);
    if (req.body.status !== undefined) found.status = parseStatus(req.body.status);
    if (!cleanText(found.title)) fail(422, 'Faculty title is required');
    if (db.programs.some((item) => item.id !== found.id && cleanText(item.title).toLowerCase() === cleanText(found.title).toLowerCase())) fail(409, 'A faculty with this name already exists');
    found.admissionFee = fixedAdmissionFee;
    found.updatedAt = new Date().toISOString();
    addActivity(db, req, {
      action: 'Updated Faculty',
      beforeAction: before,
      afterAction: found.title,
      module: 'Programs'
    });
    return found;
  });
  sendJson(res, 200, { program });
};

export const deleteProgram = async (req, res) => {
  await updateDb((db) => {
    const index = db.programs.findIndex((item) => item.id === req.params.id);
    if (index === -1) fail(404, 'Faculty not found');
    if ((db.programs[index].departments || []).length > 0) fail(409, 'Remove or reassign all programs before deleting this faculty');
    const [program] = db.programs.splice(index, 1);
    addActivity(db, req, {
      action: 'Deleted Faculty',
      beforeAction: program.title,
      module: 'Programs'
    });
  });
  sendNoContent(res);
};

export const createDepartment = async (req, res) => {
  const { durationYears, duration, description = '', status } = req.body || {};
  const name = cleanText(req.body?.name);
  const code = normalizeDepartmentCode(req.body?.code);
  if (!name) fail(422, 'Program name is required');
  const parsedDuration = parseProgramDuration(durationYears || duration);
  if (!code) fail(422, 'Program code is required');
  const program = (await readDb()).programs.find((item) => item.id === req.params.id);
  if (!program) fail(404, 'Faculty not found');
  const department = await updateDb((db) => {
    const program = db.programs.find((item) => item.id === req.params.id);
    if (!program) fail(404, 'Faculty not found');
    if (program.departments.some((item) => cleanText(item.name).toLowerCase() === name.toLowerCase())) fail(409, 'A program with this name already exists in this faculty');
    if (program.departments.some((item) => cleanText(item.code).toUpperCase() === code)) fail(409, 'A program with this code already exists in this faculty');
    const item = {
      id: createId('dep'),
      name,
      code: normalizeDepartmentCode(code),
      durationYears: parsedDuration,
      admissionFee: fixedAdmissionFee,
      status: parseStatus(status),
      description: cleanText(description)
    };
    program.departments.push(item);
    ensureDepartmentCodes(db.programs);
    program.updatedAt = new Date().toISOString();
    addActivity(db, req, {
      action: 'Added Department',
      afterAction: name,
      module: 'Programs'
    });
    return item;
  });

  sendJson(res, 201, { department });
};

export const updateDepartment = async (req, res) => {
  const department = await updateDb((db) => {
    const program = db.programs.find((item) => item.id === req.params.programId);
    if (!program) fail(404, 'Faculty not found');
    const found = program.departments.find((item) => item.id === req.params.departmentId);
    if (!found) fail(404, 'Department not found');
    const before = found.name;
    if (req.body.name !== undefined) found.name = cleanText(req.body.name);
    if (req.body.code !== undefined) found.code = normalizeDepartmentCode(req.body.code);
    if (req.body.durationYears !== undefined || req.body.duration !== undefined) {
      parseProgramDuration(req.body.durationYears || req.body.duration);
      found.durationYears = parseProgramDuration(req.body.durationYears || req.body.duration);
    }
    if (!found.name) fail(422, 'Program name is required');
    if (!found.code) fail(422, 'Program code is required');
    if (req.body.status !== undefined) found.status = parseStatus(req.body.status);
    if (req.body.description !== undefined) found.description = cleanText(req.body.description);
    if (program.departments.some((item) => item.id !== found.id && cleanText(item.name).toLowerCase() === found.name.toLowerCase())) fail(409, 'A program with this name already exists in this faculty');
    if (program.departments.some((item) => item.id !== found.id && cleanText(item.code).toUpperCase() === found.code.toUpperCase())) fail(409, 'A program with this code already exists in this faculty');
    ensureDepartmentCodes(db.programs);
    program.updatedAt = new Date().toISOString();
    addActivity(db, req, {
      action: 'Updated Department',
      beforeAction: before,
      afterAction: found.name,
      module: 'Programs'
    });
    return found;
  });

  sendJson(res, 200, { department });
};

export const deleteDepartment = async (req, res) => {
  await updateDb((db) => {
    const program = db.programs.find((item) => item.id === req.params.programId);
    if (!program) fail(404, 'Faculty not found');
    const index = program.departments.findIndex((item) => item.id === req.params.departmentId);
    if (index === -1) fail(404, 'Department not found');
    const [department] = program.departments.splice(index, 1);
    program.updatedAt = new Date().toISOString();
    addActivity(db, req, {
      action: 'Deleted Department',
      beforeAction: department.name,
      module: 'Programs'
    });
  });
  sendNoContent(res);
};
