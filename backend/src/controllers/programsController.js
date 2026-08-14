import { createId, readDb, updateDb } from '../lib/db.js';
import { fail, sendJson, sendNoContent } from '../lib/http.js';
import { matchesText } from '../lib/query.js';
import { addActivity } from '../services/audit.js';
import { admissionFee } from '../config/admissionFee.js';
import { ensureDepartmentCodes, normalizeDepartmentCode } from '../utils/departmentCodes.js';

const fixedAdmissionFee = admissionFee;
const minimumProgramDurationYears = 5;
const durationForDepartment = (name) =>
  /^(medicine\s*&\s*general surgery|mbbs)$/i.test(String(name).trim()) ? 7 : 5;
const withFixedAdmissionFee = (program) => ({
  ...program,
  admissionFee: fixedAdmissionFee,
  departments: (program.departments || []).map((department) => ({
    ...department,
    durationYears: durationForDepartment(department.name)
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
  programs = programs.filter((item) => matchesText(item, ['title', 'campus'], req.query.search));
  const summary = {
    totalPrograms: db.programs.reduce((sum, item) => sum + item.departments.length, 0),
    totalFaculties: db.programs.length,
    totalAdmissionFees: db.programs.length * fixedAdmissionFee
  };
  sendJson(res, 200, { data: programs, summary });
};

export const createProgram = async (req, res) => {
  const { title, campus = 'Main Campus', image = '', departments = [] } = req.body || {};
  if (!title) fail(422, 'Faculty title is required');
  departments.forEach((department) => {
    parseProgramDuration(department.durationYears || department.duration);
  });

  const program = await updateDb((db) => {
    const now = new Date().toISOString();
    const item = {
      id: createId('fac'),
      title,
      admissionFee: fixedAdmissionFee,
      campus,
      image,
      departments: departments.map((department) => ({
        id: createId('dep'),
        name: department.name,
        code: normalizeDepartmentCode(department.code),
        durationYears: durationForDepartment(department.name)
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
    for (const key of ['title', 'campus', 'image']) {
      if (req.body[key] !== undefined) found[key] = req.body[key];
    }
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
  const { name, code, durationYears, duration } = req.body || {};
  if (!name) fail(422, 'Department name is required');
  parseProgramDuration(durationYears || duration);
  const program = (await readDb()).programs.find((item) => item.id === req.params.id);
  if (!program) fail(404, 'Faculty not found');
  const parsedDuration = durationForDepartment(name);

  const department = await updateDb((db) => {
    const program = db.programs.find((item) => item.id === req.params.id);
    if (!program) fail(404, 'Faculty not found');
    const item = {
      id: createId('dep'),
      name,
      code: normalizeDepartmentCode(code),
      durationYears: parsedDuration
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
    if (req.body.name !== undefined) found.name = req.body.name;
    if (req.body.code !== undefined) found.code = normalizeDepartmentCode(req.body.code);
    if (req.body.durationYears !== undefined || req.body.duration !== undefined) {
      parseProgramDuration(req.body.durationYears || req.body.duration);
      found.durationYears = durationForDepartment(found.name);
    } else if (req.body.name !== undefined) {
      found.durationYears = durationForDepartment(found.name);
    }
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
