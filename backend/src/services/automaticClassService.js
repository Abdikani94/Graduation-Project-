import { createId } from '../lib/db.js';
import { CLASS_CAPACITY } from '../config/classConfig.js';

export { CLASS_CAPACITY };

const activeStudent = (student) => !['Withdrawn', 'Inactive', 'Graduated', 'Deleted'].includes(student.status);

export const academicYearStart = (value, fallbackDate = new Date()) => {
  const match = String(value || '').match(/(?:19|20)\d{2}/);
  return match ? Number(match[0]) : fallbackDate.getFullYear();
};

export const resolveAcademicYear = (db, application = {}) => {
  const period = (db.admissionPeriods || []).find((item) => item.id === application.admissionPeriodId);
  return academicYearStart(period?.academicYear, new Date(application.createdAt || Date.now()));
};

export const findDepartment = (db, facultyName, departmentName) => {
  const faculty = (db.programs || []).find((item) => item.title === facultyName);
  const department = faculty?.departments?.find((item) => item.name === departmentName);
  if (faculty && department) return { faculty, department };

  // Legacy records may contain an older faculty label. A department-name
  // fallback is safe only when that name belongs to exactly one faculty.
  const matches = (db.programs || []).flatMap((program) =>
    (program.departments || [])
      .filter((item) => item.name === departmentName)
      .map((item) => ({ faculty: program, department: item })),
  );
  return matches.length === 1 ? matches[0] : null;
};

export const classEnrollmentCount = (db, classId, excludedStudentId = null) =>
  (db.students || []).filter((student) => (
    student.id !== excludedStudentId && student.classId === classId && activeStudent(student)
  )).length;

export const refreshClassCounts = (db) => {
  for (const item of db.classes || []) {
    item.capacity = CLASS_CAPACITY;
    item.currentStudents = classEnrollmentCount(db, item.id);
    item.classCode = item.classCode || item.name;
    item.name = item.classCode;
  }
};

export const assignAutomaticClass = (db, {
  faculty: facultyName,
  department: departmentName,
  academicYear,
  excludedStudentId = null
}) => {
  const selection = findDepartment(db, facultyName, departmentName);
  if (!selection) throw Object.assign(new Error('Department must belong to the selected faculty'), { statusCode: 422 });
  if (!selection.department.code) throw Object.assign(new Error('Department code is not configured'), { statusCode: 422 });

  db.classes = db.classes || [];
  const year = academicYearStart(academicYear);
  const yearShort = String(year).slice(-2);
  const departmentClasses = db.classes
    .filter((item) => item.departmentId === selection.department.id && Number(item.academicYear) === year)
    .sort((a, b) => Number(a.sequenceNumber) - Number(b.sequenceNumber));

  let target = departmentClasses.find((item) => classEnrollmentCount(db, item.id, excludedStudentId) < CLASS_CAPACITY);
  if (!target) {
    const latestSequence = departmentClasses.reduce((highest, item) => Math.max(highest, Number(item.sequenceNumber) || 0), 0);
    const sequenceNumber = latestSequence + 1;
    const classCode = `${selection.department.code}${yearShort}${sequenceNumber}`;
    if (db.classes.some((item) => (item.classCode || item.name) === classCode)) {
      throw Object.assign(new Error(`Class code ${classCode} already exists`), { statusCode: 409 });
    }
    const now = new Date().toISOString();
    target = {
      id: createId('cls'),
      classCode,
      name: classCode,
      facultyId: selection.faculty.id,
      faculty: selection.faculty.title,
      departmentId: selection.department.id,
      department: selection.department.name,
      academicYear: year,
      sequenceNumber,
      capacity: CLASS_CAPACITY,
      currentStudents: 0,
      generatedAutomatically: true,
      createdAt: now,
      updatedAt: now
    };
    db.classes.unshift(target);
  }

  target.capacity = CLASS_CAPACITY;
  target.currentStudents = classEnrollmentCount(db, target.id, excludedStudentId) + 1;
  target.updatedAt = new Date().toISOString();
  return target;
};
